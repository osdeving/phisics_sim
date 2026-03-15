import type { ContactManifold, ContactPoint } from "./contact";
import type { ColliderSnapshot, RigidBody } from "../dynamics/RigidBody";
import { overlapsAabb } from "./Aabb";
import {
  getSupportPoint,
  projectCircle,
  projectPolygon,
  type WorldCircleShape,
  type WorldPolygonShape,
} from "./shapes";
import { Vector3 } from "../math/Vector3";

function combineMaterial(
  first: ColliderSnapshot["collider"],
  second: ColliderSnapshot["collider"],
) {
  return {
    friction: Math.sqrt(first.material.friction * second.material.friction),
    restitution: Math.max(
      first.material.restitution,
      second.material.restitution,
    ),
    isSensor: first.isSensor || second.isSensor,
  };
}

function createManifold(
  bodyA: RigidBody,
  bodyB: RigidBody,
  snapshotA: ColliderSnapshot,
  snapshotB: ColliderSnapshot,
  normal: Vector3,
  penetration: number,
  points: ContactPoint[],
): ContactManifold {
  const material = combineMaterial(snapshotA.collider, snapshotB.collider);

  return {
    bodyAId: bodyA.id,
    bodyBId: bodyB.id,
    colliderAId: snapshotA.collider.id,
    colliderBId: snapshotB.collider.id,
    normal,
    penetration,
    points,
    friction: material.friction,
    restitution: material.restitution,
    isSensor: material.isSensor,
  };
}

function circleCircleContact(
  bodyA: RigidBody,
  bodyB: RigidBody,
  snapshotA: ColliderSnapshot,
  snapshotB: ColliderSnapshot,
) {
  const circleA = snapshotA.shape as WorldCircleShape;
  const circleB = snapshotB.shape as WorldCircleShape;
  const delta = circleB.center.subtract(circleA.center);
  const distance = delta.length;
  const radiusSum = circleA.radius + circleB.radius;

  if (distance >= radiusSum) {
    return null;
  }

  const normal =
    distance === 0 ? Vector3.right() : delta.scale(1 / distance);
  const penetration = radiusSum - distance;
  const point = circleA.center.add(
    normal.scale(circleA.radius - penetration * 0.5),
  );

  return createManifold(bodyA, bodyB, snapshotA, snapshotB, normal, penetration, [
    {
      position: point,
      penetration,
    },
  ]);
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

function circlePolygonContact(
  bodyA: RigidBody,
  bodyB: RigidBody,
  circleSnapshot: ColliderSnapshot,
  polygonSnapshot: ColliderSnapshot,
  circleIsA: boolean,
) {
  const circle = circleSnapshot.shape as WorldCircleShape;
  const polygon = polygonSnapshot.shape as WorldPolygonShape;
  const closestPoint = getClosestPointOnPolygon(circle.center, polygon);
  const delta = circle.center.subtract(closestPoint);
  const distance = delta.length;
  const inside = isPointInsidePolygon(circle.center, polygon);

  if (!inside && distance >= circle.radius) {
    return null;
  }

  const directionToPolygon = closestPoint.subtract(circle.center);
  const normal =
    distance === 0
      ? polygon.normals[0] ?? Vector3.down()
      : directionToPolygon.scale(1 / distance);
  const penetration = inside ? circle.radius + distance : circle.radius - distance;
  const contactPoint = inside
    ? circle.center.add(normal.scale(circle.radius))
    : closestPoint;
  const normalFromAtoB = circleIsA ? normal : normal.scale(-1);

  return createManifold(
    bodyA,
    bodyB,
    circleIsA ? circleSnapshot : polygonSnapshot,
    circleIsA ? polygonSnapshot : circleSnapshot,
    normalFromAtoB,
    penetration,
    [
      {
        position: contactPoint,
        penetration,
      },
    ],
  );
}

interface AxisTestResult {
  axis: Vector3;
  overlap: number;
}

function getAxisWithLeastOverlap(
  first: WorldPolygonShape,
  second: WorldPolygonShape,
) {
  const axes = [...first.normals, ...second.normals];
  let best: AxisTestResult | null = null;

  for (const axis of axes) {
    const normalizedAxis = axis.normalized();
    const projectionA = projectPolygon(normalizedAxis, first);
    const projectionB = projectPolygon(normalizedAxis, second);
    const overlap =
      Math.min(projectionA.max, projectionB.max) -
      Math.max(projectionA.min, projectionB.min);

    if (overlap <= 0) {
      return null;
    }

    if (!best || overlap < best.overlap) {
      best = {
        axis: normalizedAxis,
        overlap,
      };
    }
  }

  return best;
}

function clipPointsToPlane(
  points: Vector3[],
  planePoint: Vector3,
  planeNormal: Vector3,
) {
  const clipped: Vector3[] = [];

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const currentDistance = current.subtract(planePoint).dot(planeNormal);
    const nextDistance = next.subtract(planePoint).dot(planeNormal);

    if (currentDistance <= 0) {
      clipped.push(current);
    }

    if (currentDistance * nextDistance < 0) {
      const alpha = currentDistance / (currentDistance - nextDistance);
      clipped.push(current.add(next.subtract(current).scale(alpha)));
    }
  }

  return clipped;
}

function polygonPolygonContact(
  bodyA: RigidBody,
  bodyB: RigidBody,
  snapshotA: ColliderSnapshot,
  snapshotB: ColliderSnapshot,
) {
  const polygonA = snapshotA.shape as WorldPolygonShape;
  const polygonB = snapshotB.shape as WorldPolygonShape;
  const bestAxis = getAxisWithLeastOverlap(polygonA, polygonB);

  if (!bestAxis) {
    return null;
  }

  let normal = bestAxis.axis;
  if (polygonB.center.subtract(polygonA.center).dot(normal) < 0) {
    normal = normal.scale(-1);
  }

  const referencePolygon =
    polygonA.normals.includes(bestAxis.axis) ||
    polygonA.normals.some((axis) => axis.dot(bestAxis.axis) > 0.999)
      ? polygonA
      : polygonB;
  const incidentPolygon = referencePolygon === polygonA ? polygonB : polygonA;
  const referenceIsA = referencePolygon === polygonA;

  const faceIndex = referencePolygon.normals.reduce(
    (bestIndex, axis, index) =>
      axis.dot(normal) > referencePolygon.normals[bestIndex].dot(normal)
        ? index
        : bestIndex,
    0,
  );
  const v1 = referencePolygon.points[faceIndex];
  const v2 = referencePolygon.points[(faceIndex + 1) % referencePolygon.points.length];
  const sideNormal = v2.subtract(v1).normalized();
  const incidentFaceIndex = incidentPolygon.normals.reduce(
    (bestIndex, axis, index) =>
      axis.dot(normal.scale(-1)) > incidentPolygon.normals[bestIndex].dot(normal.scale(-1))
        ? index
        : bestIndex,
    0,
  );
  const i1 = incidentPolygon.points[incidentFaceIndex];
  const i2 =
    incidentPolygon.points[
      (incidentFaceIndex + 1) % incidentPolygon.points.length
    ];

  let clipped = clipPointsToPlane([i1, i2], v1, sideNormal.scale(-1));
  clipped = clipPointsToPlane(clipped, v2, sideNormal);

  const faceNormal = sideNormal.perpendicular().normalized();
  const planeNormal =
    faceNormal.dot(normal) < 0 ? faceNormal.scale(-1) : faceNormal;
  const planeOffset = planeNormal.dot(v1);

  const points = clipped
    .map((point) => ({
      position: point,
      penetration: planeOffset - planeNormal.dot(point),
    }))
    .filter((point) => point.penetration >= -1e-4)
    .map((point) => ({
      position: point.position,
      penetration: Math.max(point.penetration, 0),
    }));

  if (points.length === 0) {
    const supportA = getSupportPoint(polygonA.points, normal);
    const supportB = getSupportPoint(polygonB.points, normal.scale(-1));
    points.push({
      position: supportA.add(supportB).scale(0.5),
      penetration: bestAxis.overlap,
    });
  }

  return createManifold(
    referenceIsA ? bodyA : bodyB,
    referenceIsA ? bodyB : bodyA,
    referenceIsA ? snapshotA : snapshotB,
    referenceIsA ? snapshotB : snapshotA,
    referenceIsA ? normal : normal.scale(-1),
    bestAxis.overlap,
    points,
  );
}

export function intersectSnapshots(
  bodyA: RigidBody,
  bodyB: RigidBody,
  snapshotA: ColliderSnapshot,
  snapshotB: ColliderSnapshot,
) {
  if (!overlapsAabb(snapshotA.aabb, snapshotB.aabb)) {
    return null;
  }

  if (snapshotA.shape.kind === "circle" && snapshotB.shape.kind === "circle") {
    return circleCircleContact(bodyA, bodyB, snapshotA, snapshotB);
  }

  if (snapshotA.shape.kind === "circle" && snapshotB.shape.kind === "polygon") {
    return circlePolygonContact(bodyA, bodyB, snapshotA, snapshotB, true);
  }

  if (snapshotA.shape.kind === "polygon" && snapshotB.shape.kind === "circle") {
    return circlePolygonContact(bodyA, bodyB, snapshotB, snapshotA, false);
  }

  return polygonPolygonContact(bodyA, bodyB, snapshotA, snapshotB);
}
