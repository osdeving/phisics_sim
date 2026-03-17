import { formatQuantity } from "../core/units";
import { metersToPixels, worldToScreen } from "../render/viewport";
import {
  drawArrow,
  drawCircleBody,
  drawGrid,
  drawGround,
  drawLineWorld,
  drawScenicBackdrop,
  drawWorldLabel,
} from "../render/canvasPrimitives";
import { SceneDefinition, ScenePanelData, SceneRenderArgs, SceneState } from "./types";
import { Vector2 } from "../math/Vector2";
import { toRadians } from "../math/scalar";
import {
  ALL_COLLISION_BITS,
  PhysicsWorld,
  Vector3,
  circleCastWithScene,
  createBox,
  createCircle,
  createPolygon,
  createRigidBody,
  createSweepProbeShape,
  drawBodyCollider,
  shapeCastWithScene,
  type Shape,
  type WorldShape,
} from "../../ventania3d";

const BULLET_ID = "engine-lab-bullet";
const THIN_WALL_ID = "engine-lab-thin-wall";
const BACKSTOP_ID = "engine-lab-backstop";
const FLOOR_ID = "engine-lab-floor";
const SHOT_CYCLE_DURATION = 1.15;
const BULLET_RADIUS = 0.22;
const SHAPE_CAST_ORIGIN = new Vector3(1.8, 6.35, 0);
const CIRCLE_CAST_ORIGIN = new Vector3(1.8, 8.0, 0);
const LAYER_ENVIRONMENT = 1 << 0;
const LAYER_PROJECTILE = 1 << 1;

interface EngineLabState extends SceneState {
  world: PhysicsWorld;
  groundY: number;
  wallX: number;
  bulletStart: Vector3;
  bulletTrail: Vector3[];
  shotTimer: number;
  shotIndex: number;
  bulletBeginCount: number;
  bulletPersistCount: number;
  bulletEndCount: number;
  bulletEscapeCount: number;
  escapeRecordedThisShot: boolean;
  lastImpactBodyId: string | null;
  lastImpactPoint: Vector3 | null;
  lastImpactSpeed: number;
  shapeCastDistance: number | null;
  shapeCastPoint: Vector3 | null;
  shapeCastNormal: Vector3 | null;
  shapeCastBodyId: string | null;
  shapeCastPosition: Vector3 | null;
  circleCastDistance: number | null;
  circleCastPoint: Vector3 | null;
  circleCastNormal: Vector3 | null;
  circleCastBodyId: string | null;
  circleCastCenter: Vector3 | null;
}

function getState(state: SceneState) {
  return state as EngineLabState;
}

function toVector2(vector: Vector3) {
  return new Vector2(vector.x, vector.y);
}

function directionFromDegrees(angleDegrees: number) {
  const radians = toRadians(angleDegrees);
  return new Vector3(Math.cos(radians), -Math.sin(radians), 0).normalized();
}

function buildProbeShape(shapeMode: number): Shape {
  if (shapeMode >= 0.5) {
    return createBox(1.1, 0.72);
  }

  return createPolygon([
    new Vector3(-0.72, -0.46, 0),
    new Vector3(0.82, 0, 0),
    new Vector3(-0.72, 0.46, 0),
  ]);
}

function drawWorldShape(
  ctx: CanvasRenderingContext2D,
  viewport: SceneRenderArgs["viewport"],
  shape: WorldShape,
  fillStyle: string,
  strokeStyle: string,
) {
  ctx.save();
  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = 2;

  if (shape.kind === "circle") {
    const center = worldToScreen(viewport, toVector2(shape.center));
    const radius = metersToPixels(viewport, shape.radius);
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  shape.points.forEach((point, index) => {
    const screen = worldToScreen(viewport, toVector2(point));
    if (index === 0) {
      ctx.moveTo(screen.x, screen.y);
    } else {
      ctx.lineTo(screen.x, screen.y);
    }
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function createStaticBoxBody(
  id: string,
  position: Vector3,
  width: number,
  height: number,
  rotation = 0,
) {
  return createRigidBody({
    id,
    type: "static",
    position,
    rotation,
    colliders: [
      {
        id: `${id}-shape`,
        shape: createBox(width, height),
        material: {
          density: 0,
          friction: 0.9,
          restitution: 0.02,
        },
        collisionLayer: LAYER_ENVIRONMENT,
        collisionMask: ALL_COLLISION_BITS,
      },
    ],
  });
}

function buildWorld(config: Record<string, number>) {
  const groundY = 9.35;
  const wallX = 8.5;
  const bulletStart = new Vector3(1.35, 2.35, 0);

  const world = new PhysicsWorld({
    gravity: Vector3.zero(),
    solverIterations: 12,
    positionIterations: 5,
    broadPhaseCellSize: 2.2,
    maxSubsteps: 1,
    maxToiIterations: 8,
  });

  world.addBody(
    createStaticBoxBody(FLOOR_ID, new Vector3(8.2, groundY + 0.65, 0), 18, 1.3),
  );
  world.addBody(
    createStaticBoxBody(THIN_WALL_ID, new Vector3(wallX, 2.35, 0), config.wallThickness, 2.4),
  );
  world.addBody(
    createStaticBoxBody(BACKSTOP_ID, new Vector3(14.4, 2.35, 0), 0.42, 3.1),
  );
  world.addBody(
    createStaticBoxBody("engine-lab-cast-box", new Vector3(7.9, 6.8, 0), 1.55, 1.0, toRadians(-18)),
  );
  world.addBody(
    createRigidBody({
      id: "engine-lab-cast-circle",
      type: "static",
      position: new Vector3(10.7, 6.05, 0),
      colliders: [
        {
          id: "engine-lab-cast-circle-shape",
          shape: createCircle(0.74),
          material: {
            density: 0,
            friction: 0.8,
            restitution: 0.02,
          },
          collisionLayer: LAYER_ENVIRONMENT,
          collisionMask: ALL_COLLISION_BITS,
        },
      ],
    }),
  );
  world.addBody(
    createStaticBoxBody("engine-lab-cast-slab", new Vector3(13.1, 7.35, 0), 0.6, 3.05),
  );
  world.addBody(
    createStaticBoxBody("engine-lab-cast-low-box", new Vector3(9.25, 8.25, 0), 1.2, 0.9, toRadians(8)),
  );
  world.addBody(
    createRigidBody({
      id: BULLET_ID,
      position: bulletStart,
      velocity: new Vector3(config.bulletSpeed, 0, 0),
      mass: 1,
      inertia: 0.5 * BULLET_RADIUS * BULLET_RADIUS,
      linearDamping: 0.01,
      angularDamping: 0.03,
      colliders: [
        {
          id: "engine-lab-bullet-shape",
          shape: createCircle(BULLET_RADIUS),
          material: {
            density: 1,
            friction: 0.08,
            restitution: 0,
          },
          collisionLayer: LAYER_PROJECTILE,
          collisionMask: LAYER_ENVIRONMENT,
        },
      ],
    }),
  );

  return {
    world,
    groundY,
    wallX,
    bulletStart,
  };
}

function relaunchBullet(scene: EngineLabState, config: Record<string, number>, incrementShot = true) {
  const bullet = scene.world.getBody(BULLET_ID);
  if (!bullet) {
    return;
  }

  bullet.setPose(scene.bulletStart, 0);
  bullet.velocity = new Vector3(config.bulletSpeed, 0, 0);
  bullet.angularVelocity = 0;
  bullet.wake();
  scene.shotTimer = 0;
  scene.escapeRecordedThisShot = false;
  scene.bulletTrail = [scene.bulletStart.clone()];

  if (incrementShot) {
    scene.shotIndex += 1;
  }
}

function inspectScene(scene: EngineLabState, config: Record<string, number>) {
  const castDirection = directionFromDegrees(config.probeAngle);
  const probeShape = buildProbeShape(config.probeShape);
  const shapeHit = shapeCastWithScene(
    scene.world,
    probeShape,
    SHAPE_CAST_ORIGIN,
    toRadians(config.probeRotation),
    castDirection,
    config.probeDistance,
    {
      layerMask: LAYER_ENVIRONMENT,
      ignoreBodyIds: [BULLET_ID],
    },
  );
  const circleHit = circleCastWithScene(
    scene.world,
    CIRCLE_CAST_ORIGIN,
    config.sensorRadius,
    castDirection,
    config.probeDistance,
    {
      layerMask: LAYER_ENVIRONMENT,
      ignoreBodyIds: [BULLET_ID],
    },
  );

  scene.shapeCastDistance = shapeHit?.distance ?? null;
  scene.shapeCastPoint = shapeHit?.point ?? null;
  scene.shapeCastNormal = shapeHit?.normal ?? null;
  scene.shapeCastBodyId = shapeHit?.bodyId ?? null;
  scene.shapeCastPosition = shapeHit?.position ?? null;

  scene.circleCastDistance = circleHit?.distance ?? null;
  scene.circleCastPoint = circleHit?.point ?? null;
  scene.circleCastNormal = circleHit?.normal ?? null;
  scene.circleCastBodyId = circleHit?.bodyId ?? null;
  scene.circleCastCenter = circleHit?.center ?? null;
}

function buildPanel(scene: EngineLabState, config: Record<string, number>): ScenePanelData {
  const bullet = scene.world.getBody(BULLET_ID);
  const bulletSpeed = bullet?.velocity.length ?? 0;
  const wallClearance = bullet
    ? scene.wallX - config.wallThickness * 0.5 - BULLET_RADIUS - bullet.position.x
    : 0;

  return {
    metrics: [
      {
        label: "Velocidade do projetil",
        value: formatQuantity(bulletSpeed, "m/s"),
        helper: "Sai de uma velocidade inicial alta para forcar o teste de CCD em uma parede fina.",
      },
      {
        label: "Ciclos de disparo",
        value: `${scene.shotIndex}`,
        helper: "A cena relanca o projetil automaticamente para repetir o experimento sem depender so do Reset.",
      },
      {
        label: "Eventos do projetil",
        value: `${scene.bulletBeginCount}/${scene.bulletPersistCount}/${scene.bulletEndCount}`,
        helper: "Contagem acumulada de begin/persist/end para o rigid body rapido.",
      },
      {
        label: "Falhas de tunneling",
        value: `${scene.bulletEscapeCount}`,
        helper: "Conta quantas vezes o centro do projetil cruzou a parede fina quando isso nao deveria acontecer.",
      },
      {
        label: "Folga ate a parede",
        value: formatQuantity(Math.max(wallClearance, 0), "m"),
        helper: "Serve para enxergar se o TOI esta segurando o corpo antes do atravessamento.",
      },
      {
        label: "Shape cast",
        value:
          scene.shapeCastDistance === null
            ? "sem hit"
            : formatQuantity(scene.shapeCastDistance, "m"),
        helper: scene.shapeCastBodyId
          ? `Primeiro alvo: ${scene.shapeCastBodyId.replace("engine-lab-", "")}.`
          : "Varredura de poligono convexo contra o cenario.",
      },
      {
        label: "Circle cast",
        value:
          scene.circleCastDistance === null
            ? "sem hit"
            : formatQuantity(scene.circleCastDistance, "m"),
        helper: scene.circleCastBodyId
          ? `Primeiro alvo: ${scene.circleCastBodyId.replace("engine-lab-", "")}.`
          : "Referencia para comparar um volume circular com o cast poligonal.",
      },
      {
        label: "Ultimo impacto",
        value: scene.lastImpactBodyId
          ? scene.lastImpactBodyId.replace("engine-lab-", "")
          : "ainda nao houve",
        helper: scene.lastImpactBodyId
          ? `${scene.lastImpactSpeed.toFixed(2)} m/s no momento do begin contact.`
          : "Quando o projetil toca a parede, a cena registra corpo e velocidade.",
      },
    ],
    formulas: [
      {
        title: "Time of impact",
        formula: "$$x(t)=x_0+vt,\\; t_{impacto}=\\arg\\min\\,t$$",
        explanation:
          "O CCD translacional procura o primeiro instante de choque no intervalo do frame para integrar ate ali antes de resolver contato.",
      },
      {
        title: "Swept SAT",
        formula: "$$[a_{min}(t),a_{max}(t)] \\cap [b_{min},b_{max}]$$",
        explanation:
          "No shape cast convexo, cada eixo gera uma janela de entrada e saida. A sobreposicao dessas janelas define se ha impacto futuro.",
      },
      {
        title: "Impulso",
        formula: "$$\\vec{J}=\\Delta \\vec{p}$$",
        explanation:
          "Quando o projetil toca a parede, o solver converte velocidade em impulso de contato para impedir atravesamento e ajustar a resposta.",
      },
      {
        title: "Eventos de contato",
        formula: "$$begin \\rightarrow persist \\rightarrow end$$",
        explanation:
          "A cena usa o cache de manifolds para identificar quando um contato nasce, continua ativo ou termina em um frame posterior.",
      },
    ],
    concept: [
      {
        title: "Cena de validacao, nao de efeito visual",
        body: "Este laboratorio existe para provar o motor em uso real. A parte de cima forza o CCD/TOI com corpo rapido e parede fina; a parte de baixo compara consultas espaciais contra obstaculos reais do mundo.",
      },
      {
        title: "Por que manter os dois casts",
        body: "O circle cast e util para sensores arredondados e previsao simples. O shape cast entra quando o volume que se move tem quinas, orientacao e footprint proprio.",
      },
    ],
    studyNotes: [
      {
        title: "Mexa na espessura da parede",
        body: "Ao reduzir a espessura, voce cria exatamente o caso em que um solver discreto puro costuma falhar por tunneling.",
      },
      {
        title: "Gire o poligono",
        body: "O shape cast nao olha so para o centro. A orientacao muda os eixos de separacao e altera o instante previsto de contato.",
      },
    ],
    loopSteps: [
      {
        title: "1. Relancar o projetil",
        body: "A cada ciclo, a cena reposiciona o rigid body e limpa a trilha para repetir o experimento.",
      },
      {
        title: "2. Integrar o mundo com TOI",
        body: "O mundo roda com maxSubsteps = 1 para obrigar o teste a depender do CCD continuo em vez de se apoiar em substeps adaptativos.",
      },
      {
        title: "3. Contar begin/persist/end",
        body: "Os eventos do projetil sao somados no painel para mostrar que o contato existe, continua e depois termina quando o tiro e reiniciado.",
      },
      {
        title: "4. Executar shape cast e circle cast",
        body: "As duas consultas varrem o cenario no mesmo frame e desenham ponto de hit, normal e posicao final prevista.",
      },
    ],
    exercises: [
      {
        title: "Falha de solver discreto",
        prompt:
          "Por que uma parede fina costuma falhar quando a simulacao so testa sobreposicao depois de mover o corpo inteiro de uma vez?",
        answer:
          "Porque o corpo pode estar antes da parede em um frame e depois dela no frame seguinte, sem nunca produzir sobreposicao detectavel no instante amostrado.",
      },
      {
        title: "Cast circular vs poligonal",
        prompt:
          "O que muda quando o shape cast usa um triangulo orientado em vez de um circulo com o mesmo tamanho medio?",
        answer:
          "Mudam os eixos de separacao e o ponto de contato previsto. A quina pode encostar antes de o centro percorrer a mesma distancia que um circulo.",
      },
    ],
    engineering: [
      {
        title: "Cena de regressao manual",
        body: "Este laboratorio vira uma cena de manutencao do motor: sempre que CCD, casts ou cache de contato mudarem, basta abrir esta tela e confirmar visualmente o comportamento esperado.",
      },
    ],
    pitfalls: [
      {
        title: "Achar que passar no build basta",
        body: "Compilar nao prova fisica. Aqui o objetivo e ligar a feature nova a um experimento visual e a um teste automatizado para fechar o circuito de confianca.",
      },
    ],
  };
}

export const engineLabScene: SceneDefinition = {
  id: "engine-lab",
  title: "Laboratorio da engine",
  subtitle: "Parede fina, shape cast e CCD",
  accent: "#86f7d3",
  category: "Engine",
  summary:
    "Cena de validacao do ventania3d: um projetil rapido testa CCD/TOI contra parede fina, enquanto shape cast e circle cast varrem um corredor de obstaculos no mesmo frame.",
  worldWidth: 16,
  worldHeight: 10,
  keyboardHints: [
    "Use os sliders e Reset",
    "Observe a parede fina no topo",
    "Compare shape cast e circle cast no corredor inferior",
  ],
  defaults: {
    bulletSpeed: 120,
    wallThickness: 0.08,
    probeDistance: 11,
    probeAngle: 8,
    probeRotation: -10,
    probeShape: 0,
    sensorRadius: 0.45,
  },
  controls: [
    {
      key: "bulletSpeed",
      label: "Velocidade do tiro",
      min: 30,
      max: 220,
      step: 1,
      unit: "m/s",
      description: "Quanto maior a velocidade, mais agressivo fica o teste de CCD contra a parede fina.",
    },
    {
      key: "wallThickness",
      label: "Espessura da parede",
      min: 0.04,
      max: 0.5,
      step: 0.01,
      unit: "m",
      description: "Reduce este valor para aproximar o caso classico de tunneling.",
    },
    {
      key: "probeDistance",
      label: "Alcance do cast",
      min: 3,
      max: 12,
      step: 0.1,
      unit: "m",
      description: "Distancia maxima varrida pelas queries no corredor inferior.",
    },
    {
      key: "probeAngle",
      label: "Angulo do cast",
      min: -24,
      max: 28,
      step: 1,
      unit: "°",
      description: "Muda a direcao do varrimento para atravessar diferentes obstaculos.",
    },
    {
      key: "probeRotation",
      label: "Rotacao do poligono",
      min: -90,
      max: 90,
      step: 1,
      unit: "°",
      description: "A orientacao do shape cast altera o ponto e a distancia de contato previstos.",
    },
    {
      key: "probeShape",
      label: "Forma do shape cast",
      min: 0,
      max: 1,
      step: 1,
      unit: "",
      description: "Alterna entre um triangulo e um retangulo para comparar perfis convexos.",
      choices: [
        { label: "Triangulo", value: 0 },
        { label: "Retangulo", value: 1 },
      ],
    },
    {
      key: "sensorRadius",
      label: "Raio do circle cast",
      min: 0.15,
      max: 0.95,
      step: 0.01,
      unit: "m",
      description: "Referencia de varredura circular para comparar com o shape cast.",
    },
  ],
  createState: (config) => {
    const built = buildWorld(config);
    const scene: EngineLabState = {
      ...built,
      bulletTrail: [built.bulletStart.clone()],
      shotTimer: 0,
      shotIndex: 1,
      bulletBeginCount: 0,
      bulletPersistCount: 0,
      bulletEndCount: 0,
      bulletEscapeCount: 0,
      escapeRecordedThisShot: false,
      lastImpactBodyId: null,
      lastImpactPoint: null,
      lastImpactSpeed: 0,
      shapeCastDistance: null,
      shapeCastPoint: null,
      shapeCastNormal: null,
      shapeCastBodyId: null,
      shapeCastPosition: null,
      circleCastDistance: null,
      circleCastPoint: null,
      circleCastNormal: null,
      circleCastBodyId: null,
      circleCastCenter: null,
    };
    inspectScene(scene, config);
    return scene;
  },
  step: ({ state, config, dt }) => {
    const scene = getState(state);

    if (scene.shotTimer >= SHOT_CYCLE_DURATION) {
      relaunchBullet(scene, config);
    }

    scene.world.step(dt, 1);
    scene.shotTimer += dt;

    const bullet = scene.world.getBody(BULLET_ID);
    if (bullet) {
      scene.bulletTrail.push(bullet.position.clone());
      if (scene.bulletTrail.length > 40) {
        scene.bulletTrail.shift();
      }

      const escapeThreshold = scene.wallX + config.wallThickness * 0.5 + BULLET_RADIUS + 0.12;
      if (!scene.escapeRecordedThisShot && bullet.position.x > escapeThreshold) {
        scene.escapeRecordedThisShot = true;
        scene.bulletEscapeCount += 1;
      }
    }

    const bulletBegins = scene.world.contactEvents.begin.filter(
      (contact) => contact.bodyAId === BULLET_ID || contact.bodyBId === BULLET_ID,
    );
    const bulletPersists = scene.world.contactEvents.persist.filter(
      (contact) => contact.bodyAId === BULLET_ID || contact.bodyBId === BULLET_ID,
    );
    const bulletEnds = scene.world.contactEvents.end.filter(
      (contact) => contact.bodyAId === BULLET_ID || contact.bodyBId === BULLET_ID,
    );

    scene.bulletBeginCount += bulletBegins.length;
    scene.bulletPersistCount += bulletPersists.length;
    scene.bulletEndCount += bulletEnds.length;

    if (bulletBegins.length > 0) {
      const latest = bulletBegins[bulletBegins.length - 1];
      scene.lastImpactBodyId =
        latest.bodyAId === BULLET_ID ? latest.bodyBId : latest.bodyAId;
      scene.lastImpactPoint = latest.points[0]?.position.clone() ?? null;
      scene.lastImpactSpeed = bullet?.velocity.length ?? 0;
    }

    inspectScene(scene, config);
  },
  render: ({ ctx, state, config, viewport }) => {
    const scene = getState(state);
    const bullet = scene.world.getBody(BULLET_ID);
    const castDirection = directionFromDegrees(config.probeAngle);
    const probeShape = buildProbeShape(config.probeShape);
    const probeRotation = toRadians(config.probeRotation);
    const probeDistance = config.probeDistance;

    drawScenicBackdrop(ctx, viewport, {
      groundY: scene.groundY,
      hillHeight: 0.85,
      treeSpacing: 4.6,
    });
    drawGrid(ctx, viewport, 1);
    drawGround(ctx, viewport, scene.groundY, "Base estatica");

    drawLineWorld(
      ctx,
      viewport,
      new Vector2(0.8, 2.35),
      new Vector2(15.2, 2.35),
      "rgba(134, 247, 211, 0.18)",
      1.5,
    );
    drawWorldLabel(ctx, viewport, new Vector2(0.95, 2.03), "pista de CCD / TOI");

    drawLineWorld(
      ctx,
      viewport,
      new Vector2(SHAPE_CAST_ORIGIN.x, SHAPE_CAST_ORIGIN.y),
      new Vector2(15.2, SHAPE_CAST_ORIGIN.y),
      "rgba(118, 228, 255, 0.12)",
      1.5,
    );
    drawWorldLabel(
      ctx,
      viewport,
      new Vector2(SHAPE_CAST_ORIGIN.x, SHAPE_CAST_ORIGIN.y - 0.38),
      "shape cast",
    );

    drawLineWorld(
      ctx,
      viewport,
      new Vector2(CIRCLE_CAST_ORIGIN.x, CIRCLE_CAST_ORIGIN.y),
      new Vector2(15.2, CIRCLE_CAST_ORIGIN.y),
      "rgba(255, 191, 105, 0.12)",
      1.5,
    );
    drawWorldLabel(
      ctx,
      viewport,
      new Vector2(CIRCLE_CAST_ORIGIN.x, CIRCLE_CAST_ORIGIN.y - 0.38),
      "circle cast",
    );

    scene.world.bodies
      .filter((body) => body.id !== BULLET_ID && body.id !== FLOOR_ID)
      .forEach((body) => {
        body.getSnapshots().forEach((snapshot) => {
          let fill = "rgba(173, 241, 219, 0.14)";
          if (body.id === THIN_WALL_ID) {
            fill = "rgba(255, 136, 136, 0.18)";
          } else if (body.id === BACKSTOP_ID) {
            fill = "rgba(246, 247, 255, 0.14)";
          }

          drawBodyCollider(ctx, viewport, snapshot, fill, "rgba(255,255,255,0.24)");
        });
      });

    drawWorldLabel(
      ctx,
      viewport,
      new Vector2(scene.wallX - 0.45, 1.5),
      "parede fina",
    );
    drawWorldLabel(ctx, viewport, new Vector2(13.65, 1.5), "backstop");

    if (scene.bulletTrail.length > 1) {
      for (let index = 1; index < scene.bulletTrail.length; index += 1) {
        const alpha = index / scene.bulletTrail.length;
        drawLineWorld(
          ctx,
          viewport,
          toVector2(scene.bulletTrail[index - 1]),
          toVector2(scene.bulletTrail[index]),
          `rgba(134, 247, 211, ${0.08 + alpha * 0.18})`,
          2,
        );
      }
    }

    if (bullet) {
      drawCircleBody(
        ctx,
        viewport,
        new Vector2(bullet.position.x, bullet.position.y),
        BULLET_RADIUS,
        "#86f7d3",
      );
    }

    if (scene.lastImpactPoint) {
      drawCircleBody(
        ctx,
        viewport,
        toVector2(scene.lastImpactPoint),
        0.075,
        "#ff8a8a",
      );
      drawWorldLabel(
        ctx,
        viewport,
        toVector2(scene.lastImpactPoint.add(new Vector3(0.12, -0.18, 0))),
        "begin contact",
      );
    }

    const initialShape = createSweepProbeShape(
      probeShape,
      SHAPE_CAST_ORIGIN,
      probeRotation,
    );
    drawWorldShape(
      ctx,
      viewport,
      initialShape,
      "rgba(118, 228, 255, 0.16)",
      "rgba(118, 228, 255, 0.9)",
    );
    const shapePathEnd = scene.shapeCastPosition ?? SHAPE_CAST_ORIGIN.add(castDirection.scale(probeDistance));
    drawLineWorld(
      ctx,
      viewport,
      toVector2(SHAPE_CAST_ORIGIN),
      toVector2(shapePathEnd),
      "rgba(118, 228, 255, 0.72)",
      2,
    );

    if (scene.shapeCastPosition) {
      const finalShape = createSweepProbeShape(
        probeShape,
        scene.shapeCastPosition,
        probeRotation,
      );
      drawWorldShape(
        ctx,
        viewport,
        finalShape,
        "rgba(118, 228, 255, 0.14)",
        "rgba(118, 228, 255, 0.42)",
      );
    }

    if (scene.shapeCastPoint && scene.shapeCastNormal) {
      drawCircleBody(ctx, viewport, toVector2(scene.shapeCastPoint), 0.07, "#76e4ff");
      drawArrow(
        ctx,
        viewport,
        toVector2(scene.shapeCastPoint),
        new Vector2(scene.shapeCastNormal.x * 0.7, scene.shapeCastNormal.y * 0.7),
        "#76e4ff",
        "n",
      );
    }

    drawCircleBody(
      ctx,
      viewport,
      toVector2(CIRCLE_CAST_ORIGIN),
      config.sensorRadius,
      "#ffbf69",
    );
    const circlePathEnd = scene.circleCastCenter ?? CIRCLE_CAST_ORIGIN.add(castDirection.scale(probeDistance));
    drawLineWorld(
      ctx,
      viewport,
      toVector2(CIRCLE_CAST_ORIGIN),
      toVector2(circlePathEnd),
      "rgba(255, 191, 105, 0.72)",
      2,
    );

    if (scene.circleCastCenter) {
      drawWorldShape(
        ctx,
        viewport,
        createSweepProbeShape(createCircle(config.sensorRadius), scene.circleCastCenter),
        "rgba(255, 191, 105, 0.14)",
        "rgba(255, 191, 105, 0.42)",
      );
    }

    if (scene.circleCastPoint && scene.circleCastNormal) {
      drawCircleBody(ctx, viewport, toVector2(scene.circleCastPoint), 0.07, "#ffbf69");
      drawArrow(
        ctx,
        viewport,
        toVector2(scene.circleCastPoint),
        new Vector2(scene.circleCastNormal.x * 0.7, scene.circleCastNormal.y * 0.7),
        "#ffbf69",
        "n",
      );
    }
  },
  buildPanelData: (state, config) => buildPanel(getState(state), config),
};
