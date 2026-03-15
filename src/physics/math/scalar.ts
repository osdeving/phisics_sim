export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function signOrZero(value: number) {
  if (Math.abs(value) < 1e-9) {
    return 0;
  }

  return Math.sign(value);
}

export function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function approxZero(value: number, epsilon = 1e-3) {
  return Math.abs(value) <= epsilon;
}
