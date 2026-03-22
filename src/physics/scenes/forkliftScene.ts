import { formatNumber, formatQuantity } from "../core/units";
import { clamp } from "../math/scalar";
import { Vector2 } from "../math/Vector2";
import {
  drawGrid,
  drawLineWorld,
  drawScenicBackdrop,
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
  createPolygon,
  createRigidBody,
  drawBodyCenter,
  drawBodyCollider,
  rayWithScene,
  readForkliftCommands,
} from "../../ventania3d";
import {
  FORKLIFT_BREAKABLE_CRATES,
  FORKLIFT_CAMERA_HEIGHT,
  FORKLIFT_CAMERA_WIDTH,
  FORKLIFT_GROUND_Y,
  FORKLIFT_PAYLOAD_SPAWN_Y,
  FORKLIFT_START_X,
  FORKLIFT_START_Y,
  FORKLIFT_SURFACE_PROFILES,
  FORKLIFT_TERRAIN_SEGMENTS,
  FORKLIFT_WORLD_HEIGHT,
  FORKLIFT_WORLD_WIDTH,
  getForkliftSurfaceProfile,
  getSurfaceProfileForPoint,
  getTerrainLabelPoint,
  getTerrainPolygonPoints,
  getTerrainTopLine,
  type ForkliftBreakableCrateSpec,
  type ForkliftSurfaceProfile,
} from "./forkliftMap";
import { SceneDefinition, ScenePanelData, SceneState } from "./types";

const FORKLIFT_ID = "forklift-showcase";
const TERRAIN_BODY_PREFIX = "forklift-terrain-";
const WALL_BODY_PREFIX = "forklift-wall";
const BREAKABLE_BODY_PREFIX = "forklift-breakable-";
const DEBRIS_BODY_PREFIX = "forklift-debris-";
const PAYLOAD_IDS = ["payload-alpha", "payload-beta", "payload-gamma"];
const BREAKABLE_CRATE_IDS = FORKLIFT_BREAKABLE_CRATES.map(
  (entry) => `${BREAKABLE_BODY_PREFIX}${entry.id}`,
);
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
  activeSurfaceId: keyof typeof FORKLIFT_SURFACE_PROFILES;
  activeSurfaceLabel: string;
  activeSurfaceGripMultiplier: number;
  furthestTravelX: number;
  brokenCrates: number;
  initialPayloadPositions: Record<string, number>;
}

function getState(state: SceneState) {
  return state as ForkliftState;
}

function bodyKind(bodyId: string) {
  if (bodyId === FORKLIFT_ID) {
    return "forklift";
  }

  if (isTerrainBodyId(bodyId) || bodyId.startsWith(WALL_BODY_PREFIX)) {
    return "static";
  }

  if (isBreakableBodyId(bodyId)) {
    return "breakable";
  }

  if (isDebrisBodyId(bodyId)) {
    return "debris";
  }

  return "payload";
}

function isTerrainBodyId(bodyId: string) {
  return bodyId.startsWith(TERRAIN_BODY_PREFIX);
}

function isStaticSupportBodyId(bodyId: string) {
  return isTerrainBodyId(bodyId) || bodyId.startsWith(WALL_BODY_PREFIX);
}

function isBreakableBodyId(bodyId: string) {
  return bodyId.startsWith(BREAKABLE_BODY_PREFIX);
}

function isDebrisBodyId(bodyId: string) {
  return bodyId.startsWith(DEBRIS_BODY_PREFIX);
}

function getBreakableBodyId(specId: string) {
  return `${BREAKABLE_BODY_PREFIX}${specId}`;
}

function getBreakableCrateSpec(bodyId: string) {
  const specId = bodyId.replace(BREAKABLE_BODY_PREFIX, "");
  return FORKLIFT_BREAKABLE_CRATES.find((entry) => entry.id === specId);
}

function getShortestAngleDelta(target: number, current: number) {
  return Math.atan2(Math.sin(target - current), Math.cos(target - current));
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

function createTerrainBody(
  segment: (typeof FORKLIFT_TERRAIN_SEGMENTS)[number],
  config: Record<string, number>,
) {
  const surface = getForkliftSurfaceProfile(segment.surfaceId);
  const points = getTerrainPolygonPoints(segment);

  return createRigidBody({
    id: `${TERRAIN_BODY_PREFIX}${segment.id}`,
    type: "static",
    position: Vector3.zero(),
    colliders: [
      {
        id: `${segment.id}-shape`,
        shape: createPolygon(points),
        material: {
          density: 0,
          friction: config.surfaceFriction * surface.frictionMultiplier,
          restitution: 0.01,
        },
      },
    ],
    userData: {
      kind: "terrain",
      surfaceId: segment.surfaceId,
    },
  });
}

function createBreakableCrateBody(spec: ForkliftBreakableCrateSpec) {
  return createRigidBody({
    id: getBreakableBodyId(spec.id),
    position: spec.position,
    mass: spec.mass,
    inertia: spec.mass * 0.26,
    linearDamping: 0.08,
    angularDamping: 0.11,
    colliders: [
      {
        id: `${spec.id}-body`,
        shape: createBox(spec.width, spec.height),
        material: {
          density: 1,
          friction: 0.7,
          restitution: 0.05,
        },
      },
    ],
    userData: {
      kind: "breakable",
      breakThreshold: spec.breakThreshold,
    },
  });
}

function resolveSurfaceResponse(points: Vector3[]) {
  const profiles = points.map((point) => getSurfaceProfileForPoint(point));
  const gripMultiplier =
    profiles.reduce((sum, profile) => sum + profile.frictionMultiplier, 0) /
    Math.max(profiles.length, 1);
  const rollingResistanceMultiplier =
    profiles.reduce(
      (sum, profile) => sum + profile.rollingResistanceMultiplier,
      0,
    ) / Math.max(profiles.length, 1);
  const dragMultiplier =
    profiles.reduce((sum, profile) => sum + profile.dragMultiplier, 0) /
    Math.max(profiles.length, 1);
  const primaryProfile = profiles.reduce<ForkliftSurfaceProfile>(
    (best, profile) =>
      profile.frictionMultiplier < best.frictionMultiplier ? profile : best,
    profiles[0] ?? getForkliftSurfaceProfile("concrete"),
  );

  return {
    primaryProfile,
    gripMultiplier,
    rollingResistanceMultiplier,
    dragMultiplier,
  };
}

function getStabilityAssistTargetRotation(
  scene: ForkliftState,
  rearWheelCenter: Vector3,
  frontWheelCenter: Vector3,
) {
  const ignoreBodyIds = [
    FORKLIFT_ID,
    ...PAYLOAD_IDS,
    ...BREAKABLE_CRATE_IDS,
    ...scene.world.bodies
      .filter((body) => isDebrisBodyId(body.id))
      .map((body) => body.id),
  ];
  const rayOptions = { ignoreBodyIds };
  const rayDistance = 1.8;
  const rearHit = rayWithScene(
    scene.world,
    rearWheelCenter,
    Vector3.down(),
    rayDistance,
    rayOptions,
  );
  const frontHit = rayWithScene(
    scene.world,
    frontWheelCenter,
    Vector3.down(),
    rayDistance,
    rayOptions,
  );

  if (
    rearHit &&
    frontHit &&
    isStaticSupportBodyId(rearHit.bodyId) &&
    isStaticSupportBodyId(frontHit.bodyId)
  ) {
    return clamp(
      Math.atan2(
        frontHit.point.y - rearHit.point.y,
        frontHit.point.x - rearHit.point.x,
      ),
      -0.42,
      0.42,
    );
  }

  return 0;
}

function updateSurfaceTelemetry(scene: ForkliftState, points: Vector3[]) {
  const surface = resolveSurfaceResponse(points);
  scene.activeSurfaceId = surface.primaryProfile.id;
  scene.activeSurfaceLabel = surface.primaryProfile.label;
  scene.activeSurfaceGripMultiplier = surface.gripMultiplier;
}

function renderTerrainTexture(
  ctx: CanvasRenderingContext2D,
  viewport: Parameters<typeof drawBodyCollider>[1],
  segment: (typeof FORKLIFT_TERRAIN_SEGMENTS)[number],
  surface: ForkliftSurfaceProfile,
) {
  const [topStart, topEnd] = getTerrainTopLine(segment);
  const topDirection = topEnd.subtract(topStart);
  const topLength = topDirection.length;
  const tangent = topDirection.normalized();
  const normal = tangent.perpendicular().normalized();
  const startOffset = 0.8;
  const endOffset = 0.8;

  if (surface.id === "concrete") {
    for (let distance = startOffset; distance < topLength - endOffset; distance += 2.25) {
      const markStart = topStart
        .add(tangent.scale(distance))
        .add(normal.scale(0.2));
      const markEnd = markStart.add(tangent.scale(Math.min(1.05, topLength - distance - 0.4)));
      drawLineWorld(
        ctx,
        viewport,
        toVector2(markStart),
        toVector2(markEnd),
        "rgba(244, 249, 255, 0.24)",
        2,
      );
    }
    return;
  }

  if (surface.id === "gravel") {
    for (let distance = startOffset; distance < topLength - 0.2; distance += 0.95) {
      const anchor = topStart
        .add(tangent.scale(distance))
        .add(normal.scale(0.18));
      drawLineWorld(
        ctx,
        viewport,
        toVector2(anchor.add(tangent.scale(-0.14))),
        toVector2(anchor.add(normal.scale(0.12))),
        "rgba(255, 233, 194, 0.22)",
        1.4,
      );
    }
    return;
  }

  if (surface.id === "steel") {
    for (let distance = 0.5; distance < topLength - 0.2; distance += 1.1) {
      const stripeBase = topStart.add(tangent.scale(distance));
      drawLineWorld(
        ctx,
        viewport,
        toVector2(stripeBase.add(normal.scale(0.06))),
        toVector2(
          stripeBase.add(tangent.scale(0.42)).add(normal.scale(0.34)),
        ),
        "rgba(255, 200, 120, 0.34)",
        2,
      );
    }
    return;
  }

  for (let distance = 0.35; distance < topLength - 0.1; distance += 0.92) {
    const plank = topStart.add(tangent.scale(distance));
    drawLineWorld(
      ctx,
      viewport,
      toVector2(plank.add(normal.scale(-0.02))),
      toVector2(plank.add(normal.scale(0.28))),
      "rgba(242, 218, 182, 0.2)",
      1.6,
    );
  }
}

function renderForkliftMap(
  ctx: CanvasRenderingContext2D,
  viewport: Parameters<typeof drawBodyCollider>[1],
) {
  FORKLIFT_TERRAIN_SEGMENTS.forEach((segment) => {
    const surface = getForkliftSurfaceProfile(segment.surfaceId);
    drawWorldPolygon(
      ctx,
      viewport,
      getTerrainPolygonPoints(segment),
      surface.sideColor,
      "rgba(255, 255, 255, 0.08)",
      1.2,
    );
    const [topStart, topEnd] = getTerrainTopLine(segment);
    drawLineWorld(
      ctx,
      viewport,
      toVector2(topStart),
      toVector2(topEnd),
      surface.topColor,
      6,
    );
    drawLineWorld(
      ctx,
      viewport,
      toVector2(topStart),
      toVector2(topEnd),
      surface.accentColor,
      1.5,
    );
    renderTerrainTexture(ctx, viewport, segment, surface);
    drawWorldLabel(
      ctx,
      viewport,
      new Vector2(getTerrainLabelPoint(segment).x, getTerrainLabelPoint(segment).y),
      segment.label,
    );
  });
}

function renderBreakableCrateSkin(
  ctx: CanvasRenderingContext2D,
  viewport: Parameters<typeof drawBodyCollider>[1],
  body: NonNullable<ReturnType<PhysicsWorld["getBody"]>>,
  spec: ForkliftBreakableCrateSpec,
) {
  const boxPoints = getLocalBoxPoints(body, Vector3.zero(), spec.width, spec.height);
  drawWorldPolygon(
    ctx,
    viewport,
    boxPoints,
    "rgba(164, 112, 58, 0.96)",
    "rgba(245, 220, 180, 0.22)",
  );
  drawLineWorld(
    ctx,
    viewport,
    toVector2(boxPoints[0]),
    toVector2(boxPoints[2]),
    "rgba(244, 221, 186, 0.2)",
    2,
  );
  drawLineWorld(
    ctx,
    viewport,
    toVector2(boxPoints[1]),
    toVector2(boxPoints[3]),
    "rgba(244, 221, 186, 0.2)",
    2,
  );
}

function renderDebrisSkin(
  ctx: CanvasRenderingContext2D,
  viewport: Parameters<typeof drawBodyCollider>[1],
  body: NonNullable<ReturnType<PhysicsWorld["getBody"]>>,
) {
  drawWorldPolygon(
    ctx,
    viewport,
    getLocalBoxPoints(body, Vector3.zero(), 0.34, 0.18),
    "rgba(126, 84, 45, 0.9)",
    "rgba(238, 209, 168, 0.14)",
    1,
  );
}

function computeBreakableImpactSeverity(
  world: PhysicsWorld,
  contact: PhysicsWorld["contactEvents"]["begin"][number],
) {
  const bodyA = world.getBody(contact.bodyAId);
  const bodyB = world.getBody(contact.bodyBId);
  if (!bodyA || !bodyB) {
    return 0;
  }

  const contactSeverity = contact.points.reduce((best, point) => {
    const relativeVelocity = bodyB
      .getPointVelocity(point.position)
      .subtract(bodyA.getPointVelocity(point.position));
    const normalSpeed = Math.abs(relativeVelocity.dot(contact.normal));
    const tangentSpeed = Math.abs(
      relativeVelocity.dot(contact.normal.perpendicular().normalized()),
    );
    const impulse = Math.abs(point.normalImpulse) + Math.abs(point.tangentImpulse) * 0.4;
    return Math.max(best, normalSpeed + tangentSpeed * 0.24 + impulse * 0.012);
  }, 0);

  return contactSeverity;
}

function spawnBreakableDebris(
  scene: ForkliftState,
  spec: ForkliftBreakableCrateSpec,
  breakPoint: Vector3,
) {
  const offsets = [
    new Vector3(-0.24, -0.2, 0),
    new Vector3(0.22, -0.14, 0),
    new Vector3(-0.18, 0.18, 0),
    new Vector3(0.2, 0.16, 0),
  ];

  offsets.forEach((offset, index) => {
    const body = scene.world.addBody(
      createRigidBody({
        id: `${DEBRIS_BODY_PREFIX}${spec.id}-${index}-${scene.brokenCrates}`,
        position: spec.position.add(offset),
        rotation: (index - 1.5) * 0.22,
        velocity: offset.scale(2.8),
        mass: spec.mass * 0.12,
        inertia: spec.mass * 0.03,
        linearDamping: 0.32,
        angularDamping: 0.34,
        colliders: [
          {
            id: `${spec.id}-debris-${index}`,
            shape: createBox(0.34, 0.18),
            material: {
              density: 1,
              friction: 0.74,
              restitution: 0.08,
            },
          },
        ],
        userData: {
          kind: "debris",
        },
      }),
    );
    body.applyImpulse(
      offset.normalized().add(new Vector3(0, -0.4, 0)).scale(0.45),
      body.position,
    );
  });
}

function processBreakableCrates(scene: ForkliftState) {
  const brokenIds = new Set<string>();

  scene.world.contactEvents.begin.forEach((contact) => {
    const breakableBodyId = [contact.bodyAId, contact.bodyBId].find((bodyId) =>
      isBreakableBodyId(bodyId),
    );
    if (!breakableBodyId || brokenIds.has(breakableBodyId)) {
      return;
    }

    const spec = getBreakableCrateSpec(breakableBodyId);
    const breakableBody = scene.world.getBody(breakableBodyId);
    if (!spec || !breakableBody) {
      return;
    }

    const impactSeverity = computeBreakableImpactSeverity(scene.world, contact);
    if (impactSeverity < spec.breakThreshold) {
      return;
    }

    brokenIds.add(breakableBodyId);
    const breakPoint = contact.points[0]?.position ?? breakableBody.position;
    scene.world.removeBody(breakableBodyId);
    spawnBreakableDebris(scene, spec, breakPoint);
    scene.brokenCrates += 1;
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
  const groundY = FORKLIFT_GROUND_Y;
  const forkSurfaceFriction = configValue(config, "forkSurfaceFriction", 0.24);
  const world = new PhysicsWorld({
    gravity: new Vector3(0, config.gravity, 0),
    solverIterations: 12,
    positionIterations: 5,
  });

  FORKLIFT_TERRAIN_SEGMENTS.forEach((segment) => {
    world.addBody(createTerrainBody(segment, config));
  });

  world.addBody(
    createRigidBody({
      id: `${WALL_BODY_PREFIX}-left`,
      type: "static",
      position: new Vector3(-1.5, FORKLIFT_WORLD_HEIGHT * 0.5, 0),
      colliders: [
        {
          shape: createBox(2, FORKLIFT_WORLD_HEIGHT + 2),
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
      id: `${WALL_BODY_PREFIX}-right`,
      type: "static",
      position: new Vector3(FORKLIFT_WORLD_WIDTH + 1.5, FORKLIFT_WORLD_HEIGHT * 0.5, 0),
      colliders: [
        {
          shape: createBox(2, FORKLIFT_WORLD_HEIGHT + 2),
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
      position: new Vector3(FORKLIFT_START_X, FORKLIFT_START_Y, 0),
      mass: displayTonsToSimMass(config.forkliftMass),
      inertia: displayTonsToSimMass(config.forkliftMass) * 11.5,
      linearDamping: 0.12,
      angularDamping: 0.34,
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
        new Vector3(payload.spawnX, FORKLIFT_PAYLOAD_SPAWN_Y, 0),
        getPayloadMass(config, payload.id),
        config.payloadFriction,
      ),
    );
  });

  FORKLIFT_BREAKABLE_CRATES.forEach((spec) => {
    world.addBody(createBreakableCrateBody(spec));
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
      !isTerrainBodyId(contact.bodyBId) &&
      !contact.bodyBId.startsWith(WALL_BODY_PREFIX),
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
  scene.furthestTravelX = Math.max(scene.furthestTravelX, forklift?.position.x ?? 0);
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
        label: "Superficie atual",
        value: scene.activeSurfaceLabel,
        helper: `Grip relativo ${formatNumber(scene.activeSurfaceGripMultiplier, 2)}x sobre o atrito base. O cascalho da rampa entrega bem menos tracao que o patio.`,
      },
      {
        label: "Avanco no mapa",
        value: formatQuantity(Math.max(scene.furthestTravelX - FORKLIFT_START_X, 0), "m"),
        helper: "A fase agora passa da largura da tela; a camera segue a empilhadeira e registra o quanto voce ja explorou.",
      },
      {
        label: "Caixas quebradas",
        value: `${scene.brokenCrates}/${FORKLIFT_BREAKABLE_CRATES.length}`,
        helper: "Caixas leves se despedacam quando o impacto inicial passa do limite configurado para aquele obstaculo.",
      },
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
        title: "Agora existe um mapa de verdade",
        body: "A fase saiu do corredor curto e passou a ser um percurso maior que a tela, com patio, faixa de cascalho, rampa e deck elevado. A camera so mostra uma janela do mundo e acompanha a empilhadeira pelo mapa.",
      },
      {
        title: "Superficie muda a dirigibilidade",
        body: "Cada trecho do mapa aplica um multiplicador proprio de atrito, arrasto e resistencia ao rolamento. O efeito mais visivel esta no cascalho: ele deixa a rampa dependente de embalo em vez de torque bruto parado.",
      },
      {
        title: "Atuadores internos, resposta externa real",
        body: "Lift e tilt continuam sendo atuadores internos com curso, velocidade e amortecimento. Como os colliders moveis ainda passam pelo solver, tocar o solo, entrar na rampa ou bater numa caixa quebravel devolve reacao fisica no corpo principal.",
      },
    ],
    studyNotes: [
      {
        title: "Pegue embalo no cascalho",
        body: "Saia do patio de concreto com velocidade e entre na faixa de cascalho sem aliviar. A rampa foi calibrada para premiar entrada rapida; parado nela, a empilhadeira tende a patinar ou morrer.",
      },
      {
        title: "Leve uma carga ate o deck",
        body: "Entre por baixo de um pallet ainda na area inicial, estabilize a pa e tente carregar a caixa ate o piso metalico. A subida mostra a disputa entre peso, tracao e inercia.",
      },
      {
        title: "Quebre a barreira",
        body: "As caixas leves espalhadas pelo percurso quebram quando recebem uma pancada forte o bastante. Use o Shift para ganhar embalo e compare bater vazio com bater carregando um pallet.",
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

  if (bodyKind(bodyId) === "breakable") {
    return "rgba(176, 126, 70, 0.12)";
  }

  if (bodyKind(bodyId) === "debris") {
    return "rgba(110, 76, 42, 0.12)";
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
  subtitle: "Mapa maior, pisos variados, rampa e caixas quebraveis",
  accent: "#ffb85a",
  category: "Engine",
  summary:
    "Cena-cobaia maior do ventania3d: mapa side-view mais largo que a tela, camera seguindo a empilhadeira, pisos com atrito diferente, rampa de embalo, deck elevado e caixas quebraveis.",
  worldWidth: FORKLIFT_WORLD_WIDTH,
  worldHeight: FORKLIFT_WORLD_HEIGHT,
  keyboardHints: [
    "← / → dirigem",
    "W / S sobem e descem a pa",
    "Z / X inclinam a pa",
    "Shift ajuda a pegar embalo na rampa",
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
      description: "Multiplicador base do atrito. Cada piso do mapa ainda aplica seu proprio fator por cima desse valor.",
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
      activeSurfaceId: "concrete",
      activeSurfaceLabel: getForkliftSurfaceProfile("concrete").label,
      activeSurfaceGripMultiplier: 1,
      furthestTravelX: FORKLIFT_START_X,
      brokenCrates: 0,
      initialPayloadPositions,
    };

    updateForkAssembly(scene.world, scene.forkLift, scene.forkTilt);
    updateSurfaceTelemetry(scene, [
      new Vector3(FORKLIFT_START_X, FORKLIFT_GROUND_Y, 0),
      new Vector3(FORKLIFT_START_X + 0.8, FORKLIFT_GROUND_Y, 0),
    ]);
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
      const surfaceSamplePoints = [rearContactPoint, frontContactPoint];
      const surfaceResponse = resolveSurfaceResponse(surfaceSamplePoints);
      updateSurfaceTelemetry(scene, surfaceSamplePoints);
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
      const tractionLimit =
        config.surfaceFriction *
        surfaceResponse.gripMultiplier *
        gravityLoad *
        turboTractionMultiplier;
      const rawSlip = scene.wheelAngularVelocity * WHEEL_RADIUS - contactSpeed;
      const tractionForce =
        wheelSupport.count === 0
          ? 0
          : clamp(rawSlip * tractionGain, -tractionLimit, tractionLimit);
      const rollingResistance =
        wheelSupport.count === 0
          ? 0
          : rollingResistanceTorque *
            surfaceResponse.rollingResistanceMultiplier *
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
          new Vector3(
            -forklift.velocity.x *
              config.chassisDrag *
              surfaceResponse.dragMultiplier *
              WORLD_SUBSTEPS,
            0,
            0,
          ),
        );
      }

      if (wheelSupport.count > 0) {
        const targetRotation = getStabilityAssistTargetRotation(
          scene,
          rearWheelCenter,
          frontWheelCenter,
        );
        const rotationError = getShortestAngleDelta(
          targetRotation,
          forklift.rotation,
        );
        const assistGain = wheelSupport.count === 2 ? 17.5 : 11.5;
        const assistDamping = wheelSupport.count === 2 ? 5.8 : 4.1;
        const liftPenalty = clamp(
          1 - (scene.forkLift / Math.max(config.maxLift, 0.1)) * 0.22,
          0.74,
          1,
        );
        const stabilization =
          clamp(
            rotationError * assistGain -
              forklift.angularVelocity * assistDamping,
            -14,
            14,
          ) *
          supportRatio *
          liftPenalty;

        forklift.angularVelocity += stabilization * dt;

        if (
          Math.abs(rotationError) > 0.42 &&
          Math.abs(forklift.angularVelocity) > 0.9
        ) {
          forklift.angularVelocity *= 0.9;
        }
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
    processBreakableCrates(scene);
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

    drawScenicBackdrop(ctx, viewport, {
      groundY: scene.groundY,
      hillHeight: 1.55,
      treeBaseY: scene.groundY,
      treeSpacing: 4.4,
    });
    drawGrid(ctx, viewport, 1);
    renderForkliftMap(ctx, viewport);

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
      .filter((body) => !isTerrainBodyId(body.id) && !body.id.startsWith(WALL_BODY_PREFIX))
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

    FORKLIFT_BREAKABLE_CRATES.forEach((spec) => {
      const body = scene.world.getBody(getBreakableBodyId(spec.id));
      if (!body) {
        return;
      }

      renderBreakableCrateSkin(ctx, viewport, body, spec);
    });

    scene.world.bodies
      .filter((body) => isDebrisBodyId(body.id))
      .forEach((body) => {
        renderDebrisSkin(ctx, viewport, body);
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

    FORKLIFT_BREAKABLE_CRATES.forEach((spec) => {
      const body = scene.world.getBody(getBreakableBodyId(spec.id));
      if (!body) {
        return;
      }

      drawWorldLabel(
        ctx,
        viewport,
        new Vector2(body.position.x - 0.64, body.position.y - 0.8),
        spec.label,
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
    const cameraWidth = FORKLIFT_CAMERA_WIDTH;
    const cameraHeight = FORKLIFT_CAMERA_HEIGHT;
    const lookAhead = clamp((forklift?.velocity.x ?? 0) * 0.55, -2.1, 2.1);
    const centerX = clamp(
      (forklift?.position.x ?? FORKLIFT_START_X) + lookAhead,
      cameraWidth * 0.5,
      FORKLIFT_WORLD_WIDTH - cameraWidth * 0.5,
    );
    const centerY = clamp(
      (forklift?.position.y ?? FORKLIFT_START_Y) - 1.7,
      cameraHeight * 0.5,
      FORKLIFT_WORLD_HEIGHT - cameraHeight * 0.5,
    );

    return {
      center: new Vector2(centerX, centerY),
      width: cameraWidth,
      height: cameraHeight,
    };
  },
};
