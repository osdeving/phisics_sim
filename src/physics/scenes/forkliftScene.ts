import { formatNumber, formatQuantity } from "../core/units";
import { clamp } from "../math/scalar";
import { Vector2 } from "../math/Vector2";
import {
  drawGrid,
  drawGround,
  drawLineWorld,
  drawSpriteAtWorld,
  drawWorldLabel,
} from "../render/canvasPrimitives";
import { metersToPixels, worldToScreen } from "../render/viewport";
import {
  PhysicsWorld,
  Vector3,
  circleWithScene,
  createBox,
  createChamferedFork,
  createRigidBody,
  drawBodyCenter,
  drawBodyCollider,
  rayWithScene,
  readForkliftCommands,
} from "../../ventania3d";
import { SceneDefinition, ScenePanelData, SceneState } from "./types";

const GROUND_ID = "forklift-ground";
const FORKLIFT_ID = "forklift-showcase";
const PAYLOAD_IDS = ["payload-alpha", "payload-beta", "payload-gamma"];
const WHEEL_RADIUS = 0.4;
const FORK_BLADE_LENGTH = 2.15;
const DISPLAY_TONS_TO_SIM_MASS = 10;
const NOMINAL_LOAD_CENTER = 0.9;
const WORLD_SUBSTEPS = 3;
const REAR_WHEEL_LOCAL = new Vector3(-0.72, 0.76, 0);
const FRONT_WHEEL_LOCAL = new Vector3(0.34, 0.76, 0);
const PAYLOAD_SPECS = [
  { id: PAYLOAD_IDS[0], key: "payloadFrontMass", label: "caixote A", spawnX: 12.9 },
  { id: PAYLOAD_IDS[1], key: "payloadMiddleMass", label: "caixote B", spawnX: 14.45 },
  { id: PAYLOAD_IDS[2], key: "payloadRearMass", label: "caixote C", spawnX: 16.2 },
] as const;

interface ForkAssemblyLocal {
  carriageCenter: Vector3;
  pivot: Vector3;
  backplateCenter: Vector3;
  frameCenter: Vector3;
  bladeCenter: Vector3;
  bladeHeel: Vector3;
  bladeEntry: Vector3;
  bladeTip: Vector3;
  mastAnchor: Vector3;
  cylinderAnchor: Vector3;
}

interface ForkliftState extends SceneState {
  world: PhysicsWorld;
  groundY: number;
  forkLift: number;
  forkTilt: number;
  liftCylinderExtension: number;
  liftCylinderVelocity: number;
  tiltCylinderLength: number;
  tiltCylinderVelocity: number;
  wheelAngle: number;
  wheelAngularVelocity: number;
  wheelSlip: number;
  tractionForce: number;
  groundedWheels: number;
  engagedPayloadId: string | null;
  tipContacts: number;
  raisedPayloads: number;
  movedPayloads: number;
  chassisPitchDeg: number;
  lastForkClearance: number;
  lastDriveTorque: number;
  activePayloadMass: number;
  staticReserveMoment: number;
  estimatedCapacity: number;
  initialPayloadPositions: Record<string, number>;
}

function getState(state: SceneState) {
  return state as ForkliftState;
}

function bodyKind(bodyId: string) {
  if (bodyId === FORKLIFT_ID) {
    return "forklift";
  }

  if (bodyId === GROUND_ID || bodyId.startsWith("forklift-wall")) {
    return "static";
  }

  return "payload";
}

function configValue(config: Record<string, number>, key: string, fallback: number) {
  const value = config[key];
  return Number.isFinite(value) ? value : fallback;
}

function displayTonsToSimMass(tons: number) {
  return tons * DISPLAY_TONS_TO_SIM_MASS;
}

function simMassToDisplayTons(simMass: number) {
  return simMass / DISPLAY_TONS_TO_SIM_MASS;
}

function formatDisplayMassTons(tons: number) {
  return tons >= 1 ? `${formatNumber(tons, 1)} t` : `${formatNumber(tons * 1000, 0)} kg`;
}

function formatSimMass(simMass: number) {
  return formatDisplayMassTons(simMassToDisplayTons(simMass));
}

function getPayloadSpec(id: string) {
  return PAYLOAD_SPECS.find((entry) => entry.id === id);
}

function getPayloadMassTons(config: Record<string, number>, id: string) {
  const spec = getPayloadSpec(id);
  return spec ? configValue(config, spec.key, 1) : 1;
}

function getPayloadMass(config: Record<string, number>, id: string) {
  return displayTonsToSimMass(getPayloadMassTons(config, id));
}

function updateForkAssembly(
  world: PhysicsWorld,
  forkLift: number,
  forkTilt: number,
) {
  const forklift = world.getBody(FORKLIFT_ID);
  if (!forklift) {
    return;
  }

  const assembly = getForkAssemblyLocal(forkLift, forkTilt);
  forklift.setColliderLocalTransform(
    "forklift-carriage",
    assembly.carriageCenter,
  );
  forklift.setColliderLocalTransform(
    "forklift-backplate",
    assembly.backplateCenter,
    forkTilt,
  );
  forklift.setColliderLocalTransform(
    "forklift-fork-frame",
    assembly.frameCenter,
    forkTilt,
  );
  forklift.setColliderLocalTransform(
    "forklift-blade",
    assembly.bladeCenter,
    forkTilt,
  );
}

function getForkAssemblyLocal(
  forkLift: number,
  forkTilt: number,
): ForkAssemblyLocal {
  const carriageCenter = new Vector3(0.98, 0.62 - forkLift, 0);
  const pivot = new Vector3(1.06, 0.96 - forkLift, 0);

  return {
    carriageCenter,
    pivot,
    backplateCenter: pivot.add(new Vector3(0.08, -0.18, 0).rotateZ(forkTilt)),
    frameCenter: pivot.add(new Vector3(0.38, -0.03, 0).rotateZ(forkTilt)),
    bladeCenter: pivot.add(new Vector3(1.22, 0.02, 0).rotateZ(forkTilt)),
    bladeHeel: pivot.add(new Vector3(0.18, 0.02, 0).rotateZ(forkTilt)),
    bladeEntry: pivot.add(new Vector3(1.42, 0.02, 0).rotateZ(forkTilt)),
    bladeTip: pivot.add(new Vector3(2.34, 0.02, 0).rotateZ(forkTilt)),
    mastAnchor: new Vector3(0.84, 0.42 - forkLift, 0),
    cylinderAnchor: pivot.add(new Vector3(0.28, -0.14, 0).rotateZ(forkTilt)),
  };
}

function getLiftCylinderLength(forkLift: number) {
  return 0.64 + forkLift;
}

function getTiltCylinderLength(forkLift: number, forkTilt: number) {
  const assembly = getForkAssemblyLocal(forkLift, forkTilt);
  return assembly.mastAnchor.distanceTo(assembly.cylinderAnchor);
}

function getTiltCylinderRange(
  forkLift: number,
  maxBackTilt: number,
  maxForwardTilt: number,
) {
  const backTiltLength = getTiltCylinderLength(forkLift, -maxBackTilt);
  const forwardTiltLength = getTiltCylinderLength(forkLift, maxForwardTilt);

  return {
    min: Math.min(backTiltLength, forwardTiltLength),
    max: Math.max(backTiltLength, forwardTiltLength),
    direction: Math.sign(forwardTiltLength - backTiltLength) || 1,
  };
}

function solveTiltAngleForCylinderLength(
  cylinderLength: number,
  forkLift: number,
  minTilt: number,
  maxTilt: number,
  currentTilt: number,
) {
  let bestTilt = clamp(currentTilt, minTilt, maxTilt);
  let bestError = Number.POSITIVE_INFINITY;
  const samples = 64;

  for (let index = 0; index <= samples; index += 1) {
    const alpha = index / samples;
    const tilt = minTilt + (maxTilt - minTilt) * alpha;
    const error = Math.abs(getTiltCylinderLength(forkLift, tilt) - cylinderLength);

    if (
      error < bestError - 1e-6 ||
      (Math.abs(error - bestError) <= 1e-6 &&
        Math.abs(tilt - currentTilt) < Math.abs(bestTilt - currentTilt))
    ) {
      bestError = error;
      bestTilt = tilt;
    }
  }

  return bestTilt;
}

function hasWheelSupport(world: PhysicsWorld, contactPoint: Vector3) {
  return circleWithScene(world, contactPoint, 0.08).some(
    (contact) => contact.bodyBId !== FORKLIFT_ID,
  );
}

function createPayloadBody(
  id: string,
  position: Vector3,
  mass: number,
  friction: number,
) {
  return createRigidBody({
    id,
    position,
    mass,
    inertia: mass * 1.1,
    linearDamping: 0.15,
    angularDamping: 0.16,
    colliders: [
      {
        id: `${id}-body`,
        shape: createBox(1.02, 0.74),
        localPosition: new Vector3(0.04, -0.1, 0),
        material: {
          density: 1,
          friction,
          restitution: 0.04,
        },
        userData: {
          role: "body",
        },
      },
      {
        id: `${id}-pallet-deck`,
        shape: createBox(1.18, 0.12),
        localPosition: new Vector3(0.02, 0.31, 0),
        material: {
          density: 1,
          friction,
          restitution: 0.02,
        },
        userData: {
          role: "pallet",
        },
      },
      {
        id: `${id}-pallet-runner`,
        shape: createBox(0.68, 0.24),
        localPosition: new Vector3(0.18, 0.505, 0),
        material: {
          density: 1,
          friction,
          restitution: 0.02,
        },
        userData: {
          role: "pallet",
        },
      },
    ],
    userData: {
      kind: "payload",
    },
  });
}

function computeStabilityState(
  scene: ForkliftState,
  engagedPayloadId: string | null = scene.engagedPayloadId,
) {
  const forklift = scene.world.getBody(FORKLIFT_ID);
  if (!forklift) {
    return {
      activePayloadMass: 0,
      reserveMoment: 0,
      estimatedCapacity: 0,
    };
  }

  const gravity = scene.world.gravity.y;
  const frontAxleX = forklift.worldPoint(FRONT_WHEEL_LOCAL).x;
  const restoringArm = Math.max(frontAxleX - forklift.position.x, 0.1);
  const restoringMoment = forklift.mass * gravity * restoringArm;
  const activePayload = engagedPayloadId
    ? scene.world.getBody(engagedPayloadId)
    : null;
  const activePayloadMass = activePayload?.mass ?? 0;
  const loadArm = activePayload
    ? Math.max(activePayload.position.x - frontAxleX, 0.1)
    : NOMINAL_LOAD_CENTER;
  const loadMoment = activePayloadMass * gravity * loadArm;
  const reserveMoment = restoringMoment - loadMoment;
  const estimatedCapacity = restoringMoment / (gravity * loadArm);

  return {
    activePayloadMass,
    reserveMoment,
    estimatedCapacity,
  };
}

function createForkliftWorld(config: Record<string, number>) {
  const groundY = 7.55;
  const forkSurfaceFriction = configValue(config, "forkSurfaceFriction", 0.24);
  const world = new PhysicsWorld({
    gravity: new Vector3(0, config.gravity, 0),
    solverIterations: 12,
    positionIterations: 5,
  });

  world.addBody(
    createRigidBody({
      id: GROUND_ID,
      type: "static",
      position: new Vector3(11, groundY + 1, 0),
      colliders: [
        {
          id: "ground-body",
          shape: createBox(30, 2),
          material: {
            density: 0,
            friction: config.surfaceFriction,
            restitution: 0.02,
          },
        },
      ],
      userData: {
        kind: "static",
      },
    }),
  );

  world.addBody(
    createRigidBody({
      id: "forklift-wall-left",
      type: "static",
      position: new Vector3(-1.5, 5.5, 0),
      colliders: [
        {
          shape: createBox(2, 10),
          material: {
            density: 0,
            friction: 0.9,
            restitution: 0.02,
          },
        },
      ],
      userData: {
        kind: "static",
      },
    }),
  );

  world.addBody(
    createRigidBody({
      id: "forklift-wall-right",
      type: "static",
      position: new Vector3(23.2, 5.5, 0),
      colliders: [
        {
          shape: createBox(2, 10),
          material: {
            density: 0,
            friction: 0.9,
            restitution: 0.02,
          },
        },
      ],
      userData: {
        kind: "static",
      },
    }),
  );

  world.addBody(
    createRigidBody({
      id: FORKLIFT_ID,
      position: new Vector3(5.2, 6.39, 0),
      mass: displayTonsToSimMass(config.forkliftMass),
      inertia: displayTonsToSimMass(config.forkliftMass) * 8.5,
      linearDamping: 0.12,
      angularDamping: 0.22,
      colliders: [
        {
          id: "forklift-chassis",
          shape: createBox(2.25, 0.72),
          localPosition: new Vector3(-0.08, 0.04, 0),
          material: {
            density: 1,
            friction: config.surfaceFriction,
            restitution: 0.04,
          },
        },
        {
          id: "forklift-counterweight",
          shape: createBox(0.72, 0.9),
          localPosition: new Vector3(-0.84, -0.36, 0),
          material: {
            density: 1,
            friction: config.surfaceFriction,
            restitution: 0.03,
          },
        },
        {
          id: "forklift-roof",
          shape: createBox(1.5, 0.18),
          localPosition: new Vector3(-0.08, -1.28, 0),
          material: {
            density: 1,
            friction: 0.6,
            restitution: 0.02,
          },
        },
        {
          id: "forklift-back-post",
          shape: createBox(0.18, 1.72),
          localPosition: new Vector3(-0.7, -0.5, 0),
          material: {
            density: 1,
            friction: 0.6,
            restitution: 0.02,
          },
        },
        {
          id: "forklift-mast",
          shape: createBox(0.2, 2.42),
          localPosition: new Vector3(0.84, -0.15, 0),
          material: {
            density: 1,
            friction: 0.7,
            restitution: 0.02,
          },
        },
        {
          id: "forklift-carriage",
          shape: createBox(0.18, 0.72),
          localPosition: new Vector3(0.98, 0.62, 0),
          material: {
            density: 1,
            friction: 0.7,
            restitution: 0.02,
          },
        },
        {
          id: "forklift-backplate",
          shape: createBox(0.18, 0.48),
          localPosition: new Vector3(1.14, 0.78, 0),
          material: {
            density: 1,
            friction: forkSurfaceFriction,
            restitution: 0.02,
          },
        },
        {
          id: "forklift-fork-frame",
          shape: createBox(0.58, 0.08),
          localPosition: new Vector3(1.46, 0.9, 0),
          material: {
            density: 1,
            friction: forkSurfaceFriction,
            restitution: 0.02,
          },
        },
        {
          id: "forklift-blade",
          shape: createChamferedFork(FORK_BLADE_LENGTH, 0.12, 0.34, 0.04),
          localPosition: new Vector3(2.28, 1.02, 0),
          material: {
            density: 1,
            friction: forkSurfaceFriction,
            restitution: 0.02,
          },
        },
        {
          id: "forklift-wheel-left",
          shape: { kind: "circle", radius: WHEEL_RADIUS },
          localPosition: REAR_WHEEL_LOCAL,
          material: {
            density: 1,
            friction: 0.06,
            restitution: 0.02,
          },
        },
        {
          id: "forklift-wheel-right",
          shape: { kind: "circle", radius: WHEEL_RADIUS },
          localPosition: FRONT_WHEEL_LOCAL,
          material: {
            density: 1,
            friction: 0.06,
            restitution: 0.02,
          },
        },
      ],
      userData: {
        kind: "forklift",
      },
    }),
  );

  PAYLOAD_SPECS.forEach((payload) => {
    world.addBody(
      createPayloadBody(
        payload.id,
        new Vector3(payload.spawnX, 6.915, 0),
        getPayloadMass(config, payload.id),
        config.payloadFriction,
      ),
    );
  });

  return { world, groundY };
}

function getForkBladePoints(world: PhysicsWorld, state: ForkliftState) {
  const forklift = world.getBody(FORKLIFT_ID);
  if (!forklift) {
    return {
      heel: Vector3.zero(),
      entry: Vector3.zero(),
      tip: Vector3.zero(),
      carriage: Vector3.zero(),
      mastAnchor: Vector3.zero(),
      cylinderAnchor: Vector3.zero(),
    };
  }

  const assembly = getForkAssemblyLocal(state.forkLift, state.forkTilt);

  return {
    heel: forklift.worldPoint(assembly.bladeHeel),
    entry: forklift.worldPoint(assembly.bladeEntry),
    tip: forklift.worldPoint(assembly.bladeTip),
    carriage: forklift.worldPoint(assembly.carriageCenter),
    mastAnchor: forklift.worldPoint(assembly.mastAnchor),
    cylinderAnchor: forklift.worldPoint(assembly.cylinderAnchor),
  };
}

function isPayloadInserted(
  payloadBody: ReturnType<PhysicsWorld["getBody"]>,
  heel: Vector3,
  entry: Vector3,
  tip: Vector3,
) {
  if (!payloadBody) {
    return false;
  }

  const slotMinY = 0.36;
  const slotMaxY = 0.58;
  const slotMinX = -0.72;
  const slotMaxX = 0.12;
  const bladeDirection = tip.subtract(heel);
  const bladeSamples = [0.72, 0.8, 0.88, 0.96].map((alpha) =>
    payloadBody.localPoint(heel.add(bladeDirection.scale(alpha))),
  );
  const pointsInsideSlot = bladeSamples.filter(
    (point) =>
      point.x >= slotMinX &&
      point.x <= slotMaxX &&
      point.y >= slotMinY &&
      point.y <= slotMaxY,
  ).length;

  return pointsInsideSlot >= 3;
}

function inspectForkliftState(scene: ForkliftState) {
  const { heel, entry, tip } = getForkBladePoints(scene.world, scene);
  const tipHits = circleWithScene(scene.world, tip, 0.14).filter(
    (contact) =>
      contact.bodyBId !== FORKLIFT_ID &&
      contact.bodyBId !== GROUND_ID &&
      !contact.bodyBId.startsWith("forklift-wall"),
  );

  const payloadBodies = PAYLOAD_IDS.map((id) => scene.world.getBody(id)).filter(
    (body): body is NonNullable<typeof body> => Boolean(body),
  );
  const engagedPayload =
    payloadBodies.find((payload) => isPayloadInserted(payload, heel, entry, tip)) ?? null;
  const raisedPayloads = payloadBodies.filter(
    (payload) => payload.position.y < scene.groundY - 0.9,
  ).length;
  const movedPayloads = payloadBodies.filter(
    (payload) =>
      Math.abs(
        payload.position.x - (scene.initialPayloadPositions[payload.id] ?? payload.position.x),
      ) > 0.22,
  ).length;
  const raycast = rayWithScene(scene.world, tip, Vector3.down(), 2.5);
  const forklift = scene.world.getBody(FORKLIFT_ID);
  const bladeCollider = forklift?.colliders.find((collider) => collider.id === "forklift-blade");
  const bladeSnapshot =
    forklift && bladeCollider ? forklift.getColliderSnapshot(bladeCollider) : null;
  const stability = computeStabilityState(scene, engagedPayload?.id ?? null);

  scene.engagedPayloadId = engagedPayload?.id ?? null;
  scene.tipContacts = tipHits.length;
  scene.raisedPayloads = raisedPayloads;
  scene.movedPayloads = movedPayloads;
  scene.lastForkClearance = bladeSnapshot
    ? Math.max(scene.groundY - bladeSnapshot.aabb.max.y, 0)
    : (raycast?.distance ?? 2.5);
  scene.chassisPitchDeg = forklift ? (forklift.rotation * 180) / Math.PI : 0;
  scene.activePayloadMass = stability.activePayloadMass;
  scene.staticReserveMoment = stability.reserveMoment;
  scene.estimatedCapacity = stability.estimatedCapacity;
}

function buildPanel(
  scene: ForkliftState,
  config: Record<string, number>,
): ScenePanelData {
  const forklift = scene.world.getBody(FORKLIFT_ID);
  const speed = forklift?.velocity.x ?? 0;
  const engagementLabel = scene.engagedPayloadId
    ? "encaixe util"
    : scene.tipContacts > 0
      ? "tocando errado"
      : "livre";

  return {
    metrics: [
      {
        label: "Velocidade do chassi",
        value: formatQuantity(speed, "m/s"),
        helper: "Agora o chassi anda por tracao no contato das rodas, nao por empurrao direto no centro do corpo.",
      },
      {
        label: "Massa da empilhadeira",
        value: formatDisplayMassTons(config.forkliftMass),
        helper: "A UI trabalha em toneladas equivalentes, enquanto a engine conserva a escala interna estavel do showcase.",
      },
      {
        label: "Carga engajada",
        value: scene.activePayloadMass > 0 ? formatSimMass(scene.activePayloadMass) : "nenhuma",
        helper: "Mostra a massa atual que realmente esta apoiada pela pa.",
      },
      {
        label: "Capacidade estimada",
        value: formatSimMass(scene.estimatedCapacity),
        helper: "Estimativa estatica no centro de carga atual. Se a carga passar disso, a traseira tende a aliviar ou levantar.",
      },
      {
        label: "Margem estatica",
        value: `${formatNumber(scene.staticReserveMoment, 1)} N·m`,
        helper: scene.staticReserveMoment >= 0
          ? "Momento restaurador ainda vence o momento da carga."
          : "Momento da carga ja superou a reserva estatica; a empilhadeira esta na zona de tombamento.",
      },
      {
        label: "Rotacao da roda",
        value: `${formatNumber(scene.wheelAngularVelocity, 2)} rad/s`,
        helper: "A relacao de rolamento usa v = wR. Se a roda gira mais do que o chassi acompanha, aparece slip.",
      },
      {
        label: "Slip longitudinal",
        value: formatQuantity(scene.wheelSlip, "m/s"),
        helper: "Slip positivo significa a banda da roda tentando andar mais do que o solo permite.",
      },
      {
        label: "Tracao no contato",
        value: formatQuantity(scene.tractionForce, "N"),
        helper: "Forca tangencial limitada por atrito, repartida entre as rodas que estao apoiadas.",
      },
      {
        label: "Elevacao da pa",
        value: formatQuantity(scene.forkLift, "m"),
        helper: "Curso do pistao de lift convertido em deslocamento vertical do carriage.",
      },
      {
        label: "Curso do pistao de lift",
        value: formatQuantity(getLiftCylinderLength(scene.forkLift), "m"),
        helper: "Stroke interno do cilindro vertical que sustenta a subida e a descida da pa.",
      },
      {
        label: "Inclinacao da pa",
        value: `${formatNumber((scene.forkTilt * 180) / Math.PI, 1)}°`,
        helper: "O tilt nao e livre: ele vem do comprimento instantaneo do cilindro hidraulico.",
      },
      {
        label: "Curso do pistao de tilt",
        value: formatQuantity(scene.tiltCylinderLength, "m"),
        helper: "O solver da cena procura o angulo do garfo que fecha essa geometria de cilindro.",
      },
      {
        label: "Estado do encaixe",
        value: engagementLabel,
        helper: scene.engagedPayloadId
          ? `Payload ativo: ${scene.engagedPayloadId.replace("payload-", "")}.`
          : "A ponta da pa ainda nao esta bem posicionada sob uma carga.",
      },
      {
        label: "Pitch do chassi",
        value: `${formatNumber(scene.chassisPitchDeg, 1)}°`,
        helper: "Mostra a reacao angular quando a pa toca o solo ou levanta carga.",
      },
      {
        label: "Rodas apoiadas",
        value: `${scene.groundedWheels}/2`,
        helper: "Sem apoio nao ha transmissao de tracao; o eixo pode girar livre, mas o chassi nao ganha empuxo.",
      },
      {
        label: "Folga do garfo",
        value: formatQuantity(scene.lastForkClearance, "m"),
        helper: "A pa repousa rente ao piso, so o suficiente para o contato com o chao nao frear a locomocao normal.",
      },
      {
        label: "Cargas erguidas",
        value: `${scene.raisedPayloads}`,
        helper: "Contagem de caixas claramente fora da altura de repouso.",
      },
      {
        label: "Cargas empurradas",
        value: `${scene.movedPayloads}`,
        helper: "Indica se a forca ja comecou a transferir movimento entre caixas.",
      },
    ],
    formulas: [
      {
        title: "Rolamento basico",
        formula: "$$v = \\omega R,\\qquad \\Delta s = R\\,\\Delta \\theta$$",
        explanation:
          "A distancia percorrida pelo chassi passa a nascer do giro da roda. O eixo acumula angulo e o contato converte isso em deslocamento.",
      },
      {
        title: "Slip e tracao",
        formula:
          "$$s = \\omega R - v_c,\\qquad F_t = \\operatorname{clamp}(k_s s,-\\mu N,\\mu N)$$",
        explanation:
          "Quando a banda da roda tenta correr mais do que o ponto de contato, o atrito devolve uma forca tangencial limitada pelo normal.",
      },
      {
        title: "Torque no eixo",
        formula:
          "$$\\tau_{motor} - F_tR - \\tau_{rr} = I_w\\alpha_w$$",
        explanation:
          "O motor acelera o eixo; a tracao no solo e a resistencia ao rolamento roubam parte desse torque.",
      },
      {
        title: "Translacao + rotacao do chassi",
        formula: "$$\\sum \\vec{F} = m\\vec{a},\\qquad \\sum \\tau = I\\alpha$$",
        explanation:
          "A empilhadeira e tratada como rigidbody 2D com velocidade linear e angular.",
      },
      {
        title: "Geometria do pistao de tilt",
        formula:
          "$$L_c = \\|\\vec{p}_{mast}(h) - \\vec{p}_{garfo}(h,\\theta)\\|$$",
        explanation:
          "O tilt e resolvido por comprimento do cilindro. A cena encontra o angulo que fecha a geometria para aquele stroke.",
      },
      {
        title: "Atrito tangencial",
        formula: "$$|J_t| \\le \\mu J_n$$",
        explanation:
          "O atrito limita o deslizamento, permitindo arraste, empurrao e transferencia de forca entre caixas.",
      },
      {
        title: "Tombamento estatico simplificado",
        formula:
          "$$M_{res} = m_{emp} g d_{tras},\\qquad M_{carga} = m_{carga} g d_{frente}$$",
        explanation:
          "Se o momento da carga em torno do eixo dianteiro supera o momento restaurador da empilhadeira, a traseira alivia e o sistema entra em zona de tombamento.",
      },
      {
        title: "Deslizamento em superficie",
        formula: "$$\\vec{v}_{slide} = \\vec{v} - (\\vec{v}\\cdot\\hat{n})\\hat{n}$$",
        explanation:
          "A engine ja expoe a operacao de sliding vector para respostas projetadas sobre a tangente do contato.",
      },
    ],
    concept: [
      {
        title: "Showcase da engine, nao truque da cena",
        body: "Nesta cena o chassi, rodas, mastro, carriage e pa pertencem ao mesmo rigidbody composto. O mundo fisico desacoplado cuida de colisao, torque, atrito, rolamento e empurrao entre cargas.",
      },
      {
        title: "Atuadores internos, resposta externa real",
        body: "Lift e tilt sao atuadores internos com curso, velocidade e amortecimento. Como os colliders moveis ainda passam pelo solver, tocar o solo com a pa devolve reacao real no corpo principal.",
      },
      {
        title: "Escala coerente de massa",
        body: "Os controles agora trabalham em toneladas equivalentes. Isso permite comparar intuitivamente o peso da empilhadeira com o das cargas sem perder a estabilidade numerica da simulacao.",
      },
    ],
    studyNotes: [
      {
        title: "Primeiro teste util",
        body: "Entre por baixo do primeiro pallet com a pa baixa. Quando o encaixe estiver limpo, suba aos poucos e depois empurre a fila para sentir a transferencia de impulso.",
      },
      {
        title: "Derrube com intencao",
        body: "Incline demais a pa ou bata lateralmente na carga. O momento aplicado longe do centro de massa faz a caixa girar e tombar.",
      },
      {
        title: "Experimento de sobrecarga",
        body: "Aumente muito a massa do caixote A e mantenha a empilhadeira leve. Observe a margem estatica e veja quando a carga deixa de ser coerente com o veiculo.",
      },
    ],
    loopSteps: [
      {
        title: "1. Ler operador e eixo",
        body: "Drive vira torque no eixo. Lift e tilt viram comando para dois atuadores com velocidade e amortecimento limitados.",
      },
      {
        title: "2. Fechar a geometria interna",
        body: "O lift atualiza o carriage; o tilt atualiza o comprimento do cilindro e a cena resolve o angulo correspondente do garfo.",
      },
      {
        title: "3. Aplicar tracao no contato",
        body: "A diferenca entre velocidade angular da roda e velocidade no contato gera slip. O atrito devolve a forca tangencial que realmente move o chassi.",
      },
      {
        title: "4. Resolver o mundo",
        body: "A world do ventania3d integra forcas, encontra contatos e aplica impulso normal + atrito em multiplas iteracoes.",
      },
      {
        title: "5. Medir o showcase",
        body: "Queries como circleWithScene e rayWithScene alimentam o HUD com encaixe, folga da ponta, slip e estado das cargas.",
      },
    ],
    exercises: [
      {
        title: "Contato pela ponta",
        prompt:
          "O que acontece com o chassi quando voce inclina a pa para frente ate a ponta tocar o chao e continua forcando?",
        answer:
          "A reacao de contato aparece longe do centro de massa da empilhadeira, entao ela cria torque e o chassi tende a girar. E esse efeito que faz a frente levantar e o veiculo descrever um arco entre os apoios.",
      },
      {
        title: "Transferencia de forca",
        prompt:
          "Se a primeira carga encontra outra no caminho, por que a segunda tambem comeca a se mover?",
        answer:
          "Porque o solver propaga impulsos pelos contatos. A primeira caixa recebe forca da pa, comprime a cadeia de contatos e parte desse impulso passa para a segunda caixa respeitando massa, atrito e geometria.",
      },
    ],
    intuition: [
      {
        title: "Rigid body nao e so posicao",
        body: "O que torna esse showcase interessante e a componente angular. A mesma forca aplicada em outro ponto muda completamente o comportamento do veiculo ou da carga.",
      },
    ],
    engineering: [
      {
        title: "Base para uma engine maior",
        body: "O pacote ventania3d foi separado em math, collision, dynamics, forces, input e render debug. A cena usa esse mundo sem reaproveitar o solver simplificado antigo.",
      },
    ],
    pitfalls: [
      {
        title: "Confundir lift local com teleporte",
        body: "Subir a pa nao move a empilhadeira diretamente. O que move o chassi e a reacao fisica quando esse novo collider encontra algo e o solver devolve impulso.",
      },
      {
        title: "Achar que empurrao e script",
        body: "Aqui nao ha regra especial para empurrar outra caixa. Isso emerge do contato entre rigidbodies, entao massa, atrito e ponto de aplicacao importam de verdade.",
      },
    ],
  };
}

function toVector2(vector: Vector3) {
  return new Vector2(vector.x, vector.y);
}

function getColliderRole(colliderId: string) {
  if (colliderId.includes("wheel")) {
    return "wheel";
  }
  if (colliderId.includes("blade")) {
    return "blade";
  }
  if (colliderId.includes("fork")) {
    return "fork";
  }
  if (colliderId.includes("backplate")) {
    return "fork";
  }
  if (colliderId.includes("mast") || colliderId.includes("carriage")) {
    return "mast";
  }
  if (colliderId.includes("pallet")) {
    return "pallet";
  }
  if (colliderId.includes("foot")) {
    return "foot";
  }
  return "body";
}

function getFillColor(bodyId: string, colliderId: string) {
  if (bodyKind(bodyId) === "forklift") {
    const role = getColliderRole(colliderId);

    if (role === "wheel") {
      return "rgba(16, 26, 41, 0.28)";
    }
    if (role === "blade") {
      return "rgba(200, 226, 255, 0.18)";
    }
    if (role === "fork") {
      return "rgba(214, 231, 255, 0.16)";
    }
    if (role === "mast") {
      return "rgba(118, 208, 255, 0.14)";
    }

    return "rgba(255, 178, 76, 0.12)";
  }

  if (bodyKind(bodyId) === "payload") {
    if (colliderId.includes("pallet")) {
      return "rgba(161, 110, 54, 0.16)";
    }
    return colliderId.includes("foot")
      ? "rgba(120, 78, 31, 0.14)"
      : "rgba(156, 104, 62, 0.1)";
  }

  return "rgba(59, 86, 122, 0.7)";
}

function renderWheelDetails(
  ctx: CanvasRenderingContext2D,
  viewport: Parameters<typeof drawBodyCollider>[1],
  center: Vector3,
  rotation: number,
) {
  const screen = worldToScreen(viewport, toVector2(center));
  const radius = metersToPixels(viewport, WHEEL_RADIUS * 0.86);
  const axisLength = radius * 0.76;
  const axisDirection = Vector2.fromAngle(rotation, axisLength);

  ctx.save();
  ctx.strokeStyle = "rgba(255, 245, 214, 0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(screen.x - axisDirection.x, screen.y - axisDirection.y);
  ctx.lineTo(screen.x + axisDirection.x, screen.y + axisDirection.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(screen.x, screen.y, radius * 0.16, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 245, 214, 0.92)";
  ctx.fill();
  ctx.restore();
}

function renderContacts(
  ctx: CanvasRenderingContext2D,
  viewport: Parameters<typeof drawBodyCollider>[1],
  world: PhysicsWorld,
) {
  world.contacts.slice(0, 28).forEach((contact) => {
    contact.points.forEach((point) => {
      const screen = worldToScreen(viewport, toVector2(point.position));
      const normalEnd = point.position.add(contact.normal.scale(0.28));
      const normalScreen = worldToScreen(viewport, toVector2(normalEnd));

      ctx.save();
      ctx.fillStyle = "rgba(120, 240, 255, 0.92)";
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(120, 240, 255, 0.78)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(screen.x, screen.y);
      ctx.lineTo(normalScreen.x, normalScreen.y);
      ctx.stroke();
      ctx.restore();
    });
  });
}

function drawWorldPolygon(
  ctx: CanvasRenderingContext2D,
  viewport: Parameters<typeof drawBodyCollider>[1],
  points: Vector3[],
  fillStyle: string,
  strokeStyle = "rgba(255, 255, 255, 0.18)",
  lineWidth = 1.4,
) {
  if (points.length === 0) {
    return;
  }

  const first = worldToScreen(viewport, toVector2(points[0]));
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  points.slice(1).forEach((point) => {
    const screen = worldToScreen(viewport, toVector2(point));
    ctx.lineTo(screen.x, screen.y);
  });
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = strokeStyle;
  ctx.stroke();
  ctx.restore();
}

function getLocalBoxPoints(
  body: NonNullable<ReturnType<PhysicsWorld["getBody"]>>,
  center: Vector3,
  width: number,
  height: number,
  localRotation = 0,
) {
  const halfWidth = width * 0.5;
  const halfHeight = height * 0.5;
  return [
    new Vector3(-halfWidth, -halfHeight, 0),
    new Vector3(halfWidth, -halfHeight, 0),
    new Vector3(halfWidth, halfHeight, 0),
    new Vector3(-halfWidth, halfHeight, 0),
  ].map((point) => body.worldPoint(center.add(point.rotateZ(localRotation))));
}

function renderPayloadSkin(
  ctx: CanvasRenderingContext2D,
  viewport: Parameters<typeof drawBodyCollider>[1],
  body: NonNullable<ReturnType<PhysicsWorld["getBody"]>>,
  sprite?: HTMLImageElement,
) {
  const crateCenter = body.worldPoint(new Vector3(0.04, -0.1, 0));
  drawSpriteAtWorld(
    ctx,
    viewport,
    sprite,
    new Vector2(crateCenter.x, crateCenter.y),
    1.12,
    0.86,
    body.rotation,
    "#a16b3d",
  );

  drawWorldPolygon(
    ctx,
    viewport,
    getLocalBoxPoints(body, new Vector3(0.02, 0.31, 0), 1.18, 0.12),
    "rgba(164, 113, 56, 0.96)",
    "rgba(239, 211, 166, 0.3)",
  );
  drawWorldPolygon(
    ctx,
    viewport,
    getLocalBoxPoints(body, new Vector3(-0.06, 0.505, 0), 0.14, 0.27),
    "rgba(117, 78, 34, 0.96)",
    "rgba(239, 211, 166, 0.2)",
  );
  drawWorldPolygon(
    ctx,
    viewport,
    getLocalBoxPoints(body, new Vector3(0.44, 0.505, 0), 0.14, 0.27),
    "rgba(117, 78, 34, 0.96)",
    "rgba(239, 211, 166, 0.2)",
  );
}

function renderForkliftSkin(
  ctx: CanvasRenderingContext2D,
  viewport: Parameters<typeof drawBodyCollider>[1],
  body: NonNullable<ReturnType<PhysicsWorld["getBody"]>>,
  scene: ForkliftState,
) {
  drawWorldPolygon(
    ctx,
    viewport,
    getLocalBoxPoints(body, new Vector3(-0.1, -0.42, 0), 0.88, 0.58),
    "rgba(168, 210, 237, 0.9)",
    "rgba(240, 248, 255, 0.34)",
  );
  drawWorldPolygon(
    ctx,
    viewport,
    getLocalBoxPoints(body, new Vector3(-0.08, 0.04, 0), 2.18, 0.68),
    "rgba(224, 142, 33, 0.96)",
    "rgba(255, 224, 168, 0.28)",
  );
  drawWorldPolygon(
    ctx,
    viewport,
    getLocalBoxPoints(body, new Vector3(-0.84, -0.36, 0), 0.72, 0.9),
    "rgba(119, 74, 26, 0.94)",
    "rgba(255, 214, 154, 0.18)",
  );
  drawWorldPolygon(
    ctx,
    viewport,
    getLocalBoxPoints(body, new Vector3(0.84, -0.15, 0), 0.2, 2.42),
    "rgba(79, 101, 118, 0.96)",
    "rgba(211, 226, 237, 0.24)",
  );
  drawWorldPolygon(
    ctx,
    viewport,
    getLocalBoxPoints(body, new Vector3(0.98, 0.62 - scene.forkLift, 0), 0.18, 0.72),
    "rgba(123, 147, 175, 0.9)",
    "rgba(240, 246, 250, 0.18)",
  );
  drawWorldPolygon(
    ctx,
    viewport,
    getLocalBoxPoints(body, new Vector3(1.14, 0.78 - scene.forkLift, 0), 0.18, 0.48, scene.forkTilt),
    "rgba(143, 156, 171, 0.94)",
    "rgba(246, 249, 252, 0.18)",
  );

  const assembly = getForkAssemblyLocal(scene.forkLift, scene.forkTilt);
  const bladeHeel = body.worldPoint(assembly.bladeHeel);
  const bladeEntry = body.worldPoint(assembly.bladeEntry);
  const bladeTip = body.worldPoint(assembly.bladeTip);
  const lamp = body.worldPoint(new Vector3(0.86, -0.02, 0));
  const lampGlow = worldToScreen(viewport, toVector2(lamp));
  ctx.save();
  ctx.fillStyle = "rgba(255, 231, 164, 0.92)";
  ctx.beginPath();
  ctx.arc(lampGlow.x, lampGlow.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawLineWorld(
    ctx,
    viewport,
    toVector2(bladeHeel),
    toVector2(bladeEntry),
    "rgba(198, 208, 221, 0.9)",
    6,
  );
  drawLineWorld(
    ctx,
    viewport,
    toVector2(bladeEntry),
    toVector2(bladeTip),
    "rgba(228, 237, 247, 0.96)",
    5,
  );
  drawLineWorld(
    ctx,
    viewport,
    toVector2(bladeHeel.add(new Vector3(0, -0.04, 0))),
    toVector2(bladeTip.add(new Vector3(0, -0.04, 0))),
    "rgba(123, 147, 175, 0.9)",
    2,
  );
}

export const forkliftScene: SceneDefinition = {
  id: "forklift-showcase",
  title: "Empilhadeira showcase",
  subtitle: "Rigid body, contatos, atrito e carga",
  accent: "#ffb85a",
  category: "Engine",
  summary:
    "Cena-cobaia do ventania3d: rigidbody composto, eixo com rolamento, pistoes internos, caixas dinamicas, solver de contato e transferencia de forca entre cargas.",
  worldWidth: 18,
  worldHeight: 8.4,
  keyboardHints: [
    "← / → dirigem",
    "W / S sobem e descem a pa",
    "Z / X inclinam a pa",
    "Shift ativa o modo pancada",
  ],
  autoLoopDefault: false,
  defaults: {
    gravity: 9.81,
    forkliftMass: 3.6,
    payloadFrontMass: 0.2,
    payloadMiddleMass: 0.18,
    payloadRearMass: 0.15,
    driveTorque: 140,
    liftSpeed: 1.1,
    tiltSpeed: 0.16,
    maxLift: 1.55,
    maxBackTilt: 0.18,
    maxForwardTilt: 0.09,
    surfaceFriction: 0.88,
    payloadFriction: 0.84,
    forkSurfaceFriction: 0.24,
    chassisDrag: 1.2,
    wheelInertia: 1.9,
    wheelAngularDamping: 3.2,
    tractionGain: 2400,
    rollingResistanceTorque: 10,
    liftActuatorAccel: 5.8,
    liftActuatorDamping: 5.6,
    tiltCylinderAccel: 0.75,
    tiltCylinderDamping: 5.4,
    boostTorqueMultiplier: 1.55,
    boostTractionMultiplier: 2.6,
    hydraulicAssist: 1.05,
  },
  controls: [
    {
      key: "forkliftMass",
      label: "Massa da empilhadeira",
      min: 1.8,
      max: 6.5,
      step: 0.1,
      unit: "t",
      description: "Massa total equivalente da empilhadeira. Ela define a reserva contra tombamento e a inercia do corpo principal.",
    },
    {
      key: "payloadFrontMass",
      label: "Massa do caixote A",
      min: 0.05,
      max: 3.8,
      step: 0.1,
      unit: "t",
      description: "Carga frontal. Use para testar limite de capacidade e tombamento quando a pa entra por baixo.",
    },
    {
      key: "payloadMiddleMass",
      label: "Massa do caixote B",
      min: 0.05,
      max: 3.8,
      step: 0.1,
      unit: "t",
      description: "Carga intermediaria. Ajuda a observar transferencia de impacto entre caixas com massas diferentes.",
    },
    {
      key: "payloadRearMass",
      label: "Massa do caixote C",
      min: 0.05,
      max: 3.8,
      step: 0.1,
      unit: "t",
      description: "Carga traseira. Fica util para experimentar cadeia de empurrao e propagacao de impulso.",
    },
    {
      key: "driveTorque",
      label: "Torque no eixo",
      min: 60,
      max: 420,
      step: 5,
      unit: "N·m",
      description: "O torque acelera a roda; a forca no chassi surge depois pelo contato com o solo.",
    },
    {
      key: "liftSpeed",
      label: "Velocidade do lift",
      min: 0.4,
      max: 1.8,
      step: 0.05,
      unit: "m/s",
      description: "Limite de velocidade do pistao vertical que sobe e desce o carriage.",
    },
    {
      key: "tiltSpeed",
      label: "Velocidade do pistao de tilt",
      min: 0.04,
      max: 0.32,
      step: 0.01,
      unit: "m/s",
      description: "Limite de velocidade do cilindro que inclina o conjunto da pa.",
    },
    {
      key: "surfaceFriction",
      label: "Atrito com o solo",
      min: 0.2,
      max: 1.2,
      step: 0.02,
      unit: "",
      description: "Limite de atrito tangencial nos contatos da empilhadeira com o chao.",
    },
    {
      key: "payloadFriction",
      label: "Atrito das cargas",
      min: 0.15,
      max: 1,
      step: 0.02,
      unit: "",
      description: "Controla escorregamento entre pa, carga e carga com carga.",
    },
    {
      key: "gravity",
      label: "Gravidade",
      min: 1,
      max: 20,
      step: 0.1,
      unit: "m/s²",
      description: "Entra em todos os contatos normais e no peso aparente da operacao.",
    },
  ],
  createState: (config) => {
    const { world, groundY } = createForkliftWorld(config);
    const initialPayloadPositions = Object.fromEntries(
      PAYLOAD_IDS.map((id) => [id, world.getBody(id)?.position.x ?? 0]),
    );
    const initialForkLift = 0;
    const initialForkTilt = -0.02;

    const scene: ForkliftState = {
      world,
      groundY,
      forkLift: initialForkLift,
      forkTilt: initialForkTilt,
      liftCylinderExtension: initialForkLift,
      liftCylinderVelocity: 0,
      tiltCylinderLength: getTiltCylinderLength(initialForkLift, initialForkTilt),
      tiltCylinderVelocity: 0,
      wheelAngle: 0,
      wheelAngularVelocity: 0,
      wheelSlip: 0,
      tractionForce: 0,
      groundedWheels: 0,
      engagedPayloadId: null,
      tipContacts: 0,
      raisedPayloads: 0,
      movedPayloads: 0,
      chassisPitchDeg: 0,
      lastForkClearance: 0,
      lastDriveTorque: 0,
      activePayloadMass: 0,
      staticReserveMoment: 0,
      estimatedCapacity: 0,
      initialPayloadPositions,
    };

    updateForkAssembly(scene.world, scene.forkLift, scene.forkTilt);
    inspectForkliftState(scene);
    return scene;
  },
  step: ({ state, config, dt, input }) => {
    const scene = getState(state);
    scene.world.gravity = new Vector3(0, config.gravity, 0);

    const commands = readForkliftCommands(input);
    const maxLiftSpeed = configValue(config, "liftSpeed", 1.1);
    const liftActuatorAccel = configValue(config, "liftActuatorAccel", 5.8);
    const liftActuatorDamping = configValue(config, "liftActuatorDamping", 5.6);
    scene.liftCylinderVelocity += commands.lift * liftActuatorAccel * dt;
    scene.liftCylinderVelocity *= Math.max(0, 1 - liftActuatorDamping * dt);
    scene.liftCylinderVelocity = clamp(
      scene.liftCylinderVelocity,
      -maxLiftSpeed,
      maxLiftSpeed,
    );
    scene.liftCylinderExtension = clamp(
      scene.liftCylinderExtension + scene.liftCylinderVelocity * dt,
      0,
      config.maxLift,
    );
    if (
      (scene.liftCylinderExtension <= 0 && scene.liftCylinderVelocity < 0) ||
      (scene.liftCylinderExtension >= config.maxLift && scene.liftCylinderVelocity > 0)
    ) {
      scene.liftCylinderVelocity = 0;
    }
    scene.forkLift = scene.liftCylinderExtension;

    const tiltRange = getTiltCylinderRange(
      scene.forkLift,
      config.maxBackTilt,
      config.maxForwardTilt,
    );
    const maxTiltCylinderSpeed = configValue(config, "tiltSpeed", 0.16);
    const tiltCylinderAccel = configValue(config, "tiltCylinderAccel", 0.75);
    const tiltCylinderDamping = configValue(config, "tiltCylinderDamping", 5.4);
    const tiltCylinderCommand = -commands.tilt * tiltRange.direction;
    scene.tiltCylinderVelocity += tiltCylinderCommand * tiltCylinderAccel * dt;
    scene.tiltCylinderVelocity *= Math.max(0, 1 - tiltCylinderDamping * dt);
    scene.tiltCylinderVelocity = clamp(
      scene.tiltCylinderVelocity,
      -maxTiltCylinderSpeed,
      maxTiltCylinderSpeed,
    );
    scene.tiltCylinderLength = clamp(
      scene.tiltCylinderLength + scene.tiltCylinderVelocity * dt,
      tiltRange.min,
      tiltRange.max,
    );
    if (
      (scene.tiltCylinderLength <= tiltRange.min && scene.tiltCylinderVelocity < 0) ||
      (scene.tiltCylinderLength >= tiltRange.max && scene.tiltCylinderVelocity > 0)
    ) {
      scene.tiltCylinderVelocity = 0;
    }
    scene.forkTilt = solveTiltAngleForCylinderLength(
      scene.tiltCylinderLength,
      scene.forkLift,
      -config.maxBackTilt,
      config.maxForwardTilt,
      scene.forkTilt,
    );
    updateForkAssembly(scene.world, scene.forkLift, scene.forkTilt);
    const bladePoints = getForkBladePoints(scene.world, scene);

    const forklift = scene.world.getBody(FORKLIFT_ID);
    if (forklift) {
      const forwardAxis = Vector3.fromAngle(forklift.rotation, 1);
      const downAxis = Vector3.fromAngle(forklift.rotation + Math.PI / 2, 1);
      const rearWheelCenter = forklift.worldPoint(REAR_WHEEL_LOCAL);
      const frontWheelCenter = forklift.worldPoint(FRONT_WHEEL_LOCAL);
      const rearContactPoint = rearWheelCenter.add(downAxis.scale(WHEEL_RADIUS));
      const frontContactPoint = frontWheelCenter.add(downAxis.scale(WHEEL_RADIUS));
      const rearSupported = hasWheelSupport(
        scene.world,
        rearContactPoint.add(downAxis.scale(0.04)),
      );
      const frontSupported = hasWheelSupport(
        scene.world,
        frontContactPoint.add(downAxis.scale(0.04)),
      );
      const rearContactSpeed = forklift.getPointVelocity(rearContactPoint).dot(forwardAxis);
      const frontContactSpeed = forklift.getPointVelocity(frontContactPoint).dot(forwardAxis);
      const contactSpeed = (rearContactSpeed + frontContactSpeed) * 0.5;
      const wheelSupport = {
        rear: rearSupported,
        front: frontSupported,
        count: (rearSupported ? 1 : 0) + (frontSupported ? 1 : 0),
      };
      const supportRatio = wheelSupport.count / 2;
      const turboTorqueMultiplier = commands.boost
        ? configValue(config, "boostTorqueMultiplier", 1.55)
        : 1;
      const turboTractionMultiplier = commands.boost
        ? configValue(config, "boostTractionMultiplier", 2.6)
        : 1;
      const driveTorque =
        commands.drive * configValue(config, "driveTorque", 220) * turboTorqueMultiplier;
      const tractionGain = configValue(config, "tractionGain", 2400);
      const wheelInertia = configValue(config, "wheelInertia", 1.9);
      const wheelAngularDamping = configValue(config, "wheelAngularDamping", 3.2);
      const rollingResistanceTorque = configValue(
        config,
        "rollingResistanceTorque",
        10,
      );
      const gravityLoad = forklift.mass * config.gravity * supportRatio;
      const tractionLimit = config.surfaceFriction * gravityLoad * turboTractionMultiplier;
      const rawSlip = scene.wheelAngularVelocity * WHEEL_RADIUS - contactSpeed;
      const tractionForce =
        wheelSupport.count === 0
          ? 0
          : clamp(rawSlip * tractionGain, -tractionLimit, tractionLimit);
      const rollingResistance =
        wheelSupport.count === 0
          ? 0
          : rollingResistanceTorque *
            Math.sign(
              Math.abs(scene.wheelAngularVelocity) > 0.02
                ? scene.wheelAngularVelocity
                : contactSpeed,
            );

      scene.wheelSlip = rawSlip;
      scene.tractionForce = tractionForce;
      scene.groundedWheels = wheelSupport.count;
      scene.lastDriveTorque = driveTorque;

      const wheelAngularAcceleration =
        (driveTorque -
          tractionForce * WHEEL_RADIUS -
          rollingResistance -
          scene.wheelAngularVelocity * wheelAngularDamping) /
        wheelInertia;
      scene.wheelAngularVelocity += wheelAngularAcceleration * dt;
      if (
        Math.abs(commands.drive) < 0.01 &&
        wheelSupport.count > 0 &&
        Math.abs(contactSpeed) < 0.025 &&
        Math.abs(scene.wheelAngularVelocity) < 0.06
      ) {
        scene.wheelAngularVelocity = 0;
      }
      scene.wheelAngle += scene.wheelAngularVelocity * dt;

      const tractionPerWheel =
        wheelSupport.count > 0 ? tractionForce / wheelSupport.count : 0;
      if (wheelSupport.rear) {
        forklift.applyForceAtPoint(
          forwardAxis.scale(tractionPerWheel * WORLD_SUBSTEPS),
          rearContactPoint,
        );
      }
      if (wheelSupport.front) {
        forklift.applyForceAtPoint(
          forwardAxis.scale(tractionPerWheel * WORLD_SUBSTEPS),
          frontContactPoint,
        );
      }

      if (Math.abs(forklift.velocity.x) > 0.02) {
        forklift.applyForce(
          new Vector3(-forklift.velocity.x * config.chassisDrag * WORLD_SUBSTEPS, 0, 0),
        );
      }
    }

    if (forklift && scene.engagedPayloadId) {
      const payload = scene.world.getBody(scene.engagedPayloadId);
      if (payload) {
        const shouldSupportPayload =
          commands.lift > 0 || payload.position.y < scene.groundY - 0.72;
        if (shouldSupportPayload) {
          const supportMagnitude =
            payload.mass *
            config.gravity *
            configValue(config, "hydraulicAssist", 1.05) *
            WORLD_SUBSTEPS;
          const supportPoint = bladePoints.entry.add(bladePoints.tip).scale(0.5);
          payload.applyForceAtPoint(new Vector3(0, -supportMagnitude, 0), supportPoint);
          forklift.applyForceAtPoint(new Vector3(0, supportMagnitude, 0), supportPoint);
        }
      }
    }

    PAYLOAD_IDS.forEach((id) => {
      const payload = scene.world.getBody(id);
      if (!payload) {
        return;
      }

      if (payload.velocity.length > 0.02) {
        payload.applyForce(payload.velocity.scale(-1.2 * WORLD_SUBSTEPS));
      }
    });

    scene.world.step(dt, WORLD_SUBSTEPS);
    if (
      forklift &&
      commands.drive === 0 &&
      commands.lift === 0 &&
      commands.tilt === 0 &&
      Math.abs(forklift.velocity.x) < 0.018 &&
      Math.abs(forklift.velocity.y) < 0.018 &&
      Math.abs(forklift.angularVelocity) < 0.02 &&
      Math.abs(scene.wheelAngularVelocity) < 0.65 &&
      Math.abs(scene.liftCylinderVelocity) < 0.02 &&
      Math.abs(scene.tiltCylinderVelocity) < 0.02
    ) {
      forklift.sleep();
      scene.wheelAngularVelocity = 0;
      scene.wheelSlip = 0;
      scene.tractionForce = 0;
      scene.liftCylinderVelocity = 0;
      scene.tiltCylinderVelocity = 0;
    }
    inspectForkliftState(scene);
  },
  render: ({ ctx, state, viewport, sprites }) => {
    const scene = getState(state);
    const forklift = scene.world.getBody(FORKLIFT_ID);
    const bladePoints = getForkBladePoints(scene.world, scene);

    drawGrid(ctx, viewport, 1);
    drawGround(ctx, viewport, scene.groundY, "Piso de teste");

    drawLineWorld(
      ctx,
      viewport,
      new Vector2(10.9, scene.groundY - 0.02),
      new Vector2(10.9, scene.groundY - 1.8),
      "rgba(255, 184, 90, 0.34)",
      2,
    );
    drawWorldLabel(
      ctx,
      viewport,
      new Vector2(11.08, scene.groundY - 1.58),
      "zona de picking",
    );

    scene.world.bodies
      .filter((body) => body.id !== GROUND_ID && !body.id.startsWith("forklift-wall"))
      .forEach((body) => {
        body.getSnapshots().forEach((snapshot) => {
          drawBodyCollider(
            ctx,
            viewport,
            snapshot,
            getFillColor(body.id, snapshot.collider.id),
          );
        });

        if (bodyKind(body.id) === "forklift") {
          drawBodyCenter(ctx, viewport, body, "#fff0c2");
        }
      });

    if (forklift) {
      renderForkliftSkin(ctx, viewport, forklift, scene);
    }

    PAYLOAD_SPECS.forEach((payloadSpec) => {
      const payload = scene.world.getBody(payloadSpec.id);
      if (!payload) {
        return;
      }

      renderPayloadSkin(ctx, viewport, payload, sprites.crate);
    });

    if (forklift) {
      drawWorldLabel(
        ctx,
        viewport,
        new Vector2(forklift.position.x - 0.92, forklift.position.y - 1.88),
        `empilhadeira ${formatSimMass(forklift.mass)}`,
      );
    }

    PAYLOAD_SPECS.forEach((payloadSpec) => {
      const payload = scene.world.getBody(payloadSpec.id);
      if (!payload) {
        return;
      }

      drawWorldLabel(
        ctx,
        viewport,
        new Vector2(payload.position.x - 0.52, payload.position.y - 0.92),
        `${payloadSpec.label} ${formatSimMass(payload.mass)}`,
      );
    });

    if (forklift) {
      const wheelLeft = forklift.worldPoint(REAR_WHEEL_LOCAL);
      const wheelRight = forklift.worldPoint(FRONT_WHEEL_LOCAL);
      drawLineWorld(
        ctx,
        viewport,
        toVector2(wheelLeft),
        toVector2(wheelRight),
        "rgba(255, 245, 214, 0.7)",
        3,
      );
      drawLineWorld(
        ctx,
        viewport,
        toVector2(bladePoints.mastAnchor),
        toVector2(bladePoints.cylinderAnchor),
        "rgba(214, 231, 255, 0.9)",
        4,
      );
      renderWheelDetails(
        ctx,
        viewport,
        wheelLeft,
        forklift.rotation + scene.wheelAngle,
      );
      renderWheelDetails(
        ctx,
        viewport,
        wheelRight,
        forklift.rotation + scene.wheelAngle,
      );
    }

    const bladeTipScreen = worldToScreen(viewport, toVector2(bladePoints.tip));
    ctx.save();
    ctx.beginPath();
    ctx.arc(bladeTipScreen.x, bladeTipScreen.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = scene.engagedPayloadId
      ? "rgba(120, 255, 193, 0.92)"
      : "rgba(255, 129, 120, 0.92)";
    ctx.fill();
    ctx.restore();

    renderContacts(ctx, viewport, scene.world);
    drawWorldLabel(
      ctx,
      viewport,
      new Vector2(bladePoints.tip.x + 0.12, bladePoints.tip.y - 0.18),
      scene.engagedPayloadId ? "encaixe ok" : "ponta da pa",
    );
  },
  buildPanelData: (state, config) => buildPanel(getState(state), config),
  getCameraWindow: (state) => {
    const scene = getState(state);
    const forklift = scene.world.getBody(FORKLIFT_ID);
    const centerX = clamp(forklift?.position.x ?? 9, 8.5, 14.5);

    return {
      center: new Vector2(centerX, 4.35),
      width: 17,
      height: 8.4,
    };
  },
};
