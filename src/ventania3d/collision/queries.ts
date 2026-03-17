import { intersectSnapshots } from "./intersections";
import {
  createCircle,
  type Shape,
  type WorldCircleShape,
  type WorldPolygonShape,
  transformShape,
} from "./shapes";
import {
  matchesQueryFilter,
  type QueryFilterOptions,
} from "./filter";
import {
  createSweepProbeShape,
  sweepWorldShapes,
} from "./sweep";
import { Transform2D } from "../math/Transform2D";
import { Vector3 } from "../math/Vector3";
import { approxZero } from "../math/scalar";
import type { PhysicsWorld } from "../dynamics/World";
import type { ContactManifold } from "./contact";
import type { ColliderSnapshot, RigidBody } from "../dynamics/RigidBody";

function shouldIgnoreBody(bodyId: string, options?: QueryFilterOptions) {
  return options?.ignoreBodyIds?.includes(bodyId) ?? false;
}

function forEachMatchingSnapshot(
  world: PhysicsWorld,
  options: QueryFilterOptions | undefined,
  callback: (body: RigidBody, snapshot: ColliderSnapshot) => void,
) {
  world.bodies.forEach((body) => {
    if (shouldIgnoreBody(body.id, options)) {
      return;
    }

    body.getSnapshots().forEach((snapshot) => {
      if (!matchesQueryFilter(snapshot.collider, options)) {
        return;
      }

      callback(body, snapshot);
    });
  });
}

export function circleWithScene(
  world: PhysicsWorld,
  center: Vector3,
  radius: number,
  options?: QueryFilterOptions,
): ContactManifold[] {
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
      collisionLayer: 1,
      collisionMask: 0xffffffff >>> 0,
    },
    shape: probeShape,
    aabb: world.computeShapeAabb(probeShape),
  };

  const probeBody = world.getProbeBody(center);
  const hits: ContactManifold[] = [];

  forEachMatchingSnapshot(world, options, (body, snapshot) => {
    const manifold = intersectSnapshots(probeBody, body, probeSnapshot, snapshot);
    if (manifold) {
      hits.push(manifold);
    }
  });

  return hits;
}

export function sphereWithScene(
  world: PhysicsWorld,
  center: Vector3,
  radius: number,
  options?: QueryFilterOptions,
): ContactManifold[] {
  return circleWithScene(world, center.withZ(0), radius, options);
}

export interface RaycastHit {
  bodyId: string;
  colliderId: string;
  point: Vector3;
  normal: Vector3;
  distance: number;
}

export interface CircleCastHit extends RaycastHit {
  center: Vector3;
  radius: number;
}

export interface ShapeCastHit extends RaycastHit {
  shape: Shape;
  position: Vector3;
  rotation: number;
}

function getClosestPointOnSegment(point: Vector3, start: Vector3, end: Vector3) {
  const segment = end.subtract(start);
  const lengthSquared = segment.lengthSquared;

  if (lengthSquared === 0) {
    return start;
  }

  const projection = point.subtract(start).dot(segment) / lengthSquared;
  const t = Math.max(0, Math.min(1, projection));
  return start.add(segment.scale(t));
}

function getClosestPointOnPolygon(point: Vector3, polygon: WorldPolygonShape) {
  let closestPoint = polygon.points[0];
  let minDistanceSquared = point.subtract(closestPoint).lengthSquared;

  for (let index = 0; index < polygon.points.length; index += 1) {
    const start = polygon.points[index];
    const end = polygon.points[(index + 1) % polygon.points.length];
    const candidate = getClosestPointOnSegment(point, start, end);
    const distanceSquared = point.subtract(candidate).lengthSquared;

    if (distanceSquared < minDistanceSquared) {
      minDistanceSquared = distanceSquared;
      closestPoint = candidate;
    }
  }

  return closestPoint;
}

function raycastCircle(
  origin: Vector3,
  direction: Vector3,
  maxDistance: number,
  circle: WorldCircleShape,
) {
  const toOrigin = origin.subtract(circle.center);
  const b = toOrigin.dot(direction);
  const c = toOrigin.dot(toOrigin) - circle.radius * circle.radius;

  if (c <= 0) {
    const normal =
      toOrigin.length > 0 ? toOrigin.normalized() : direction.scale(-1);
    return {
      point: origin,
      normal,
      distance: 0,
    };
  }

  if (b > 0) {
    return null;
  }

  const discriminant = b * b - c;
  if (discriminant < 0) {
    return null;
  }

  const distance = -b - Math.sqrt(discriminant);
  if (distance < 0 || distance > maxDistance) {
    return null;
  }

  const point = origin.add(direction.scale(distance));
  const normal = point.subtract(circle.center).normalized();
  return {
    point,
    normal,
    distance,
  };
}

function isPointInsidePolygon(point: Vector3, polygon: WorldPolygonShape) {
  return polygon.normals.every((normal, index) => {
    const vertex = polygon.points[index];
    return point.subtract(vertex).dot(normal) <= 1e-6;
  });
}

function raycastPolygon(
  origin: Vector3,
  direction: Vector3,
  maxDistance: number,
  polygon: WorldPolygonShape,
) {
  if (isPointInsidePolygon(origin, polygon)) {
    const fallbackNormal = polygon.normals[0] ?? Vector3.up();
    return {
      point: origin,
      normal: fallbackNormal,
      distance: 0,
    };
  }

  let enter = 0;
  let exit = maxDistance;
  let enterNormal: Vector3 | null = null;

  for (let index = 0; index < polygon.points.length; index += 1) {
    const vertex = polygon.points[index];
    const normal = polygon.normals[index];
    const signedDistance = normal.dot(origin.subtract(vertex));
    const denominator = normal.dot(direction);

    if (approxZero(denominator)) {
      if (signedDistance > 0) {
        return null;
      }
      continue;
    }

    const hitDistance = -signedDistance / denominator;

    if (denominator < 0) {
      if (hitDistance > enter) {
        enter = hitDistance;
        enterNormal = normal;
      }
    } else {
      exit = Math.min(exit, hitDistance);
    }

    if (enter > exit) {
      return null;
    }
  }

  if (enter < 0 || enter > maxDistance) {
    return null;
  }

  return {
    point: origin.add(direction.scale(enter)),
    normal: enterNormal ?? polygon.normals[0] ?? Vector3.up(),
    distance: enter,
  };
}

function raycastSnapshot(
  origin: Vector3,
  direction: Vector3,
  maxDistance: number,
  snapshot: ColliderSnapshot,
) {
  if (snapshot.shape.kind === "circle") {
    return raycastCircle(origin, direction, maxDistance, snapshot.shape);
  }

  return raycastPolygon(origin, direction, maxDistance, snapshot.shape);
}

function circleCastCircle(
  origin: Vector3,
  direction: Vector3,
  maxDistance: number,
  radius: number,
  circle: WorldCircleShape,
) {
  const expandedHit = raycastCircle(origin, direction, maxDistance, {
    ...circle,
    radius: circle.radius + radius,
  });

  if (!expandedHit) {
    return null;
  }

  return {
    center: expandedHit.point,
    point: circle.center.add(expandedHit.normal.scale(circle.radius)),
    normal: expandedHit.normal,
    distance: expandedHit.distance,
  };
}

function circleCastPolygon(
  origin: Vector3,
  direction: Vector3,
  maxDistance: number,
  radius: number,
  polygon: WorldPolygonShape,
) {
  const insideExpanded = polygon.normals.every((normal, index) => {
    const vertex = polygon.points[index];
    return normal.dot(origin.subtract(vertex)) <= radius + 1e-6;
  });

  let bestHit:
    | {
        center: Vector3;
        point: Vector3;
        normal: Vector3;
        distance: number;
      }
    | null = null;

  if (insideExpanded) {
    const closestPoint = getClosestPointOnPolygon(origin, polygon);
    const delta = origin.subtract(closestPoint);
    const normal =
      delta.length > 1e-6 ? delta.normalized() : polygon.normals[0] ?? Vector3.up();
    bestHit = {
      center: origin,
      point: closestPoint,
      normal,
      distance: 0,
    };
  }

  let enter = 0;
  let exit = maxDistance;
  let enterNormal: Vector3 | null = null;

  for (let index = 0; index < polygon.points.length; index += 1) {
    const vertex = polygon.points[index];
    const normal = polygon.normals[index];
    const signedDistance = normal.dot(origin.subtract(vertex)) - radius;
    const denominator = normal.dot(direction);

    if (approxZero(denominator)) {
      if (signedDistance > 0) {
        enter = Number.POSITIVE_INFINITY;
        break;
      }
      continue;
    }

    const hitDistance = -signedDistance / denominator;

    if (denominator < 0) {
      if (hitDistance > enter) {
        enter = hitDistance;
        enterNormal = normal;
      }
    } else {
      exit = Math.min(exit, hitDistance);
    }

    if (enter > exit) {
      enter = Number.POSITIVE_INFINITY;
      break;
    }
  }

  if (enter !== Number.POSITIVE_INFINITY && enter >= 0 && enter <= maxDistance) {
    const normal = enterNormal ?? polygon.normals[0] ?? Vector3.up();
    const center = origin.add(direction.scale(enter));
    const point = center.subtract(normal.scale(radius));
    bestHit =
      !bestHit || enter < bestHit.distance
        ? {
            center,
            point,
            normal,
            distance: enter,
          }
        : bestHit;
  }

  polygon.points.forEach((vertex) => {
    const vertexHit = circleCastCircle(origin, direction, maxDistance, radius, {
      kind: "circle",
      center: vertex,
      radius: 0,
    });

    if (!vertexHit) {
      return;
    }

    const candidate = {
      center: vertexHit.center,
      point: vertex,
      normal: vertexHit.normal,
      distance: vertexHit.distance,
    };

    if (!bestHit || candidate.distance < bestHit.distance) {
      bestHit = candidate;
    }
  });

  return bestHit;
}

function circleCastSnapshot(
  origin: Vector3,
  direction: Vector3,
  maxDistance: number,
  radius: number,
  snapshot: ColliderSnapshot,
) {
  if (snapshot.shape.kind === "circle") {
    return circleCastCircle(origin, direction, maxDistance, radius, snapshot.shape);
  }

  return circleCastPolygon(origin, direction, maxDistance, radius, snapshot.shape);
}

export function shapeCastWithScene(
  world: PhysicsWorld,
  shape: Shape,
  position: Vector3,
  rotation: number,
  direction: Vector3,
  maxDistance: number,
  options?: QueryFilterOptions,
): ShapeCastHit | null {
  const castDirection = direction.normalized();
  if (castDirection.length === 0) {
    return null;
  }

  const motion = castDirection.scale(maxDistance);
  const movingShape = createSweepProbeShape(shape, position, rotation);
  let closestHit: ShapeCastHit | null = null;

  forEachMatchingSnapshot(world, options, (body, snapshot) => {
    const hit = sweepWorldShapes(movingShape, motion, snapshot.shape);
    if (!hit) {
      return;
    }

    if (!closestHit || hit.distance < closestHit.distance) {
      closestHit = {
        bodyId: body.id,
        colliderId: snapshot.collider.id,
        point: hit.point,
        normal: hit.normal,
        distance: hit.distance,
        shape,
        position: position.add(castDirection.scale(hit.distance)),
        rotation,
      };
    }
  });

  return closestHit;
}

export function rayWithScene(
  world: PhysicsWorld,
  origin: Vector3,
  direction: Vector3,
  maxDistance: number,
  options?: QueryFilterOptions,
): RaycastHit | null {
  const rayDirection = direction.normalized();
  if (rayDirection.length === 0) {
    return null;
  }

  let closestHit: RaycastHit | null = null;

  forEachMatchingSnapshot(world, options, (body, snapshot) => {
    const hit = raycastSnapshot(origin, rayDirection, maxDistance, snapshot);
    if (!hit) {
      return;
    }

    if (!closestHit || hit.distance < closestHit.distance) {
      closestHit = {
        bodyId: body.id,
        colliderId: snapshot.collider.id,
        point: hit.point,
        normal: hit.normal,
        distance: hit.distance,
      };
    }
  });

  return closestHit;
}

export function circleCastWithScene(
  world: PhysicsWorld,
  origin: Vector3,
  radius: number,
  direction: Vector3,
  maxDistance: number,
  options?: QueryFilterOptions,
): CircleCastHit | null {
  const castDirection = direction.normalized();
  if (castDirection.length === 0) {
    return null;
  }

  let closestHit: CircleCastHit | null = null;

  forEachMatchingSnapshot(world, options, (body, snapshot) => {
    const hit = circleCastSnapshot(origin, castDirection, maxDistance, radius, snapshot);
    if (!hit) {
      return;
    }

    if (!closestHit || hit.distance < closestHit.distance) {
      closestHit = {
        bodyId: body.id,
        colliderId: snapshot.collider.id,
        point: hit.point,
        center: hit.center,
        normal: hit.normal,
        distance: hit.distance,
        radius,
      };
    }
  });

  return closestHit;
}
