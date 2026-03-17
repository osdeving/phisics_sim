import { describe, expect, it } from "vitest";
import { engineLabScene } from "./engineLabScene";

const input = {
  left: false,
  right: false,
  jump: false,
  liftUp: false,
  liftDown: false,
  tiltUp: false,
  tiltDown: false,
  boost: false,
};

describe("engineLabScene", () => {
  it("integra casts e CCD no loop da cena", () => {
    const config = { ...engineLabScene.defaults };
    const state = engineLabScene.createState(config) as {
      shapeCastDistance: number | null;
      circleCastDistance: number | null;
      bulletBeginCount: number;
      bulletPersistCount: number;
      bulletEndCount: number;
      bulletEscapeCount: number;
    };

    expect(state.shapeCastDistance).not.toBeNull();
    expect(state.circleCastDistance).not.toBeNull();

    for (let index = 0; index < 140; index += 1) {
      engineLabScene.step({
        state,
        config,
        dt: 1 / 60,
        input,
      });
    }

    expect(state.bulletBeginCount).toBeGreaterThan(0);
    expect(state.bulletPersistCount).toBeGreaterThan(0);
    expect(state.bulletEndCount).toBeGreaterThan(0);
    expect(state.bulletEscapeCount).toBe(0);
  });
});
