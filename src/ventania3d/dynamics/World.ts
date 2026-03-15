import type { ContactManifold } from "../collision/contact";
import { intersectSnapshots } from "../collision/intersections";
import { computeShapeAabb, type WorldShape } from "../collision/shapes";
import { approxZero, clamp } from "../math/scalar";
import { Vector3, crossScalarVector2D } from "../math/Vector3";
import type { Joint } from "./Joint";
import { createRigidBody, RigidBody } from "./RigidBody";

function pairKey(first: string, second: string) {
  return [first, second].sort().join("::");
}

export interface PhysicsWorldOptions {
  gravity?: Vector3;
  solverIterations?: number;
  positionIterations?: number;
}

export class PhysicsWorld {
  gravity: Vector3;
  solverIterations: number;
  positionIterations: number;
  bodies: RigidBody[] = [];
  joints: Joint[] = [];
  contacts: ContactManifold[] = [];
  time = 0;

  constructor(options: PhysicsWorldOptions = {}) {
    this.gravity = options.gravity?.clone() ?? new Vector3(0, 9.81, 0);
    this.solverIterations = options.solverIterations ?? 10;
    this.positionIterations = options.positionIterations ?? 4;
  }

  addBody(body: RigidBody) {
    this.bodies.push(body);
    return body;
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

  detectContacts() {
    const contacts: ContactManifold[] = [];
    const checkedPairs = new Set<string>();

    for (let bodyIndex = 0; bodyIndex < this.bodies.length; bodyIndex += 1) {
      const bodyA = this.bodies[bodyIndex];

      for (
        let otherIndex = bodyIndex + 1;
        otherIndex < this.bodies.length;
        otherIndex += 1
      ) {
        const bodyB = this.bodies[otherIndex];
        const key = pairKey(bodyA.id, bodyB.id);

        if (checkedPairs.has(key)) {
          continue;
        }

        checkedPairs.add(key);

        if (
          (bodyA.type === "static" || bodyA.type === "kinematic") &&
          (bodyB.type === "static" || bodyB.type === "kinematic")
        ) {
          continue;
        }

        if (!bodyA.overlaps(bodyB)) {
          continue;
        }

        const snapshotsA = bodyA.getSnapshots();
        const snapshotsB = bodyB.getSnapshots();

        snapshotsA.forEach((snapshotA) => {
          snapshotsB.forEach((snapshotB) => {
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
      }
    }

    this.contacts = contacts;
    return contacts;
  }

  step(dt: number, substeps = 1) {
    const stepDt = dt / substeps;

    for (let stepIndex = 0; stepIndex < substeps; stepIndex += 1) {
      this.bodies.forEach((body) => {
        body.integrateForces(this.gravity, stepDt);
      });

      this.joints.forEach((joint) => {
        joint.apply(this, stepDt);
      });

      this.bodies.forEach((body) => {
        body.integrateVelocity(stepDt);
      });

      this.detectContacts();

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

      this.updateSleeping(stepDt);
      this.time += stepDt;
    }
  }

  private solveVelocity(contact: ContactManifold) {
    const bodyA = this.getBody(contact.bodyAId);
    const bodyB = this.getBody(contact.bodyBId);

    if (!bodyA || !bodyB) {
      return;
    }

    contact.points.forEach((point) => {
      const offsetA = point.position.subtract(bodyA.position);
      const offsetB = point.position.subtract(bodyB.position);
      const velocityA = bodyA.getPointVelocity(point.position);
      const velocityB = bodyB.getPointVelocity(point.position);
      const relativeVelocity = velocityB.subtract(velocityA);
      const normalVelocity = relativeVelocity.dot(contact.normal);

      if (normalVelocity > 0) {
        return;
      }

      const normalMass =
        bodyA.inverseMass +
        bodyB.inverseMass +
        offsetA.cross(contact.normal).z ** 2 * bodyA.inverseInertia +
        offsetB.cross(contact.normal).z ** 2 * bodyB.inverseInertia;

      if (approxZero(normalMass)) {
        return;
      }

      const normalImpulseMagnitude =
        (-(1 + contact.restitution) * normalVelocity) / normalMass;
      const normalImpulse = contact.normal.scale(normalImpulseMagnitude);
      const relativeSpeed = relativeVelocity.length;

      if (relativeSpeed > 0.1 && Math.abs(normalImpulseMagnitude) > 0.05) {
        if (bodyA.isDynamic()) {
          bodyA.wake();
        }
        if (bodyB.isDynamic()) {
          bodyB.wake();
        }
      }

      bodyA.applyImpulse(normalImpulse.scale(-1), point.position);
      bodyB.applyImpulse(normalImpulse, point.position);

      const tangentVelocity = relativeVelocity.subtract(
        contact.normal.scale(relativeVelocity.dot(contact.normal)),
      );
      const tangent =
        tangentVelocity.length === 0
          ? Vector3.zero()
          : tangentVelocity.normalized();

      if (tangent.length === 0) {
        return;
      }

      const tangentMass =
        bodyA.inverseMass +
        bodyB.inverseMass +
        offsetA.cross(tangent).z ** 2 * bodyA.inverseInertia +
        offsetB.cross(tangent).z ** 2 * bodyB.inverseInertia;

      if (approxZero(tangentMass)) {
        return;
      }

      const frictionImpulseMagnitude = clamp(
        -relativeVelocity.dot(tangent) / tangentMass,
        -contact.friction * normalImpulseMagnitude,
        contact.friction * normalImpulseMagnitude,
      );
      const frictionImpulse = tangent.scale(frictionImpulseMagnitude);

      bodyA.applyImpulse(frictionImpulse.scale(-1), point.position);
      bodyB.applyImpulse(frictionImpulse, point.position);
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
    });

    world.bodies = this.bodies.map((body) => body.clone());
    world.joints = this.joints.map((joint) => joint.clone());
    world.contacts = this.contacts.map((contact) => ({
      ...contact,
      normal: contact.normal.clone(),
      points: contact.points.map((point) => ({
        position: point.position.clone(),
        penetration: point.penetration,
      })),
    }));
    world.time = this.time;

    return world;
  }
}
