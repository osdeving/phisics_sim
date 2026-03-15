import { solveMruvPosition, solveMruvVelocity } from "../core/solvers";
import { formatQuantity } from "../core/units";
import { clamp } from "../math/scalar";
import { Vector2 } from "../math/Vector2";
import {
  drawArrow,
  drawGrid,
  drawGround,
  drawSpriteAtWorld,
  drawWorldLabel,
} from "../render/canvasPrimitives";
import { SceneDefinition, ScenePanelData, SceneState } from "./types";

interface MruvState extends SceneState {
  time: number;
  position: number;
  velocity: number;
  groundY: number;
}

function getState(state: SceneState) {
  return state as MruvState;
}

function buildPanel(
  state: MruvState,
  config: Record<string, number>,
): ScenePanelData {
  return {
    metrics: [
      {
        label: "Posição x",
        value: formatQuantity(state.position, "m"),
        helper: "x(t) cresce quadraticamente quando a ≠ 0.",
      },
      {
        label: "Velocidade v",
        value: formatQuantity(state.velocity, "m/s"),
        helper: "No MRUV, v muda linearmente com t.",
      },
      {
        label: "Aceleração a",
        value: formatQuantity(config.acceleration, "m/s²"),
        helper: "Aceleração constante imposta ao móvel.",
      },
      {
        label: "Tempo",
        value: formatQuantity(state.time, "s"),
        helper: "Relógio da simulação.",
      },
    ],
    formulas: [
      {
        title: "Velocidade",
        formula: "$$v = v_0 + at$$",
        explanation: "A velocidade varia linearmente sob aceleração constante.",
      },
      {
        title: "Posição",
        formula: "$$x = x_0 + v_0t + \\frac{1}{2}at^2$$",
        explanation: "A posição cresce com um termo quadrático em t.",
      },
      {
        title: "Torricelli",
        formula: "$$v^2 = v_0^2 + 2a\\Delta x$$",
        explanation: "Útil quando você quer eliminar o tempo da conta.",
      },
    ],
    concept: [
      {
        title: "MRUV é a cinemática com curvatura temporal",
        body: "A trajetória continua reta, mas o gráfico x × t deixa de ser uma reta e passa a ser uma parábola.",
      },
    ],
    studyNotes: [
      {
        title: "Checklist Halliday",
        body: "A aceleração é constante? Então as três equações do MRUV são suas ferramentas principais; escolha a que elimina a variável que você não quer.",
      },
    ],
    loopSteps: [
      {
        title: "1. Avançar t",
        body: "A cena evolui com dt fixo.",
      },
      {
        title: "2. Recalcular v(t) e x(t)",
        body: "Usamos as expressões analíticas do MRUV para manter a leitura didática.",
      },
    ],
    exercises: [
      {
        title: "Frenagem e arranque",
        prompt: `Com v₀ = ${config.initialVelocity.toFixed(1)} m/s e a = ${config.acceleration.toFixed(1)} m/s², qual é a velocidade após 5 s?`,
        answer: `${solveMruvVelocity(config.initialVelocity, config.acceleration, 5).toFixed(2)} m/s.`,
      },
    ],
    intuition: [
      {
        title: "A aceleração “entorta” o gráfico",
        body: "No MRUV, a velocidade não é o que desenha a curva do espaço; é a aceleração que faz a posição crescer cada vez mais rápido ou cada vez mais devagar.",
      },
    ],
    engineering: [
      {
        title:
          "Este é o modelo de partida, frenagem e avanço em trilhos/atuadores",
        body: "Sempre que a aceleração puder ser aproximada como constante por um trecho, o MRUV aparece naturalmente.",
      },
    ],
    pitfalls: [
      {
        title: "Sinal da aceleração",
        body: "Se a aceleração tiver sinal oposto ao da velocidade, o móvel desacelera — mas isso não significa que a aceleração seja “negativa” em sentido absoluto.",
      },
    ],
  };
}

export const mruvScene: SceneDefinition = {
  id: "mruv",
  title: "MRUV",
  subtitle: "Velocidade muda linearmente, posição quadraticamente",
  accent: "#8effa9",
  category: "Cinemática 1D",
  summary:
    "O módulo clássico de movimento retilíneo uniformemente variado, com velocidade inicial, aceleração constante e equações fechadas.",
  worldWidth: 18,
  worldHeight: 8,
  keyboardHints: ["Arraste v₀", "Arraste a aceleração", "Pense em Torricelli"],
  defaults: {
    initialPosition: 1.8,
    initialVelocity: 1,
    acceleration: 1.6,
  },
  controls: [
    {
      key: "initialPosition",
      label: "Posição inicial",
      min: 1,
      max: 8,
      step: 0.1,
      unit: "m",
      description: "Posição em t = 0.",
    },
    {
      key: "initialVelocity",
      label: "Velocidade inicial",
      min: -6,
      max: 8,
      step: 0.1,
      unit: "m/s",
      description: "Velocidade no instante inicial.",
    },
    {
      key: "acceleration",
      label: "Aceleração",
      min: -4,
      max: 4,
      step: 0.1,
      unit: "m/s²",
      description: "Aceleração constante do experimento.",
    },
  ],
  createState: (config) => ({
    time: 0,
    position: config.initialPosition,
    velocity: config.initialVelocity,
    groundY: 6.5,
  }),
  step: ({ state, config, dt }) => {
    const scene = getState(state);
    scene.time += dt;
    scene.velocity = solveMruvVelocity(
      config.initialVelocity,
      config.acceleration,
      scene.time,
    );
    scene.position = solveMruvPosition(
      config.initialPosition,
      config.initialVelocity,
      config.acceleration,
      scene.time,
    );
    scene.position = clamp(scene.position, 1, 16.6);
  },
  render: ({ ctx, state, viewport, sprites, config }) => {
    const scene = getState(state);
    const carPosition = new Vector2(scene.position, scene.groundY - 0.68);
    drawGrid(ctx, viewport, 1);
    drawGround(ctx, viewport, scene.groundY, "Trecho MRUV");
    drawSpriteAtWorld(
      ctx,
      viewport,
      sprites.car,
      carPosition,
      2.2,
      1.2,
      0,
      "#8effa9",
      scene.velocity < 0,
    );
    drawArrow(
      ctx,
      viewport,
      carPosition,
      new Vector2(scene.velocity * 0.15, 0),
      "#ffbf69",
      "v",
    );
    drawArrow(
      ctx,
      viewport,
      carPosition.add(new Vector2(0, -0.45)),
      new Vector2(config.acceleration * 0.18, 0),
      "#ffffff",
      "a",
    );
    drawWorldLabel(
      ctx,
      viewport,
      new Vector2(0.8, 0.95),
      "Use v = v₀ + at e x = x₀ + v₀t + ½at² como bloco básico",
    );
  },
  buildPanelData: (state, config) => buildPanel(getState(state), config),
  getDragHandles: (state, config) => {
    const scene = getState(state);
    const carPosition = new Vector2(scene.position, scene.groundY - 0.68);
    return [
      {
        id: "velocity",
        anchor: carPosition,
        position: carPosition.add(
          new Vector2((config.initialVelocity || 0.5) * 0.18, 0),
        ),
        label: "v₀",
        radius: 0.16,
        color: "#ffbf69",
        style: "vector",
      },
      {
        id: "acceleration",
        anchor: carPosition.add(new Vector2(0, -0.45)),
        position: carPosition.add(
          new Vector2((config.acceleration || 0.5) * 0.22, -0.45),
        ),
        label: "a",
        radius: 0.16,
        color: "#ffffff",
        style: "vector",
      },
    ];
  },
  onDrag: ({ handleId, state, worldPoint }) => {
    const scene = getState(state);
    const carPosition = new Vector2(scene.position, scene.groundY - 0.68);
    if (handleId === "velocity") {
      return {
        configPatch: {
          initialVelocity: clamp((worldPoint.x - carPosition.x) / 0.18, -6, 8),
        },
      };
    }
    if (handleId === "acceleration") {
      return {
        configPatch: {
          acceleration: clamp((worldPoint.x - carPosition.x) / 0.22, -4, 4),
        },
      };
    }
  },
};
