import { Vector3 } from "../math/Vector3";

export function computeSlidingVector(vector: Vector3, surfaceNormal: Vector3) {
  const normal = surfaceNormal.normalized();
  const intoSurface = vector.dot(normal);

  if (intoSurface >= 0) {
    return vector;
  }

  return vector.subtract(normal.scale(intoSurface));
}

