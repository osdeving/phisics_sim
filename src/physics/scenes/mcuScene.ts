import { solveCircularMotion } from "../core/solvers";
import { formatQuantity } from "../core/units";
import { clamp } from "../math/scalar";
import { Vector2 } from "../math/Vector2";
import {
  drawArrow,
  drawCircleBody,
  drawGrid,
  drawLineWorld,
} from "../render/canvasPrimitives";
import { SceneDefinition, ScenePanelData, SceneState } from "./types";

interface McuState extends SceneState {
  time: number;
  angle: number;
  center: Vector2;
}

function getState(state: SceneState) {
  return state as McuState;
}

function buildPanel(
  state: McuState,
  config: Record<string, number>,
): ScenePanelData {
  const solution = solveCircularMotion(
    config.radius,
    config.angularSpeed,
    config.mass,
  );
  return {
    metrics: [
      {
        label: "Raio",
        value: formatQuantity(config.radius, "m"),
        helper: "Distância do corpo até o centro.",
      },
      {
        label: "Velocidade tangencial",
        value: formatQuantity(solution.tangentialSpeed, "m/s"),
        helper: "v = ωr.",
      },
      {
        label: "Aceleração centrípeta",
        value: formatQuantity(solution.centripetalAcceleration, "m/s²"),
        helper: "a_c aponta sempre para o centro.",
      },
      {
        label: "Período",
        value: Number.isFinite(solution.period)
          ? formatQuantity(solution.period, "s")
          : "∞",
        helper: "Tempo para completar uma volta.",
      },
    ],
    formulas: [
      {
        title: "Velocidade angular",
        formula: "$$\\theta = \\theta_0 + \\omega t$$",
        explanation: "No MCU ideal, a velocidade angular é constante.",
      },
      {
        title: "Velocidade tangencial",
        formula: "$$v = \\omega r$$",
        explanation:
          "Quanto maior o raio, maior a velocidade linear para a mesma rotação.",
      },
      {
        title: "Centrípeta",
        formula: "$$a_c = \\frac{v^2}{r} = \\omega^2 r$$",
        explanation:
          "Mesmo com módulo de velocidade constante, a direção muda o tempo todo — por isso existe aceleração.",
      },
    ],
    concept: [
      {
        title: "Curva sem acelerar o módulo",
        body: "No MCU, o tamanho da velocidade pode permanecer constante enquanto sua direção muda a todo instante.",
      },
    ],
    studyNotes: [
      {
        title: "Resumo Halliday",
        body: "Sempre separe grandezas lineares (v, a) das angulares (θ, ω). A ponte entre elas é o raio.",
      },
    ],
    loopSteps: [
      {
        title: "1. Atualizar ângulo",
        body: "O solver avança θ com velocidade angular constante.",
      },
      {
        title: "2. Reconstruir posição",
        body: "A posição do corpo sobre a circunferência sai de seno e cosseno.",
      },
      {
        title: "3. Desenhar vetores",
        body: "A cena mostra velocidade tangencial e aceleração centrípeta ao mesmo tempo.",
      },
    ],
    exercises: [
      {
        title: "Uma volta completa",
        prompt: `Com ω = ${config.angularSpeed.toFixed(2)} rad/s e r = ${config.radius.toFixed(2)} m, qual é a velocidade tangencial?`,
        answer: `${solution.tangentialSpeed.toFixed(2)} m/s.`,
      },
    ],
    intuition: [
      {
        title: "O “puxão” é para dentro",
        body: "O corpo quer seguir tangente por inércia. Para curvar a trajetória, a resultante precisa apontar sempre para o centro.",
      },
    ],
    engineering: [
      {
        title: "Motores, rodas e rotores",
        body: "MCU aparece em rodas, eixos, discos, ventiladores e praticamente qualquer sistema rotativo em engenharia.",
      },
    ],
    pitfalls: [
      {
        title: "Confundir velocidade com aceleração",
        body: "No ponto mais alto, a velocidade é horizontal; a aceleração centrípeta continua apontando para o centro.",
      },
    ],
  };
}

export const mcuScene: SceneDefinition = {
  id: "mcu",
  title: "MCU",
  subtitle: "Velocidade angular, tangencial e centrípeta",
  accent: "#ffd974",
  category: "Cinemática angular",
  summary:
    "Um ponto gira em movimento circular uniforme para visualizar a relação entre raio, velocidade tangencial e aceleração centrípeta.",
  worldWidth: 16,
  worldHeight: 10,
  keyboardHints: [
    "Arraste o raio",
    "Arraste o vetor ω",
    "Observe v e a_c em cada ponto",
  ],
  defaults: {
    radius: 2.8,
    angularSpeed: 1.6,
    mass: 1.5,
  },
  controls: [
    {
      key: "radius",
      label: "Raio",
      min: 1,
      max: 4.2,
      step: 0.1,
      unit: "m",
      description: "Distância do corpo ao centro.",
    },
    {
      key: "angularSpeed",
      label: "Velocidade angular",
      min: -4,
      max: 4,
      step: 0.1,
      unit: "rad/s",
      description: "Sinal define o sentido da rotação.",
    },
    {
      key: "mass",
      label: "Massa",
      min: 0.2,
      max: 5,
      step: 0.1,
      unit: "kg",
      description: "Usada para calcular a força centrípeta.",
    },
  ],
  createState: () => ({
    time: 0,
    angle: -Math.PI / 3,
    center: new Vector2(8, 5.2),
  }),
  step: ({ state, config, dt }) => {
    const scene = getState(state);
    scene.time += dt;
    scene.angle += config.angularSpeed * dt;
  },
  render: ({ ctx, state, viewport, config }) => {
    const scene = getState(state);
    const bodyPosition = scene.center.add(
      Vector2.fromAngle(scene.angle, config.radius),
    );
    const radial = bodyPosition.subtract(scene.center);
    const tangent = new Vector2(-radial.y, radial.x)
      .normalized()
      .scale(config.angularSpeed * config.radius * 0.18);
    const inward = radial
      .normalized()
      .scale(
        -solveCircularMotion(config.radius, config.angularSpeed, config.mass)
          .centripetalAcceleration * 0.08,
      );

    drawGrid(ctx, viewport, 1);
    drawCircleBody(ctx, viewport, scene.center, 0.08, "#ffffff");
    const screenCenter = new Vector2(
      scene.center.x + config.radius,
      scene.center.y,
    );
    drawLineWorld(
      ctx,
      viewport,
      scene.center,
      screenCenter,
      "rgba(255,255,255,0.14)",
      1.5,
    );
    const steps = 72;
    let previous = scene.center.add(Vector2.fromAngle(0, config.radius));
    for (let i = 1; i <= steps; i += 1) {
      const point = scene.center.add(
        Vector2.fromAngle((i / steps) * Math.PI * 2, config.radius),
      );
      drawLineWorld(
        ctx,
        viewport,
        previous,
        point,
        "rgba(255,255,255,0.12)",
        1.6,
      );
      previous = point;
    }
    drawLineWorld(ctx, viewport, scene.center, bodyPosition, "#ffffff", 2);
    drawCircleBody(ctx, viewport, bodyPosition, 0.22, "#ffd974");
    drawArrow(ctx, viewport, bodyPosition, tangent, "#69e2ff", "v");
    drawArrow(ctx, viewport, bodyPosition, inward, "#ff8d8d", "a_c");
  },
  buildPanelData: (state, config) => buildPanel(getState(state), config),
  getDragHandles: (state, config) => {
    const scene = getState(state);
    const radiusPoint = scene.center.add(
      Vector2.fromAngle(scene.angle, config.radius),
    );
    const omegaAnchor = scene.center.add(new Vector2(0, -3.2));
    return [
      {
        id: "radius",
        anchor: scene.center,
        position: radiusPoint,
        label: "r",
        radius: 0.16,
        color: "#ffffff",
        style: "vector",
      },
      {
        id: "omega",
        anchor: omegaAnchor,
        position: omegaAnchor.add(new Vector2(config.angularSpeed * 0.28, 0)),
        label: "ω",
        radius: 0.16,
        color: "#69e2ff",
        style: "vector",
      },
    ];
  },
  onDrag: ({ handleId, state, worldPoint }) => {
    const scene = getState(state);
    if (handleId === "radius") {
      return {
        configPatch: {
          radius: clamp(worldPoint.distanceTo(scene.center), 1, 4.2),
        },
      };
    }
    if (handleId === "omega") {
      const omegaAnchor = scene.center.add(new Vector2(0, -3.2));
      return {
        configPatch: {
          angularSpeed: clamp((worldPoint.x - omegaAnchor.x) / 0.28, -4, 4),
        },
      };
    }
  },
  resetOnConfigChange: false,
};
