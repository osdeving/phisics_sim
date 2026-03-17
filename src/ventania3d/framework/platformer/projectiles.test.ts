import { describe, expect, it } from "vitest";
import {
  buildPlatformerLevel,
  finalizePlatformerLevelStep,
  finalizePlatformerProjectiles,
  preparePlatformerLevelStep,
  updatePlatformerProjectileEmitters,
  Vector3,
} from "../../index";

describe("platformer projectiles", () => {
  it("emite projetil e remove no primeiro impacto", () => {
    const level = buildPlatformerLevel({
      gravity: 0,
      spawnPoint: new Vector3(0, 0, 0),
      strips: [
        {
          id: "platformer-wall",
          x: 3.2,
          y: 0,
          tilesWide: 1,
          tilesHigh: 3,
          theme: "stone",
        },
      ],
      projectileEmitters: [
        {
          id: "platformer-emitter",
          position: new Vector3(0.6, 1, 0),
          direction: new Vector3(1, 0, 0),
          speed: 10,
          interval: 99,
          startDelay: 0.01,
          ttl: 2,
        },
      ],
    });

    let sawImpact = false;
    let impactedBodyId: string | null = null;

    for (let index = 0; index < 40; index += 1) {
      preparePlatformerLevelStep(level);
      updatePlatformerProjectileEmitters(level, 1 / 60);
      level.world.step(1 / 60, 1);
      finalizePlatformerLevelStep(level);
      finalizePlatformerProjectiles(level, 1 / 60);
      if (level.projectileImpacts.length > 0) {
        sawImpact = true;
        impactedBodyId = level.projectileImpacts[0]?.otherBodyId ?? null;
      }
    }

    expect(sawImpact).toBe(true);
    expect(impactedBodyId).toBe("platformer-wall");
    expect(level.projectiles.length).toBe(0);
  });
});
