import { ParticleBody } from './body';
import { Vector2 } from '../math/Vector2';

export function gravityForce(body: ParticleBody, gravity: number) {
  return new Vector2(0, body.mass * gravity);
}

export function linearDragForce(velocity: Vector2, coefficient: number) {
  return velocity.scale(-coefficient);
}

export function springForce(displacement: number, stiffness: number) {
  return -stiffness * displacement;
}

export function damperForce(velocity: number, damping: number) {
  return -damping * velocity;
}
