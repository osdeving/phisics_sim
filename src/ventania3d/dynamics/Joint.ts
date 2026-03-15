import type { Vector3 } from "../math/Vector3";
import type { RigidBody } from "./RigidBody";

export interface JointWorldLike {
  getBody(id: string): RigidBody | undefined;
}

export interface Joint {
  id: string;
  apply(world: JointWorldLike, dt: number): void;
  clone(): Joint;
}

export class DistanceJoint implements Joint {
  constructor(
    public readonly id: string,
    public readonly bodyAId: string,
    public readonly bodyBId: string,
    public readonly anchorA: Vector3,
    public readonly anchorB: Vector3,
    public readonly targetDistance: number,
    public readonly stiffness = 0.18,
  ) {}

  apply(world: JointWorldLike, dt: number) {
    const bodyA = world.getBody(this.bodyAId);
    const bodyB = world.getBody(this.bodyBId);

    if (!bodyA || !bodyB) {
      return;
    }

    const worldAnchorA = bodyA.worldPoint(this.anchorA);
    const worldAnchorB = bodyB.worldPoint(this.anchorB);
    const delta = worldAnchorB.subtract(worldAnchorA);
    const distance = delta.length;

    if (distance === 0) {
      return;
    }

    const error = distance - this.targetDistance;
    const direction = delta.scale(1 / distance);
    const impulseMagnitude =
      (error * this.stiffness) / Math.max(dt, 1e-4);
    const impulse = direction.scale(impulseMagnitude);

    bodyA.applyImpulse(impulse, worldAnchorA);
    bodyB.applyImpulse(impulse.scale(-1), worldAnchorB);
  }

  clone() {
    return new DistanceJoint(
      this.id,
      this.bodyAId,
      this.bodyBId,
      this.anchorA.clone(),
      this.anchorB.clone(),
      this.targetDistance,
      this.stiffness,
    );
  }
}

