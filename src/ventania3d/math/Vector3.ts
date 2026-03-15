import { approxZero } from "./scalar";

export class Vector3 {
  constructor(
    public readonly x = 0,
    public readonly y = 0,
    public readonly z = 0,
  ) {}

  static zero() {
    return new Vector3(0, 0, 0);
  }

  static right() {
    return new Vector3(1, 0, 0);
  }

  static up() {
    return new Vector3(0, -1, 0);
  }

  static down() {
    return new Vector3(0, 1, 0);
  }

  static fromAngle(angleRadians: number, magnitude = 1) {
    return new Vector3(
      Math.cos(angleRadians) * magnitude,
      Math.sin(angleRadians) * magnitude,
      0,
    );
  }

  add(other: Vector3) {
    return new Vector3(this.x + other.x, this.y + other.y, this.z + other.z);
  }

  subtract(other: Vector3) {
    return new Vector3(this.x - other.x, this.y - other.y, this.z - other.z);
  }

  scale(scalar: number) {
    return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  dot(other: Vector3) {
    return this.x * other.x + this.y * other.y + this.z * other.z;
  }

  cross(other: Vector3) {
    return new Vector3(
      this.y * other.z - this.z * other.y,
      this.z * other.x - this.x * other.z,
      this.x * other.y - this.y * other.x,
    );
  }

  crossZ(scalar: number) {
    return new Vector3(-scalar * this.y, scalar * this.x, 0);
  }

  get length() {
    return Math.hypot(this.x, this.y, this.z);
  }

  get lengthSquared() {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  normalized() {
    const magnitude = this.length;
    return approxZero(magnitude) ? Vector3.zero() : this.scale(1 / magnitude);
  }

  perpendicular() {
    return new Vector3(-this.y, this.x, this.z);
  }

  rotateZ(angleRadians: number) {
    const cosine = Math.cos(angleRadians);
    const sine = Math.sin(angleRadians);
    return new Vector3(
      this.x * cosine - this.y * sine,
      this.x * sine + this.y * cosine,
      this.z,
    );
  }

  projectOn(other: Vector3) {
    const denominator = other.lengthSquared;
    if (approxZero(denominator)) {
      return Vector3.zero();
    }

    return other.scale(this.dot(other) / denominator);
  }

  distanceTo(other: Vector3) {
    return this.subtract(other).length;
  }

  withX(x: number) {
    return new Vector3(x, this.y, this.z);
  }

  withY(y: number) {
    return new Vector3(this.x, y, this.z);
  }

  withZ(z: number) {
    return new Vector3(this.x, this.y, z);
  }

  clone() {
    return new Vector3(this.x, this.y, this.z);
  }
}

export function crossScalarVector2D(scalar: number, vector: Vector3) {
  return new Vector3(-scalar * vector.y, scalar * vector.x, 0);
}

export function crossVectorScalar2D(vector: Vector3, scalar: number) {
  return new Vector3(scalar * vector.y, -scalar * vector.x, 0);
}

