import { Vector3 } from "../math/Vector3";

export interface Aabb {
  min: Vector3;
  max: Vector3;
}

export function createAabb(min: Vector3, max: Vector3): Aabb {
  return { min, max };
}

export function unionAabbs(first: Aabb, second: Aabb): Aabb {
  return {
    min: new Vector3(
      Math.min(first.min.x, second.min.x),
      Math.min(first.min.y, second.min.y),
      0,
    ),
    max: new Vector3(
      Math.max(first.max.x, second.max.x),
      Math.max(first.max.y, second.max.y),
      0,
    ),
  };
}

export function overlapsAabb(first: Aabb, second: Aabb) {
  return !(
    first.max.x < second.min.x ||
    first.min.x > second.max.x ||
    first.max.y < second.min.y ||
    first.min.y > second.max.y
  );
}

