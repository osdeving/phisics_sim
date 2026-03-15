import { clamp, toRadians } from "../math/scalar";
import { Vector2 } from "../math/Vector2";
import { solveInclinedPlaneAcceleration } from "../core/solvers";
import { formatQuantity } from "../core/units";
import {
  drawArrow,
  drawGrid,
  drawLineWorld,
  drawScenicBackdrop,
  drawSpriteAtWorld,
} from "../render/canvasPrimitives";
import { SceneDefinition, ScenePanelData, SceneState } from "./types";

interface InclineState extends SceneState {
  distance: number;
  velocity: number;
  acceleration: number;
  parallelForce: number;
  normalForce: number;
  frictionForce: number;
}

function getState(state: SceneState) {
  return state as InclineState;
}

function buildPanel(
  state: InclineState,
  config: Record<string, number>,
): ScenePanelData {
  const angleRadians = toRadians(config.angle);
  return {
    metrics: [
      {
        label: "Posição ao longo da rampa",
        value: formatQuantity(state.distance, "m"),
        helper: "Coordenada escalar medida a partir do topo da rampa.",
      },
      {
        label: "Velocidade tangencial",
        value: formatQuantity(state.velocity, "m/s"),
        helper: "Velocidade ao longo da direção da rampa.",
      },
      {
        label: "Componente do peso",
        value: formatQuantity(state.parallelForce, "N"),
        helper: "m·g·sen(θ), a parte do peso que puxa o bloco morro abaixo.",
      },
      {
        label: "Força normal",
        value: formatQuantity(state.normalForce, "N"),
        helper: "m·g·cos(θ), perpendicular ao plano inclinado.",
      },
    ],
    formulas: [
      {
        title: "Decomposição do peso",
        formula: `$$F_{\\parallel} = mg\\sin(${config.angle.toFixed(1)}^\\circ),\\; N = mg\\cos(${config.angle.toFixed(1)}^\\circ)$$`,
        explanation:
          "Em um plano inclinado, o peso é projetado nos eixos tangencial e normal.",
      },
      {
        title: "Atrito",
        formula: `$$F_{at} = \\mu N = ${config.friction.toFixed(2)} \\cdot N$$`,
        explanation:
          "O atrito sempre se opõe ao movimento ou à tendência de movimento.",
      },
      {
        title: "Aceleração resultante",
        formula: `$$a = ${state.acceleration.toFixed(2)}\\,\\mathrm{m/s^2}$$`,
        explanation: `Com θ = ${((angleRadians * 180) / Math.PI).toFixed(1)}°, a componente do peso tenta vencer o atrito.`,
      },
    ],
    concept: [
      {
        title: "Escolha inteligente de eixos",
        body: "Em vez de usar x/y globais, a cena trabalha com um eixo ao longo da rampa. Isso deixa as equações muito mais legíveis.",
      },
      {
        title: "Atrito estático simplificado",
        body: "Se a componente do peso não vencer o limite μ·N, o bloco permanece em repouso. Isso ajuda a visualizar o limiar do escorregamento.",
      },
    ],
    studyNotes: [
      {
        title: "Variação do ângulo",
        body: "Aumente θ e observe como sen(θ) cresce, reforçando a parcela do peso ao longo do plano.",
      },
      {
        title: "Limiar de escorregamento",
        body: "Ajuste o atrito para encontrar o ponto em que o bloco deixa de ficar parado.",
      },
    ],
    loopSteps: [
      {
        title: "1. Projetar forças",
        body: "Calculamos componentes do peso com seno e cosseno do ângulo.",
      },
      {
        title: "2. Avaliar atrito",
        body: "Se o bloco estiver quase parado, comparamos a tendência de movimento com μ·N.",
      },
      {
        title: "3. Integrar s(t)",
        body: "A coordenada tangencial é integrada com o mesmo dt fixo.",
      },
      {
        title: "4. Converter para 2D",
        body: "A posição escalar ao longo da rampa é projetada de volta no plano para renderização.",
      },
    ],
    exercises: [
      {
        title: "Quando escorrega?",
        prompt:
          "Qual condição precisa ser satisfeita para o bloco começar a escorregar sozinho plano abaixo?",
        answer:
          "O bloco desliza quando a componente do peso ao longo da rampa vence o atrito máximo: m·g·senθ > μ·m·g·cosθ, ou senθ > μ·cosθ.",
      },
    ],
  };
}

export const inclineScene: SceneDefinition = {
  id: "incline",
  title: "Plano inclinado",
  subtitle: "Decomposição do peso + atrito",
  accent: "#8effb2",
  category: "Dinâmica",
  summary:
    "Um caixote desce uma rampa inclinada com atrito. A cena mostra explicitamente a decomposição do peso em componentes paralela e normal.",
  worldWidth: 14,
  worldHeight: 8,
  keyboardHints: [
    "Use os sliders",
    "Observe seno e cosseno",
    "Atrito pode travar o bloco",
  ],
  defaults: {
    mass: 4,
    gravity: 9.81,
    angle: 28,
    friction: 0.22,
  },
  controls: [
    {
      key: "mass",
      label: "Massa do caixote",
      min: 1,
      max: 12,
      step: 0.1,
      unit: "kg",
      description:
        "A massa escala o peso e a normal, mas pode se cancelar em a.",
    },
    {
      key: "gravity",
      label: "Gravidade",
      min: 1,
      max: 20,
      step: 0.1,
      unit: "m/s²",
      description: "Define o módulo do peso do bloco.",
    },
    {
      key: "angle",
      label: "Ângulo da rampa",
      min: 5,
      max: 50,
      step: 0.5,
      unit: "°",
      description: "Controla a decomposição do peso em seno e cosseno.",
    },
    {
      key: "friction",
      label: "Coef. de atrito",
      min: 0,
      max: 0.9,
      step: 0.01,
      unit: "",
      description: "Atrito simplificado agindo contra o escorregamento.",
    },
  ],
  createState: () => ({
    distance: 0.6,
    velocity: 0,
    acceleration: 0,
    parallelForce: 0,
    normalForce: 0,
    frictionForce: 0,
  }),
  step: ({ state, config, dt }) => {
    const scene = getState(state);
    const angle = toRadians(config.angle);
    const solution = solveInclinedPlaneAcceleration(
      config.mass,
      config.gravity,
      angle,
      config.friction,
      scene.velocity,
    );

    scene.parallelForce = solution.parallelForce;
    scene.normalForce = solution.normalForce;
    scene.frictionForce = solution.frictionForce;
    scene.acceleration = solution.acceleration;

    scene.velocity += scene.acceleration * dt;
    scene.distance = clamp(scene.distance + scene.velocity * dt, 0.6, 7.7);

    if (scene.distance === 0.6 || scene.distance === 7.7) {
      scene.velocity = 0;
    }
  },
  render: ({ ctx, state, viewport, sprites, config }) => {
    const scene = getState(state);
    const angle = toRadians(config.angle);
    const top = new Vector2(3.4, 1.35);
    const direction = Vector2.fromAngle(angle, 1);
    const bottom = top.add(direction.scale(8.2));
    const blockCenter = top
      .add(direction.scale(scene.distance))
      .add(direction.perpendicular().scale(-0.48));

    drawScenicBackdrop(ctx, viewport, {
      groundY: bottom.y + 0.8,
      treeBaseY: bottom.y + 0.78,
      hillHeight: 0.9,
      treeSpacing: 4.2,
    });
    drawGrid(ctx, viewport, 1);
    drawLineWorld(
      ctx,
      viewport,
      new Vector2(top.x, bottom.y + 0.8),
      bottom,
      "rgba(118, 181, 255, 0.35)",
      1.5,
    );
    drawLineWorld(ctx, viewport, top, bottom, "#9ed8ff", 5);

    drawSpriteAtWorld(
      ctx,
      viewport,
      sprites.crate,
      blockCenter,
      1.1,
      1.1,
      angle,
      "#d9a35f",
    );

    const tangent = direction.scale(scene.parallelForce * 0.02);
    const normal = direction.perpendicular().scale(-scene.normalForce * 0.012);
    drawArrow(ctx, viewport, blockCenter, tangent, "#ffbf69", "m·g·senθ");
    drawArrow(ctx, viewport, blockCenter, normal, "#9bff9b", "N");

  },
  buildPanelData: (state, config) => buildPanel(getState(state), config),
};
