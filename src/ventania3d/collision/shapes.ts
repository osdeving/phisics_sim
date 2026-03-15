import { Matrix3 } from "../math/Matrix3";
import { Transform2D } from "../math/Transform2D";
import { Vector3 } from "../math/Vector3";
import { createAabb, type Aabb } from "./Aabb";

export type ShapeKind = "circle" | "polygon";

export interface CircleShape {
  kind: "circle";
  radius: number;
}

export interface PolygonShape {
  kind: "polygon";
  points: Vector3[];
  normals: Vector3[];
}

export type Shape = CircleShape | PolygonShape;

export interface WorldCircleShape extends CircleShape {
  center: Vector3;
}

export interface WorldPolygonShape extends PolygonShape {
  center: Vector3;
  points: Vector3[];
  normals: Vector3[];
}

export type WorldShape = WorldCircleShape | WorldPolygonShape;

export function createCircle(radius: number): CircleShape {
  return {
    kind: "circle",
    radius,
  };
}

export function createPolygon(points: Vector3[]): PolygonShape {
  const winding = Math.sign(getPolygonSignedArea(points)) || 1;
  return {
    kind: "polygon",
    points,
    normals: buildPolygonNormals(points, winding),
  };
}

export function createBox(width: number, height: number): PolygonShape {
  const halfWidth = width * 0.5;
  const halfHeight = height * 0.5;

  return createPolygon([
    new Vector3(-halfWidth, -halfHeight, 0),
    new Vector3(halfWidth, -halfHeight, 0),
    new Vector3(halfWidth, halfHeight, 0),
    new Vector3(-halfWidth, halfHeight, 0),
  ]);
}

export function createChamferedFork(
  length: number,
  thickness: number,
  chamferLength: number,
  chamferDepth: number,
): PolygonShape {
  const halfThickness = thickness * 0.5;
  const tipX = length * 0.5;
  const baseX = -length * 0.5;

  return createPolygon([
    new Vector3(baseX, -halfThickness, 0),
    new Vector3(tipX - chamferLength, -halfThickness, 0),
    new Vector3(tipX, -halfThickness + chamferDepth, 0),
    new Vector3(tipX, halfThickness - chamferDepth, 0),
    new Vector3(tipX - chamferLength, halfThickness, 0),
    new Vector3(baseX, halfThickness, 0),
  ]);
}

export function buildPolygonNormals(points: Vector3[], winding = 1) {
  return points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    const edge = next.subtract(point);
    const normal =
      winding > 0 ? edge.perpendicular().scale(-1) : edge.perpendicular();
    return normal.normalized();
  });
}

export function computePolygonCenter(points: Vector3[]) {
  const sum = points.reduce((accumulator, point) => accumulator.add(point), Vector3.zero());
  return sum.scale(1 / points.length);
}

export function getShapeArea(shape: Shape) {
  if (shape.kind === "circle") {
    return Math.PI * shape.radius * shape.radius;
  }

  return Math.abs(getPolygonSignedArea(shape.points));
}

export function getShapeInertia(shape: Shape, mass: number) {
  if (shape.kind === "circle") {
    return 0.5 * mass * shape.radius * shape.radius;
  }

  return getPolygonMomentOfInertia(shape.points, mass);
}

export function getPolygonSignedArea(points: Vector3[]) {
  let area = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }

  return area * 0.5;
}

export function getPolygonMomentOfInertia(points: Vector3[], mass: number) {
  let numerator = 0;
  let denominator = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const cross = Math.abs(current.cross(next).z);
    const term =
      current.dot(current) + current.dot(next) + next.dot(next);

    numerator += cross * term;
    denominator += cross;
  }

  if (denominator === 0) {
    return mass;
  }

  return (mass / 6) * (numerator / denominator);
}

export function buildTransformMatrix(transform: Transform2D) {
  return Matrix3.translation(transform.position).multiply(
    Matrix3.rotation(transform.rotation),
  );
}

export function transformShape(shape: Shape, transform: Transform2D): WorldShape {
  if (shape.kind === "circle") {
    return {
      kind: "circle",
      radius: shape.radius,
      center: transform.position,
    };
  }

  const matrix = buildTransformMatrix(transform);
  const points = shape.points.map((point) => matrix.transformPoint(point));
  const normals = shape.normals.map((normal) =>
    matrix.transformDirection(normal).normalized(),
  );

  return {
    kind: "polygon",
    points,
    normals,
    center: computePolygonCenter(points),
  };
}

export function computeShapeAabb(shape: WorldShape): Aabb {
  if (shape.kind === "circle") {
    return createAabb(
      new Vector3(
        shape.center.x - shape.radius,
        shape.center.y - shape.radius,
        0,
      ),
      new Vector3(
        shape.center.x + shape.radius,
        shape.center.y + shape.radius,
        0,
      ),
    );
  }

  const xs = shape.points.map((point) => point.x);
  const ys = shape.points.map((point) => point.y);

  return createAabb(
    new Vector3(Math.min(...xs), Math.min(...ys), 0),
    new Vector3(Math.max(...xs), Math.max(...ys), 0),
  );
}

export function projectPolygon(axis: Vector3, polygon: WorldPolygonShape) {
  let min = axis.dot(polygon.points[0]);
  let max = min;

  polygon.points.slice(1).forEach((point) => {
    const projection = axis.dot(point);
    min = Math.min(min, projection);
    max = Math.max(max, projection);
  });

  return { min, max };
}

export function projectCircle(axis: Vector3, circle: WorldCircleShape) {
  const centerProjection = axis.dot(circle.center);
  return {
    min: centerProjection - circle.radius,
    max: centerProjection + circle.radius,
  };
}

export function getSupportPoint(points: Vector3[], direction: Vector3) {
  return points.reduce((bestPoint, point) =>
    point.dot(direction) > bestPoint.dot(direction) ? point : bestPoint,
  );
}
