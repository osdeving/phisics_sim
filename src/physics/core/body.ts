import { Vector2 } from '../math/Vector2';

export interface ParticleBody {
  mass: number;
  inverseMass: number;
  radius: number;
  restitution: number;
  position: Vector2;
  velocity: Vector2;
  acceleration: Vector2;
  accumulatedForce: Vector2;
}

interface ParticleBodyOptions {
  mass: number;
  radius: number;
  restitution?: number;
  position: Vector2;
  velocity?: Vector2;
}

export function createParticleBody(options: ParticleBodyOptions): ParticleBody {
  return {
    mass: options.mass,
    inverseMass: options.mass === 0 ? 0 : 1 / options.mass,
    radius: options.radius,
    restitution: options.restitution ?? 0,
    position: options.position,
    velocity: options.velocity ?? Vector2.zero(),
    acceleration: Vector2.zero(),
    accumulatedForce: Vector2.zero(),
  };
}

export function clearForces(body: ParticleBody) {
  body.accumulatedForce = Vector2.zero();
}

export function applyForce(body: ParticleBody, force: Vector2) {
  body.accumulatedForce = body.accumulatedForce.add(force);
}

export function integrateSemiImplicitEuler(body: ParticleBody, dt: number) {
  // O integrador semi-implícito atualiza a velocidade antes da posição.
  // Em simulações de jogos e sandboxes físicas ele costuma conservar energia
  // melhor que o Euler explícito simples para o mesmo custo computacional.
  body.acceleration = body.accumulatedForce.scale(body.inverseMass);
  body.velocity = body.velocity.add(body.acceleration.scale(dt));
  body.position = body.position.add(body.velocity.scale(dt));
  clearForces(body);
}
