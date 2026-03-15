import { Vector3 } from "../math/Vector3";

export interface ContactPoint {
  position: Vector3;
  penetration: number;
}

export interface ContactManifold {
  bodyAId: string;
  bodyBId: string;
  colliderAId: string;
  colliderBId: string;
  normal: Vector3;
  penetration: number;
  points: ContactPoint[];
  friction: number;
  restitution: number;
  isSensor: boolean;
}

