import { approxZero } from "../math/scalar";
import { Vector3 } from "../math/Vector3";
import {
  computePolygonCenter,
  getSupportPoint,
  projectPolygon,
  type Shape,
  type WorldCircleShape,
  type WorldPolygonShape,
  type WorldShape,
} from "./shapes";

export interface SweepHit {
  point: Vector3;
  normal: Vector3;
  distance: number;
  fraction: number;
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

function isPointInsidePolygon(point: Vector3, polygon: WorldPolygonShape) {
  return polygon.normals.every((normal, index) => {
    const vertex = polygon.points[index];
    return point.subtract(vertex).dot(normal) <= 1e-6;
  });
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

function circleCastCircle(
  origin: Vector3,
  direction: Vector3,
  maxDistance: number,
  radius: number,
  circle: WorldCircleShape,
): SweepHit | null {
  const expandedHit = raycastCircle(origin, direction, maxDistance, {
    ...circle,
    radius: circle.radius + radius,
  });

  if (!expandedHit) {
    return null;
  }

  return {
    point: circle.center.add(expandedHit.normal.scale(circle.radius)),
    normal: expandedHit.normal,
    distance: expandedHit.distance,
    fraction: maxDistance <= 1e-6 ? 0 : expandedHit.distance / maxDistance,
  };
}

function circleCastPolygon(
  origin: Vector3,
  direction: Vector3,
  maxDistance: number,
  radius: number,
  polygon: WorldPolygonShape,
): SweepHit | null {
  const insideExpanded = polygon.normals.every((normal, index) => {
    const vertex = polygon.points[index];
    return normal.dot(origin.subtract(vertex)) <= radius + 1e-6;
  });

  let bestHit: SweepHit | null = null;

  if (insideExpanded) {
    const closestPoint = getClosestPointOnPolygon(origin, polygon);
    const delta = origin.subtract(closestPoint);
    const normal =
      delta.length > 1e-6 ? delta.normalized() : polygon.normals[0] ?? Vector3.up();
    bestHit = {
      point: closestPoint,
      normal,
      distance: 0,
      fraction: 0,
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
    const candidate: SweepHit = {
      point: origin.add(direction.scale(enter)).subtract(normal.scale(radius)),
      normal,
      distance: enter,
      fraction: maxDistance <= 1e-6 ? 0 : enter / maxDistance,
    };
    bestHit =
      !bestHit || candidate.distance < bestHit.distance ? candidate : bestHit;
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

    const candidate: SweepHit = {
      point: vertex,
      normal: vertexHit.normal,
      distance: vertexHit.distance,
      fraction: vertexHit.fraction,
    };

    bestHit =
      !bestHit || candidate.distance < bestHit.distance ? candidate : bestHit;
  });

  return bestHit;
}

function sweepPolygonCircle(
  moving: WorldPolygonShape,
  motion: Vector3,
  target: WorldCircleShape,
) {
  const distance = motion.length;
  if (distance <= 1e-6) {
    return null;
  }

  const reverseHit = circleCastPolygon(
    target.center,
    motion.normalized().scale(-1),
    distance,
    target.radius,
    moving,
  );

  if (!reverseHit) {
    return null;
  }

  return {
    point: target.center.subtract(reverseHit.normal.scale(target.radius)),
    normal: reverseHit.normal,
    distance: reverseHit.distance,
    fraction: reverseHit.fraction,
  } satisfies SweepHit;
}

function sweepPolygonPolygon(
  moving: WorldPolygonShape,
  motion: Vector3,
  target: WorldPolygonShape,
) {
  const motionLength = motion.length;
  if (motionLength <= 1e-6) {
    return null;
  }

  const axes = [...moving.normals, ...target.normals].map((axis) =>
    axis.normalized(),
  );
  let enterFraction = 0;
  let exitFraction = 1;
  let hitNormal: Vector3 | null = null;

  for (const axis of axes) {
    const projectionA = projectPolygon(axis, moving);
    const projectionB = projectPolygon(axis, target);
    const relativeVelocity = motion.dot(axis);

    if (approxZero(relativeVelocity)) {
      if (
        projectionA.max < projectionB.min ||
        projectionB.max < projectionA.min
      ) {
        return null;
      }
      continue;
    }

    const entry =
      relativeVelocity > 0
        ? (projectionB.min - projectionA.max) / relativeVelocity
        : (projectionB.max - projectionA.min) / relativeVelocity;
    const exit =
      relativeVelocity > 0
        ? (projectionB.max - projectionA.min) / relativeVelocity
        : (projectionB.min - projectionA.max) / relativeVelocity;
    const candidateNormal =
      relativeVelocity > 0 ? axis : axis.scale(-1);

    if (entry > enterFraction) {
      enterFraction = entry;
      hitNormal = candidateNormal;
    }
    exitFraction = Math.min(exitFraction, exit);

    if (enterFraction > exitFraction) {
      return null;
    }
  }

  if (enterFraction < 0 || enterFraction > 1) {
    return null;
  }

  const translation = motion.scale(enterFraction);
  const movedPoints = moving.points.map((point) => point.add(translation));
  const movedPolygon: WorldPolygonShape = {
    ...moving,
    points: movedPoints,
    center: computePolygonCenter(movedPoints),
  };
  const normal = hitNormal ?? motion.normalized().scale(-1);
  const movingSupport = getSupportPoint(movedPolygon.points, normal);
  const targetSupport = getSupportPoint(target.points, normal.scale(-1));
  const point = movingSupport.add(targetSupport).scale(0.5);

  return {
    point,
    normal,
    distance: motionLength * enterFraction,
    fraction: enterFraction,
  } satisfies SweepHit;
}

export function sweepWorldShapes(
  moving: WorldShape,
  motion: Vector3,
  target: WorldShape,
): SweepHit | null {
  const motionLength = motion.length;
  if (motionLength <= 1e-6) {
    return null;
  }

  if (moving.kind === "circle" && target.kind === "circle") {
    return circleCastCircle(
      moving.center,
      motion.scale(1 / motionLength),
      motionLength,
      moving.radius,
      target,
    );
  }

  if (moving.kind === "circle" && target.kind === "polygon") {
    return circleCastPolygon(
      moving.center,
      motion.scale(1 / motionLength),
      motionLength,
      moving.radius,
      target,
    );
  }

  if (moving.kind === "polygon" && target.kind === "circle") {
    return sweepPolygonCircle(moving, motion, target);
  }

  if (moving.kind === "polygon" && target.kind === "polygon") {
    return sweepPolygonPolygon(moving, motion, target);
  }

  return null;
}

export function createSweepProbeShape(shape: Shape, position: Vector3, rotation = 0) {
  if (shape.kind === "circle") {
    return {
      kind: "circle",
      radius: shape.radius,
      center: position,
    } satisfies WorldCircleShape;
  }

  const points = shape.points.map((point) => point.rotateZ(rotation).add(position));
  const normals = shape.normals.map((normal) => normal.rotateZ(rotation).normalized());

  return {
    kind: "polygon",
    points,
    normals,
    center: computePolygonCenter(points),
  } satisfies WorldPolygonShape;
}
