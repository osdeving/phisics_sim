import { describe, expect, it } from "vitest";
import {
  PhysicsWorld,
  Vector3,
  createBox,
  createCircle,
  createPolygon,
  createRigidBody,
  circleCastWithScene,
  shapeCastWithScene,
} from "./index";

function createStaticBox(id: string, position: Vector3, width: number, height: number) {
  return createRigidBody({
    id,
    type: "static",
    position,
    colliders: [
      {
        id: `${id}-collider`,
        shape: createBox(width, height),
        material: {
          density: 0,
          friction: 0.8,
          restitution: 0.02,
        },
      },
    ],
  });
}

describe("ventania3d", () => {
  it("emite begin, persist e end em contatos", () => {
    const world = new PhysicsWorld({
      gravity: new Vector3(0, 10, 0),
    });

    world.addBody(createStaticBox("ground", new Vector3(0, 2.4, 0), 8, 1));
    const ball = world.addBody(
      createRigidBody({
        id: "ball",
        position: new Vector3(0, 0.6, 0),
        mass: 1,
        inertia: 0.5 * 0.35 * 0.35,
        colliders: [
          {
            id: "ball-shape",
            shape: createCircle(0.35),
          },
        ],
      }),
    );

    world.step(0.5, 1);
    expect(world.contactEvents.begin.length).toBeGreaterThan(0);
    expect(
      world.contactEvents.begin.some(
        (contact) => contact.bodyAId === "ball" || contact.bodyBId === "ball",
      ),
    ).toBe(true);

    ball.velocity = Vector3.zero();
    world.step(0.05, 1);
    expect(world.contactEvents.persist.length).toBeGreaterThan(0);

    ball.setPose(new Vector3(0, 0, 0), 0);
    ball.velocity = Vector3.zero();
    world.step(0.01, 1);
    expect(world.contactEvents.end.length).toBeGreaterThan(0);
  });

  it("faz circle cast contra geometria estatica", () => {
    const world = new PhysicsWorld({
      gravity: Vector3.zero(),
    });

    world.addBody(createStaticBox("wall", new Vector3(5, 0, 0), 2, 4));

    const hit = circleCastWithScene(
      world,
      new Vector3(0, 0, 0),
      0.5,
      new Vector3(1, 0, 0),
      10,
    );

    expect(hit).not.toBeNull();
    expect(hit?.bodyId).toBe("wall");
    expect(hit?.distance).toBeCloseTo(3.5, 2);
    expect(hit?.point.x).toBeCloseTo(4, 2);
  });

  it("faz shape cast de poligono convexo", () => {
    const world = new PhysicsWorld({
      gravity: Vector3.zero(),
    });

    world.addBody(createStaticBox("wall", new Vector3(5, 0, 0), 2, 4));

    const triangle = createPolygon([
      new Vector3(-0.6, -0.5, 0),
      new Vector3(0.6, -0.5, 0),
      new Vector3(0, 0.65, 0),
    ]);

    const hit = shapeCastWithScene(
      world,
      triangle,
      new Vector3(0, 0, 0),
      0,
      new Vector3(1, 0, 0),
      10,
    );

    expect(hit).not.toBeNull();
    expect(hit?.bodyId).toBe("wall");
    expect(hit?.distance).toBeGreaterThan(3);
    expect(hit?.distance).toBeLessThan(5);
  });

  it("usa CCD/TOI para impedir tunneling em corpo rapido", () => {
    const world = new PhysicsWorld({
      gravity: Vector3.zero(),
      maxToiIterations: 6,
    });

    world.addBody(createStaticBox("wall", new Vector3(5, 0, 0), 0.2, 4));
    const bullet = world.addBody(
      createRigidBody({
        id: "bullet",
        position: new Vector3(0, 0, 0),
        velocity: new Vector3(120, 0, 0),
        mass: 1,
        inertia: 0.5 * 0.25 * 0.25,
        colliders: [
          {
            id: "bullet-shape",
            shape: createCircle(0.25),
            material: {
              density: 1,
              friction: 0.2,
              restitution: 0.04,
            },
          },
        ],
      }),
    );

    world.step(0.1, 1);

    expect(bullet.position.x).toBeLessThan(5);
    expect(
      world.contactEvents.begin.some(
        (contact) =>
          (contact.bodyAId === "bullet" && contact.bodyBId === "wall") ||
          (contact.bodyAId === "wall" && contact.bodyBId === "bullet"),
      ),
    ).toBe(true);
  });
});
