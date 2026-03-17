import { Vector3 } from "../math/Vector3";

export interface ContactPoint {
  id: string;
  position: Vector3;
  penetration: number;
  normalImpulse: number;
  tangentImpulse: number;
}

export interface ContactManifold {
  id: string;
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

export interface ContactEventSet {
  begin: ContactManifold[];
  persist: ContactManifold[];
  end: ContactManifold[];
}

export function createEmptyContactEventSet(): ContactEventSet {
  return {
    begin: [],
    persist: [],
    end: [],
  };
}
