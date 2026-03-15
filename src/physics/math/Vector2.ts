export class Vector2 {
  constructor(
    public readonly x = 0,
    public readonly y = 0,
  ) {}

  static zero() {
    return new Vector2(0, 0);
  }

  static fromAngle(angleRadians: number, magnitude = 1) {
    return new Vector2(Math.cos(angleRadians) * magnitude, Math.sin(angleRadians) * magnitude);
  }

  static fromPolar(magnitude: number, angleRadians: number) {
    return Vector2.fromAngle(angleRadians, magnitude);
  }

  add(other: Vector2) {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  subtract(other: Vector2) {
    return new Vector2(this.x - other.x, this.y - other.y);
  }

  scale(scalar: number) {
    return new Vector2(this.x * scalar, this.y * scalar);
  }

  dot(other: Vector2) {
    return this.x * other.x + this.y * other.y;
  }

  cross(other: Vector2) {
    return this.x * other.y - this.y * other.x;
  }

  get length() {
    return Math.hypot(this.x, this.y);
  }

  get angle() {
    return Math.atan2(this.y, this.x);
  }

  normalized() {
    const magnitude = this.length;
    return magnitude === 0 ? Vector2.zero() : this.scale(1 / magnitude);
  }

  perpendicular() {
    return new Vector2(-this.y, this.x);
  }

  rotate(angleRadians: number) {
    const cos = Math.cos(angleRadians);
    const sin = Math.sin(angleRadians);
    return new Vector2(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
  }

  distanceTo(other: Vector2) {
    return this.subtract(other).length;
  }

  withX(x: number) {
    return new Vector2(x, this.y);
  }

  withY(y: number) {
    return new Vector2(this.x, y);
  }
}
