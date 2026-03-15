import {
  applyForce,
  createParticleBody,
  integrateSemiImplicitEuler,
  ParticleBody,
} from "../core/body";
import { gravityForce, linearDragForce } from "../core/forces";
import { formatQuantity } from "../core/units";
import { Vector2 } from "../math/Vector2";
import {
  drawArrow,
  drawCircleBody,
  drawGrid,
  drawGround,
  drawWorldLabel,
} from "../render/canvasPrimitives";
import { SceneDefinition, ScenePanelData, SceneState } from "./types";
import { solveJumpVelocity } from "../core/solvers";
import { clamp } from "../math/scalar";

interface FreeFallState extends SceneState {
  body: ParticleBody;
  groundY: number;
  grounded: boolean;
  jumpLatched: boolean;
  lastNetForce: Vector2;
  time: number;
}

function getState(state: SceneState) {
  return state as FreeFallState;
}

function buildPanel(
  state: FreeFallState,
  config: Record<string, number>,
): ScenePanelData {
  const body = state.body;
  const height = Math.max(0, state.groundY - body.position.y - body.radius);
  const jumpVelocity = solveJumpVelocity(config.jumpHeight, config.gravity);

  return {
    metrics: [
      {
        label: "Altura sobre o chão",
        value: formatQuantity(height, "m"),
        helper: "Distância vertical real entre a esfera e o chão.",
      },
      {
        label: "Velocidade vertical",
        value: formatQuantity(body.velocity.y, "m/s"),
        helper: "Sinal positivo aponta para baixo na convenção da tela.",
      },
      {
        label: "Força resultante",
        value: formatQuantity(state.lastNetForce.length, "N"),
        helper: "Soma vetorial entre gravidade, força horizontal e arrasto.",
      },
      {
        label: "Aceleração vertical",
        value: formatQuantity(body.acceleration.y, "m/s²"),
        helper: "Obtida diretamente de ΣF / m.",
      },
    ],
    formulas: [
      {
        title: "Peso",
        formula: `$$F_g = mg = ${config.mass.toFixed(2)} \\cdot ${config.gravity.toFixed(2)} = ${(config.mass * config.gravity).toFixed(2)}\\,\\mathrm{N}$$`,
        explanation:
          "Mesmo quando a massa muda, a queda livre continua com aceleração g porque o m cancela em a = F/m.",
      },
      {
        title: "Salto",
        formula: `$$v_0 = \\sqrt{2gh} = ${jumpVelocity.toFixed(2)}\\,\\mathrm{m/s}$$`,
        explanation:
          "A velocidade inicial do salto é calculada para atingir a altura configurada.",
      },
      {
        title: "Integração numérica",
        formula: "$$v_{n+1} = v_n + a\\,dt,\\; x_{n+1} = x_n + v_{n+1}\\,dt$$",
        explanation:
          "Esse é o semi-implicit Euler usado pelo simulador em todo frame fixo.",
      },
    ],
    concept: [
      {
        title: "O que está acontecendo",
        body: "Esta cena usa um corpo pontual com raio para simular queda, movimento horizontal e salto. A física roda em metros e segundos; os pixels são apenas projeção visual.",
      },
      {
        title: "Por que a massa importa só na horizontal",
        body: "Quando você pressiona as setas, entra uma força horizontal real. Pela segunda lei de Newton, massas maiores respondem com acelerações menores à mesma força.",
      },
    ],
    studyNotes: [
      {
        title: "Experimento sugerido",
        body: "Aumente a massa mantendo a mesma força horizontal e compare a aceleração. Depois altere apenas a gravidade e observe o salto.",
      },
      {
        title: "Leia o código",
        body: "Procure por gravityForce, solveJumpVelocity e integrateSemiImplicitEuler para relacionar cada etapa com a fórmula física.",
      },
    ],
    loopSteps: [
      {
        title: "1. Acumular forças",
        body: "Somamos peso, força do teclado e arrasto linear no vetor acumulado do corpo.",
      },
      {
        title: "2. Calcular aceleração",
        body: "O integrador converte a força resultante em aceleração usando a = F / m.",
      },
      {
        title: "3. Integrar no tempo",
        body: "Velocidade e posição são atualizadas com dt fixo de 1/60 s.",
      },
      {
        title: "4. Resolver colisão",
        body: "Ao tocar no chão, a posição é corrigida e a componente vertical da velocidade usa a restituição escolhida.",
      },
    ],
    exercises: [
      {
        title: "Primeiro quique",
        prompt:
          "Se a bola cair de uma altura h₀ e a restituição for e, qual é a altura do primeiro quique?",
        answer: `h₁ = e²·h₀. Com e = ${config.restitution.toFixed(2)}, a bola recupera cerca de ${(config.restitution ** 2 * 100).toFixed(1)}% da altura anterior.`,
        steps: [
          "A velocidade imediatamente antes do choque vem da energia ou da cinemática.",
          "A restituição multiplica o módulo da velocidade vertical por e.",
          "Como altura é proporcional a v², a nova altura fica multiplicada por e².",
        ],
      },
    ],
  };
}

export const freeFallScene: SceneDefinition = {
  id: "free-fall",
  title: "Queda livre e salto",
  subtitle: "Gravidade real + força horizontal",
  accent: "#66d7ff",
  category: "Cinemática + forças",
  summary:
    "Uma esfera com massa real sofre gravidade, pode receber força horizontal e pula com a velocidade necessária para atingir uma altura alvo.",
  worldWidth: 14,
  worldHeight: 8,
  keyboardHints: [
    "← / → aplicam força",
    "Espaço aplica o salto",
    "dt fixo = 1/60 s",
  ],
  defaults: {
    mass: 2,
    gravity: 9.81,
    moveForce: 15,
    jumpHeight: 1.4,
    restitution: 0.18,
    airDrag: 0.35,
  },
  controls: [
    {
      key: "mass",
      label: "Massa da bola",
      min: 0.5,
      max: 8,
      step: 0.1,
      unit: "kg",
      description: "Massa usada diretamente em F = m·a.",
    },
    {
      key: "gravity",
      label: "Gravidade",
      min: 1,
      max: 20,
      step: 0.1,
      unit: "m/s²",
      description: "Aceleração gravitacional do mundo.",
    },
    {
      key: "moveForce",
      label: "Força horizontal",
      min: 2,
      max: 40,
      step: 0.5,
      unit: "N",
      description: "Força aplicada quando as setas estão pressionadas.",
    },
    {
      key: "jumpHeight",
      label: "Altura do salto",
      min: 0.3,
      max: 3,
      step: 0.05,
      unit: "m",
      description: "Altura-alvo para calcular a velocidade inicial.",
    },
    {
      key: "restitution",
      label: "Restituição",
      min: 0,
      max: 0.95,
      step: 0.01,
      unit: "",
      description: "Quanto da velocidade é preservada no choque com o chão.",
    },
    {
      key: "airDrag",
      label: "Arrasto linear",
      min: 0,
      max: 2,
      step: 0.05,
      unit: "N·s/m",
      description: "Força que se opõe à velocidade atual.",
    },
  ],
  createState: (config) => ({
    body: createParticleBody({
      mass: config.mass,
      radius: 0.28,
      restitution: config.restitution,
      position: new Vector2(3, 1.6),
      velocity: new Vector2(0, 0),
    }),
    groundY: 6.8,
    grounded: false,
    jumpLatched: false,
    lastNetForce: Vector2.zero(),
    time: 0,
  }),
  step: ({ state, config, dt, input }) => {
    const scene = getState(state);
    const body = scene.body;
    body.mass = config.mass;
    body.inverseMass = 1 / config.mass;
    body.restitution = config.restitution;

    if (input.jump && scene.grounded && !scene.jumpLatched) {
      body.velocity = body.velocity.withY(
        -solveJumpVelocity(config.jumpHeight, config.gravity),
      );
      scene.grounded = false;
    }
    scene.jumpLatched = input.jump;

    const horizontalDirection = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const userForce = new Vector2(horizontalDirection * config.moveForce, 0);
    const gravity = gravityForce(body, config.gravity);
    const drag = linearDragForce(body.velocity, config.airDrag);

    applyForce(body, gravity);
    applyForce(body, userForce);
    applyForce(body, drag);

    scene.lastNetForce = body.accumulatedForce;
    integrateSemiImplicitEuler(body, dt);

    if (body.position.y + body.radius >= scene.groundY) {
      body.position = body.position.withY(scene.groundY - body.radius);
      body.velocity = body.velocity.withY(
        body.velocity.y < 0.2 ? 0 : -body.velocity.y * body.restitution,
      );
      scene.grounded = Math.abs(body.velocity.y) < 0.15;
    } else {
      scene.grounded = false;
    }

    if (body.position.x - body.radius <= 0.8) {
      body.position = body.position.withX(0.8 + body.radius);
      body.velocity = body.velocity.withX(Math.abs(body.velocity.x) * 0.4);
    }
    if (body.position.x + body.radius >= 13.2) {
      body.position = body.position.withX(13.2 - body.radius);
      body.velocity = body.velocity.withX(-Math.abs(body.velocity.x) * 0.4);
    }

    scene.time += dt;
  },
  render: ({ ctx, state, viewport }) => {
    const scene = getState(state);
    const body = scene.body;
    drawGrid(ctx, viewport, 1);
    drawGround(ctx, viewport, scene.groundY, "Chão");
    drawCircleBody(ctx, viewport, body.position, body.radius, "#6cdcff");

    drawArrow(
      ctx,
      viewport,
      body.position,
      scene.lastNetForce.scale(0.025),
      "#ffbf69",
      "ΣF",
    );
    drawArrow(
      ctx,
      viewport,
      body.position,
      body.velocity.scale(0.12),
      "#9bff9b",
      "v",
    );

    drawWorldLabel(
      ctx,
      viewport,
      new Vector2(0.9, 0.8),
      "Unidades internas: m, s, kg, N",
    );
    drawWorldLabel(
      ctx,
      viewport,
      new Vector2(0.9, 1.25),
      "A tela só converte metros → pixels",
    );
  },
  buildPanelData: (state, config) => buildPanel(getState(state), config),
  getDragHandles: (state) => {
    const scene = getState(state);
    const velocityHandle =
      scene.body.velocity.length > 0.05
        ? scene.body.position.add(scene.body.velocity.scale(0.12))
        : scene.body.position.add(new Vector2(0.8, -0.6));

    return [
      {
        id: "body",
        position: scene.body.position,
        label: "posição",
        radius: 0.22,
        color: "#7ce5ff",
        style: "point",
      },
      {
        id: "velocity",
        position: velocityHandle,
        anchor: scene.body.position,
        label: "vetor v",
        radius: 0.18,
        color: "#ffbf69",
        style: "vector",
      },
    ];
  },
  onDrag: ({ handleId, worldPoint, state }) => {
    const scene = getState(state);

    if (handleId === "body") {
      scene.body.position = new Vector2(
        clamp(worldPoint.x, 1, 13),
        clamp(worldPoint.y, 0.8, 5.6),
      );
      scene.body.velocity = Vector2.zero();
      scene.body.acceleration = Vector2.zero();
      scene.grounded = false;
    }

    if (handleId === "velocity") {
      scene.body.velocity = worldPoint
        .subtract(scene.body.position)
        .scale(1 / 0.12);
      scene.grounded = false;
    }
  },
};
