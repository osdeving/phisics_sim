import { Vector3 } from "../math/Vector3";
import { RigidBody } from "../dynamics/RigidBody";

export function applyGravity(body: RigidBody, gravity: Vector3) {
  if (!body.isDynamic()) {
    return;
  }

  body.applyForce(gravity.scale(body.mass * body.gravityScale));
}

export function applyLinearDrag(body: RigidBody, dragCoefficient: number) {
  if (!body.isDynamic()) {
    return;
  }

  body.applyForce(body.velocity.scale(-dragCoefficient));
}

