import { Vector3 } from "./Vector3";

export class Matrix3 {
  constructor(public readonly elements: readonly number[]) {}

  static identity() {
    return new Matrix3([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  }

  static translation(offset: Vector3) {
    return new Matrix3([1, 0, offset.x, 0, 1, offset.y, 0, 0, 1]);
  }

  static rotation(angleRadians: number) {
    const cosine = Math.cos(angleRadians);
    const sine = Math.sin(angleRadians);
    return new Matrix3([cosine, -sine, 0, sine, cosine, 0, 0, 0, 1]);
  }

  multiply(other: Matrix3) {
    const a = this.elements;
    const b = other.elements;

    return new Matrix3([
      a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
      a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
      a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
      a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
      a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
      a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
      a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
      a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
      a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
    ]);
  }

  transformPoint(point: Vector3) {
    const m = this.elements;
    return new Vector3(
      m[0] * point.x + m[1] * point.y + m[2],
      m[3] * point.x + m[4] * point.y + m[5],
      point.z,
    );
  }

  transformDirection(direction: Vector3) {
    const m = this.elements;
    return new Vector3(
      m[0] * direction.x + m[1] * direction.y,
      m[3] * direction.x + m[4] * direction.y,
      direction.z,
    );
  }

  clone() {
    return new Matrix3([...this.elements]);
  }
}

