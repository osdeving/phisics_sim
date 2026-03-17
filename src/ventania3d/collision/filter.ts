export const ALL_COLLISION_BITS = 0xffffffff >>> 0;

export interface CollisionFilter {
  collisionLayer: number;
  collisionMask: number;
}

export interface QueryFilterOptions {
  layerMask?: number;
  ignoreBodyIds?: string[];
  ignoreColliderIds?: string[];
  includeSensors?: boolean;
}

export function normalizeCollisionBits(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback >>> 0;
  }

  return (value as number) >>> 0;
}

export function canCollideFilters(first: CollisionFilter, second: CollisionFilter) {
  return (
    (first.collisionMask & second.collisionLayer) !== 0 &&
    (second.collisionMask & first.collisionLayer) !== 0
  );
}

export function matchesQueryFilter(
  filter: CollisionFilter & { id: string; isSensor: boolean },
  options?: QueryFilterOptions,
) {
  if (!options) {
    return !filter.isSensor;
  }

  if (!options.includeSensors && filter.isSensor) {
    return false;
  }

  if (
    options.layerMask !== undefined &&
    (filter.collisionLayer & normalizeCollisionBits(options.layerMask, 0)) === 0
  ) {
    return false;
  }

  if (options.ignoreColliderIds?.includes(filter.id)) {
    return false;
  }

  return true;
}
