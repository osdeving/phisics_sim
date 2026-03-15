export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(from: number, to: number, alpha: number) {
  return from + (to - from) * alpha;
}

export function approxZero(value: number, epsilon = 1e-6) {
  return Math.abs(value) <= epsilon;
}

export function normalizeAngle(angleRadians: number) {
  let angle = angleRadians;

  while (angle > Math.PI) {
    angle -= Math.PI * 2;
  }

  while (angle < -Math.PI) {
    angle += Math.PI * 2;
  }

  return angle;
}

export function safeDivide(numerator: number, denominator: number) {
  return approxZero(denominator) ? 0 : numerator / denominator;
}

export function square(value: number) {
  return value * value;
}

