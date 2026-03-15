import { Vector2 } from '../math/Vector2';
import { approxZero, signOrZero } from '../math/scalar';

export function solveJumpVelocity(targetHeight: number, gravity: number) {
  return Math.sqrt(2 * gravity * targetHeight);
}

export function solveAtwoodMachine(massLeft: number, massRight: number, gravity: number) {
  const totalMass = massLeft + massRight;
  if (totalMass === 0) {
    return { acceleration: 0, tension: 0 };
  }

  const acceleration = ((massRight - massLeft) * gravity) / totalMass;
  const tension = (2 * massLeft * massRight * gravity) / totalMass;

  return { acceleration, tension };
}

export function solveInclinedPlaneAcceleration(
  mass: number,
  gravity: number,
  angleRadians: number,
  frictionCoefficient: number,
  velocity: number,
) {
  const parallelForce = mass * gravity * Math.sin(angleRadians);
  const normalForce = mass * gravity * Math.cos(angleRadians);
  const frictionLimit = frictionCoefficient * normalForce;

  if (approxZero(velocity) && Math.abs(parallelForce) <= frictionLimit) {
    return {
      parallelForce,
      normalForce,
      frictionForce: -parallelForce,
      acceleration: 0,
    };
  }

  const direction = signOrZero(velocity) || signOrZero(parallelForce);
  const frictionForce = -direction * frictionLimit;
  const netForce = parallelForce + frictionForce;

  return {
    parallelForce,
    normalForce,
    frictionForce,
    acceleration: netForce / mass,
  };
}

export function solveMruPosition(initialPosition: number, velocity: number, time: number) {
  return initialPosition + velocity * time;
}

export function solveMruvPosition(
  initialPosition: number,
  initialVelocity: number,
  acceleration: number,
  time: number,
) {
  return initialPosition + initialVelocity * time + 0.5 * acceleration * time ** 2;
}

export function solveMruvVelocity(initialVelocity: number, acceleration: number, time: number) {
  return initialVelocity + acceleration * time;
}

export function solveCircularMotion(radius: number, angularSpeed: number, mass: number) {
  const tangentialSpeed = Math.abs(angularSpeed) * radius;
  const centripetalAcceleration = radius === 0 ? 0 : tangentialSpeed ** 2 / radius;
  const centripetalForce = mass * centripetalAcceleration;
  const period = angularSpeed === 0 ? Infinity : (2 * Math.PI) / Math.abs(angularSpeed);
  const frequency = period === Infinity ? 0 : 1 / period;

  return {
    tangentialSpeed,
    centripetalAcceleration,
    centripetalForce,
    period,
    frequency,
  };
}

export function resolveVectorComponents(magnitude: number, angleRadians: number) {
  return Vector2.fromPolar(magnitude, angleRadians);
}

export function solveResultantVector(first: Vector2, second: Vector2) {
  const resultant = first.add(second);
  return {
    resultant,
    magnitude: resultant.length,
    angle: resultant.angle,
  };
}

export function solveStaticLoadBalance(forces: Vector2[]) {
  const resultant = forces.reduce((sum, force) => sum.add(force), Vector2.zero());
  return {
    resultant,
    equilibriumForce: resultant.scale(-1),
    isBalanced: resultant.length < 1e-3,
  };
}

export function solveCantileverSupport(weight: number, armLength: number) {
  return {
    shearForce: weight,
    bendingMoment: weight * armLength,
  };
}
