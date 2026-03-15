import { solveMruPosition } from "../core/solvers";
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

interface MruState extends SceneState {
  time: number;
  position: number;
  groundY: number;
}

function getState(state: SceneState) {
  return state as MruState;
}

function buildPanel(
  state: MruState,
  config: Record<string, number>,
): ScenePanelData {
  const displacement = state.position - config.initialPosition;
  return {
    metrics: [
      {
        label: "Posição x",
        value: formatQuantity(state.position, "m"),
        helper: "Coordenada atual do móvel.",
      },
      {
        label: "Deslocamento Δx",
        value: formatQuantity(displacement, "m"),
        helper: "Variação em relação à posição inicial.",
      },
      {
        label: "Velocidade",
        value: formatQuantity(config.velocity, "m/s"),
        helper: "No MRU, v permanece constante.",
      },
      {
        label: "Tempo",
        value: formatQuantity(state.time, "s"),
        helper: "Relógio da simulação desde t = 0.",
      },
    ],
    formulas: [
      {
        title: "Equação horária",
        formula: "$$x = x_0 + vt$$",
        explanation:
          "Se a velocidade não muda, a posição cresce linearmente com o tempo.",
      },
      {
        title: "Inclinação do gráfico",
        formula: "$$v = \\frac{\\Delta x}{\\Delta t}$$",
        explanation: "No gráfico x × t, a velocidade é a inclinação da reta.",
      },
      {
        title: "Aceleração",
        formula: "$$a = 0$$",
        explanation: "No MRU ideal, não existe aceleração resultante.",
      },
    ],
    concept: [
      {
        title: "MR e MRU",
        body: "Movimento retilíneo significa trajetória em linha reta. Quando a velocidade também é constante, temos o caso especial chamado MRU.",
      },
    ],
    studyNotes: [
      {
        title: "Leitura estilo Halliday",
        body: "Sempre pergunte: a trajetória é reta? a velocidade muda? Se a resposta for “reta e constante”, a ferramenta certa é x = x₀ + vt.",
      },
    ],
    loopSteps: [
      {
        title: "1. Avançar o relógio",
        body: "A cena incrementa t com passo fixo.",
      },
      {
        title: "2. Recalcular x(t)",
        body: "Como o movimento é exato, usamos a equação analítica em vez de integrar numericamente.",
      },
    ],
    exercises: [
      {
        title: "Quanto anda em 8 s?",
        prompt: `Partindo de x₀ = ${config.initialPosition.toFixed(1)} m com v = ${config.velocity.toFixed(1)} m/s, onde o móvel estará após 8 s?`,
        answer: `${solveMruPosition(config.initialPosition, config.velocity, 8).toFixed(2)} m.`,
      },
    ],
    intuition: [
      {
        title: "Reta no espaço, reta no gráfico",
        body: "No MRU, a história é linear em dois sentidos: a trajetória é uma linha reta e o gráfico posição-tempo também é uma reta.",
      },
    ],
    engineering: [
      {
        title: "Esteira, esteio e transporte",
        body: "Trechos de velocidade constante aparecem em esteiras, robôs lineares, carros em cruzeiro e correias industriais.",
      },
    ],
    pitfalls: [
      {
        title: "Trocar posição por deslocamento",
        body: "O móvel pode estar em x = 12 m e ainda assim ter deslocamento de apenas 2 m se começou em x₀ = 10 m.",
      },
    ],
  };
}

export const mruScene: SceneDefinition = {
  id: "mru",
  title: "MR / MRU",
  subtitle: "Reta, velocidade constante, aceleração zero",
  accent: "#80dcff",
  category: "Cinemática 1D",
  summary:
    "O módulo mais básico de movimento retilíneo: reta, velocidade constante e leitura direta da equação x = x₀ + vt.",
  worldWidth: 18,
  worldHeight: 8,
  keyboardHints: [
    "Arraste a velocidade",
    "Arraste a posição inicial",
    "Use a timeline para rever",
  ],
  defaults: {
    initialPosition: 2.2,
    velocity: 2.4,
  },
  controls: [
    {
      key: "initialPosition",
      label: "Posição inicial",
      min: 1,
      max: 12,
      step: 0.1,
      unit: "m",
      description: "Coordenada em t = 0.",
    },
    {
      key: "velocity",
      label: "Velocidade",
      min: -6,
      max: 6,
      step: 0.1,
      unit: "m/s",
      description: "Velocidade escalar com sinal.",
    },
  ],
  createState: (config) => ({
    time: 0,
    position: config.initialPosition,
    groundY: 6.5,
  }),
  step: ({ state, config, dt }) => {
    const scene = getState(state);
    scene.time += dt;
    scene.position = solveMruPosition(
      config.initialPosition,
      config.velocity,
      scene.time,
    );
    scene.position = clamp(scene.position, 1, 16.8);
  },
  render: ({ ctx, state, viewport, sprites, config }) => {
    const scene = getState(state);
    const carPosition = new Vector2(scene.position, scene.groundY - 0.68);
    drawGrid(ctx, viewport, 1);
    drawGround(ctx, viewport, scene.groundY, "Pista MRU");
    drawSpriteAtWorld(
      ctx,
      viewport,
      sprites.car,
      carPosition,
      2.2,
      1.2,
      0,
      "#80dcff",
      config.velocity < 0,
    );
    drawArrow(
      ctx,
      viewport,
      carPosition,
      new Vector2(config.velocity * 0.22, 0),
      "#ffbf69",
      "v",
    );
    drawWorldLabel(
      ctx,
      viewport,
      new Vector2(0.8, 0.95),
      "Sem força resultante horizontal → velocidade constante",
    );
  },
  buildPanelData: (state, config) => buildPanel(getState(state), config),
  getDragHandles: (state, config) => {
    const scene = getState(state);
    const carPosition = new Vector2(scene.position, scene.groundY - 0.68);
    return [
      {
        id: "initial-position",
        position: carPosition,
        label: "x",
        radius: 0.18,
        color: "#80dcff",
        style: "point",
      },
      {
        id: "velocity",
        anchor: carPosition,
        position: carPosition.add(
          new Vector2(config.velocity * 0.22 || 0.5, 0),
        ),
        label: "v",
        radius: 0.16,
        color: "#ffbf69",
        style: "vector",
      },
    ];
  },
  onDrag: ({ handleId, worldPoint, state }) => {
    const scene = getState(state);
    const carPosition = new Vector2(scene.position, scene.groundY - 0.68);
    if (handleId === "initial-position") {
      return { configPatch: { initialPosition: clamp(worldPoint.x, 1, 12) } };
    }
    if (handleId === "velocity") {
      return {
        configPatch: {
          velocity: clamp((worldPoint.x - carPosition.x) / 0.22, -6, 6),
        },
      };
    }
  },
};
