import { intersectSnapshots } from "./intersections";
import { createCircle, transformShape } from "./shapes";
import { Transform2D } from "../math/Transform2D";
import { Vector3 } from "../math/Vector3";
import type { PhysicsWorld } from "../dynamics/World";
import type { ContactManifold } from "./contact";

export function circleWithScene(world: PhysicsWorld, center: Vector3, radius: number) {
  const probeShape = transformShape(
    createCircle(radius),
    new Transform2D(center, 0),
  );

  const probeSnapshot = {
    collider: {
      id: "circle-probe",
      shape: createCircle(radius),
      localPosition: Vector3.zero(),
      localRotation: 0,
      material: {
        density: 0,
        friction: 0,
        restitution: 0,
      },
      isSensor: true,
    },
    shape: probeShape,
    aabb: world.computeShapeAabb(probeShape),
  };

  const probeBody = world.getProbeBody(center);

  return world.bodies.flatMap((body) =>
    body.getSnapshots().flatMap((snapshot) => {
      const manifold = intersectSnapshots(probeBody, body, probeSnapshot, snapshot);
      return manifold ? [manifold] : [];
    }),
  );
}

export function sphereWithScene(world: PhysicsWorld, center: Vector3, radius: number) {
  return circleWithScene(world, center.withZ(0), radius);
}

export interface RaycastHit {
  bodyId: string;
  point: Vector3;
  normal: Vector3;
  distance: number;
}

export function rayWithScene(
  world: PhysicsWorld,
  origin: Vector3,
  direction: Vector3,
  maxDistance: number,
) {
  const stepDirection = direction.normalized();
  const stepLength = 0.1;
  let travelled = 0;

  while (travelled <= maxDistance) {
    const point = origin.add(stepDirection.scale(travelled));
    const hits = circleWithScene(world, point, 0.05);

    if (hits.length > 0) {
      const first = hits[0];
      return {
        bodyId: first.bodyBId,
        point,
        normal: first.normal,
        distance: travelled,
      } satisfies RaycastHit;
    }

    travelled += stepLength;
  }

  return null;
}

