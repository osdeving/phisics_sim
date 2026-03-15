import { approxZero, clamp, signOrZero } from "../math/scalar";
import { Vector2 } from "../math/Vector2";
import { formatQuantity } from "../core/units";
import {
  drawArrow,
  drawGrid,
  drawGround,
  drawLineWorld,
  drawSpriteAtWorld,
  drawWorldLabel,
} from "../render/canvasPrimitives";
import { SceneDefinition, ScenePanelData, SceneState } from "./types";

interface TractionState extends SceneState {
  position: number;
  velocity: number;
  acceleration: number;
  tractionForce: number;
  rollingForce: number;
  dragForce: number;
  netForce: number;
  groundY: number;
}

function getState(state: SceneState) {
  return state as TractionState;
}

function buildPanel(
  state: TractionState,
  config: Record<string, number>,
): ScenePanelData {
  return {
    metrics: [
      {
        label: "Velocidade do sistema",
        value: formatQuantity(state.velocity, "m/s"),
        helper: "Carro e caixote são tratados como um sistema único.",
      },
      {
        label: "Aceleração",
        value: formatQuantity(state.acceleration, "m/s²"),
        helper: "Resultado direto da força líquida dividida pela massa total.",
      },
      {
        label: "Tração aplicada",
        value: formatQuantity(state.tractionForce, "N"),
        helper: "Força do motor quando o usuário pressiona as setas.",
      },
      {
        label: "Força resultante",
        value: formatQuantity(state.netForce, "N"),
        helper: "Tração menos resistência ao rolamento e arrasto.",
      },
    ],
    formulas: [
      {
        title: "Resistência ao rolamento",
        formula: `$$F_r = \\mu m g = ${config.rollingResistance.toFixed(2)} \\cdot ${config.totalMass.toFixed(2)} \\cdot ${config.gravity.toFixed(2)}$$`,
        explanation:
          "Ela sempre atua no sentido contrário ao movimento ou à tentativa de mover o sistema.",
      },
      {
        title: "Arrasto linear",
        formula: `$$F_d = -cv = -${config.dragCoefficient.toFixed(2)} \\cdot v$$`,
        explanation:
          "Um modelo simples para dissipação proporcional à velocidade.",
      },
      {
        title: "Segunda lei",
        formula: "$$\\sum F = ma$$",
        explanation:
          "Aqui o sistema carro + caixote é intencionalmente reduzido a um único corpo translacional.",
      },
    ],
    concept: [
      {
        title: "Sistema equivalente",
        body: "Para focar em ΣF = m·a, o carro e o caixote são tratados como uma massa total única. Isso simplifica a análise sem esconder a física essencial.",
      },
      {
        title: "Forças concorrentes",
        body: "A tração tenta acelerar o sistema, enquanto resistência ao rolamento e arrasto tentam desacelerar.",
      },
    ],
    studyNotes: [
      {
        title: "Teste a influência da massa",
        body: "Mantenha a tração fixa e aumente a massa total. A aceleração deve cair na mesma proporção prevista por F = m·a.",
      },
      {
        title: "Observe o equilíbrio dinâmico",
        body: "Quando a tração se iguala às forças dissipativas, a aceleração tende a zero e a velocidade se estabiliza.",
      },
    ],
    loopSteps: [
      {
        title: "1. Ler teclado",
        body: "As setas escolhem o sentido da tração aplicada.",
      },
      {
        title: "2. Somar forças",
        body: "Tração, rolamento e arrasto entram na soma escalar horizontal.",
      },
      {
        title: "3. Integrar x(t)",
        body: "Usamos semi-implicit Euler em 1D para posição e velocidade.",
      },
      {
        title: "4. Limitar a pista",
        body: "O sistema é mantido dentro do trecho visível do laboratório.",
      },
    ],
    exercises: [
      {
        title: "Massa e aceleração",
        prompt:
          "Mantendo a mesma tração do motor, o que acontece com a aceleração quando a massa total dobra?",
        answer:
          "Ela cai pela metade, porque a = ΣF / m. Se a força líquida fica igual e a massa dobra, a resposta dinâmica diminui em proporção inversa.",
      },
    ],
  };
}

export const tractionScene: SceneDefinition = {
  id: "traction",
  title: "Carro rebocando caixote",
  subtitle: "Tração, rolamento e arrasto",
  accent: "#ffb36a",
  category: "Dinâmica",
  summary:
    "Uma cena didática onde carro e carga formam um único sistema translacional. As setas aplicam tração real em newtons e a massa total define a resposta.",
  worldWidth: 18,
  worldHeight: 8,
  keyboardHints: [
    "← / → aplicam tração",
    "Sistema equivalente",
    "Foco em ΣF = m·a",
  ],
  defaults: {
    totalMass: 12,
    engineForce: 85,
    gravity: 9.81,
    rollingResistance: 0.08,
    dragCoefficient: 6,
  },
  controls: [
    {
      key: "totalMass",
      label: "Massa total",
      min: 2,
      max: 40,
      step: 0.5,
      unit: "kg",
      description: "Massa equivalente do carro mais o caixote.",
    },
    {
      key: "engineForce",
      label: "Tração do motor",
      min: 10,
      max: 180,
      step: 1,
      unit: "N",
      description: "Força horizontal disponível ao pressionar as setas.",
    },
    {
      key: "gravity",
      label: "Gravidade",
      min: 1,
      max: 20,
      step: 0.1,
      unit: "m/s²",
      description: "Entra na força normal e na resistência ao rolamento.",
    },
    {
      key: "rollingResistance",
      label: "Coef. de rolamento",
      min: 0,
      max: 0.4,
      step: 0.01,
      unit: "",
      description: "Modelo simples para perdas no contato com o solo.",
    },
    {
      key: "dragCoefficient",
      label: "Arrasto linear",
      min: 0,
      max: 18,
      step: 0.2,
      unit: "N·s/m",
      description: "Termo dissipativo proporcional à velocidade.",
    },
  ],
  createState: () => ({
    position: 4.5,
    velocity: 0,
    acceleration: 0,
    tractionForce: 0,
    rollingForce: 0,
    dragForce: 0,
    netForce: 0,
    groundY: 6.5,
  }),
  step: ({ state, config, dt, input }) => {
    const scene = getState(state);
    const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const tractionForce = direction * config.engineForce;
    const normal = config.totalMass * config.gravity;
    const rollingMagnitude = config.rollingResistance * normal;
    const directionForResistance =
      signOrZero(scene.velocity) || signOrZero(tractionForce);
    const rollingForce =
      directionForResistance === 0
        ? 0
        : -directionForResistance * rollingMagnitude;
    const dragForce = -config.dragCoefficient * scene.velocity;

    let netForce = tractionForce + rollingForce + dragForce;

    // Se a tração não vence a resistência estática simplificada, o sistema permanece parado.
    if (
      approxZero(scene.velocity, 0.02) &&
      Math.abs(tractionForce) <= rollingMagnitude
    ) {
      netForce = 0;
      scene.velocity = 0;
    }

    scene.acceleration = netForce / config.totalMass;
    scene.velocity += scene.acceleration * dt;
    scene.position += scene.velocity * dt;
    scene.position = clamp(scene.position, 3.5, 14.8);

    if (scene.position === 3.5 || scene.position === 14.8) {
      scene.velocity = 0;
    }

    scene.tractionForce = tractionForce;
    scene.rollingForce = rollingForce;
    scene.dragForce = dragForce;
    scene.netForce = netForce;
  },
  render: ({ ctx, state, viewport, sprites }) => {
    const scene = getState(state);
    const carCenter = new Vector2(scene.position, scene.groundY - 0.65);
    const crateCenter = new Vector2(scene.position - 2.2, scene.groundY - 0.42);
    drawGrid(ctx, viewport, 1);
    drawGround(ctx, viewport, scene.groundY, "Pista");

    drawLineWorld(
      ctx,
      viewport,
      new Vector2(crateCenter.x + 0.65, crateCenter.y),
      new Vector2(carCenter.x - 1.2, carCenter.y),
      "#e8f1ff",
      4,
    );
    drawSpriteAtWorld(
      ctx,
      viewport,
      sprites.car,
      carCenter,
      2.6,
      1.45,
      0,
      "#69d5ff",
    );
    drawSpriteAtWorld(
      ctx,
      viewport,
      sprites.crate,
      crateCenter,
      1.2,
      1.2,
      0,
      "#e8a55f",
    );

    drawArrow(
      ctx,
      viewport,
      crateCenter,
      new Vector2(scene.netForce * 0.02, 0),
      "#ffbf69",
      "ΣF",
    );
    drawArrow(
      ctx,
      viewport,
      carCenter,
      new Vector2(scene.velocity * 0.12, 0),
      "#9bff9b",
      "v",
    );

    drawWorldLabel(
      ctx,
      viewport,
      new Vector2(0.8, 0.85),
      "Modelo: carro + carga → sistema equivalente",
    );
    drawWorldLabel(
      ctx,
      viewport,
      new Vector2(0.8, 1.3),
      "Tração em N, massa em kg, velocidade em m/s",
    );
  },
  buildPanelData: (state, config) => buildPanel(getState(state), config),
};
