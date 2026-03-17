import { ALL_COLLISION_BITS } from "../../collision/filter";
import { createBox, createCircle, createPolygon } from "../../collision/shapes";
import { createRigidBody, type BodyType, type RigidBody } from "../../dynamics/RigidBody";
import { PhysicsWorld } from "../../dynamics/World";
import { Vector3 } from "../../math/Vector3";
import {
  createPlatformerCharacterBody,
  type PlatformerCharacterBodyOptions,
} from "./CharacterController";

export const PLATFORMER_LAYERS = {
  solid: 1 << 0,
  oneWay: 1 << 1,
  player: 1 << 2,
  pickup: 1 << 3,
  hazard: 1 << 4,
  goal: 1 << 5,
  ladder: 1 << 6,
  checkpoint: 1 << 7,
  projectile: 1 << 8,
} as const;

export const PLATFORMER_ENVIRONMENT_MASK =
  PLATFORMER_LAYERS.solid | PLATFORMER_LAYERS.oneWay;
export const PLATFORMER_PLAYER_SENSOR_MASK =
  PLATFORMER_LAYERS.pickup |
  PLATFORMER_LAYERS.hazard |
  PLATFORMER_LAYERS.goal |
  PLATFORMER_LAYERS.ladder |
  PLATFORMER_LAYERS.checkpoint |
  PLATFORMER_LAYERS.projectile;
export const PLATFORMER_PLAYER_COLLISION_MASK =
  PLATFORMER_ENVIRONMENT_MASK | PLATFORMER_PLAYER_SENSOR_MASK;

export type VectorLike = Vector3 | { x: number; y: number; z?: number };
export type PlatformerTheme = "grass" | "stone";
export type PlatformerCollisionKind = "solid" | "one-way";
export type PlatformerProjectileOwner = "player" | "hazard";

export interface PlatformerStripDefinition {
  id: string;
  x: number;
  y: number;
  tilesWide: number;
  tilesHigh: number;
  theme: PlatformerTheme;
  bodyType?: BodyType;
  velocity?: VectorLike;
  collision?: PlatformerCollisionKind;
}

export interface PlatformerMovingPlatformDefinition
  extends Omit<PlatformerStripDefinition, "bodyType" | "velocity"> {
  axis: "x" | "y";
  min: number;
  max: number;
  speed: number;
}

export interface PlatformerSlopeDefinition {
  id: string;
  position: VectorLike;
  points: VectorLike[];
  fillStyle?: string;
  strokeStyle?: string;
}

export interface PlatformerGemDefinition {
  id: string;
  position: VectorLike;
}

export interface PlatformerSpikeDefinition {
  id: string;
  x: number;
  y: number;
  count: number;
}

export interface PlatformerLadderDefinition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlatformerCheckpointDefinition {
  id: string;
  position: VectorLike;
  width?: number;
  height?: number;
  label?: string;
}

export interface PlatformerGoalDefinition {
  id?: string;
  position: VectorLike;
  width?: number;
  height?: number;
}

export interface PlatformerProjectileEmitterDefinition {
  id: string;
  position: VectorLike;
  direction: VectorLike;
  speed: number;
  interval: number;
  startDelay?: number;
  radius?: number;
  ttl?: number;
  owner?: PlatformerProjectileOwner;
  color?: string;
  gravityScale?: number;
}

export interface PlatformerLevelDefinition {
  gravity?: number;
  solverIterations?: number;
  positionIterations?: number;
  broadPhaseCellSize?: number;
  maxSubsteps?: number;
  maxToiIterations?: number;
  spawnPoint: VectorLike;
  strips?: PlatformerStripDefinition[];
  movingPlatforms?: PlatformerMovingPlatformDefinition[];
  slopes?: PlatformerSlopeDefinition[];
  gems?: PlatformerGemDefinition[];
  spikes?: PlatformerSpikeDefinition[];
  ladders?: PlatformerLadderDefinition[];
  checkpoints?: PlatformerCheckpointDefinition[];
  projectileEmitters?: PlatformerProjectileEmitterDefinition[];
  goal?: PlatformerGoalDefinition;
}

export interface PlatformerStripRuntime extends PlatformerStripDefinition {
  bodyId: string;
  bodyType: BodyType;
  collision: PlatformerCollisionKind;
}

export interface PlatformerMovingPlatformRuntime
  extends PlatformerMovingPlatformDefinition {
  bodyId: string;
  bodyType: "kinematic";
  collision: PlatformerCollisionKind;
  previousPosition: Vector3;
  delta: Vector3;
}

export interface PlatformerSlopeRuntime extends PlatformerSlopeDefinition {
  bodyId: string;
  fillStyle: string;
  strokeStyle: string;
}

export interface PlatformerGemRuntime {
  id: string;
  bodyId: string;
  position: Vector3;
  collected: boolean;
}

export interface PlatformerSpikeRuntime extends PlatformerSpikeDefinition {
  bodyId: string;
}

export interface PlatformerLadderRuntime extends PlatformerLadderDefinition {
  bodyId: string;
}

export interface PlatformerCheckpointRuntime {
  id: string;
  bodyId: string;
  position: Vector3;
  width: number;
  height: number;
  label?: string;
  reached: boolean;
}

export interface PlatformerProjectileEmitterRuntime
  extends PlatformerProjectileEmitterDefinition {
  cooldown: number;
  shotsFired: number;
}

export interface PlatformerProjectileRuntime {
  id: string;
  bodyId: string;
  radius: number;
  owner: PlatformerProjectileOwner;
  color: string;
  ttlRemaining: number;
  gravityScale: number;
  destroyOnImpact: boolean;
  sourceEmitterId?: string;
}

export interface PlatformerProjectileImpact {
  projectileId: string;
  projectileBodyId: string;
  owner: PlatformerProjectileOwner;
  otherBodyId: string;
}

export interface PlatformerLevelRuntime {
  world: PhysicsWorld;
  strips: PlatformerStripRuntime[];
  movingPlatforms: PlatformerMovingPlatformRuntime[];
  slopes: PlatformerSlopeRuntime[];
  gems: PlatformerGemRuntime[];
  spikes: PlatformerSpikeRuntime[];
  ladders: PlatformerLadderRuntime[];
  checkpoints: PlatformerCheckpointRuntime[];
  projectileEmitters: PlatformerProjectileEmitterRuntime[];
  projectiles: PlatformerProjectileRuntime[];
  projectileImpacts: PlatformerProjectileImpact[];
  spawnPoint: Vector3;
  goalBodyId: string | null;
  playerBodyId: string | null;
  supportMotion: Record<string, Vector3>;
}

export interface BuildPlatformerLevelOptions {
  player?: PlatformerCharacterBodyOptions;
}

export function toVector3(value: VectorLike) {
  if (value instanceof Vector3) {
    return value.clone();
  }

  return new Vector3(value.x, value.y, value.z ?? 0);
}

export function clonePlatformerLevelDefinition(
  definition: PlatformerLevelDefinition,
): PlatformerLevelDefinition {
  const cloneVectorLike = (value: VectorLike) => toVector3(value);

  return {
    ...definition,
    spawnPoint: cloneVectorLike(definition.spawnPoint),
    strips: definition.strips?.map((strip) => ({
      ...strip,
      velocity: strip.velocity ? cloneVectorLike(strip.velocity) : undefined,
    })),
    movingPlatforms: definition.movingPlatforms?.map((platform) => ({ ...platform })),
    slopes: definition.slopes?.map((slope) => ({
      ...slope,
      position: cloneVectorLike(slope.position),
      points: slope.points.map(cloneVectorLike),
    })),
    gems: definition.gems?.map((gem) => ({
      ...gem,
      position: cloneVectorLike(gem.position),
    })),
    spikes: definition.spikes?.map((spike) => ({ ...spike })),
    ladders: definition.ladders?.map((ladder) => ({ ...ladder })),
    checkpoints: definition.checkpoints?.map((checkpoint) => ({
      ...checkpoint,
      position: cloneVectorLike(checkpoint.position),
    })),
    projectileEmitters: definition.projectileEmitters?.map((emitter) => ({
      ...emitter,
      position: cloneVectorLike(emitter.position),
      direction: cloneVectorLike(emitter.direction),
    })),
    goal: definition.goal
      ? {
          ...definition.goal,
          position: cloneVectorLike(definition.goal.position),
        }
      : undefined,
  };
}

export function getPlatformerStripTopY(
  strip: Pick<PlatformerStripDefinition, "y">,
) {
  return strip.y;
}

export function getPlatformerSurfaceHandlePosition(
  strip: Pick<PlatformerStripDefinition, "x" | "y" | "tilesWide">,
) {
  return new Vector3(strip.x + strip.tilesWide * 0.5, strip.y + 0.5, 0);
}

function createStripBody(definition: PlatformerStripDefinition) {
  const bodyType = definition.bodyType ?? "static";
  const collision = definition.collision ?? "solid";
  const colliderHeight =
    collision === "one-way"
      ? Math.min(0.28, Math.max(0.18, definition.tilesHigh * 0.28))
      : definition.tilesHigh;
  const centerY =
    collision === "one-way"
      ? definition.y + colliderHeight * 0.5
      : definition.y + definition.tilesHigh * 0.5;
  const layer =
    collision === "one-way" ? PLATFORMER_LAYERS.oneWay : PLATFORMER_LAYERS.solid;

  return createRigidBody({
    id: definition.id,
    type: bodyType,
    position: new Vector3(definition.x + definition.tilesWide * 0.5, centerY, 0),
    velocity: definition.velocity ? toVector3(definition.velocity) : Vector3.zero(),
    colliders: [
      {
        id: `${definition.id}-shape`,
        shape: createBox(definition.tilesWide, colliderHeight),
        material: {
          density: 0,
          friction: collision === "one-way" ? 0.78 : 0.92,
          restitution: 0,
        },
        collisionLayer: layer,
        collisionMask: ALL_COLLISION_BITS,
      },
    ],
    userData: {
      kind: collision === "one-way" ? "platformer-one-way" : "platformer-solid",
      theme: definition.theme,
    },
  });
}

function createSlopeBody(definition: PlatformerSlopeDefinition) {
  return createRigidBody({
    id: definition.id,
    type: "static",
    position: toVector3(definition.position),
    colliders: [
      {
        id: `${definition.id}-shape`,
        shape: createPolygon(definition.points.map(toVector3)),
        material: {
          density: 0,
          friction: 0.88,
          restitution: 0,
        },
        collisionLayer: PLATFORMER_LAYERS.solid,
        collisionMask: ALL_COLLISION_BITS,
      },
    ],
    userData: {
      kind: "platformer-slope",
    },
  });
}

function createSpikeBody(definition: PlatformerSpikeDefinition) {
  return createRigidBody({
    id: definition.id,
    type: "static",
    position: new Vector3(
      definition.x + definition.count * 0.5,
      definition.y + 0.78,
      0,
    ),
    colliders: [
      {
        id: `${definition.id}-sensor`,
        shape: createBox(definition.count, 0.4),
        material: {
          density: 0,
          friction: 0,
          restitution: 0,
        },
        isSensor: true,
        collisionLayer: PLATFORMER_LAYERS.hazard,
        collisionMask: PLATFORMER_LAYERS.player,
      },
    ],
    userData: {
      kind: "platformer-hazard",
    },
  });
}

function createGemBody(definition: PlatformerGemDefinition) {
  const position = toVector3(definition.position);
  return createRigidBody({
    id: definition.id,
    type: "static",
    position,
    colliders: [
      {
        id: `${definition.id}-sensor`,
        shape: createCircle(0.24),
        material: {
          density: 0,
          friction: 0,
          restitution: 0,
        },
        isSensor: true,
        collisionLayer: PLATFORMER_LAYERS.pickup,
        collisionMask: PLATFORMER_LAYERS.player,
      },
    ],
    userData: {
      kind: "platformer-gem",
    },
  });
}

function createLadderBody(definition: PlatformerLadderDefinition) {
  return createRigidBody({
    id: definition.id,
    type: "static",
    position: new Vector3(
      definition.x + definition.width * 0.5,
      definition.y + definition.height * 0.5,
      0,
    ),
    colliders: [
      {
        id: `${definition.id}-sensor`,
        shape: createBox(definition.width, definition.height),
        material: {
          density: 0,
          friction: 0,
          restitution: 0,
        },
        isSensor: true,
        collisionLayer: PLATFORMER_LAYERS.ladder,
        collisionMask: PLATFORMER_LAYERS.player,
      },
    ],
    userData: {
      kind: "platformer-ladder",
    },
  });
}

function createCheckpointBody(definition: PlatformerCheckpointDefinition) {
  const width = definition.width ?? 0.8;
  const height = definition.height ?? 1.8;
  const position = toVector3(definition.position);
  return createRigidBody({
    id: definition.id,
    type: "static",
    position,
    colliders: [
      {
        id: `${definition.id}-sensor`,
        shape: createBox(width, height),
        material: {
          density: 0,
          friction: 0,
          restitution: 0,
        },
        isSensor: true,
        collisionLayer: PLATFORMER_LAYERS.checkpoint,
        collisionMask: PLATFORMER_LAYERS.player,
      },
    ],
    userData: {
      kind: "platformer-checkpoint",
      label: definition.label,
    },
  });
}

function createGoalBody(definition: PlatformerGoalDefinition) {
  const id = definition.id ?? "platformer-exit";
  const position = toVector3(definition.position);
  return createRigidBody({
    id,
    type: "static",
    position,
    colliders: [
      {
        id: `${id}-sensor`,
        shape: createBox(definition.width ?? 0.8, definition.height ?? 1.6),
        material: {
          density: 0,
          friction: 0,
          restitution: 0,
        },
        isSensor: true,
        collisionLayer: PLATFORMER_LAYERS.goal,
        collisionMask: PLATFORMER_LAYERS.player,
      },
    ],
    userData: {
      kind: "platformer-goal",
    },
  });
}

export function buildPlatformerLevel(
  definition: PlatformerLevelDefinition,
  options: BuildPlatformerLevelOptions = {},
): PlatformerLevelRuntime {
  const world = new PhysicsWorld({
    gravity: new Vector3(0, definition.gravity ?? 22, 0),
    solverIterations: definition.solverIterations ?? 12,
    positionIterations: definition.positionIterations ?? 5,
    broadPhaseCellSize: definition.broadPhaseCellSize ?? 2.4,
    maxSubsteps: definition.maxSubsteps ?? 4,
    maxToiIterations: definition.maxToiIterations ?? 6,
  });

  const strips: PlatformerStripRuntime[] = [];
  const movingPlatforms: PlatformerMovingPlatformRuntime[] = [];
  const slopes: PlatformerSlopeRuntime[] = [];
  const spikes: PlatformerSpikeRuntime[] = [];
  const gems: PlatformerGemRuntime[] = [];
  const ladders: PlatformerLadderRuntime[] = [];
  const checkpoints: PlatformerCheckpointRuntime[] = [];
  const projectileEmitters: PlatformerProjectileEmitterRuntime[] = [];
  let goalBodyId: string | null = null;

  definition.strips?.forEach((strip) => {
    world.addBody(createStripBody(strip));
    strips.push({
      ...strip,
      bodyId: strip.id,
      bodyType: strip.bodyType ?? "static",
      collision: strip.collision ?? "solid",
    });
  });

  definition.movingPlatforms?.forEach((platform) => {
    world.addBody(
      createStripBody({
        ...platform,
        bodyType: "kinematic",
        velocity:
          platform.axis === "x"
            ? new Vector3(platform.speed, 0, 0)
            : new Vector3(0, platform.speed, 0),
      }),
    );
    movingPlatforms.push({
      ...platform,
      bodyId: platform.id,
      bodyType: "kinematic",
      collision: platform.collision ?? "solid",
      previousPosition: new Vector3(
        platform.x + platform.tilesWide * 0.5,
        platform.y + platform.tilesHigh * 0.5,
        0,
      ),
      delta: Vector3.zero(),
    });
  });

  definition.slopes?.forEach((slope) => {
    world.addBody(createSlopeBody(slope));
    slopes.push({
      ...slope,
      bodyId: slope.id,
      fillStyle: slope.fillStyle ?? "rgba(126, 199, 153, 0.28)",
      strokeStyle: slope.strokeStyle ?? "rgba(236, 248, 255, 0.22)",
    });
  });

  definition.spikes?.forEach((spike) => {
    world.addBody(createSpikeBody(spike));
    spikes.push({
      ...spike,
      bodyId: spike.id,
    });
  });

  definition.gems?.forEach((gem) => {
    world.addBody(createGemBody(gem));
    gems.push({
      id: gem.id,
      bodyId: gem.id,
      position: toVector3(gem.position),
      collected: false,
    });
  });

  definition.ladders?.forEach((ladder) => {
    world.addBody(createLadderBody(ladder));
    ladders.push({
      ...ladder,
      bodyId: ladder.id,
    });
  });

  definition.checkpoints?.forEach((checkpoint) => {
    const width = checkpoint.width ?? 0.8;
    const height = checkpoint.height ?? 1.8;
    const position = toVector3(checkpoint.position);
    world.addBody(createCheckpointBody(checkpoint));
    checkpoints.push({
      id: checkpoint.id,
      bodyId: checkpoint.id,
      position,
      width,
      height,
      label: checkpoint.label,
      reached: false,
    });
  });

  definition.projectileEmitters?.forEach((emitter) => {
    projectileEmitters.push({
      ...emitter,
      position: toVector3(emitter.position),
      direction: toVector3(emitter.direction),
      cooldown: emitter.startDelay ?? emitter.interval,
      shotsFired: 0,
    });
  });

  if (definition.goal) {
    const goalBody = createGoalBody(definition.goal);
    goalBodyId = goalBody.id;
    world.addBody(goalBody);
  }

  const spawnPoint = toVector3(definition.spawnPoint);
  let playerBodyId: string | null = null;

  if (options.player) {
    const playerBody = createPlatformerCharacterBody({
      ...options.player,
      position: options.player.position ?? spawnPoint,
    });
    playerBodyId = playerBody.id;
    world.addBody(playerBody);
  }

  world.detectContacts();

  return {
    world,
    strips,
    movingPlatforms,
    slopes,
    gems,
    spikes,
    ladders,
    checkpoints,
    projectileEmitters,
    projectiles: [],
    projectileImpacts: [],
    spawnPoint,
    goalBodyId,
    playerBodyId,
    supportMotion: {},
  };
}

export function preparePlatformerLevelStep(level: PlatformerLevelRuntime) {
  level.projectileImpacts = [];

  level.movingPlatforms.forEach((platform) => {
    const body = level.world.getBody(platform.bodyId);
    if (!body) {
      return;
    }

    platform.previousPosition = body.position.clone();

    if (platform.axis === "x") {
      if (body.position.x <= platform.min && body.velocity.x < 0) {
        body.velocity = body.velocity.withX(platform.speed);
      }

      if (body.position.x >= platform.max && body.velocity.x > 0) {
        body.velocity = body.velocity.withX(-platform.speed);
      }
    } else {
      if (body.position.y <= platform.min && body.velocity.y < 0) {
        body.velocity = body.velocity.withY(platform.speed);
      }

      if (body.position.y >= platform.max && body.velocity.y > 0) {
        body.velocity = body.velocity.withY(-platform.speed);
      }
    }
  });
}

export function finalizePlatformerLevelStep(level: PlatformerLevelRuntime) {
  const supportMotion: Record<string, Vector3> = {};

  level.movingPlatforms.forEach((platform) => {
    const body = level.world.getBody(platform.bodyId);
    if (!body) {
      platform.delta = Vector3.zero();
      return;
    }

    platform.delta = body.position.subtract(platform.previousPosition);
    supportMotion[platform.bodyId] = platform.delta;
  });

  level.supportMotion = supportMotion;
}

export function respawnPlatformerBody(
  level: PlatformerLevelRuntime,
  bodyId: string,
  position: Vector3,
) {
  const body = level.world.getBody(bodyId);
  if (!body) {
    return;
  }

  body.setPose(position, 0);
  body.velocity = Vector3.zero();
  body.angularVelocity = 0;
  body.wake();
}

export function collectPlatformerCheckpoint(
  level: PlatformerLevelRuntime,
  checkpointBodyId: string,
) {
  const checkpoint = level.checkpoints.find(
    (entry) => entry.bodyId === checkpointBodyId,
  );
  if (!checkpoint) {
    return null;
  }

  level.checkpoints.forEach((entry) => {
    entry.reached = entry.bodyId === checkpointBodyId;
  });
  level.spawnPoint = checkpoint.position.clone();
  return checkpoint;
}

export function getPlatformerBody(
  level: PlatformerLevelRuntime,
  bodyId: string | null,
): RigidBody | null {
  if (!bodyId) {
    return null;
  }

  return level.world.getBody(bodyId) ?? null;
}
