import { Vector2 } from '../math/Vector2';
import { SceneState } from '../scenes/types';

function cloneValue<T>(value: T): T {
  if (value instanceof Vector2) {
    return new Vector2(value.x, value.y) as T;
  }

  if (
    value &&
    typeof value === "object" &&
    "clone" in value &&
    typeof value.clone === "function"
  ) {
    return value.clone() as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => cloneValue(item)) as T;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
      key,
      cloneValue(nestedValue),
    ]);
    return Object.fromEntries(entries) as T;
  }

  return value;
}

export function cloneSceneState<T extends SceneState>(state: T): T {
  return cloneValue(state);
}
