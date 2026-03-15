import { Matrix3 } from "./Matrix3";
import { Vector3 } from "./Vector3";

export class Transform2D {
  constructor(
    public readonly position = Vector3.zero(),
    public readonly rotation = 0,
  ) {}

  toMatrix() {
    return Matrix3.translation(this.position).multiply(
      Matrix3.rotation(this.rotation),
    );
  }

  applyToPoint(point: Vector3) {
    return this.toMatrix().transformPoint(point);
  }

  applyToDirection(direction: Vector3) {
    return direction.rotateZ(this.rotation);
  }

  inverseApplyToPoint(point: Vector3) {
    return point.subtract(this.position).rotateZ(-this.rotation);
  }

  combine(child: Transform2D) {
    return new Transform2D(
      this.applyToPoint(child.position),
      this.rotation + child.rotation,
    );
  }

  clone() {
    return new Transform2D(this.position.clone(), this.rotation);
  }
}

