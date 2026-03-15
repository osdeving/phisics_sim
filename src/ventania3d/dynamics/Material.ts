export interface PhysicsMaterial {
  density: number;
  friction: number;
  restitution: number;
}

export const DEFAULT_MATERIAL: PhysicsMaterial = {
  density: 1,
  friction: 0.5,
  restitution: 0.08,
};

