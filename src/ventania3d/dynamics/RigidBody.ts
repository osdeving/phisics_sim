import {
  createAabb,
  overlapsAabb,
  unionAabbs,
  type Aabb,
} from "../collision/Aabb";
import {
  computeShapeAabb,
  getShapeArea,
  getShapeInertia,
  transformShape,
  type Shape,
  type WorldShape,
} from "../collision/shapes";
import { Transform2D } from "../math/Transform2D";
import { Vector3, crossScalarVector2D } from "../math/Vector3";
import {
  DEFAULT_MATERIAL,
  type PhysicsMaterial,
} from "./Material";

export type BodyType = "static" | "dynamic" | "kinematic";

export interface ColliderDefinition {
  id?: string;
  shape: Shape;
  localPosition?: Vector3;
  localRotation?: number;
  material?: Partial<PhysicsMaterial>;
  isSensor?: boolean;
  userData?: Record<string, unknown>;
}

export interface Collider {
  id: string;
  shape: Shape;
  localPosition: Vector3;
  localRotation: number;
  material: PhysicsMaterial;
  isSensor: boolean;
  userData?: Record<string, unknown>;
}

export interface ColliderSnapshot {
  collider: Collider;
  shape: WorldShape;
  aabb: Aabb;
}

export interface RigidBodyOptions {
  id: string;
  type?: BodyType;
  position?: Vector3;
  rotation?: number;
  velocity?: Vector3;
  angularVelocity?: number;
  mass?: number;
  inertia?: number;
  gravityScale?: number;
  linearDamping?: number;
  angularDamping?: number;
  colliders: ColliderDefinition[];
  userData?: Record<string, unknown>;
}

function buildColliders(definitions: ColliderDefinition[]): Collider[] {
  return definitions.map((definition, index) => ({
    id: definition.id ?? `collider-${index}`,
    shape: definition.shape,
    localPosition: definition.localPosition?.clone() ?? Vector3.zero(),
    localRotation: definition.localRotation ?? 0,
    material: {
      ...DEFAULT_MATERIAL,
      ...definition.material,
    },
    isSensor: definition.isSensor ?? false,
    userData: definition.userData,
  }));
}

function computeMassProperties(type: BodyType, colliders: Collider[], mass?: number, inertia?: number) {
  if (type !== "dynamic") {
    return {
      mass: 0,
      inverseMass: 0,
      inertia: 0,
      inverseInertia: 0,
    };
  }

  if (mass !== undefined && inertia !== undefined) {
    return {
      mass,
      inverseMass: mass === 0 ? 0 : 1 / mass,
      inertia,
      inverseInertia: inertia === 0 ? 0 : 1 / inertia,
    };
  }

  const parts = colliders.map((collider) => {
    const density = collider.material.density;
    const area = getShapeArea(collider.shape);
    const partMass = density * area;
    const partInertia =
      getShapeInertia(collider.shape, partMass) +
      partMass * collider.localPosition.lengthSquared;

    return {
      mass: partMass,
      inertia: partInertia,
    };
  });

  const totalMass = mass ?? parts.reduce((sum, part) => sum + part.mass, 0);
  const totalInertia =
    inertia ?? parts.reduce((sum, part) => sum + part.inertia, 0);

  return {
    mass: totalMass,
    inverseMass: totalMass === 0 ? 0 : 1 / totalMass,
    inertia: totalInertia,
    inverseInertia: totalInertia === 0 ? 0 : 1 / totalInertia,
  };
}

export class RigidBody {
  readonly id: string;
  readonly type: BodyType;
  position: Vector3;
  rotation: number;
  velocity: Vector3;
  angularVelocity: number;
  readonly gravityScale: number;
  readonly linearDamping: number;
  readonly angularDamping: number;
  readonly colliders: Collider[];
  readonly userData?: Record<string, unknown>;
  readonly mass: number;
  readonly inverseMass: number;
  readonly inertia: number;
  readonly inverseInertia: number;
  sleeping = false;
  sleepTimer = 0;
  private accumulatedForce = Vector3.zero();
  private accumulatedTorque = 0;

  constructor(options: RigidBodyOptions) {
    this.id = options.id;
    this.type = options.type ?? "dynamic";
    this.position = options.position?.clone() ?? Vector3.zero();
    this.rotation = options.rotation ?? 0;
    this.velocity = options.velocity?.clone() ?? Vector3.zero();
    this.angularVelocity = options.angularVelocity ?? 0;
    this.gravityScale = options.gravityScale ?? 1;
    this.linearDamping = options.linearDamping ?? 0.04;
    this.angularDamping = options.angularDamping ?? 0.08;
    this.colliders = buildColliders(options.colliders);
    this.userData = options.userData;

    const properties = computeMassProperties(
      this.type,
      this.colliders,
      options.mass,
      options.inertia,
    );

    this.mass = properties.mass;
    this.inverseMass = properties.inverseMass;
    this.inertia = properties.inertia;
    this.inverseInertia = properties.inverseInertia;
  }

  isDynamic() {
    return this.type === "dynamic";
  }

  isKinematic() {
    return this.type === "kinematic";
  }

  setPose(position: Vector3, rotation: number) {
    this.wake();
    this.position = position.clone();
    this.rotation = rotation;
  }

  getTransform() {
    return new Transform2D(this.position, this.rotation);
  }

  getColliderSnapshot(collider: Collider): ColliderSnapshot {
    const transform = this.getTransform().combine(
      new Transform2D(collider.localPosition, collider.localRotation),
    );
    const shape = transformShape(collider.shape, transform);
    return {
      collider,
      shape,
      aabb: computeShapeAabb(shape),
    };
  }

  getSnapshots() {
    return this.colliders.map((collider) => this.getColliderSnapshot(collider));
  }

  computeAabb() {
    const snapshots = this.getSnapshots();

    if (snapshots.length === 0) {
      return createAabb(this.position, this.position);
    }

    return snapshots
      .map((snapshot) => snapshot.aabb)
      .reduce((combined, aabb) => unionAabbs(combined, aabb));
  }

  overlaps(other: RigidBody) {
    return overlapsAabb(this.computeAabb(), other.computeAabb());
  }

  worldPoint(localPoint: Vector3) {
    return this.getTransform().applyToPoint(localPoint);
  }

  localPoint(worldPoint: Vector3) {
    return this.getTransform().inverseApplyToPoint(worldPoint);
  }

  getPointVelocity(worldPoint: Vector3) {
    const offset = worldPoint.subtract(this.position);
    return this.velocity.add(crossScalarVector2D(this.angularVelocity, offset));
  }

  applyForce(force: Vector3) {
    if (!this.isDynamic()) {
      return;
    }

    if (force.lengthSquared > 1e-10) {
      this.wake();
    }
    this.accumulatedForce = this.accumulatedForce.add(force);
  }

  applyForceAtPoint(force: Vector3, worldPoint: Vector3) {
    if (!this.isDynamic()) {
      return;
    }

    if (force.lengthSquared > 1e-10) {
      this.wake();
    }
    const offset = worldPoint.subtract(this.position);
    this.accumulatedForce = this.accumulatedForce.add(force);
    this.accumulatedTorque += offset.cross(force).z;
  }

  applyImpulse(impulse: Vector3, worldPoint: Vector3) {
    if (!this.isDynamic()) {
      return;
    }

    const offset = worldPoint.subtract(this.position);
    this.velocity = this.velocity.add(impulse.scale(this.inverseMass));
    this.angularVelocity += offset.cross(impulse).z * this.inverseInertia;
  }

  integrateForces(gravity: Vector3, dt: number) {
    if (!this.isDynamic() || this.sleeping) {
      return;
    }

    const acceleration = gravity
      .scale(this.gravityScale)
      .add(this.accumulatedForce.scale(this.inverseMass));

    this.velocity = this.velocity
      .add(acceleration.scale(dt))
      .scale(Math.max(0, 1 - this.linearDamping * dt));

    this.angularVelocity =
      (this.angularVelocity + this.accumulatedTorque * this.inverseInertia * dt) *
      Math.max(0, 1 - this.angularDamping * dt);

    this.accumulatedForce = Vector3.zero();
    this.accumulatedTorque = 0;
  }

  integrateVelocity(dt: number) {
    if (this.type === "static" || this.sleeping) {
      return;
    }

    this.position = this.position.add(this.velocity.scale(dt));
    this.rotation += this.angularVelocity * dt;
  }

  setColliderLocalTransform(
    colliderId: string,
    localPosition: Vector3,
    localRotation = 0,
  ) {
    const collider = this.colliders.find((entry) => entry.id === colliderId);
    if (!collider) {
      return;
    }

    const positionChanged =
      collider.localPosition.subtract(localPosition).lengthSquared > 1e-10;
    const rotationChanged = Math.abs(collider.localRotation - localRotation) > 1e-10;

    if (!positionChanged && !rotationChanged) {
      return;
    }

    this.wake();
    collider.localPosition = localPosition.clone();
    collider.localRotation = localRotation;
  }

  wake() {
    this.sleeping = false;
    this.sleepTimer = 0;
  }

  sleep() {
    this.sleeping = true;
    this.sleepTimer = 0;
    this.velocity = Vector3.zero();
    this.angularVelocity = 0;
    this.accumulatedForce = Vector3.zero();
    this.accumulatedTorque = 0;
  }

  clone() {
    return new RigidBody({
      id: this.id,
      type: this.type,
      position: this.position.clone(),
      rotation: this.rotation,
      velocity: this.velocity.clone(),
      angularVelocity: this.angularVelocity,
      mass: this.mass,
      inertia: this.inertia,
      gravityScale: this.gravityScale,
      linearDamping: this.linearDamping,
      angularDamping: this.angularDamping,
      userData: this.userData ? { ...this.userData } : undefined,
      colliders: this.colliders.map((collider) => ({
        id: collider.id,
        shape: collider.shape,
        localPosition: collider.localPosition.clone(),
        localRotation: collider.localRotation,
        material: { ...collider.material },
        isSensor: collider.isSensor,
        userData: collider.userData ? { ...collider.userData } : undefined,
      })),
    });
  }
}

export function createRigidBody(options: RigidBodyOptions) {
  return new RigidBody(options);
}
