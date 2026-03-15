import {
  applyForce,
  createParticleBody,
  integrateSemiImplicitEuler,
  ParticleBody,
} from "../core/body";
import { gravityForce } from "../core/forces";
import { formatQuantity } from "../core/units";
import { clamp } from "../math/scalar";
import { Vector2 } from "../math/Vector2";
import {
  drawArrow,
  drawCircleBody,
  drawGrid,
  drawGround,
  drawLineWorld,
  drawWorldLabel,
} from "../render/canvasPrimitives";
import { SceneDefinition, ScenePanelData, SceneState } from "./types";

interface BouncingBallState extends SceneState {
  body: ParticleBody;
  groundY: number;
  wallLeft: number;
  wallRight: number;
  bounces: number;
  predictedBounceHeight: number;
  trail: Vector2[];
  frameCounter: number;
}

function getState(state: SceneState) {
  return state as BouncingBallState;
}

function buildPanel(
  state: BouncingBallState,
  config: Record<string, number>,
): ScenePanelData {
  const height = Math.max(
    0,
    state.groundY - state.body.position.y - state.body.radius,
  );

  return {
    metrics: [
      {
        label: "Altura instantânea",
        value: formatQuantity(height, "m"),
        helper: "Distância vertical até o chão.",
      },
      {
        label: "Velocidade",
        value: formatQuantity(state.body.velocity.length, "m/s"),
        helper: "Módulo da velocidade vetorial atual.",
      },
      {
        label: "Quiques",
        value: `${state.bounces}`,
        helper: "Contador de impactos com o solo.",
      },
      {
        label: "Altura do próximo quique",
        value: formatQuantity(state.predictedBounceHeight, "m"),
        helper: "Estimativa usando a restituição configurada.",
      },
    ],
    formulas: [
      {
        title: "Restituição",
        formula: "$$v^{+} = ev^{-},\\; h_1 = e^2 h_0$$",
        explanation:
          "Ao reduzir a velocidade vertical por e, a nova altura máxima cai com o quadrado de e.",
      },
      {
        title: "Gravidade",
        formula: `$$a = g = ${config.gravity.toFixed(2)}\\,\\mathrm{m/s^2}$$`,
        explanation:
          "Sem resistência do ar, a aceleração vertical é constante entre impactos.",
      },
      {
        title: "Integração",
        formula: "$$v_{n+1} = v_n + a\\,dt,\\; y_{n+1} = y_n + v_{n+1}\\,dt$$",
        explanation:
          "Mesmo modelo numérico das outras cenas, com impacto tratado à parte.",
      },
    ],
    concept: [
      {
        title: "Energia não conservada no choque",
        body: "O coeficiente de restituição representa a fração de velocidade preservada após o impacto. Quanto menor e, mais energia mecânica some na colisão.",
      },
      {
        title: "Queda com componente horizontal",
        body: "A componente horizontal da velocidade continua quase intacta, enquanto a vertical inverte e perde módulo ao quicar.",
      },
    ],
    studyNotes: [
      {
        title: "Experimento clássico",
        body: "Solte a bola de alturas diferentes e compare a sequência de quique usando hₙ = e²ⁿ·h₀.",
      },
    ],
    loopSteps: [
      {
        title: "1. Aplicar gravidade",
        body: "Entre colisões, a única força é o peso.",
      },
      {
        title: "2. Integrar posição e velocidade",
        body: "A bola evolui com o mesmo integrador semi-implícito.",
      },
      {
        title: "3. Resolver impacto",
        body: "Quando cruza o chão, a posição é corrigida e a velocidade vertical é refletida com restituição.",
      },
    ],
    exercises: [
      {
        title: "Altura após o quique",
        prompt:
          "Uma bola cai de 3,0 m com e = 0,80. Qual altura máxima ela atinge no primeiro quique?",
        answer: "h₁ = e²·h₀ = 0,64 · 3,0 = 1,92 m.",
      },
    ],
  };
}

export const bouncingBallScene: SceneDefinition = {
  id: "bouncing-ball",
  title: "Bola quicando",
  subtitle: "Choques, restituição e trilha",
  accent: "#7ef4ff",
  category: "Cinemática + colisões",
  summary:
    "Uma bola cai, quica, bate nas paredes e deixa uma trilha. A cena ajuda a visualizar restituição, conservação parcial de energia e composição da velocidade.",
  worldWidth: 14,
  worldHeight: 8,
  keyboardHints: [
    "Arraste a bola",
    "Arraste o vetor de velocidade",
    "Use a timeline para voltar",
  ],
  defaults: {
    mass: 1.2,
    gravity: 9.81,
    restitution: 0.82,
    dropHeight: 4.4,
    horizontalSpeed: 3,
  },
  controls: [
    {
      key: "mass",
      label: "Massa",
      min: 0.2,
      max: 8,
      step: 0.1,
      unit: "kg",
      description: "Mantida aqui para consistência física.",
    },
    {
      key: "gravity",
      label: "Gravidade",
      min: 1,
      max: 20,
      step: 0.1,
      unit: "m/s²",
      description: "Aceleração para baixo.",
    },
    {
      key: "restitution",
      label: "Restituição",
      min: 0.1,
      max: 0.98,
      step: 0.01,
      unit: "",
      description: "Fração da velocidade vertical preservada.",
    },
    {
      key: "dropHeight",
      label: "Altura inicial",
      min: 1,
      max: 5.6,
      step: 0.05,
      unit: "m",
      description: "Use reset/drag para reposicionar a bola.",
    },
    {
      key: "horizontalSpeed",
      label: "Velocidade horizontal",
      min: -8,
      max: 8,
      step: 0.1,
      unit: "m/s",
      description: "Componente inicial lateral.",
    },
  ],
  createState: (config) => {
    const groundY = 6.9;
    const radius = 0.24;
    return {
      body: createParticleBody({
        mass: config.mass,
        radius,
        restitution: config.restitution,
        position: new Vector2(2.2, groundY - config.dropHeight - radius),
        velocity: new Vector2(config.horizontalSpeed, 0),
      }),
      groundY,
      wallLeft: 0.8,
      wallRight: 13.2,
      bounces: 0,
      predictedBounceHeight: config.dropHeight * config.restitution ** 2,
      trail: [],
      frameCounter: 0,
    };
  },
  step: ({ state, config, dt }) => {
    const scene = getState(state);
    const body = scene.body;
    body.mass = config.mass;
    body.inverseMass = 1 / config.mass;
    body.restitution = config.restitution;

    applyForce(body, gravityForce(body, config.gravity));
    integrateSemiImplicitEuler(body, dt);

    if (body.position.y + body.radius >= scene.groundY) {
      const incomingSpeed = body.velocity.y;
      body.position = body.position.withY(scene.groundY - body.radius);
      body.velocity = body.velocity.withY(
        -Math.abs(incomingSpeed) * config.restitution,
      );
      scene.predictedBounceHeight = body.velocity.y ** 2 / (2 * config.gravity);
      if (Math.abs(incomingSpeed) > 0.7) {
        scene.bounces += 1;
      }
      if (Math.abs(body.velocity.y) < 0.18) {
        body.velocity = body.velocity.withY(0);
      }
    }

    if (body.position.x - body.radius <= scene.wallLeft) {
      body.position = body.position.withX(scene.wallLeft + body.radius);
      body.velocity = body.velocity.withX(
        Math.abs(body.velocity.x) * config.restitution,
      );
    }
    if (body.position.x + body.radius >= scene.wallRight) {
      body.position = body.position.withX(scene.wallRight - body.radius);
      body.velocity = body.velocity.withX(
        -Math.abs(body.velocity.x) * config.restitution,
      );
    }

    scene.frameCounter += 1;
    if (scene.frameCounter % 3 === 0) {
      scene.trail.push(new Vector2(body.position.x, body.position.y));
      if (scene.trail.length > 120) {
        scene.trail.shift();
      }
    }
  },
  render: ({ ctx, state, viewport }) => {
    const scene = getState(state);
    drawGrid(ctx, viewport, 1);
    drawGround(ctx, viewport, scene.groundY, "Chão");
    scene.trail.forEach((point, index) => {
      const next = scene.trail[index + 1];
      if (!next) {
        return;
      }
      drawLineWorld(ctx, viewport, point, next, "rgba(255,255,255,0.18)", 2);
    });
    drawCircleBody(
      ctx,
      viewport,
      scene.body.position,
      scene.body.radius,
      "#7ef4ff",
    );
    drawArrow(
      ctx,
      viewport,
      scene.body.position,
      scene.body.velocity.scale(0.15),
      "#ffbf69",
      "v",
    );
    drawWorldLabel(
      ctx,
      viewport,
      new Vector2(0.9, 0.95),
      "Trilha + restituição deixam a perda de energia visível",
    );
  },
  buildPanelData: (state, config) => buildPanel(getState(state), config),
  getDragHandles: (state) => {
    const scene = getState(state);
    const velocityHandle = scene.body.position.add(
      scene.body.velocity.length > 0.05
        ? scene.body.velocity.scale(0.15)
        : new Vector2(0.8, -0.4),
    );
    return [
      {
        id: "ball",
        position: scene.body.position,
        label: "bola",
        radius: 0.2,
        color: "#7ef4ff",
        style: "point",
      },
      {
        id: "velocity",
        position: velocityHandle,
        anchor: scene.body.position,
        label: "v₀",
        radius: 0.16,
        color: "#ffbf69",
        style: "vector",
      },
    ];
  },
  onDrag: ({ handleId, state, worldPoint }) => {
    const scene = getState(state);
    if (handleId === "ball") {
      scene.body.position = new Vector2(
        clamp(worldPoint.x, 1.1, 12.9),
        clamp(worldPoint.y, 0.8, 6.2),
      );
      scene.body.velocity = Vector2.zero();
      scene.trail = [];
      scene.bounces = 0;
    }
    if (handleId === "velocity") {
      scene.body.velocity = worldPoint
        .subtract(scene.body.position)
        .scale(1 / 0.15);
      scene.trail = [];
    }
  },
};
