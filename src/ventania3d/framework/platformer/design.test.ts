import { describe, expect, it } from "vitest";
import {
  analyzePlatformerJumpLink,
  applyPlatformerLevelEditorDrag,
  buildPlatformerLevelEditorHandles,
  type PlatformerLevelDefinition,
  Vector3,
} from "../../index";

describe("platformer design tools", () => {
  it("marca o gap final como dash-only quando a distancia cabe so com burst", () => {
    const analysis = analyzePlatformerJumpLink(
      {
        id: "from",
        left: 25.2,
        right: 28.2,
        top: 4.1,
      },
      {
        id: "to",
        left: 32,
        right: 35,
        top: 4.1,
      },
      {
        gravity: 22,
        jumpSpeed: 9,
        maxRunSpeed: 7,
        dashSpeed: 12.4,
        dashDuration: 0.14,
        fallGravityMultiplier: 1.8,
        bodyWidth: 0.72,
        bodyHeight: 1.52,
        spriteWidth: 1.2,
        spriteHeight: 1.6,
      },
    );

    expect(analysis.reachable).toBe(false);
    expect(analysis.reachableWithDash).toBe(true);
    expect(analysis.requiredDash).toBe(true);
  });

  it("o editor expõe handles e move o goal na definicao de fase", () => {
    const definition: PlatformerLevelDefinition = {
      spawnPoint: new Vector3(1.8, 9.1, 0),
      strips: [
        {
          id: "platformer-floor",
          x: 0,
          y: 10,
          tilesWide: 4,
          tilesHigh: 2,
          theme: "grass",
        },
      ],
      goal: {
        id: "platformer-goal",
        position: new Vector3(6, 4, 0),
      },
      projectileEmitters: [
        {
          id: "platformer-emitter",
          position: new Vector3(5, 5, 0),
          direction: new Vector3(-1, 0, 0),
          speed: 8,
          interval: 1,
        },
      ],
    };

    const handles = buildPlatformerLevelEditorHandles(definition);
    expect(handles.some((handle) => handle.id === "goal")).toBe(true);
    expect(handles.some((handle) => handle.id === "emitter:platformer-emitter")).toBe(true);

    const moved = applyPlatformerLevelEditorDrag(
      definition,
      "goal",
      new Vector3(9.4, 3.6, 0),
    );

    expect((moved.goal?.position as Vector3).x).toBeCloseTo(9.4, 3);
    expect((definition.goal?.position as Vector3).x).toBeCloseTo(6, 3);
  });
});
