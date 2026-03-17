import { describe, expect, it } from "vitest";
import {
  createBox,
  createPlatformerCharacterBody,
  createRigidBody,
  PhysicsWorld,
  PlatformerController,
  Vector3,
} from "../../index";

function stepController(
  world: PhysicsWorld,
  controller: PlatformerController,
  commands: {
    move?: number;
    vertical?: number;
    jumpHeld?: boolean;
    dashHeld?: boolean;
  },
  dt = 1 / 60,
  steps = 1,
) {
  for (let index = 0; index < steps; index += 1) {
    controller.preStep(
      world,
      {
        move: commands.move ?? 0,
        vertical: commands.vertical ?? 0,
        jumpHeld: commands.jumpHeld ?? false,
        dashHeld: commands.dashHeld ?? false,
      },
      dt,
    );
    world.step(dt, 1);
    controller.postStep(world);
  }
}

describe("PlatformerController", () => {
  it("assenta no solo e dispara o salto com buffer/coyote", () => {
    const world = new PhysicsWorld({
      gravity: new Vector3(0, 22, 0),
    });

    world.addBody(
      createRigidBody({
        id: "ground",
        type: "static",
        position: new Vector3(0, 2.5, 0),
        colliders: [
          {
            id: "ground-shape",
            shape: createBox(12, 1),
            material: {
              density: 0,
              friction: 0.9,
              restitution: 0,
            },
          },
        ],
      }),
    );

    world.addBody(
      createPlatformerCharacterBody({
        id: "hero",
        position: new Vector3(0, 1.1, 0),
        width: 0.72,
        height: 1.52,
      }),
    );

    const controller = new PlatformerController({
      bodyId: "hero",
      width: 0.72,
      height: 1.52,
      environmentMask: 1 << 0,
      jumpSpeed: 9,
    });

    stepController(world, controller, {}, 1 / 60, 30);

    expect(controller.grounded).toBe(true);

    controller.preStep(
      world,
      {
        move: 0,
        vertical: 0,
        jumpHeld: true,
        dashHeld: false,
      },
      1 / 60,
    );
    world.step(1 / 60, 1);
    controller.postStep(world);

    const hero = world.getBody("hero");
    expect(hero?.velocity.y ?? 0).toBeLessThan(0);
    expect(controller.grounded).toBe(false);
  });

  it("limita a queda em wall slide quando encosta e pressiona a parede", () => {
    const world = new PhysicsWorld({
      gravity: new Vector3(0, 22, 0),
    });

    world.addBody(
      createRigidBody({
        id: "wall",
        type: "static",
        position: new Vector3(2.2, 2.3, 0),
        colliders: [
          {
            id: "wall-shape",
            shape: createBox(1, 6),
            material: {
              density: 0,
              friction: 0.9,
              restitution: 0,
            },
          },
        ],
      }),
    );

    world.addBody(
      createPlatformerCharacterBody({
        id: "hero",
        position: new Vector3(1.2, 1.1, 0),
        width: 0.72,
        height: 1.52,
      }),
    );

    const hero = world.getBody("hero");
    if (!hero) {
      throw new Error("hero not found");
    }
    hero.velocity = new Vector3(4, 7, 0);

    const controller = new PlatformerController({
      bodyId: "hero",
      width: 0.72,
      height: 1.52,
      environmentMask: 1 << 0,
      wallSlideSpeed: 2.8,
    });

    stepController(world, controller, { move: 1 }, 1 / 60, 25);

    expect(controller.wallRight).toBe(true);
    expect(hero.velocity.y).toBeLessThanOrEqual(2.8 + 0.4);
  });

  it("entra em ladder mode e sobe contra a gravidade", () => {
    const world = new PhysicsWorld({
      gravity: new Vector3(0, 22, 0),
    });

    world.addBody(
      createRigidBody({
        id: "ladder",
        type: "static",
        position: new Vector3(0, 2.3, 0),
        colliders: [
          {
            id: "ladder-sensor",
            shape: createBox(1, 5),
            material: {
              density: 0,
              friction: 0,
              restitution: 0,
            },
            isSensor: true,
            collisionLayer: 1 << 1,
            collisionMask: 1 << 0,
          },
        ],
        userData: {
          kind: "platformer-ladder",
        },
      }),
    );

    world.addBody(
      createPlatformerCharacterBody({
        id: "hero",
        position: new Vector3(0, 2.7, 0),
        width: 0.72,
        height: 1.52,
        collisionLayer: 1 << 0,
        collisionMask: (1 << 0) | (1 << 1),
      }),
    );

    const controller = new PlatformerController({
      bodyId: "hero",
      width: 0.72,
      height: 1.52,
      environmentMask: 1 << 0,
      bodyCollisionMask: (1 << 0) | (1 << 1),
      climbSpeed: 4.2,
    });

    world.detectContacts();
    controller.postStep(world);
    const startY = world.getBody("hero")?.position.y ?? 0;

    stepController(world, controller, { vertical: -1 }, 1 / 60, 20);

    const hero = world.getBody("hero");
    expect(controller.touchingLadder).toBe(true);
    expect(controller.climbing).toBe(true);
    expect(hero?.position.y ?? 99).toBeLessThan(startY - 0.6);
  });

  it("executa dash horizontal com burst acima da corrida normal", () => {
    const world = new PhysicsWorld({
      gravity: new Vector3(0, 22, 0),
    });

    world.addBody(
      createRigidBody({
        id: "ground",
        type: "static",
        position: new Vector3(0, 2.5, 0),
        colliders: [
          {
            id: "ground-shape",
            shape: createBox(12, 1),
            material: {
              density: 0,
              friction: 0.9,
              restitution: 0,
            },
          },
        ],
      }),
    );

    world.addBody(
      createPlatformerCharacterBody({
        id: "hero",
        position: new Vector3(0, 1.1, 0),
        width: 0.72,
        height: 1.52,
      }),
    );

    const controller = new PlatformerController({
      bodyId: "hero",
      width: 0.72,
      height: 1.52,
      environmentMask: 1 << 0,
      maxRunSpeed: 6.5,
      dashSpeed: 12.8,
    });

    stepController(world, controller, {}, 1 / 60, 30);

    const hero = world.getBody("hero");
    if (!hero) {
      throw new Error("hero not found");
    }

    stepController(world, controller, { jumpHeld: true }, 1 / 60, 1);
    stepController(world, controller, {}, 1 / 60, 2);
    stepController(world, controller, { move: 1, dashHeld: true }, 1 / 60, 1);

    expect(controller.dashing).toBe(true);
    expect(hero.velocity.x).toBeGreaterThan(10);

    stepController(world, controller, { move: 1 }, 1 / 60, 14);
    expect(controller.dashing).toBe(false);
  });
});
