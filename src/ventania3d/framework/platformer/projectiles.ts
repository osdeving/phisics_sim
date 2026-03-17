import { createCircle } from "../../collision/shapes";
import { createRigidBody } from "../../dynamics/RigidBody";
import { Vector3 } from "../../math/Vector3";
import {
  PLATFORMER_ENVIRONMENT_MASK,
  PLATFORMER_LAYERS,
  type PlatformerLevelRuntime,
  type PlatformerProjectileEmitterRuntime,
  type PlatformerProjectileImpact,
  type PlatformerProjectileOwner,
  type VectorLike,
} from "./level";
import { toVector3 } from "./level";

export interface SpawnPlatformerProjectileOptions {
  id?: string;
  position: VectorLike;
  direction?: VectorLike;
  velocity?: VectorLike;
  speed?: number;
  radius?: number;
  ttl?: number;
  owner?: PlatformerProjectileOwner;
  color?: string;
  gravityScale?: number;
  destroyOnImpact?: boolean;
  sourceEmitterId?: string;
}

function buildProjectileVelocity(options: SpawnPlatformerProjectileOptions) {
  if (options.velocity) {
    return toVector3(options.velocity);
  }

  const direction = toVector3(options.direction ?? Vector3.right()).normalized();
  return direction.scale(options.speed ?? 6);
}

function buildProjectileMask(owner: PlatformerProjectileOwner) {
  return owner === "hazard"
    ? PLATFORMER_ENVIRONMENT_MASK | PLATFORMER_LAYERS.player
    : PLATFORMER_ENVIRONMENT_MASK | PLATFORMER_LAYERS.hazard;
}

export function spawnPlatformerProjectile(
  level: PlatformerLevelRuntime,
  options: SpawnPlatformerProjectileOptions,
) {
  const id =
    options.id ??
    `platformer-projectile-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const owner = options.owner ?? "hazard";
  const bodyId = `${id}-body`;
  const position = toVector3(options.position);
  const velocity = buildProjectileVelocity(options);
  const radius = options.radius ?? 0.14;
  const gravityScale = options.gravityScale ?? 0;

  level.world.addBody(
    createRigidBody({
      id: bodyId,
      type: "dynamic",
      position,
      velocity,
      mass: 0.06,
      gravityScale,
      linearDamping: 0,
      angularDamping: 0,
      colliders: [
        {
          id: `${bodyId}-sensor`,
          shape: createCircle(radius),
          material: {
            density: 0.1,
            friction: 0,
            restitution: 0,
          },
          isSensor: true,
          collisionLayer: PLATFORMER_LAYERS.projectile,
          collisionMask: buildProjectileMask(owner),
        },
      ],
      userData: {
        kind: "platformer-projectile",
        owner,
      },
    }),
  );

  level.projectiles.push({
    id,
    bodyId,
    radius,
    owner,
    color: options.color ?? (owner === "hazard" ? "#ff9c6b" : "#8bf0ff"),
    ttlRemaining: options.ttl ?? 3.2,
    gravityScale,
    destroyOnImpact: options.destroyOnImpact ?? true,
    sourceEmitterId: options.sourceEmitterId,
  });
}

function spawnEmitterProjectile(
  level: PlatformerLevelRuntime,
  emitter: PlatformerProjectileEmitterRuntime,
) {
  emitter.shotsFired += 1;
  spawnPlatformerProjectile(level, {
    id: `${emitter.id}-shot-${emitter.shotsFired}`,
    position: emitter.position,
    direction: emitter.direction,
    speed: emitter.speed,
    radius: emitter.radius,
    ttl: emitter.ttl,
    owner: emitter.owner ?? "hazard",
    color: emitter.color,
    gravityScale: emitter.gravityScale,
    sourceEmitterId: emitter.id,
  });
}

export function updatePlatformerProjectileEmitters(
  level: PlatformerLevelRuntime,
  dt: number,
) {
  level.projectileEmitters.forEach((emitter) => {
    emitter.cooldown -= dt;
    while (emitter.cooldown <= 1e-6) {
      spawnEmitterProjectile(level, emitter);
      emitter.cooldown += Math.max(0.05, emitter.interval);
    }
  });
}

function removeProjectile(level: PlatformerLevelRuntime, bodyId: string) {
  level.world.removeBody(bodyId);
  level.projectiles = level.projectiles.filter(
    (projectile) => projectile.bodyId !== bodyId,
  );
}

export function finalizePlatformerProjectiles(
  level: PlatformerLevelRuntime,
  dt: number,
) {
  const expiredBodyIds = new Set<string>();

  level.projectiles.forEach((projectile) => {
    projectile.ttlRemaining = Math.max(0, projectile.ttlRemaining - dt);
    if (projectile.ttlRemaining <= 1e-6 || !level.world.getBody(projectile.bodyId)) {
      expiredBodyIds.add(projectile.bodyId);
    }
  });

  const impacts: PlatformerProjectileImpact[] = [];

  level.world.contactEvents.begin.forEach((contact) => {
    const projectile =
      level.projectiles.find((entry) => entry.bodyId === contact.bodyAId) ??
      level.projectiles.find((entry) => entry.bodyId === contact.bodyBId);
    if (!projectile) {
      return;
    }

    const otherBodyId =
      contact.bodyAId === projectile.bodyId ? contact.bodyBId : contact.bodyAId;
    impacts.push({
      projectileId: projectile.id,
      projectileBodyId: projectile.bodyId,
      owner: projectile.owner,
      otherBodyId,
    });

    if (projectile.destroyOnImpact) {
      expiredBodyIds.add(projectile.bodyId);
    }
  });

  expiredBodyIds.forEach((bodyId) => {
    removeProjectile(level, bodyId);
  });

  level.projectileImpacts = impacts;
}

export function resetPlatformerProjectiles(level: PlatformerLevelRuntime) {
  level.projectiles.forEach((projectile) => {
    level.world.removeBody(projectile.bodyId);
  });
  level.projectiles = [];
  level.projectileImpacts = [];
  level.projectileEmitters.forEach((emitter) => {
    emitter.cooldown = emitter.startDelay ?? emitter.interval;
    emitter.shotsFired = 0;
  });
}
