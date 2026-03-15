import { damperForce, springForce } from "../core/forces";
import { formatQuantity } from "../core/units";
import { clamp } from "../math/scalar";
import { Vector2 } from "../math/Vector2";
import {
  drawArrow,
  drawGrid,
  drawLineWorld,
  drawSpring,
  drawSpriteAtWorld,
} from "../render/canvasPrimitives";
import { SceneDefinition, ScenePanelData, SceneState } from "./types";

interface SpringState extends SceneState {
  displacement: number;
  velocity: number;
  acceleration: number;
  springForceValue: number;
  damperForceValue: number;
  totalEnergy: number;
}

function getState(state: SceneState) {
  return state as SpringState;
}

function buildPanel(
  state: SpringState,
  config: Record<string, number>,
): ScenePanelData {
  const kinetic = 0.5 * config.mass * state.velocity ** 2;
  const elastic = 0.5 * config.stiffness * state.displacement ** 2;

  return {
    metrics: [
      {
        label: "Alongamento x",
        value: formatQuantity(state.displacement, "m"),
        helper: "Deslocamento em relação à posição de equilíbrio.",
      },
      {
        label: "Velocidade",
        value: formatQuantity(state.velocity, "m/s"),
        helper: "A massa oscila ao redor do equilíbrio.",
      },
      {
        label: "Força da mola",
        value: formatQuantity(state.springForceValue, "N"),
        helper: "Lei de Hooke: força restauradora oposta ao deslocamento.",
      },
      {
        label: "Energia total",
        value: formatQuantity(state.totalEnergy, "J"),
        helper: `Cinética = ${kinetic.toFixed(2)} J, elástica = ${elastic.toFixed(2)} J.`,
      },
    ],
    formulas: [
      {
        title: "Lei de Hooke",
        formula: `$$F_m = -kx = -${config.stiffness.toFixed(1)} \\cdot x$$`,
        explanation:
          "Quanto maior o deslocamento, mais forte a mola tenta restaurar o equilíbrio.",
      },
      {
        title: "Amortecimento",
        formula: `$$F_d = -cv = -${config.damping.toFixed(2)} \\cdot v$$`,
        explanation:
          "O amortecimento retira energia do sistema e faz a oscilação morrer aos poucos.",
      },
      {
        title: "Energia mecânica",
        formula: "$$E = \\frac{1}{2}mv^2 + \\frac{1}{2}kx^2$$",
        explanation:
          "Sem amortecimento, a energia oscilaria entre cinética e potencial elástica.",
      },
    ],
    concept: [
      {
        title: "Oscilador harmônico amortecido",
        body: "Esta é uma das equações diferenciais mais clássicas da física. A mola armazena energia, a massa carrega inércia e o amortecimento dissipa parte da energia.",
      },
      {
        title: "Equilíbrio",
        body: "Quando x = 0 e v = 0, o sistema está em equilíbrio estático. Qualquer deslocamento cria uma força restauradora.",
      },
    ],
    studyNotes: [
      {
        title: "Observe a troca de energia",
        body: "Quando a massa cruza o equilíbrio, a energia cinética é máxima. Nos extremos, a energia elástica domina.",
      },
      {
        title: "Aumente o amortecimento",
        body: "Ao crescer c, a oscilação perde amplitude mais rápido até quase não oscilar.",
      },
    ],
    loopSteps: [
      {
        title: "1. Calcular forças internas",
        body: "Mola e amortecedor são computados diretamente com x e v atuais.",
      },
      {
        title: "2. Obter aceleração",
        body: "Como o movimento é unidimensional, a aceleração é um escalar a = ΣF / m.",
      },
      {
        title: "3. Integrar",
        body: "A massa avança com dt fixo, preservando uma leitura clara do oscilador.",
      },
      {
        title: "4. Renderizar a mola",
        body: "A hélice desenhada no canvas acompanha o comprimento atual entre a parede e a caixa.",
      },
    ],
    exercises: [
      {
        title: "Período sem amortecimento",
        prompt:
          "Sem amortecimento, como estimar o período de oscilação da massa na mola?",
        answer: `T = 2π√(m/k). Com m = ${config.mass.toFixed(2)} kg e k = ${config.stiffness.toFixed(2)} N/m, o período teórico é ${(2 * Math.PI * Math.sqrt(config.mass / config.stiffness)).toFixed(2)} s.`,
      },
    ],
  };
}

export const springScene: SceneDefinition = {
  id: "spring",
  title: "Mola e oscilação",
  subtitle: "Hooke + amortecimento",
  accent: "#a88fff",
  category: "Oscilações",
  summary:
    "Uma massa presa a uma mola horizontal para estudar Lei de Hooke, amortecimento viscoso e troca de energia entre cinética e potencial elástica.",
  worldWidth: 14,
  worldHeight: 8,
  keyboardHints: [
    "Use sliders e Reset",
    "Oscilador harmônico",
    "Energia em joules",
  ],
  defaults: {
    mass: 2,
    stiffness: 18,
    damping: 1.2,
    initialStretch: 1.4,
  },
  controls: [
    {
      key: "mass",
      label: "Massa",
      min: 0.5,
      max: 10,
      step: 0.1,
      unit: "kg",
      description: "Inércia do sistema oscilante.",
    },
    {
      key: "stiffness",
      label: "Constante da mola",
      min: 2,
      max: 50,
      step: 0.5,
      unit: "N/m",
      description: "Quanto maior k, mais rígida a mola.",
    },
    {
      key: "damping",
      label: "Amortecimento",
      min: 0,
      max: 8,
      step: 0.1,
      unit: "N·s/m",
      description: "Força dissipativa proporcional à velocidade.",
    },
    {
      key: "initialStretch",
      label: "Alongamento inicial",
      min: -2,
      max: 2.5,
      step: 0.05,
      unit: "m",
      description:
        "Use Reset para reiniciar o experimento com novo deslocamento.",
    },
  ],
  createState: (config) => ({
    displacement: clamp(config.initialStretch, -2, 2.5),
    velocity: 0,
    acceleration: 0,
    springForceValue: 0,
    damperForceValue: 0,
    totalEnergy: 0.5 * config.stiffness * config.initialStretch ** 2,
  }),
  step: ({ state, config, dt }) => {
    const scene = getState(state);
    scene.springForceValue = springForce(scene.displacement, config.stiffness);
    scene.damperForceValue = damperForce(scene.velocity, config.damping);

    const netForce = scene.springForceValue + scene.damperForceValue;
    scene.acceleration = netForce / config.mass;
    scene.velocity += scene.acceleration * dt;
    scene.displacement += scene.velocity * dt;

    scene.totalEnergy =
      0.5 * config.mass * scene.velocity ** 2 +
      0.5 * config.stiffness * scene.displacement ** 2;
  },
  render: ({ ctx, state, viewport, sprites }) => {
    const scene = getState(state);
    const wallX = 1.7;
    const equilibriumX = 6.4;
    const massCenter = new Vector2(equilibriumX + scene.displacement, 4.1);

    drawGrid(ctx, viewport, 1);
    drawLineWorld(
      ctx,
      viewport,
      new Vector2(wallX, 2.5),
      new Vector2(wallX, 5.7),
      "#dbe9ff",
      5,
    );
    drawSpring(
      ctx,
      viewport,
      new Vector2(wallX, 4.1),
      new Vector2(massCenter.x - 0.65, 4.1),
    );
    drawSpriteAtWorld(
      ctx,
      viewport,
      sprites.crate,
      massCenter,
      1.25,
      1.25,
      0,
      "#dba65f",
    );

    drawArrow(
      ctx,
      viewport,
      massCenter,
      new Vector2(scene.springForceValue * 0.02, 0),
      "#ffbf69",
      "Fₘ",
    );
    drawArrow(
      ctx,
      viewport,
      massCenter,
      new Vector2(scene.velocity * 0.18, 0),
      "#9bff9b",
      "v",
    );

  },
  buildPanelData: (state, config) => buildPanel(getState(state), config),
};
