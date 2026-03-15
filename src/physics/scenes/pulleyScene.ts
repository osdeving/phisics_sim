import { clamp } from "../math/scalar";
import { Vector2 } from "../math/Vector2";
import { solveAtwoodMachine } from "../core/solvers";
import { formatQuantity } from "../core/units";
import {
  drawArrow,
  drawGrid,
  drawLineWorld,
  drawSpriteAtWorld,
} from "../render/canvasPrimitives";
import { SceneDefinition, ScenePanelData, SceneState } from "./types";

interface PulleyState extends SceneState {
  offset: number;
  velocity: number;
  acceleration: number;
  tension: number;
}

function getState(state: SceneState) {
  return state as PulleyState;
}

function buildPanel(
  state: PulleyState,
  config: Record<string, number>,
): ScenePanelData {
  const heavierSide =
    config.massRight > config.massLeft
      ? "direita"
      : config.massRight < config.massLeft
        ? "esquerda"
        : "nenhum";
  return {
    metrics: [
      {
        label: "Aceleração do sistema",
        value: formatQuantity(state.acceleration, "m/s²"),
        helper: `Sinal positivo indica o lado direito descendo.`,
      },
      {
        label: "Tensão na corda",
        value: formatQuantity(state.tension, "N"),
        helper: "Modelo ideal com corda sem massa e polia sem atrito.",
      },
      {
        label: "Deslocamento relativo",
        value: formatQuantity(state.offset, "m"),
        helper: "Metade sobe enquanto a outra metade desce a mesma distância.",
      },
      {
        label: "Lado mais pesado",
        value: heavierSide,
        helper: "A diferença de massas define o sentido da aceleração.",
      },
    ],
    formulas: [
      {
        title: "Máquina de Atwood",
        formula: "$$a = \\frac{(m_2 - m_1)g}{m_1 + m_2}$$",
        explanation:
          "Essa expressão vem de aplicar ΣF = m·a aos dois corpos acoplados pela corda.",
      },
      {
        title: "Tensão ideal",
        formula: "$$T = \\frac{2m_1m_2g}{m_1 + m_2}$$",
        explanation:
          "A tensão é a mesma em toda a corda no modelo idealizado usado aqui.",
      },
      {
        title: "Coordenada única",
        formula: "$$y_2 = y_0 + s,\\; y_1 = y_0 - s$$",
        explanation:
          "Basta uma coordenada escalar para descrever os dois blocos acoplados.",
      },
    ],
    concept: [
      {
        title: "Um sistema com restrição",
        body: "A corda impõe que os deslocamentos tenham o mesmo módulo. Por isso, a cena precisa só de uma variável escalar para atualizar ambos os baldes.",
      },
      {
        title: "Idealização útil",
        body: "Assumimos polia sem inércia e corda sem massa para deixar a dedução analítica bem clara.",
      },
    ],
    studyNotes: [
      {
        title: "Massas iguais",
        body: "Quando m₁ = m₂, a aceleração zera e o sistema entra em equilíbrio neutro.",
      },
      {
        title: "Diferença pequena de massas",
        body: "Com massas próximas, a aceleração fica pequena e o movimento evolui lentamente.",
      },
    ],
    loopSteps: [
      {
        title: "1. Resolver a equação",
        body: "A aceleração e a tensão são obtidas diretamente da fórmula analítica da máquina de Atwood.",
      },
      {
        title: "2. Integrar a coordenada s",
        body: "Com a aceleração em mãos, integramos velocidade e deslocamento como em qualquer movimento 1D.",
      },
      {
        title: "3. Aplicar limites",
        body: "Os baldes não podem atravessar o chão nem a polia, então o deslocamento é limitado.",
      },
      {
        title: "4. Desenhar a restrição",
        body: "A corda é renderizada explicitamente para tornar o vínculo geométrico visível.",
      },
    ],
    exercises: [
      {
        title: "Tempo para 1 metro",
        prompt:
          "Se as massas forem diferentes e o sistema partir do repouso, quanto tempo leva para uma das massas percorrer 1 metro?",
        answer:
          "Partindo do repouso e assumindo aceleração constante, usamos s = ½at². Logo, t = √(2s/|a|), com a dado pela fórmula da máquina de Atwood.",
      },
    ],
  };
}

export const pulleyScene: SceneDefinition = {
  id: "pulley",
  title: "Polia / Atwood",
  subtitle: "Corpos acoplados por corda",
  accent: "#ffd36a",
  category: "Dinâmica acoplada",
  summary:
    "Dois baldes ligados por uma corda passam sobre uma polia ideal. A cena deixa visível a restrição geométrica e a aceleração do sistema acoplado.",
  worldWidth: 14,
  worldHeight: 8,
  keyboardHints: ["Use sliders e Reset", "Corda sem massa", "Polia ideal"],
  defaults: {
    massLeft: 4,
    massRight: 6,
    gravity: 9.81,
  },
  controls: [
    {
      key: "massLeft",
      label: "Massa esquerda",
      min: 1,
      max: 12,
      step: 0.1,
      unit: "kg",
      description: "Massa do balde esquerdo.",
    },
    {
      key: "massRight",
      label: "Massa direita",
      min: 1,
      max: 12,
      step: 0.1,
      unit: "kg",
      description: "Massa do balde direito.",
    },
    {
      key: "gravity",
      label: "Gravidade",
      min: 1,
      max: 20,
      step: 0.1,
      unit: "m/s²",
      description: "Aceleração gravitacional aplicada aos dois lados.",
    },
  ],
  createState: (config) => {
    const solution = solveAtwoodMachine(
      config.massLeft,
      config.massRight,
      config.gravity,
    );
    return {
      offset: 0,
      velocity: 0,
      acceleration: solution.acceleration,
      tension: solution.tension,
    };
  },
  step: ({ state, config, dt }) => {
    const scene = getState(state);
    const solution = solveAtwoodMachine(
      config.massLeft,
      config.massRight,
      config.gravity,
    );

    scene.acceleration = solution.acceleration;
    scene.tension = solution.tension;
    scene.velocity += scene.acceleration * dt;
    scene.offset = clamp(scene.offset + scene.velocity * dt, -1.8, 1.8);

    if (scene.offset === -1.8 || scene.offset === 1.8) {
      scene.velocity = 0;
    }
  },
  render: ({ ctx, state, viewport, sprites }) => {
    const scene = getState(state);
    const pulleyCenter = new Vector2(7, 1.75);
    const leftAnchor = new Vector2(5.45, 2.2);
    const rightAnchor = new Vector2(8.55, 2.2);
    const baseY = 4.4;
    const leftBucket = new Vector2(leftAnchor.x, baseY - scene.offset);
    const rightBucket = new Vector2(rightAnchor.x, baseY + scene.offset);

    drawGrid(ctx, viewport, 1);
    drawLineWorld(
      ctx,
      viewport,
      new Vector2(2.5, 0.7),
      new Vector2(11.5, 0.7),
      "#8cb9ff",
      4,
    );

    drawLineWorld(
      ctx,
      viewport,
      leftAnchor,
      new Vector2(leftAnchor.x, leftBucket.y - 0.65),
      "#ebf4ff",
      4,
    );
    drawLineWorld(
      ctx,
      viewport,
      rightAnchor,
      new Vector2(rightAnchor.x, rightBucket.y - 0.65),
      "#ebf4ff",
      4,
    );
    drawLineWorld(ctx, viewport, leftAnchor, pulleyCenter, "#ebf4ff", 4);
    drawLineWorld(ctx, viewport, pulleyCenter, rightAnchor, "#ebf4ff", 4);

    drawSpriteAtWorld(
      ctx,
      viewport,
      sprites.pulley,
      pulleyCenter,
      1.25,
      1.25,
      0,
      "#ffd36a",
    );
    drawSpriteAtWorld(
      ctx,
      viewport,
      sprites.bucket,
      leftBucket,
      1.05,
      1.2,
      0,
      "#66d7ff",
    );
    drawSpriteAtWorld(
      ctx,
      viewport,
      sprites.bucket,
      rightBucket,
      1.05,
      1.2,
      0,
      "#ff9d6a",
    );

    drawArrow(
      ctx,
      viewport,
      rightBucket,
      new Vector2(0, scene.acceleration * 0.15),
      "#ffbf69",
      "a",
    );
  },
  buildPanelData: (state, config) => buildPanel(getState(state), config),
};
