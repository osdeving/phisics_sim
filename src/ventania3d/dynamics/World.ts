import {
  createEmptyContactEventSet,
  type ContactEventSet,
  type ContactManifold,
} from "../collision/contact";
import { canCollideFilters } from "../collision/filter";
import { intersectSnapshots } from "../collision/intersections";
import { overlapsAabb, type Aabb } from "../collision/Aabb";
import { sweepWorldShapes } from "../collision/sweep";
import { computeShapeAabb, type WorldShape } from "../collision/shapes";
import { approxZero, clamp } from "../math/scalar";
import { Vector3 } from "../math/Vector3";
import type { Joint } from "./Joint";
import { createRigidBody, type ColliderSnapshot, RigidBody } from "./RigidBody";

export interface PhysicsWorldOptions {
  gravity?: Vector3;
  solverIterations?: number;
  positionIterations?: number;
  broadPhaseCellSize?: number;
  maxSubsteps?: number;
  maxTranslationPerSubstep?: number;
  maxToiIterations?: number;
}

interface TimeOfImpact {
  fraction: number;
  bodyAId: string;
  bodyBId: string;
}

export class PhysicsWorld {
  gravity: Vector3;
  solverIterations: number;
  positionIterations: number;
  broadPhaseCellSize: number;
  maxSubsteps: number;
  maxTranslationPerSubstep: number;
  maxToiIterations: number;
  bodies: RigidBody[] = [];
  joints: Joint[] = [];
  contacts: ContactManifold[] = [];
  contactEvents: ContactEventSet = createEmptyContactEventSet();
  time = 0;
  private contactCache = new Map<string, ContactManifold>();

  constructor(options: PhysicsWorldOptions = {}) {
    this.gravity = options.gravity?.clone() ?? new Vector3(0, 9.81, 0);
    this.solverIterations = options.solverIterations ?? 10;
    this.positionIterations = options.positionIterations ?? 4;
    this.broadPhaseCellSize = options.broadPhaseCellSize ?? 2.75;
    this.maxSubsteps = options.maxSubsteps ?? 8;
    this.maxTranslationPerSubstep = options.maxTranslationPerSubstep ?? 0.45;
    this.maxToiIterations = options.maxToiIterations ?? 4;
  }

  addBody(body: RigidBody) {
    this.bodies.push(body);
    return body;
  }

  removeBody(bodyId: string) {
    this.bodies = this.bodies.filter((body) => body.id !== bodyId);
    this.joints = this.joints.filter((joint) => {
      if ("bodyAId" in joint && joint.bodyAId === bodyId) {
        return false;
      }
      if ("bodyBId" in joint && joint.bodyBId === bodyId) {
        return false;
      }
      return true;
    });
    this.contacts = this.contacts.filter(
      (contact) => contact.bodyAId !== bodyId && contact.bodyBId !== bodyId,
    );
    this.contactEvents = {
      begin: this.contactEvents.begin.filter(
        (contact) => contact.bodyAId !== bodyId && contact.bodyBId !== bodyId,
      ),
      persist: this.contactEvents.persist.filter(
        (contact) => contact.bodyAId !== bodyId && contact.bodyBId !== bodyId,
      ),
      end: this.contactEvents.end.filter(
        (contact) => contact.bodyAId !== bodyId && contact.bodyBId !== bodyId,
      ),
    };
    this.contactCache = new Map(
      [...this.contactCache.entries()].filter(
        ([, contact]) => contact.bodyAId !== bodyId && contact.bodyBId !== bodyId,
      ),
    );
  }

  addJoint(joint: Joint) {
    this.joints.push(joint);
    return joint;
  }

  getBody(id: string) {
    return this.bodies.find((body) => body.id === id);
  }

  getProbeBody(position: Vector3) {
    return createRigidBody({
      id: "probe",
      type: "static",
      position,
      colliders: [],
    });
  }

  computeShapeAabb(shape: WorldShape) {
    return computeShapeAabb(shape);
  }

  private buildBodyFrames() {
    return this.bodies
      .map((body) => {
        const snapshots = body.getSnapshots();
        if (snapshots.length === 0) {
          return null;
        }

        const aabb = snapshots
          .map((snapshot) => snapshot.aabb)
          .reduce((combined, next) => ({
            min: new Vector3(
              Math.min(combined.min.x, next.min.x),
              Math.min(combined.min.y, next.min.y),
              0,
            ),
            max: new Vector3(
              Math.max(combined.max.x, next.max.x),
              Math.max(combined.max.y, next.max.y),
              0,
            ),
          }));

        return {
          body,
          snapshots,
          aabb,
        };
      })
      .filter(
        (
          frame,
        ): frame is {
          body: RigidBody;
          snapshots: ColliderSnapshot[];
          aabb: Aabb;
        } => Boolean(frame),
      );
  }

  private buildBroadPhasePairs(
    frames: Array<{
      body: RigidBody;
      snapshots: ColliderSnapshot[];
      aabb: Aabb;
    }>,
  ) {
    const cellSize = Math.max(0.5, this.broadPhaseCellSize);
    const cells = new Map<string, number[]>();
    const candidatePairs = new Set<string>();

    frames.forEach((frame, frameIndex) => {
      const minCellX = Math.floor(frame.aabb.min.x / cellSize);
      const maxCellX = Math.floor(frame.aabb.max.x / cellSize);
      const minCellY = Math.floor(frame.aabb.min.y / cellSize);
      const maxCellY = Math.floor(frame.aabb.max.y / cellSize);

      for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
        for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
          const cellKey = `${cellX}:${cellY}`;
          const occupants = cells.get(cellKey);

          if (!occupants) {
            cells.set(cellKey, [frameIndex]);
            continue;
          }

          occupants.forEach((otherIndex) => {
            if (otherIndex === frameIndex) {
              return;
            }

            const first = Math.min(frameIndex, otherIndex);
            const second = Math.max(frameIndex, otherIndex);
            candidatePairs.add(`${first}:${second}`);
          });

          occupants.push(frameIndex);
        }
      }
    });

    return [...candidatePairs].map((pair) => {
      const [first, second] = pair.split(":").map(Number);
      return [first, second] as const;
    });
  }

  private expandAabbByMotion(aabb: Aabb, motion: Vector3) {
    return {
      min: new Vector3(
        Math.min(aabb.min.x, aabb.min.x + motion.x),
        Math.min(aabb.min.y, aabb.min.y + motion.y),
        0,
      ),
      max: new Vector3(
        Math.max(aabb.max.x, aabb.max.x + motion.x),
        Math.max(aabb.max.y, aabb.max.y + motion.y),
        0,
      ),
    } satisfies Aabb;
  }

  private buildSweptFrames(stepDt: number) {
    return this.buildBodyFrames().map((frame) => {
      const motion = frame.body.velocity.scale(stepDt);
      return {
        ...frame,
        motion,
        sweptAabb: this.expandAabbByMotion(frame.aabb, motion),
      };
    });
  }

  private findEarliestTimeOfImpact(stepDt: number): TimeOfImpact | null {
    const frames = this.buildSweptFrames(stepDt);
    const candidatePairs = this.buildBroadPhasePairs(
      frames.map((frame) => ({
        body: frame.body,
        snapshots: frame.snapshots,
        aabb: frame.sweptAabb,
      })),
    );
    let earliest: TimeOfImpact | null = null;

    candidatePairs.forEach(([firstIndex, secondIndex]) => {
      const frameA = frames[firstIndex];
      const frameB = frames[secondIndex];

      if (
        (frameA.body.type === "static" || frameA.body.type === "kinematic") &&
        (frameB.body.type === "static" || frameB.body.type === "kinematic")
      ) {
        return;
      }

      if (!overlapsAabb(frameA.sweptAabb, frameB.sweptAabb)) {
        return;
      }

      const relativeMotion = frameA.motion.subtract(frameB.motion);
      if (relativeMotion.length <= 1e-6) {
        return;
      }

      frameA.snapshots.forEach((snapshotA) => {
        frameB.snapshots.forEach((snapshotB) => {
          if (!canCollideFilters(snapshotA.collider, snapshotB.collider)) {
            return;
          }

          const hit = sweepWorldShapes(
            snapshotA.shape,
            relativeMotion,
            snapshotB.shape,
          );

          if (!hit || hit.fraction < 0 || hit.fraction > 1) {
            return;
          }

          if (!earliest || hit.fraction < earliest.fraction) {
            earliest = {
              fraction: hit.fraction,
              bodyAId: frameA.body.id,
              bodyBId: frameB.body.id,
            };
          }
        });
      });
    });

    return earliest;
  }

  private mergeCachedContacts(contacts: ContactManifold[]) {
    contacts.forEach((contact) => {
      const cached = this.contactCache.get(contact.id);
      if (!cached) {
        return;
      }

      contact.points.forEach((point) => {
        const match = cached.points.reduce<{
          distance: number;
          point: ContactManifold["points"][number];
        } | null>((best, cachedPoint) => {
          const distance = cachedPoint.position.distanceTo(point.position);
          if (!best || distance < best.distance) {
            return {
              distance,
              point: cachedPoint,
            };
          }
          return best;
        }, null);

        if (!match || match.distance > 0.35) {
          return;
        }

        point.id = match.point.id;
        point.normalImpulse = match.point.normalImpulse;
        point.tangentImpulse = match.point.tangentImpulse;
      });
    });
  }

  private warmStartContact(contact: ContactManifold) {
    const bodyA = this.getBody(contact.bodyAId);
    const bodyB = this.getBody(contact.bodyBId);

    if (!bodyA || !bodyB) {
      return;
    }

    const tangent = contact.normal.perpendicular().normalized();

    contact.points.forEach((point) => {
      if (
        Math.abs(point.normalImpulse) <= 1e-6 &&
        Math.abs(point.tangentImpulse) <= 1e-6
      ) {
        return;
      }

      const impulse = contact.normal
        .scale(point.normalImpulse)
        .add(tangent.scale(point.tangentImpulse));

      bodyA.applyImpulse(impulse.scale(-1), point.position);
      bodyB.applyImpulse(impulse, point.position);
    });
  }

  private warmStartContacts() {
    this.contacts.forEach((contact) => {
      if (!contact.isSensor) {
        this.warmStartContact(contact);
      }
    });
  }

  private storeContactCache() {
    const nextCache = new Map<string, ContactManifold>();

    this.contacts.forEach((contact) => {
      nextCache.set(contact.id, {
        ...contact,
        normal: contact.normal.clone(),
        points: contact.points.map((point) => ({
          id: point.id,
          position: point.position.clone(),
          penetration: point.penetration,
          normalImpulse: point.normalImpulse,
          tangentImpulse: point.tangentImpulse,
        })),
      });
    });

    this.contactCache = nextCache;
  }

  private collectContactEvents(
    previousContacts: Map<string, ContactManifold>,
    nextContacts: ContactManifold[],
    aggregate: {
      begin: Map<string, ContactManifold>;
      persist: Map<string, ContactManifold>;
      end: Map<string, ContactManifold>;
    },
  ) {
    const nextById = new Map(nextContacts.map((contact) => [contact.id, contact]));

    nextContacts.forEach((contact) => {
      if (previousContacts.has(contact.id)) {
        aggregate.persist.set(contact.id, contact);
      } else {
        aggregate.begin.set(contact.id, contact);
      }
    });

    previousContacts.forEach((contact, contactId) => {
      if (!nextById.has(contactId)) {
        aggregate.end.set(contactId, contact);
      }
    });
  }

  private estimateAdaptiveSubsteps(dt: number, requestedSubsteps: number) {
    const fromVelocity = this.bodies.reduce((maxSubsteps, body) => {
      if (!body.isDynamic() || body.sleeping) {
        return maxSubsteps;
      }

      const required = Math.ceil(
        (body.velocity.length * dt) / Math.max(this.maxTranslationPerSubstep, 1e-3),
      );
      return Math.max(maxSubsteps, required);
    }, requestedSubsteps);

    return clamp(fromVelocity, 1, this.maxSubsteps);
  }

  detectContacts() {
    const contacts: ContactManifold[] = [];
    const frames = this.buildBodyFrames();
    const candidatePairs = this.buildBroadPhasePairs(frames);

    candidatePairs.forEach(([firstIndex, secondIndex]) => {
      const frameA = frames[firstIndex];
      const frameB = frames[secondIndex];
      const bodyA = frameA.body;
      const bodyB = frameB.body;

      if (
        (bodyA.type === "static" || bodyA.type === "kinematic") &&
        (bodyB.type === "static" || bodyB.type === "kinematic")
      ) {
        return;
      }

      if (!overlapsAabb(frameA.aabb, frameB.aabb)) {
        return;
      }

      frameA.snapshots.forEach((snapshotA) => {
        frameB.snapshots.forEach((snapshotB) => {
          if (!canCollideFilters(snapshotA.collider, snapshotB.collider)) {
            return;
          }

          const manifold = intersectSnapshots(
            bodyA,
            bodyB,
            snapshotA,
            snapshotB,
          );

          if (manifold) {
            contacts.push(manifold);
          }
        });
      });
    });

    this.mergeCachedContacts(contacts);
    this.contacts = contacts;
    return contacts;
  }

  step(dt: number, substeps = 1) {
    const effectiveSubsteps = this.estimateAdaptiveSubsteps(dt, substeps);
    const stepDt = dt / effectiveSubsteps;
    const stepEvents = {
      begin: new Map<string, ContactManifold>(),
      persist: new Map<string, ContactManifold>(),
      end: new Map<string, ContactManifold>(),
    };

    for (let stepIndex = 0; stepIndex < effectiveSubsteps; stepIndex += 1) {
      this.bodies.forEach((body) => {
        body.integrateForces(this.gravity, stepDt);
      });

      this.joints.forEach((joint) => {
        joint.apply(this, stepDt);
      });
      let remainingDt = stepDt;
      let toiIterations = 0;

      while (remainingDt > 1e-6) {
        const toi: TimeOfImpact | null =
          toiIterations < this.maxToiIterations
            ? this.findEarliestTimeOfImpact(remainingDt)
            : null;
        const advanceFraction = toi ? clamp(toi.fraction, 0, 1) : 1;
        const advanceDt = remainingDt * advanceFraction;

        this.bodies.forEach((body) => {
          body.integrateVelocity(advanceDt);
        });

        const previousContacts = new Map(this.contactCache);
        this.detectContacts();
        this.collectContactEvents(previousContacts, this.contacts, stepEvents);
        this.warmStartContacts();

        for (let iteration = 0; iteration < this.solverIterations; iteration += 1) {
          this.contacts.forEach((contact) => {
            if (!contact.isSensor) {
              this.solveVelocity(contact);
            }
          });
        }

        for (
          let iteration = 0;
          iteration < this.positionIterations;
          iteration += 1
        ) {
          this.contacts.forEach((contact) => {
            if (!contact.isSensor) {
              this.solvePosition(contact);
            }
          });
        }

        this.storeContactCache();
        this.updateSleeping(advanceDt);
        this.time += advanceDt;
        remainingDt -= advanceDt;

        if (!toi) {
          break;
        }

        toiIterations += 1;
      }
    }

    this.contactEvents = {
      begin: [...stepEvents.begin.values()],
      persist: [...stepEvents.persist.values()],
      end: [...stepEvents.end.values()],
    };
  }

  private solveVelocity(contact: ContactManifold) {
    const bodyA = this.getBody(contact.bodyAId);
    const bodyB = this.getBody(contact.bodyBId);

    if (!bodyA || !bodyB) {
      return;
    }

    const tangent = contact.normal.perpendicular().normalized();

    contact.points.forEach((point) => {
      const offsetA = point.position.subtract(bodyA.position);
      const offsetB = point.position.subtract(bodyB.position);
      let velocityA = bodyA.getPointVelocity(point.position);
      let velocityB = bodyB.getPointVelocity(point.position);
      let relativeVelocity = velocityB.subtract(velocityA);
      const normalVelocity = relativeVelocity.dot(contact.normal);

      const normalMass =
        bodyA.inverseMass +
        bodyB.inverseMass +
        offsetA.cross(contact.normal).z ** 2 * bodyA.inverseInertia +
        offsetB.cross(contact.normal).z ** 2 * bodyB.inverseInertia;

      if (approxZero(normalMass)) {
        return;
      }

      const restitutionVelocity =
        normalVelocity < -0.5 ? -contact.restitution * normalVelocity : 0;
      const normalImpulseDelta =
        (restitutionVelocity - normalVelocity) / normalMass;
      const previousNormalImpulse = point.normalImpulse;
      point.normalImpulse = Math.max(previousNormalImpulse + normalImpulseDelta, 0);
      const appliedNormalImpulse = point.normalImpulse - previousNormalImpulse;

      if (Math.abs(appliedNormalImpulse) > 1e-6) {
        const normalImpulse = contact.normal.scale(appliedNormalImpulse);
        bodyA.applyImpulse(normalImpulse.scale(-1), point.position);
        bodyB.applyImpulse(normalImpulse, point.position);
      }

      velocityA = bodyA.getPointVelocity(point.position);
      velocityB = bodyB.getPointVelocity(point.position);
      relativeVelocity = velocityB.subtract(velocityA);

      const tangentMass =
        bodyA.inverseMass +
        bodyB.inverseMass +
        offsetA.cross(tangent).z ** 2 * bodyA.inverseInertia +
        offsetB.cross(tangent).z ** 2 * bodyB.inverseInertia;

      if (!approxZero(tangentMass)) {
        const tangentVelocity = relativeVelocity.dot(tangent);
        const previousTangentImpulse = point.tangentImpulse;
        const maxFrictionImpulse = contact.friction * point.normalImpulse;
        point.tangentImpulse = clamp(
          previousTangentImpulse - tangentVelocity / tangentMass,
          -maxFrictionImpulse,
          maxFrictionImpulse,
        );
        const appliedTangentImpulse =
          point.tangentImpulse - previousTangentImpulse;

        if (Math.abs(appliedTangentImpulse) > 1e-6) {
          const frictionImpulse = tangent.scale(appliedTangentImpulse);
          bodyA.applyImpulse(frictionImpulse.scale(-1), point.position);
          bodyB.applyImpulse(frictionImpulse, point.position);
        }
      }

      if (
        relativeVelocity.length > 0.1 &&
        (Math.abs(appliedNormalImpulse) > 0.05 ||
          Math.abs(point.tangentImpulse) > 0.05)
      ) {
        if (bodyA.isDynamic()) {
          bodyA.wake();
        }
        if (bodyB.isDynamic()) {
          bodyB.wake();
        }
      }
    });
  }

  private solvePosition(contact: ContactManifold) {
    const bodyA = this.getBody(contact.bodyAId);
    const bodyB = this.getBody(contact.bodyBId);

    if (!bodyA || !bodyB) {
      return;
    }

    const inverseMassSum = bodyA.inverseMass + bodyB.inverseMass;

    if (approxZero(inverseMassSum)) {
      return;
    }

    const correctionMagnitude =
      (Math.max(contact.penetration - 0.01, 0) * 0.3) / inverseMassSum;
    const correction = contact.normal.scale(correctionMagnitude);

    if (bodyA.isDynamic()) {
      bodyA.position = bodyA.position.subtract(correction.scale(bodyA.inverseMass));
    }

    if (bodyB.isDynamic()) {
      bodyB.position = bodyB.position.add(correction.scale(bodyB.inverseMass));
    }
  }

  private updateSleeping(dt: number) {
    const dynamicBodies = this.bodies.filter((body) => body.isDynamic());
    const activeContactBodyIds = new Set(
      this.contacts.flatMap((contact) => [contact.bodyAId, contact.bodyBId]),
    );

    dynamicBodies.forEach((body) => {
      const linearSpeedSquared = body.velocity.lengthSquared;
      const angularSpeed = Math.abs(body.angularVelocity);
      const nearlyStill =
        linearSpeedSquared < 0.01 && angularSpeed < 0.12;

      if (nearlyStill) {
        body.sleepTimer += dt;
        if (body.sleepTimer > 0.25) {
          body.sleep();
        }
        return;
      }

      if (activeContactBodyIds.has(body.id) || linearSpeedSquared > 0.01 || angularSpeed > 0.12) {
        body.wake();
      }
    });
  }

  clone() {
    const world = new PhysicsWorld({
      gravity: this.gravity.clone(),
      solverIterations: this.solverIterations,
      positionIterations: this.positionIterations,
      broadPhaseCellSize: this.broadPhaseCellSize,
      maxSubsteps: this.maxSubsteps,
      maxTranslationPerSubstep: this.maxTranslationPerSubstep,
      maxToiIterations: this.maxToiIterations,
    });

    world.bodies = this.bodies.map((body) => body.clone());
    world.joints = this.joints.map((joint) => joint.clone());
    world.contacts = this.contacts.map((contact) => ({
      ...contact,
      normal: contact.normal.clone(),
      points: contact.points.map((point) => ({
        id: point.id,
        position: point.position.clone(),
        penetration: point.penetration,
        normalImpulse: point.normalImpulse,
        tangentImpulse: point.tangentImpulse,
      })),
    }));
    world.contactEvents = {
      begin: this.contactEvents.begin.map((contact) => ({
        ...contact,
        normal: contact.normal.clone(),
        points: contact.points.map((point) => ({
          id: point.id,
          position: point.position.clone(),
          penetration: point.penetration,
          normalImpulse: point.normalImpulse,
          tangentImpulse: point.tangentImpulse,
        })),
      })),
      persist: this.contactEvents.persist.map((contact) => ({
        ...contact,
        normal: contact.normal.clone(),
        points: contact.points.map((point) => ({
          id: point.id,
          position: point.position.clone(),
          penetration: point.penetration,
          normalImpulse: point.normalImpulse,
          tangentImpulse: point.tangentImpulse,
        })),
      })),
      end: this.contactEvents.end.map((contact) => ({
        ...contact,
        normal: contact.normal.clone(),
        points: contact.points.map((point) => ({
          id: point.id,
          position: point.position.clone(),
          penetration: point.penetration,
          normalImpulse: point.normalImpulse,
          tangentImpulse: point.tangentImpulse,
        })),
      })),
    };
    world.contactCache = new Map(
      [...this.contactCache.entries()].map(([key, contact]) => [
        key,
        {
          ...contact,
          normal: contact.normal.clone(),
          points: contact.points.map((point) => ({
            id: point.id,
            position: point.position.clone(),
            penetration: point.penetration,
            normalImpulse: point.normalImpulse,
            tangentImpulse: point.tangentImpulse,
          })),
        },
      ]),
    );
    world.time = this.time;

    return world;
  }
}
