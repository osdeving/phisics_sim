import { Vector3 } from "../../math/Vector3";
import {
  clonePlatformerLevelDefinition,
  getPlatformerSurfaceHandlePosition,
  type PlatformerCheckpointDefinition,
  type PlatformerGoalDefinition,
  type PlatformerLadderDefinition,
  type PlatformerLevelDefinition,
  type PlatformerMovingPlatformDefinition,
  type PlatformerProjectileEmitterDefinition,
  type PlatformerStripDefinition,
} from "./level";

export interface PlatformerEditorHandle {
  id: string;
  position: Vector3;
  label: string;
  color?: string;
}

function snap(value: number, grid: number) {
  return Math.round(value / grid) * grid;
}

function snapPoint(point: Vector3, grid: number) {
  return new Vector3(snap(point.x, grid), snap(point.y, grid), 0);
}

function moveStrip(strip: PlatformerStripDefinition, point: Vector3) {
  strip.x = point.x - strip.tilesWide * 0.5;
  strip.y = point.y - 0.5;
}

function moveMovingPlatform(
  platform: PlatformerMovingPlatformDefinition,
  point: Vector3,
) {
  platform.x = point.x - platform.tilesWide * 0.5;
  platform.y = point.y - 0.5;
}

function moveLadder(ladder: PlatformerLadderDefinition, point: Vector3) {
  ladder.x = point.x - ladder.width * 0.5;
  ladder.y = point.y - ladder.height * 0.5;
}

function moveCheckpoint(checkpoint: PlatformerCheckpointDefinition, point: Vector3) {
  checkpoint.position = point;
}

function moveGoal(goal: PlatformerGoalDefinition, point: Vector3) {
  goal.position = point;
}

function moveEmitter(
  emitter: PlatformerProjectileEmitterDefinition,
  point: Vector3,
) {
  emitter.position = point;
}

export function buildPlatformerLevelEditorHandles(
  definition: PlatformerLevelDefinition,
) {
  const handles: PlatformerEditorHandle[] = [
    {
      id: "spawn",
      position:
        definition.spawnPoint instanceof Vector3
          ? definition.spawnPoint.clone()
          : new Vector3(
              definition.spawnPoint.x,
              definition.spawnPoint.y,
              definition.spawnPoint.z ?? 0,
            ),
      label: "spawn",
      color: "#8bf0ff",
    },
  ];

  definition.strips?.forEach((strip) => {
    handles.push({
      id: `strip:${strip.id}`,
      position: getPlatformerSurfaceHandlePosition(strip),
      label: strip.collision === "one-way" ? "one-way" : strip.id.replace("platformer-", ""),
      color: strip.collision === "one-way" ? "#8bf0ff" : "#7ee18a",
    });
  });

  definition.movingPlatforms?.forEach((platform) => {
    const center = getPlatformerSurfaceHandlePosition(platform);
    handles.push({
      id: `moving:${platform.id}:body`,
      position: center,
      label: "moving",
      color: "#ffd86d",
    });
    if (platform.axis === "x") {
      handles.push({
        id: `moving:${platform.id}:min`,
        position: new Vector3(platform.min, center.y, 0),
        label: "min",
        color: "#ffd86d",
      });
      handles.push({
        id: `moving:${platform.id}:max`,
        position: new Vector3(platform.max, center.y, 0),
        label: "max",
        color: "#ffd86d",
      });
    } else {
      handles.push({
        id: `moving:${platform.id}:min`,
        position: new Vector3(center.x, platform.min, 0),
        label: "min",
        color: "#ffd86d",
      });
      handles.push({
        id: `moving:${platform.id}:max`,
        position: new Vector3(center.x, platform.max, 0),
        label: "max",
        color: "#ffd86d",
      });
    }
  });

  definition.ladders?.forEach((ladder) => {
    handles.push({
      id: `ladder:${ladder.id}`,
      position: new Vector3(
        ladder.x + ladder.width * 0.5,
        ladder.y + ladder.height * 0.5,
        0,
      ),
      label: "ladder",
      color: "#ffe0a6",
    });
  });

  definition.checkpoints?.forEach((checkpoint) => {
    handles.push({
      id: `checkpoint:${checkpoint.id}`,
      position:
        checkpoint.position instanceof Vector3
          ? checkpoint.position.clone()
          : new Vector3(
              checkpoint.position.x,
              checkpoint.position.y,
              checkpoint.position.z ?? 0,
            ),
      label: "checkpoint",
      color: "#c8d5e8",
    });
  });

  definition.projectileEmitters?.forEach((emitter) => {
    handles.push({
      id: `emitter:${emitter.id}`,
      position:
        emitter.position instanceof Vector3
          ? emitter.position.clone()
          : new Vector3(
              emitter.position.x,
              emitter.position.y,
              emitter.position.z ?? 0,
            ),
      label: "turret",
      color: "#ff9c6b",
    });
  });

  if (definition.goal) {
    handles.push({
      id: "goal",
      position:
        definition.goal.position instanceof Vector3
          ? definition.goal.position.clone()
          : new Vector3(
              definition.goal.position.x,
              definition.goal.position.y,
              definition.goal.position.z ?? 0,
            ),
      label: "goal",
      color: "#ffd86d",
    });
  }

  return handles;
}

export function applyPlatformerLevelEditorDrag(
  definition: PlatformerLevelDefinition,
  handleId: string,
  worldPoint: Vector3,
  grid = 0.1,
) {
  const next = clonePlatformerLevelDefinition(definition);
  const point = snapPoint(worldPoint, grid);

  if (handleId === "spawn") {
    next.spawnPoint = point;
    return next;
  }

  if (handleId === "goal" && next.goal) {
    moveGoal(next.goal, point);
    return next;
  }

  if (handleId.startsWith("strip:")) {
    const stripId = handleId.slice("strip:".length);
    const strip = next.strips?.find((entry) => entry.id === stripId);
    if (strip) {
      moveStrip(strip, point);
    }
    return next;
  }

  if (handleId.startsWith("moving:")) {
    const [, platformId, part] = handleId.split(":");
    const platform = next.movingPlatforms?.find((entry) => entry.id === platformId);
    if (!platform) {
      return next;
    }

    if (part === "body") {
      moveMovingPlatform(platform, point);
      return next;
    }

    if (platform.axis === "x") {
      if (part === "min") {
        platform.min = Math.min(point.x, platform.max - 0.5);
      } else {
        platform.max = Math.max(point.x, platform.min + 0.5);
      }
    } else if (part === "min") {
      platform.min = Math.min(point.y, platform.max - 0.5);
    } else {
      platform.max = Math.max(point.y, platform.min + 0.5);
    }

    return next;
  }

  if (handleId.startsWith("ladder:")) {
    const ladderId = handleId.slice("ladder:".length);
    const ladder = next.ladders?.find((entry) => entry.id === ladderId);
    if (ladder) {
      moveLadder(ladder, point);
    }
    return next;
  }

  if (handleId.startsWith("checkpoint:")) {
    const checkpointId = handleId.slice("checkpoint:".length);
    const checkpoint = next.checkpoints?.find((entry) => entry.id === checkpointId);
    if (checkpoint) {
      moveCheckpoint(checkpoint, point);
    }
    return next;
  }

  if (handleId.startsWith("emitter:")) {
    const emitterId = handleId.slice("emitter:".length);
    const emitter = next.projectileEmitters?.find((entry) => entry.id === emitterId);
    if (emitter) {
      moveEmitter(emitter, point);
    }
    return next;
  }

  return next;
}
