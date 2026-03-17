import { ALL_COLLISION_BITS } from "../../collision/filter";
import { circleCastWithScene } from "../../collision/queries";
import { createBox, createCircle } from "../../collision/shapes";
import { createRigidBody, type ColliderDefinition, type RigidBody } from "../../dynamics/RigidBody";
import type { PhysicsWorld } from "../../dynamics/World";
import { Vector3 } from "../../math/Vector3";
import { clamp } from "../../math/scalar";

export interface PlatformerCommandState {
  move: number;
  vertical: number;
  jumpHeld: boolean;
  dashHeld: boolean;
}

export interface PlatformerCharacterBodyOptions {
  id: string;
  position?: Vector3;
  width?: number;
  height?: number;
  radius?: number;
  mass?: number;
  collisionLayer?: number;
  collisionMask?: number;
  linearDamping?: number;
  angularDamping?: number;
  colliders?: ColliderDefinition[];
  userData?: Record<string, unknown>;
}

export interface PlatformerControllerOptions {
  bodyId: string;
  width: number;
  height: number;
  environmentMask?: number;
  bodyCollisionMask?: number;
  oneWayLayer?: number;
  maxRunSpeed?: number;
  groundAcceleration?: number;
  groundDeceleration?: number;
  airAcceleration?: number;
  airDeceleration?: number;
  jumpSpeed?: number;
  coyoteTime?: number;
  jumpBufferTime?: number;
  fallGravityMultiplier?: number;
  lowJumpGravityMultiplier?: number;
  maxFallSpeed?: number;
  wallSlideSpeed?: number;
  wallJumpHorizontalSpeed?: number;
  wallJumpVerticalSpeed?: number;
  wallJumpLockTime?: number;
  dashSpeed?: number;
  dashDuration?: number;
  dashCooldown?: number;
  maxAirDashes?: number;
  dropThroughTime?: number;
  climbSpeed?: number;
  climbSnapSpeed?: number;
  groundNormalThreshold?: number;
  wallNormalThreshold?: number;
  sensorInset?: number;
  sensorRadius?: number;
  sensorDistance?: number;
}

export interface PlatformerControllerPostStepOptions {
  dt?: number;
  supportMotion?: Readonly<Record<string, Vector3>>;
}

function moveTowards(current: number, target: number, maxDelta: number) {
  if (Math.abs(target - current) <= maxDelta) {
    return target;
  }

  return current + Math.sign(target - current) * maxDelta;
}

function resolveBody(world: PhysicsWorld, bodyId: string) {
  const body = world.getBody(bodyId);
  if (!body) {
    throw new Error(`PlatformerController body "${bodyId}" not found`);
  }

  return body;
}

function readKind(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const kind = (value as { kind?: unknown }).kind;
  return typeof kind === "string" ? kind : null;
}

export function createPlatformerCharacterBody(
  options: PlatformerCharacterBodyOptions,
) {
  const width = options.width ?? 0.72;
  const height = options.height ?? 1.52;
  const radius = clamp(
    options.radius ?? Math.min(width * 0.46, height * 0.22),
    width * 0.2,
    Math.min(width * 0.5, height * 0.45),
  );
  const centerHeight = Math.max(height - radius * 2, radius * 0.5);
  const circleOffset = Math.max(0, height * 0.5 - radius);
  const defaultColliders: ColliderDefinition[] = [
    {
      id: "platformer-core",
      shape: createBox(width, centerHeight),
      material: {
        density: 1,
        friction: 0.08,
        restitution: 0,
      },
      collisionLayer: options.collisionLayer,
      collisionMask: options.collisionMask,
    },
    {
      id: "platformer-top",
      shape: createCircle(radius),
      localPosition: new Vector3(0, -circleOffset, 0),
      material: {
        density: 1,
        friction: 0.08,
        restitution: 0,
      },
      collisionLayer: options.collisionLayer,
      collisionMask: options.collisionMask,
    },
    {
      id: "platformer-bottom",
      shape: createCircle(radius),
      localPosition: new Vector3(0, circleOffset, 0),
      material: {
        density: 1,
        friction: 0.08,
        restitution: 0,
      },
      collisionLayer: options.collisionLayer,
      collisionMask: options.collisionMask,
    },
  ];

  return createRigidBody({
    id: options.id,
    position: options.position,
    mass: options.mass ?? 1,
    inertia: 0,
    linearDamping: options.linearDamping ?? 0.02,
    angularDamping: options.angularDamping ?? 0.1,
    colliders: options.colliders ?? defaultColliders,
    userData: options.userData,
  });
}

export class PlatformerController {
  readonly bodyId: string;
  readonly width: number;
  readonly height: number;
  readonly environmentMask: number;
  readonly bodyCollisionMask: number;
  readonly oneWayLayer: number;
  readonly maxRunSpeed: number;
  readonly groundAcceleration: number;
  readonly groundDeceleration: number;
  readonly airAcceleration: number;
  readonly airDeceleration: number;
  readonly jumpSpeed: number;
  readonly coyoteTime: number;
  readonly jumpBufferTime: number;
  readonly fallGravityMultiplier: number;
  readonly lowJumpGravityMultiplier: number;
  readonly maxFallSpeed: number;
  readonly wallSlideSpeed: number;
  readonly wallJumpHorizontalSpeed: number;
  readonly wallJumpVerticalSpeed: number;
  readonly wallJumpLockTime: number;
  readonly dashSpeed: number;
  readonly dashDuration: number;
  readonly dashCooldown: number;
  readonly maxAirDashes: number;
  readonly dropThroughTime: number;
  readonly climbSpeed: number;
  readonly climbSnapSpeed: number;
  readonly groundNormalThreshold: number;
  readonly wallNormalThreshold: number;
  readonly sensorInset: number;
  readonly sensorRadius: number;
  readonly sensorDistance: number;

  moveInput = 0;
  verticalInput = 0;
  jumpHeld = false;
  dashHeld = false;
  grounded = false;
  headBlocked = false;
  wallLeft = false;
  wallRight = false;
  touchingLadder = false;
  climbing = false;
  dashing = false;
  oneWayCollisionEnabled = true;
  facing = 1;
  coyoteTimer = 0;
  jumpBufferTimer = 0;
  wallJumpLockTimer = 0;
  dashTimer = 0;
  dashCooldownTimer = 0;
  dropThroughTimer = 0;
  airDashesRemaining: number;
  dashDirection = 1;
  lastJumpHeld = false;
  lastDashHeld = false;
  groundBodyId: string | null = null;
  ladderBodyId: string | null = null;
  groundNormal = Vector3.up();
  groundProbeDistance: number | null = null;
  leftProbeDistance: number | null = null;
  rightProbeDistance: number | null = null;
  activeEnvironmentMask: number;

  constructor(options: PlatformerControllerOptions) {
    this.bodyId = options.bodyId;
    this.width = options.width;
    this.height = options.height;
    this.environmentMask = options.environmentMask ?? ALL_COLLISION_BITS;
    this.bodyCollisionMask = options.bodyCollisionMask ?? ALL_COLLISION_BITS;
    this.oneWayLayer = options.oneWayLayer ?? 0;
    this.maxRunSpeed = options.maxRunSpeed ?? 6.8;
    this.groundAcceleration = options.groundAcceleration ?? 42;
    this.groundDeceleration = options.groundDeceleration ?? 56;
    this.airAcceleration = options.airAcceleration ?? 24;
    this.airDeceleration = options.airDeceleration ?? 16;
    this.jumpSpeed = options.jumpSpeed ?? 8.9;
    this.coyoteTime = options.coyoteTime ?? 0.1;
    this.jumpBufferTime = options.jumpBufferTime ?? 0.12;
    this.fallGravityMultiplier = options.fallGravityMultiplier ?? 1.75;
    this.lowJumpGravityMultiplier = options.lowJumpGravityMultiplier ?? 2.3;
    this.maxFallSpeed = options.maxFallSpeed ?? 14.5;
    this.wallSlideSpeed = options.wallSlideSpeed ?? 2.9;
    this.wallJumpHorizontalSpeed = options.wallJumpHorizontalSpeed ?? 6.2;
    this.wallJumpVerticalSpeed = options.wallJumpVerticalSpeed ?? 8.2;
    this.wallJumpLockTime = options.wallJumpLockTime ?? 0.12;
    this.dashSpeed = options.dashSpeed ?? 12.5;
    this.dashDuration = options.dashDuration ?? 0.14;
    this.dashCooldown = options.dashCooldown ?? 0.28;
    this.maxAirDashes = options.maxAirDashes ?? 1;
    this.dropThroughTime = options.dropThroughTime ?? 0.22;
    this.climbSpeed = options.climbSpeed ?? 4.1;
    this.climbSnapSpeed = options.climbSnapSpeed ?? 10.5;
    this.groundNormalThreshold = options.groundNormalThreshold ?? 0.58;
    this.wallNormalThreshold = options.wallNormalThreshold ?? 0.55;
    this.sensorInset = options.sensorInset ?? 0.04;
    this.sensorRadius = options.sensorRadius ?? Math.min(this.width * 0.28, 0.18);
    this.sensorDistance = options.sensorDistance ?? 0.18;
    this.airDashesRemaining = this.maxAirDashes;
    this.activeEnvironmentMask = this.environmentMask;
  }

  clone() {
    const controller = new PlatformerController({
      bodyId: this.bodyId,
      width: this.width,
      height: this.height,
      environmentMask: this.environmentMask,
      bodyCollisionMask: this.bodyCollisionMask,
      oneWayLayer: this.oneWayLayer,
      maxRunSpeed: this.maxRunSpeed,
      groundAcceleration: this.groundAcceleration,
      groundDeceleration: this.groundDeceleration,
      airAcceleration: this.airAcceleration,
      airDeceleration: this.airDeceleration,
      jumpSpeed: this.jumpSpeed,
      coyoteTime: this.coyoteTime,
      jumpBufferTime: this.jumpBufferTime,
      fallGravityMultiplier: this.fallGravityMultiplier,
      lowJumpGravityMultiplier: this.lowJumpGravityMultiplier,
      maxFallSpeed: this.maxFallSpeed,
      wallSlideSpeed: this.wallSlideSpeed,
      wallJumpHorizontalSpeed: this.wallJumpHorizontalSpeed,
      wallJumpVerticalSpeed: this.wallJumpVerticalSpeed,
      wallJumpLockTime: this.wallJumpLockTime,
      dashSpeed: this.dashSpeed,
      dashDuration: this.dashDuration,
      dashCooldown: this.dashCooldown,
      maxAirDashes: this.maxAirDashes,
      dropThroughTime: this.dropThroughTime,
      climbSpeed: this.climbSpeed,
      climbSnapSpeed: this.climbSnapSpeed,
      groundNormalThreshold: this.groundNormalThreshold,
      wallNormalThreshold: this.wallNormalThreshold,
      sensorInset: this.sensorInset,
      sensorRadius: this.sensorRadius,
      sensorDistance: this.sensorDistance,
    });

    controller.moveInput = this.moveInput;
    controller.verticalInput = this.verticalInput;
    controller.jumpHeld = this.jumpHeld;
    controller.dashHeld = this.dashHeld;
    controller.grounded = this.grounded;
    controller.headBlocked = this.headBlocked;
    controller.wallLeft = this.wallLeft;
    controller.wallRight = this.wallRight;
    controller.touchingLadder = this.touchingLadder;
    controller.climbing = this.climbing;
    controller.dashing = this.dashing;
    controller.oneWayCollisionEnabled = this.oneWayCollisionEnabled;
    controller.facing = this.facing;
    controller.coyoteTimer = this.coyoteTimer;
    controller.jumpBufferTimer = this.jumpBufferTimer;
    controller.wallJumpLockTimer = this.wallJumpLockTimer;
    controller.dashTimer = this.dashTimer;
    controller.dashCooldownTimer = this.dashCooldownTimer;
    controller.dropThroughTimer = this.dropThroughTimer;
    controller.airDashesRemaining = this.airDashesRemaining;
    controller.dashDirection = this.dashDirection;
    controller.lastJumpHeld = this.lastJumpHeld;
    controller.lastDashHeld = this.lastDashHeld;
    controller.groundBodyId = this.groundBodyId;
    controller.ladderBodyId = this.ladderBodyId;
    controller.groundNormal = this.groundNormal.clone();
    controller.groundProbeDistance = this.groundProbeDistance;
    controller.leftProbeDistance = this.leftProbeDistance;
    controller.rightProbeDistance = this.rightProbeDistance;
    controller.activeEnvironmentMask = this.activeEnvironmentMask;

    return controller;
  }

  reset(world?: PhysicsWorld) {
    this.moveInput = 0;
    this.verticalInput = 0;
    this.jumpHeld = false;
    this.dashHeld = false;
    this.grounded = false;
    this.headBlocked = false;
    this.wallLeft = false;
    this.wallRight = false;
    this.touchingLadder = false;
    this.climbing = false;
    this.dashing = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.wallJumpLockTimer = 0;
    this.dashTimer = 0;
    this.dashCooldownTimer = 0;
    this.dropThroughTimer = 0;
    this.airDashesRemaining = this.maxAirDashes;
    this.dashDirection = this.facing;
    this.lastJumpHeld = false;
    this.lastDashHeld = false;
    this.groundBodyId = null;
    this.ladderBodyId = null;
    this.groundNormal = Vector3.up();
    this.groundProbeDistance = null;
    this.leftProbeDistance = null;
    this.rightProbeDistance = null;
    this.oneWayCollisionEnabled = true;
    this.activeEnvironmentMask = this.environmentMask;

    if (world) {
      this.syncCollisionMask(resolveBody(world, this.bodyId), true);
    }
  }

  private isWallSliding() {
    const pressingIntoLeftWall = this.wallLeft && this.moveInput < -0.01;
    const pressingIntoRightWall = this.wallRight && this.moveInput > 0.01;
    return !this.grounded && !this.climbing && !this.dashing && (pressingIntoLeftWall || pressingIntoRightWall);
  }

  private isBodyKind(world: PhysicsWorld, bodyId: string | null, kind: string) {
    if (!bodyId) {
      return false;
    }

    return readKind(world.getBody(bodyId)?.userData) === kind;
  }

  private getFootCenter(body: RigidBody) {
    return body.position.add(
      new Vector3(
        0,
        this.height * 0.5 - this.sensorRadius - this.sensorInset,
        0,
      ),
    );
  }

  private getSideCenter(body: RigidBody, direction: -1 | 1) {
    return body.position.add(
      new Vector3(
        direction * (this.width * 0.5 - this.sensorRadius - this.sensorInset),
        0,
        0,
      ),
    );
  }

  private syncCollisionMask(body: RigidBody, includeOneWay: boolean) {
    const nextMask =
      includeOneWay || this.oneWayLayer === 0
        ? this.bodyCollisionMask
        : this.bodyCollisionMask & ~this.oneWayLayer;

    body.colliders.forEach((collider) => {
      collider.collisionMask = nextMask;
    });

    this.oneWayCollisionEnabled = includeOneWay || this.oneWayLayer === 0;
    this.activeEnvironmentMask = this.oneWayCollisionEnabled
      ? this.environmentMask
      : this.environmentMask & ~this.oneWayLayer;
  }

  private shouldCollideWithOneWay(world: PhysicsWorld, body: RigidBody, dt: number) {
    if (this.oneWayLayer === 0) {
      return true;
    }

    if (this.dropThroughTimer > 0 || this.climbing) {
      return false;
    }

    if (body.velocity.y < -0.05) {
      return false;
    }

    if (this.isBodyKind(world, this.groundBodyId, "platformer-one-way")) {
      return true;
    }

    const lookAhead = Math.max(
      this.sensorDistance,
      Math.abs(body.velocity.y) * dt + this.sensorRadius * 0.5,
    );
    const hit = circleCastWithScene(
      world,
      this.getFootCenter(body),
      this.sensorRadius,
      Vector3.down(),
      lookAhead,
      {
        layerMask: this.oneWayLayer,
        ignoreBodyIds: [this.bodyId],
      },
    );

    return Boolean(hit);
  }

  private updateProbes(world: PhysicsWorld, body: RigidBody) {
    this.groundProbeDistance =
      circleCastWithScene(
        world,
        this.getFootCenter(body),
        this.sensorRadius,
        Vector3.down(),
        this.sensorDistance,
        {
          layerMask: this.activeEnvironmentMask,
          ignoreBodyIds: [this.bodyId],
        },
      )?.distance ?? null;

    this.leftProbeDistance =
      circleCastWithScene(
        world,
        this.getSideCenter(body, -1),
        this.sensorRadius,
        new Vector3(-1, 0, 0),
        this.sensorDistance,
        {
          layerMask: this.activeEnvironmentMask,
          ignoreBodyIds: [this.bodyId],
        },
      )?.distance ?? null;

    this.rightProbeDistance =
      circleCastWithScene(
        world,
        this.getSideCenter(body, 1),
        this.sensorRadius,
        Vector3.right(),
        this.sensorDistance,
        {
          layerMask: this.activeEnvironmentMask,
          ignoreBodyIds: [this.bodyId],
        },
      )?.distance ?? null;
  }

  private canStartDash() {
    if (this.dashing || this.dashCooldownTimer > 1e-6) {
      return false;
    }

    if (this.grounded || this.touchingLadder || this.climbing) {
      return true;
    }

    return this.airDashesRemaining > 0;
  }

  private startDash(body: RigidBody) {
    const direction = Math.abs(this.moveInput) > 0.01 ? Math.sign(this.moveInput) : this.facing;

    this.dashing = true;
    this.climbing = false;
    this.dashDirection = direction === 0 ? 1 : direction;
    this.dashTimer = this.dashDuration;
    this.dashCooldownTimer = this.dashCooldown;
    this.jumpBufferTimer = 0;
    this.coyoteTimer = 0;
    this.grounded = false;

    if (!this.touchingLadder && this.airDashesRemaining > 0) {
      this.airDashesRemaining -= 1;
    }

    body.velocity = new Vector3(this.dashDirection * this.dashSpeed, 0, 0);
  }

  preStep(world: PhysicsWorld, commands: PlatformerCommandState, dt: number) {
    const body = resolveBody(world, this.bodyId);
    const jumpPressed = commands.jumpHeld && !this.lastJumpHeld;
    const dashPressed = commands.dashHeld && !this.lastDashHeld;

    this.moveInput = clamp(commands.move, -1, 1);
    this.verticalInput = clamp(commands.vertical, -1, 1);
    this.jumpHeld = commands.jumpHeld;
    this.dashHeld = commands.dashHeld;
    this.lastJumpHeld = commands.jumpHeld;
    this.lastDashHeld = commands.dashHeld;

    if (Math.abs(this.moveInput) > 0.01) {
      this.facing = this.moveInput > 0 ? 1 : -1;
    }

    this.jumpBufferTimer = jumpPressed
      ? this.jumpBufferTime
      : Math.max(0, this.jumpBufferTimer - dt);
    this.coyoteTimer = this.grounded
      ? this.coyoteTime
      : Math.max(0, this.coyoteTimer - dt);
    this.wallJumpLockTimer = Math.max(0, this.wallJumpLockTimer - dt);
    this.dashCooldownTimer = Math.max(0, this.dashCooldownTimer - dt);
    this.dropThroughTimer = Math.max(0, this.dropThroughTimer - dt);

    if (this.dashing) {
      this.dashTimer = Math.max(0, this.dashTimer - dt);
      if (this.dashTimer <= 1e-6) {
        this.dashing = false;
      }
    }

    if (
      this.grounded &&
      jumpPressed &&
      this.verticalInput > 0.45 &&
      this.isBodyKind(world, this.groundBodyId, "platformer-one-way")
    ) {
      this.dropThroughTimer = this.dropThroughTime;
      this.grounded = false;
      this.groundBodyId = null;
      this.climbing = false;
      body.position = body.position.add(new Vector3(0, 0.06, 0));
      body.velocity = body.velocity.withY(Math.max(body.velocity.y, 1.6));
      this.jumpBufferTimer = 0;
    }

    if (this.touchingLadder && !this.dashing && Math.abs(this.verticalInput) > 0.1) {
      this.climbing = true;
    }

    this.syncCollisionMask(body, this.shouldCollideWithOneWay(world, body, dt));

    if (this.climbing && !this.touchingLadder) {
      this.climbing = false;
    }

    if (this.climbing) {
      const ladderBody = this.ladderBodyId ? world.getBody(this.ladderBodyId) : null;
      body.applyForce(world.gravity.scale(-body.mass * body.gravityScale));

      if (jumpPressed) {
        this.climbing = false;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        body.velocity = new Vector3(
          this.facing * Math.max(this.maxRunSpeed * 0.55, 2.8),
          -this.jumpSpeed * 0.92,
          0,
        );
        return;
      }

      if (dashPressed && this.canStartDash()) {
        this.startDash(body);
        body.applyForce(world.gravity.scale(-body.mass * body.gravityScale));
        return;
      }

      if (ladderBody) {
        body.position = body.position.withX(
          moveTowards(body.position.x, ladderBody.position.x, this.climbSnapSpeed * dt),
        );
      }

      const climbVelocityY =
        Math.abs(this.verticalInput) > 0.08 ? this.verticalInput * this.climbSpeed : 0;
      body.velocity = new Vector3(this.moveInput * this.maxRunSpeed * 0.32, climbVelocityY, 0);
      return;
    }

    if (dashPressed && this.canStartDash()) {
      this.startDash(body);
    }

    if (this.dashing) {
      body.applyForce(world.gravity.scale(-body.mass * body.gravityScale));
      body.velocity = new Vector3(this.dashDirection * this.dashSpeed, 0, 0);
      return;
    }

    const canSteer = this.wallJumpLockTimer <= 1e-6;
    const inputForMovement = canSteer ? this.moveInput : 0;
    const targetSpeed = inputForMovement * this.maxRunSpeed;
    const acceleration = this.grounded
      ? Math.abs(targetSpeed) > 0.01
        ? this.groundAcceleration
        : this.groundDeceleration
      : Math.abs(targetSpeed) > 0.01
        ? this.airAcceleration
        : this.airDeceleration;

    let nextVelocityX = moveTowards(
      body.velocity.x,
      targetSpeed,
      acceleration * dt,
    );

    if (!this.grounded && Math.abs(inputForMovement) <= 0.01) {
      nextVelocityX = moveTowards(nextVelocityX, 0, this.airDeceleration * dt * 0.5);
    }

    let nextVelocityY = body.velocity.y;

    if (this.jumpBufferTimer > 0) {
      if (this.grounded || this.coyoteTimer > 0) {
        nextVelocityY = -this.jumpSpeed;
        this.grounded = false;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
      } else if (this.wallLeft || this.wallRight) {
        nextVelocityX = this.wallLeft
          ? this.wallJumpHorizontalSpeed
          : -this.wallJumpHorizontalSpeed;
        nextVelocityY = -this.wallJumpVerticalSpeed;
        this.grounded = false;
        this.jumpBufferTimer = 0;
        this.wallJumpLockTimer = this.wallJumpLockTime;
        this.facing = nextVelocityX > 0 ? 1 : -1;
      }
    }

    if (this.isWallSliding()) {
      nextVelocityY = Math.min(nextVelocityY, this.wallSlideSpeed);
    }

    if (!this.grounded) {
      const gravityMagnitude = Math.abs(world.gravity.y) * body.gravityScale;
      let extraGravity = 0;

      if (nextVelocityY < 0 && !this.jumpHeld) {
        extraGravity =
          gravityMagnitude * Math.max(0, this.lowJumpGravityMultiplier - 1);
      } else if (nextVelocityY > 0) {
        extraGravity =
          gravityMagnitude * Math.max(0, this.fallGravityMultiplier - 1);
      }

      nextVelocityY = Math.min(nextVelocityY + extraGravity * dt, this.maxFallSpeed);
    } else {
      nextVelocityY = Math.min(nextVelocityY, 1.5);
    }

    body.velocity = new Vector3(nextVelocityX, nextVelocityY, 0);
  }

  postStep(world: PhysicsWorld, options?: PlatformerControllerPostStepOptions) {
    const body = resolveBody(world, this.bodyId);
    let grounded = false;
    let headBlocked = false;
    let wallLeft = false;
    let wallRight = false;
    let touchingLadder = false;
    let groundBodyId: string | null = null;
    let ladderBodyId: string | null = null;
    let bestGroundNormal = Vector3.up();

    world.contacts.forEach((contact) => {
      if (contact.bodyAId !== this.bodyId && contact.bodyBId !== this.bodyId) {
        return;
      }

      const otherBodyId = contact.bodyAId === this.bodyId ? contact.bodyBId : contact.bodyAId;
      const otherKind = readKind(world.getBody(otherBodyId)?.userData);

      if (contact.isSensor) {
        if (otherKind === "platformer-ladder") {
          touchingLadder = true;
          ladderBodyId = otherBodyId;
        }
        return;
      }

      const normalOnBody =
        contact.bodyAId === this.bodyId
          ? contact.normal.scale(-1)
          : contact.normal;

      if (normalOnBody.y <= -this.groundNormalThreshold) {
        grounded = true;
        groundBodyId = otherBodyId;
        if (normalOnBody.y < bestGroundNormal.y) {
          bestGroundNormal = normalOnBody;
        }
      }

      if (normalOnBody.y >= this.groundNormalThreshold) {
        headBlocked = true;
      }

      if (normalOnBody.x >= this.wallNormalThreshold) {
        wallLeft = true;
      }

      if (normalOnBody.x <= -this.wallNormalThreshold) {
        wallRight = true;
      }
    });

    this.grounded = grounded;
    this.headBlocked = headBlocked;
    this.wallLeft = wallLeft;
    this.wallRight = wallRight;
    this.touchingLadder = touchingLadder;
    this.groundBodyId = groundBodyId;
    this.ladderBodyId = ladderBodyId;
    this.groundNormal = bestGroundNormal;

    if (options?.supportMotion && this.grounded && this.groundBodyId) {
      const delta = options.supportMotion[this.groundBodyId];
      if (delta && delta.lengthSquared > 1e-8) {
        body.position = body.position.add(delta);
      }
    }

    if (this.grounded || this.touchingLadder) {
      this.coyoteTimer = this.coyoteTime;
      this.airDashesRemaining = this.maxAirDashes;
      if (body.velocity.y > 0) {
        body.velocity = body.velocity.withY(Math.min(body.velocity.y, 0.6));
      }
    }

    if (!this.touchingLadder) {
      this.climbing = false;
    }

    if (this.headBlocked && body.velocity.y < 0) {
      body.velocity = body.velocity.withY(0);
    }

    if (this.isWallSliding()) {
      body.velocity = body.velocity.withY(Math.min(body.velocity.y, this.wallSlideSpeed));
    }

    if (this.dashing && (this.grounded || this.headBlocked)) {
      this.dashing = false;
      this.dashTimer = 0;
    }

    this.updateProbes(world, body);
  }

  getAnimationState(world: PhysicsWorld) {
    const body = resolveBody(world, this.bodyId);
    const horizontalSpeed = Math.abs(body.velocity.x);

    if (this.dashing) {
      return "dash" as const;
    }

    if (this.climbing) {
      return Math.abs(body.velocity.y) > 0.15 ? ("climb" as const) : ("ladder" as const);
    }

    if (!this.grounded) {
      if (this.isWallSliding()) {
        return "slide" as const;
      }
      return body.velocity.y < 0 ? ("jump" as const) : ("fall" as const);
    }

    if (Math.abs(this.moveInput) < 0.01 && horizontalSpeed > this.maxRunSpeed * 0.45) {
      return "skid" as const;
    }

    if (horizontalSpeed > 0.4) {
      return "run" as const;
    }

    return "idle" as const;
  }
}
