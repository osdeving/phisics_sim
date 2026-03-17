import { describe, expect, it } from "vitest";
import { platformerLabScene } from "./platformerLabScene";
import { Vector2 } from "../math/Vector2";
import { Vector3 } from "../../ventania3d";

const idleInput = {
  left: false,
  right: false,
  jump: false,
  liftUp: false,
  liftDown: false,
  tiltUp: false,
  tiltDown: false,
  boost: false,
};

const runRightInput = {
  ...idleInput,
  right: true,
};

const dropThroughInput = {
  ...idleInput,
  jump: true,
  liftDown: true,
};

interface SceneStateShape {
  controller: {
    grounded: boolean;
    groundBodyId: string | null;
    reset(world: unknown): void;
  };
  definition: {
    strips?: Array<{ id: string; x: number }>;
  };
  jumpPreviews: Array<{
    id: string;
    analysis: {
      reachable: boolean;
      reachableWithDash: boolean;
    };
  }>;
  level: {
    spawnPoint: Vector3;
    projectileHits: number;
    projectiles: Array<{ bodyId: string }>;
    supportMotion: Record<string, Vector3>;
    world: {
      getBody(id: string): {
        position: Vector3;
        setPose(position: Vector3, rotation: number): void;
        velocity: Vector3;
      } | undefined;
      detectContacts(): void;
    };
  };
  activeCheckpointId: string | null;
}

function stepScene(
  state: SceneStateShape,
  input = idleInput,
  steps = 1,
  dt = 1 / 60,
) {
  const config = { ...platformerLabScene.defaults };

  for (let index = 0; index < steps; index += 1) {
    platformerLabScene.step({
      state: state as never,
      config,
      dt,
      input,
    });
  }
}

describe("platformerLabScene", () => {
  it("inicializa o controller, move horizontalmente e gera projeteis na cena", () => {
    const config = { ...platformerLabScene.defaults };
    const state = platformerLabScene.createState(config) as unknown as SceneStateShape;

    stepScene(state, idleInput, 30);
    expect(state.controller.grounded).toBe(true);

    const startX =
      state.level.world.getBody("platformer-player")?.position.x ?? 0;

    stepScene(state, runRightInput, 60);

    const playerX =
      state.level.world.getBody("platformer-player")?.position.x ?? 0;
    expect(playerX).toBeGreaterThan(startX + 1.5);
    expect(state.level.projectiles.length).toBeGreaterThan(0);
  });

  it("usa carry da moving platform e atravessa one-way para baixo", () => {
    const config = { ...platformerLabScene.defaults };
    const state = platformerLabScene.createState(config) as unknown as SceneStateShape;
    const player = state.level.world.getBody("platformer-player");
    if (!player) {
      throw new Error("player not found");
    }

    player.setPose(new Vector3(16.4, 5.94, 0), 0);
    player.velocity = Vector3.zero();
    state.controller.reset(state.level.world);
    state.level.world.detectContacts();
    stepScene(state, idleInput, 20);

    const startX = player.position.x;
    expect(state.controller.groundBodyId).toBe("platformer-moving-a");

    stepScene(state, idleInput, 45);

    expect(player.position.x).toBeGreaterThan(startX + 0.8);

    player.setPose(new Vector3(7.7, 5.58, 0), 0);
    player.velocity = Vector3.zero();
    state.controller.reset(state.level.world);
    state.level.world.detectContacts();
    stepScene(state, idleInput, 15);

    expect(state.controller.groundBodyId).toBe("platformer-oneway-start");
    const beforeDropY = player.position.y;

    stepScene(state, dropThroughInput, 1);
    stepScene(state, idleInput, 18);

    expect(player.position.y).toBeGreaterThan(beforeDropY + 0.45);
    expect(state.controller.groundBodyId).not.toBe("platformer-oneway-start");
  });

  it("ativa checkpoint, usa editor e recalcula o envelope do gap final", () => {
    const config = { ...platformerLabScene.defaults };
    const state = platformerLabScene.createState(config) as unknown as SceneStateShape;
    const player = state.level.world.getBody("platformer-player");
    if (!player) {
      throw new Error("player not found");
    }

    player.setPose(new Vector3(26.7, 7.9, 0), 0);
    player.velocity = Vector3.zero();
    state.controller.reset(state.level.world);
    state.level.world.detectContacts();
    stepScene(state, idleInput, 2);

    expect(state.activeCheckpointId).toBe("platformer-checkpoint-a");

    player.setPose(new Vector3(26.7, 15.2, 0), 0);
    player.velocity = Vector3.zero();
    stepScene(state, idleInput, 1);

    const respawnedPlayer = state.level.world.getBody("platformer-player");
    expect(respawnedPlayer?.position.distanceTo(state.level.spawnPoint) ?? 99).toBeLessThan(0.3);

    const before = state.jumpPreviews.find((entry) => entry.id === "jump-final");
    expect(before?.analysis.reachableWithDash).toBe(true);

    platformerLabScene.onDrag?.({
      handleId: "strip:platformer-goal-platform",
      worldPoint: new Vector2(43.5, 4.6),
      state: state as never,
      config,
      phase: "move",
    });

    const after = state.jumpPreviews.find((entry) => entry.id === "jump-final");
    expect(after?.analysis.reachableWithDash).toBe(false);
  });
});
