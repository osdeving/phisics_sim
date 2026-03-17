import { formatQuantity } from "../core/units";
import { clamp, toRadians } from "../math/scalar";
import { Vector2 } from "../math/Vector2";
import {
  drawCircleBody,
  drawGrid,
  drawGround,
  drawLineWorld,
  drawScenicBackdrop,
  drawSpriteAtWorld,
  drawWorldLabel,
} from "../render/canvasPrimitives";
import { SceneDefinition, ScenePanelData, SceneState } from "./types";
import {
  ALL_COLLISION_BITS,
  circleCastWithScene,
  DistanceJoint,
  PhysicsWorld,
  Vector3,
  createBox,
  createCircle,
  createRigidBody,
  drawBodyCollider,
} from "../../ventania3d";

const ANCHOR_ID = "wrecking-anchor";
const BALL_ID = "wrecking-ball";
const GROUND_ID = "wrecking-ground";
const CRATE_IDS = ["wrecking-crate-a", "wrecking-crate-b", "wrecking-crate-c", "wrecking-crate-d"];
const BALL_RADIUS = 0.58;
const LAYER_ENVIRONMENT = 1 << 0;
const LAYER_PENDULUM = 1 << 1;
const LAYER_PAYLOAD = 1 << 2;

interface WreckingBallState extends SceneState {
  world: PhysicsWorld;
  groundY: number;
  anchor: Vector3;
  ropeLength: number;
  cratesMoved: number;
  cratesToppled: number;
  predictedHitDistance: number | null;
  predictedHitPoint: Vector3 | null;
  predictedHitBodyId: string | null;
  impactCount: number;
  lastImpactBodyId: string | null;
  lastImpactSpeed: number;
  initialCratePositions: Record<string, Vector3>;
}

function getState(state: SceneState) {
  return state as WreckingBallState;
}

function createEnvironment(groundY: number) {
  return [
    createRigidBody({
      id: GROUND_ID,
      type: "static",
      position: new Vector3(9, groundY + 1.1, 0),
      colliders: [
        {
          id: "ground-body",
          shape: createBox(26, 2.2),
          material: {
            density: 0,
            friction: 0.88,
            restitution: 0.04,
          },
          collisionLayer: LAYER_ENVIRONMENT,
          collisionMask: ALL_COLLISION_BITS,
        },
      ],
    }),
    createRigidBody({
      id: "wrecking-wall-left",
      type: "static",
      position: new Vector3(-1.1, 5.4, 0),
      colliders: [
        {
          shape: createBox(2, 12),
          material: {
            density: 0,
            friction: 0.9,
            restitution: 0.03,
          },
          collisionLayer: LAYER_ENVIRONMENT,
          collisionMask: ALL_COLLISION_BITS,
        },
      ],
    }),
    createRigidBody({
      id: "wrecking-wall-right",
      type: "static",
      position: new Vector3(19.4, 5.4, 0),
      colliders: [
        {
          shape: createBox(2, 12),
          material: {
            density: 0,
            friction: 0.9,
            restitution: 0.03,
          },
          collisionLayer: LAYER_ENVIRONMENT,
          collisionMask: ALL_COLLISION_BITS,
        },
      ],
    }),
  ];
}

function buildPendulumWorld(config: Record<string, number>) {
  const groundY = 8.7;
  const anchor = new Vector3(5, 1.8, 0);
  const ropeLength = clamp(config.ropeLength, 2.2, 5.2);
  const releaseAngle = toRadians(config.releaseAngle);
  const releaseDirection = Vector3.fromAngle(Math.PI / 2 - releaseAngle, ropeLength);
  const ballPosition = anchor.add(releaseDirection);
  const ballMass = config.ballMass;
  const crateMass = config.crateMass;

  const world = new PhysicsWorld({
    gravity: new Vector3(0, config.gravity, 0),
    solverIterations: 12,
    positionIterations: 5,
    broadPhaseCellSize: 2.4,
  });

  createEnvironment(groundY).forEach((body) => world.addBody(body));

  world.addBody(
    createRigidBody({
      id: ANCHOR_ID,
      type: "static",
      position: anchor,
      colliders: [],
    }),
  );

  world.addBody(
    createRigidBody({
      id: BALL_ID,
      position: ballPosition,
      mass: ballMass,
      inertia: 0.5 * ballMass * BALL_RADIUS * BALL_RADIUS,
      linearDamping: 0.02,
      angularDamping: 0.04,
      colliders: [
        {
          id: "wrecking-ball-body",
          shape: createCircle(BALL_RADIUS),
          material: {
            density: 1,
            friction: 0.72,
            restitution: 0.08,
          },
          collisionLayer: LAYER_PENDULUM,
          collisionMask: LAYER_ENVIRONMENT | LAYER_PAYLOAD,
        },
      ],
    }),
  );

  const cratePositions = [
    new Vector3(11.8, groundY - 0.52, 0),
    new Vector3(12.92, groundY - 0.52, 0),
    new Vector3(11.8, groundY - 1.56, 0),
    new Vector3(12.92, groundY - 1.56, 0),
  ];

  CRATE_IDS.forEach((id, index) => {
    world.addBody(
      createRigidBody({
        id,
        position: cratePositions[index],
        mass: crateMass,
        inertia: (crateMass * (1.02 * 1.02 + 1.02 * 1.02)) / 6,
        linearDamping: 0.08,
        angularDamping: 0.1,
        colliders: [
          {
            id: `${id}-body`,
            shape: createBox(1.02, 1.02),
            material: {
              density: 1,
              friction: config.crateFriction,
              restitution: 0.04,
            },
            collisionLayer: LAYER_PAYLOAD,
            collisionMask: LAYER_ENVIRONMENT | LAYER_PENDULUM | LAYER_PAYLOAD,
          },
        ],
      }),
    );
  });

  world.addJoint(
    new DistanceJoint(
      "wrecking-rope",
      ANCHOR_ID,
      BALL_ID,
      Vector3.zero(),
      Vector3.zero(),
      ropeLength,
      0.22,
    ),
  );

  return {
    world,
    groundY,
    anchor,
    ropeLength,
    initialCratePositions: Object.fromEntries(
      CRATE_IDS.map((id) => [id, world.getBody(id)?.position.clone() ?? Vector3.zero()]),
    ) as Record<string, Vector3>,
  };
}

function inspectScene(scene: WreckingBallState) {
  const ball = scene.world.getBody(BALL_ID);
  if (!ball) {
    scene.cratesMoved = 0;
    scene.cratesToppled = 0;
    scene.predictedHitDistance = null;
    scene.predictedHitPoint = null;
    scene.predictedHitBodyId = null;
    return;
  }

  scene.cratesMoved = CRATE_IDS.reduce((count, id) => {
    const body = scene.world.getBody(id);
    const start = scene.initialCratePositions[id];
    if (!body || !start) {
      return count;
    }
    return body.position.subtract(start).length > 0.24 ? count + 1 : count;
  }, 0);

  scene.cratesToppled = CRATE_IDS.reduce((count, id) => {
    const body = scene.world.getBody(id);
    if (!body) {
      return count;
    }
    return Math.abs(body.rotation) > 0.32 ? count + 1 : count;
  }, 0);

  if (ball.velocity.length < 0.16) {
    scene.predictedHitDistance = null;
    scene.predictedHitPoint = null;
    scene.predictedHitBodyId = null;
    return;
  }

  const hit = circleCastWithScene(
    scene.world,
    ball.position,
    BALL_RADIUS,
    ball.velocity,
    8,
    {
      layerMask: LAYER_ENVIRONMENT | LAYER_PAYLOAD,
      ignoreBodyIds: [BALL_ID, ANCHOR_ID],
    },
  );

  scene.predictedHitDistance = hit?.distance ?? null;
  scene.predictedHitPoint = hit?.point ?? null;
  scene.predictedHitBodyId = hit?.bodyId ?? null;
}

function estimateRopeTension(scene: WreckingBallState, gravity: number) {
  const ball = scene.world.getBody(BALL_ID);
  if (!ball) {
    return 0;
  }

  const radial = ball.position.subtract(scene.anchor);
  const radius = Math.max(radial.length, 1e-3);
  const radialDirection = radial.scale(1 / radius);
  const alongGravity = radialDirection.dot(Vector3.down());
  return ball.mass * (gravity * alongGravity + ball.velocity.lengthSquared / radius);
}

function buildPanel(
  scene: WreckingBallState,
  config: Record<string, number>,
): ScenePanelData {
  const ball = scene.world.getBody(BALL_ID);
  const speed = ball?.velocity.length ?? 0;
  const kinetic = ball ? 0.5 * ball.mass * speed * speed : 0;
  const ropeError = ball ? Math.abs(ball.position.distanceTo(scene.anchor) - scene.ropeLength) : 0;
  const tension = estimateRopeTension(scene, config.gravity);

  return {
    metrics: [
      {
        label: "Velocidade da esfera",
        value: formatQuantity(speed, "m/s"),
        helper: "Sai da gravidade convertendo energia potencial em cinetica durante a oscilacao.",
      },
      {
        label: "Tensao estimada na corda",
        value: formatQuantity(tension, "N"),
        helper: "Componente radial do peso somada ao termo centripeto m·v²/L.",
      },
      {
        label: "Proximo impacto",
        value:
          scene.predictedHitDistance === null
            ? "sem alvo"
            : formatQuantity(scene.predictedHitDistance, "m"),
        helper: scene.predictedHitBodyId
          ? `Circle cast ate ${scene.predictedHitBodyId.replace("wrecking-", "")}.`
          : "Consulta de varredura usando o volume real da esfera.",
      },
      {
        label: "Caixas movidas",
        value: `${scene.cratesMoved}`,
        helper: "Conta quantas caixas ja sairam claramente da posicao de repouso.",
      },
      {
        label: "Caixas tombadas",
        value: `${scene.cratesToppled}`,
        helper: "Rotacao acima de um limiar simples para indicar tombamento.",
      },
      {
        label: "Erro da junta",
        value: formatQuantity(ropeError, "m"),
        helper: "Serve para enxergar o quanto a corda numerica ainda se afasta do comprimento alvo.",
      },
      {
        label: "Energia cinetica",
        value: formatQuantity(kinetic, "J"),
        helper: "Mostra a parte de energia que aparece no ponto baixo do movimento.",
      },
      {
        label: "Impactos novos",
        value: `${scene.impactCount}`,
        helper: scene.lastImpactBodyId
          ? `Ultimo begin contact com ${scene.lastImpactBodyId.replace("wrecking-", "")} a ${scene.lastImpactSpeed.toFixed(2)} m/s.`
          : "Contagem acumulada de inicios de contato da esfera.",
      },
    ],
    formulas: [
      {
        title: "Restricao da corda",
        formula: "$$|\\vec{x}_{bola} - \\vec{x}_{ancora}| = L$$",
        explanation:
          "A junta de distancia força a esfera a permanecer aproximadamente a um comprimento fixo da ancora.",
      },
      {
        title: "Energia do pendulo",
        formula: "$$mgh \\rightarrow \\frac{1}{2}mv^2$$",
        explanation:
          "Ao descer, a esfera converte altura em velocidade; ao subir, faz o caminho inverso.",
      },
      {
        title: "Momento linear e impulso",
        formula: "$$\\vec{J} = \\Delta \\vec{p}$$",
        explanation:
          "Quando a esfera atinge as caixas, o solver troca impulso entre os rigid bodies e o empurrao emerge do contato.",
      },
      {
        title: "Varredura de forma",
        formula: "$$\\text{cast}(C_r,\\vec{d})$$",
        explanation:
          "A previsao de impacto usa o volume da esfera em movimento, nao apenas a linha do centro.",
      },
      {
        title: "Tensao radial",
        formula: "$$T \\approx m\\left(g\\cos\\theta + \\frac{v^2}{L}\\right)$$",
        explanation:
          "E uma estimativa continua util para ler a combinacao entre peso radial e exigencia centripeta.",
      },
    ],
    concept: [
      {
        title: "Cena 100% apoiada no ventania3d",
        body: "Aqui nao existe animacao fake de pendulo nem script especial para derrubar caixa. A esfera, a junta, o solo e as caixas entram no mesmo mundo de rigid bodies e deixam a dinamica emergir dos contatos.",
      },
      {
        title: "Por que isso importa",
        body: "Essa cena prova que a engine nao serve so para a empilhadeira. O mesmo solver pode sustentar pendulos, demoliçao, stacks, brinquedos mecanicos e outras simulacoes com colisao.",
      },
    ],
    studyNotes: [
      {
        title: "Observe o ponto baixo",
        body: "A maior velocidade aparece perto do ponto mais baixo da trajetoria, porque a energia potencial foi quase toda convertida em cinetica.",
      },
      {
        title: "Mexa nas massas",
        body: "Aumente a massa da esfera e compare o efeito sobre o stack. Depois aumente a massa das caixas e veja quanto da transferencia de impulso ainda sobra.",
      },
    ],
    loopSteps: [
      {
        title: "1. Integrar a gravidade",
        body: "O mundo atualiza velocidade linear e angular dos corpos dinâmicos.",
      },
      {
        title: "2. Aplicar a junta",
        body: "A DistanceJoint tenta corrigir o comprimento da corda usando impulso entre ancora e esfera.",
      },
      {
        title: "3. Detectar contatos",
        body: "A broad-phase gera pares candidatos e a narrow-phase calcula manifolds reais entre esfera, caixas e ambiente.",
      },
      {
        title: "4. Resolver impulsos",
        body: "Normal e atrito redistribuem movimento entre os corpos, produzindo quique, empurrao e tombamento.",
      },
      {
        title: "5. Fazer leitura de cena",
        body: "Um circle cast procura o primeiro contato futuro da esfera e os eventos do mundo registram begin/stay/end contacts.",
      },
    ],
    exercises: [
      {
        title: "Mais altura, mais impacto",
        prompt:
          "Se a esfera for solta de um angulo maior, o que acontece com a velocidade no ponto mais baixo e com o impacto sobre as caixas?",
        answer:
          "A diferenca de altura cresce, entao a energia potencial inicial aumenta. Isso eleva a velocidade no ponto baixo e tende a transferir mais impulso para as caixas.",
      },
    ],
    intuition: [
      {
        title: "A junta nao empurra na tangente",
        body: "A corda corrige a distancia radial. O ganho de velocidade tangencial vem principalmente da gravidade convertendo altura em movimento.",
      },
    ],
    engineering: [
      {
        title: "Blueprint para novas cenas",
        body: "Com esse mesmo pacote ja da para montar guindaste simples, pêndulo de Newton, demoliçao, empilhamento, carrocerias, portas articuladas e cenas de impacto com leitura de colisao.",
      },
    ],
    pitfalls: [
      {
        title: "Confundir joint com teleporte",
        body: "A junta aqui nao redefine a posicao da esfera de forma perfeita a cada frame. Ela aplica correcoes numericas, por isso existe um erro pequeno de comprimento e ele aparece no painel.",
      },
    ],
  };
}

export const wreckingBallScene: SceneDefinition = {
  id: "wrecking-ball",
  title: "Pendulo de impacto",
  subtitle: "Junta, colisao e impulso",
  accent: "#ffd27a",
  category: "Engine",
  summary:
    "Um pendulo pesado atinge um stack de caixas usando o ventania3d de ponta a ponta: junta de distancia, colisao, atrito, broad-phase, circle cast e eventos de contato.",
  worldWidth: 18,
  worldHeight: 10,
  keyboardHints: [
    "Use os sliders e Reset",
    "Observe o circle cast de impacto",
    "A cena roda inteiramente no ventania3d",
  ],
  defaults: {
    ballMass: 16,
    ropeLength: 3.9,
    releaseAngle: 44,
    crateMass: 4.5,
    crateFriction: 0.62,
    gravity: 9.81,
  },
  controls: [
    {
      key: "ballMass",
      label: "Massa da esfera",
      min: 6,
      max: 40,
      step: 0.5,
      unit: "kg",
      description: "Define o quanto de momento linear a esfera consegue transferir no impacto.",
    },
    {
      key: "ropeLength",
      label: "Comprimento da corda",
      min: 2.2,
      max: 5.2,
      step: 0.05,
      unit: "m",
      description: "A junta de distancia tenta manter a esfera a esse comprimento da ancora.",
    },
    {
      key: "releaseAngle",
      label: "Angulo de soltura",
      min: 5,
      max: 75,
      step: 1,
      unit: "°",
      description: "Quanto maior o angulo inicial, maior a altura potencial do pendulo.",
    },
    {
      key: "crateMass",
      label: "Massa das caixas",
      min: 1,
      max: 14,
      step: 0.25,
      unit: "kg",
      description: "Controla a resistencia do stack a ser deslocado pelo impacto.",
    },
    {
      key: "crateFriction",
      label: "Atrito das caixas",
      min: 0.2,
      max: 1,
      step: 0.02,
      unit: "",
      description: "Altera o quanto elas escorregam ou travam ao receber o impacto.",
    },
    {
      key: "gravity",
      label: "Gravidade",
      min: 1,
      max: 20,
      step: 0.1,
      unit: "m/s²",
      description: "Afeta a aceleracao do pendulo e o peso aparente das caixas.",
    },
  ],
  createState: (config) => {
    const built = buildPendulumWorld(config);
    const scene: WreckingBallState = {
      ...built,
      cratesMoved: 0,
      cratesToppled: 0,
      predictedHitDistance: null,
      predictedHitPoint: null,
      predictedHitBodyId: null,
      impactCount: 0,
      lastImpactBodyId: null,
      lastImpactSpeed: 0,
    };
    inspectScene(scene);
    return scene;
  },
  step: ({ state, config, dt }) => {
    const scene = getState(state);
    scene.world.gravity = new Vector3(0, config.gravity, 0);
    scene.world.step(dt, 2);

    const ballImpacts = scene.world.contactEvents.begin.filter(
      (contact) => contact.bodyAId === BALL_ID || contact.bodyBId === BALL_ID,
    );
    if (ballImpacts.length > 0) {
      const ball = scene.world.getBody(BALL_ID);
      const latest = ballImpacts[ballImpacts.length - 1];
      scene.impactCount += ballImpacts.length;
      scene.lastImpactBodyId =
        latest.bodyAId === BALL_ID ? latest.bodyBId : latest.bodyAId;
      scene.lastImpactSpeed = ball?.velocity.length ?? 0;
    }

    inspectScene(scene);
  },
  render: ({ ctx, state, viewport, sprites }) => {
    const scene = getState(state);
    const ball = scene.world.getBody(BALL_ID);

    drawScenicBackdrop(ctx, viewport, {
      groundY: scene.groundY,
      hillHeight: 1,
      treeSpacing: 4.1,
    });
    drawGrid(ctx, viewport, 1);
    drawGround(ctx, viewport, scene.groundY, "Piso de impacto");

    drawLineWorld(
      ctx,
      viewport,
      new Vector2(scene.anchor.x, 0.7),
      new Vector2(scene.anchor.x, scene.anchor.y),
      "rgba(226, 236, 247, 0.95)",
      4,
    );

    if (ball) {
      drawLineWorld(
        ctx,
        viewport,
        new Vector2(scene.anchor.x, scene.anchor.y),
        new Vector2(ball.position.x, ball.position.y),
        "rgba(255, 230, 188, 0.95)",
        3,
      );
    }

    scene.world.bodies
      .filter((body) => body.id !== GROUND_ID && !body.id.startsWith("wrecking-wall"))
      .forEach((body) => {
        body.getSnapshots().forEach((snapshot) => {
          const fill =
            body.id === BALL_ID
              ? "rgba(255, 210, 122, 0.16)"
              : "rgba(168, 118, 58, 0.12)";
          drawBodyCollider(ctx, viewport, snapshot, fill, "rgba(255,255,255,0.18)");
        });
      });

    drawCircleBody(
      ctx,
      viewport,
      new Vector2(scene.anchor.x, scene.anchor.y),
      0.12,
      "#f4f7ff",
    );
    drawWorldLabel(
      ctx,
      viewport,
      new Vector2(scene.anchor.x - 0.3, scene.anchor.y - 0.45),
      "ancora",
    );

    CRATE_IDS.forEach((id) => {
      const crate = scene.world.getBody(id);
      if (!crate) {
        return;
      }

      drawSpriteAtWorld(
        ctx,
        viewport,
        sprites.crate,
        new Vector2(crate.position.x, crate.position.y),
        1.1,
        1.1,
        crate.rotation,
        "#a66d3c",
      );
    });

    if (ball) {
      drawCircleBody(
        ctx,
        viewport,
        new Vector2(ball.position.x, ball.position.y),
        BALL_RADIUS,
        "#ffd27a",
      );

      if (scene.predictedHitPoint && scene.predictedHitDistance !== null) {
        drawLineWorld(
          ctx,
          viewport,
          new Vector2(ball.position.x, ball.position.y),
          new Vector2(scene.predictedHitPoint.x, scene.predictedHitPoint.y),
          "rgba(255, 122, 122, 0.8)",
          2,
        );
        drawCircleBody(
          ctx,
          viewport,
          new Vector2(scene.predictedHitPoint.x, scene.predictedHitPoint.y),
          0.08,
          "#ff8f8f",
        );
        drawWorldLabel(
          ctx,
          viewport,
          new Vector2(scene.predictedHitPoint.x + 0.12, scene.predictedHitPoint.y - 0.18),
          "impacto previsto",
        );
      }
    }
  },
  buildPanelData: (state, config) => buildPanel(getState(state), config),
};
