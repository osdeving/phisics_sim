import { Vector3 } from "../../ventania3d";

export type ForkliftSurfaceId = "concrete" | "gravel" | "steel" | "wood";

export interface ForkliftSurfaceProfile {
  id: ForkliftSurfaceId;
  label: string;
  topColor: string;
  sideColor: string;
  accentColor: string;
  frictionMultiplier: number;
  rollingResistanceMultiplier: number;
  dragMultiplier: number;
}

interface ForkliftTerrainBase {
  id: string;
  label: string;
  surfaceId: ForkliftSurfaceId;
}

export interface ForkliftFlatTerrainSegment extends ForkliftTerrainBase {
  kind: "flat";
  startX: number;
  endX: number;
  topY: number;
  height: number;
}

export interface ForkliftRampTerrainSegment extends ForkliftTerrainBase {
  kind: "ramp";
  startX: number;
  endX: number;
  startY: number;
  endY: number;
  thickness: number;
}

export type ForkliftTerrainSegment =
  | ForkliftFlatTerrainSegment
  | ForkliftRampTerrainSegment;

export interface ForkliftBreakableCrateSpec {
  id: string;
  label: string;
  position: Vector3;
  width: number;
  height: number;
  mass: number;
  breakThreshold: number;
}

export const FORKLIFT_WORLD_WIDTH = 52;
export const FORKLIFT_WORLD_HEIGHT = 12.4;
export const FORKLIFT_CAMERA_WIDTH = 17.5;
export const FORKLIFT_CAMERA_HEIGHT = 8.8;
export const FORKLIFT_GROUND_Y = 9.55;
export const FORKLIFT_START_X = 6.2;
export const FORKLIFT_START_Y = FORKLIFT_GROUND_Y - 1.16;
export const FORKLIFT_PAYLOAD_SPAWN_Y = FORKLIFT_GROUND_Y - 0.635;

export const FORKLIFT_SURFACE_PROFILES: Record<
  ForkliftSurfaceId,
  ForkliftSurfaceProfile
> = {
  concrete: {
    id: "concrete",
    label: "concreto polido",
    topColor: "rgba(112, 135, 158, 0.96)",
    sideColor: "rgba(53, 69, 90, 0.98)",
    accentColor: "rgba(225, 236, 245, 0.58)",
    frictionMultiplier: 1,
    rollingResistanceMultiplier: 1,
    dragMultiplier: 1,
  },
  gravel: {
    id: "gravel",
    label: "cascalho solto",
    topColor: "rgba(128, 112, 84, 0.96)",
    sideColor: "rgba(74, 61, 43, 0.98)",
    accentColor: "rgba(233, 206, 157, 0.52)",
    frictionMultiplier: 0.3,
    rollingResistanceMultiplier: 1.45,
    dragMultiplier: 1.16,
  },
  steel: {
    id: "steel",
    label: "deck metalico",
    topColor: "rgba(97, 119, 139, 0.96)",
    sideColor: "rgba(48, 61, 77, 0.98)",
    accentColor: "rgba(255, 204, 128, 0.62)",
    frictionMultiplier: 0.72,
    rollingResistanceMultiplier: 0.92,
    dragMultiplier: 0.96,
  },
  wood: {
    id: "wood",
    label: "doca de madeira",
    topColor: "rgba(132, 94, 58, 0.96)",
    sideColor: "rgba(84, 57, 33, 0.98)",
    accentColor: "rgba(242, 211, 161, 0.56)",
    frictionMultiplier: 0.88,
    rollingResistanceMultiplier: 1.04,
    dragMultiplier: 1.03,
  },
};

export const FORKLIFT_TERRAIN_SEGMENTS: ForkliftTerrainSegment[] = [
  {
    id: "yard-start",
    kind: "flat",
    label: "patio de carga",
    surfaceId: "concrete",
    startX: 0,
    endX: 18,
    topY: FORKLIFT_GROUND_Y,
    height: 3.2,
  },
  {
    id: "run-up-gravel",
    kind: "flat",
    label: "cascalho de embalo",
    surfaceId: "gravel",
    startX: 18,
    endX: 26,
    topY: FORKLIFT_GROUND_Y,
    height: 3.2,
  },
  {
    id: "momentum-ramp",
    kind: "ramp",
    label: "subida no embalo",
    surfaceId: "gravel",
    startX: 26,
    endX: 31.5,
    startY: FORKLIFT_GROUND_Y,
    endY: 7.3,
    thickness: 4.2,
  },
  {
    id: "upper-deck",
    kind: "flat",
    label: "deck metalico",
    surfaceId: "steel",
    startX: 31.5,
    endX: 45.5,
    topY: 7.3,
    height: 5.45,
  },
  {
    id: "service-dock",
    kind: "flat",
    label: "doca de madeira",
    surfaceId: "wood",
    startX: 45.5,
    endX: FORKLIFT_WORLD_WIDTH,
    topY: 7.3,
    height: 5.45,
  },
];

export const FORKLIFT_BREAKABLE_CRATES: ForkliftBreakableCrateSpec[] = [
  {
    id: "breakable-yard-a",
    label: "caixa fraca A",
    position: new Vector3(20.35, FORKLIFT_GROUND_Y - 0.46, 0),
    width: 0.92,
    height: 0.92,
    mass: 1.2,
    breakThreshold: 3.3,
  },
  {
    id: "breakable-yard-b",
    label: "caixa fraca B",
    position: new Vector3(21.25, FORKLIFT_GROUND_Y - 0.46, 0),
    width: 0.92,
    height: 0.92,
    mass: 1.2,
    breakThreshold: 3.3,
  },
  {
    id: "breakable-ramp-top",
    label: "caixa de impacto",
    position: new Vector3(39.9, 7.3 - 0.46, 0),
    width: 0.92,
    height: 0.92,
    mass: 1.35,
    breakThreshold: 3.8,
  },
  {
    id: "breakable-deck-barrier-a",
    label: "barreira A",
    position: new Vector3(41.15, 7.3 - 0.46, 0),
    width: 0.92,
    height: 0.92,
    mass: 1.4,
    breakThreshold: 4,
  },
  {
    id: "breakable-deck-barrier-b",
    label: "barreira B",
    position: new Vector3(41.15, 7.3 - 1.38, 0),
    width: 0.92,
    height: 0.92,
    mass: 1.35,
    breakThreshold: 4.2,
  },
];

export function getForkliftSurfaceProfile(
  surfaceId: ForkliftSurfaceId,
) {
  return FORKLIFT_SURFACE_PROFILES[surfaceId];
}

export function getTerrainPolygonPoints(segment: ForkliftTerrainSegment) {
  if (segment.kind === "flat") {
    return [
      new Vector3(segment.startX, segment.topY, 0),
      new Vector3(segment.endX, segment.topY, 0),
      new Vector3(segment.endX, segment.topY + segment.height, 0),
      new Vector3(segment.startX, segment.topY + segment.height, 0),
    ];
  }

  return [
    new Vector3(segment.startX, segment.startY, 0),
    new Vector3(segment.endX, segment.endY, 0),
    new Vector3(segment.endX, segment.endY + segment.thickness, 0),
    new Vector3(segment.startX, segment.startY + segment.thickness, 0),
  ];
}

export function getTerrainTopLine(segment: ForkliftTerrainSegment) {
  if (segment.kind === "flat") {
    return [
      new Vector3(segment.startX, segment.topY, 0),
      new Vector3(segment.endX, segment.topY, 0),
    ] as const;
  }

  return [
    new Vector3(segment.startX, segment.startY, 0),
    new Vector3(segment.endX, segment.endY, 0),
  ] as const;
}

export function getTerrainLabelPoint(segment: ForkliftTerrainSegment) {
  if (segment.kind === "flat") {
    return new Vector3(
      (segment.startX + segment.endX) * 0.5 - 1.4,
      segment.topY - 0.6,
      0,
    );
  }

  return new Vector3(
    segment.startX + (segment.endX - segment.startX) * 0.2,
    segment.startY - 0.45,
    0,
  );
}

export function getSurfaceProfileForPoint(point: Vector3) {
  const segment =
    [...FORKLIFT_TERRAIN_SEGMENTS]
      .reverse()
      .find((entry) => {
        const polygon = getTerrainPolygonPoints(entry);
        const xs = polygon.map((vertex) => vertex.x);
        const ys = polygon.map((vertex) => vertex.y);
        return (
          point.x >= Math.min(...xs) - 0.45 &&
          point.x <= Math.max(...xs) + 0.45 &&
          point.y >= Math.min(...ys) - 0.9 &&
          point.y <= Math.max(...ys) + 1.2
        );
      }) ?? FORKLIFT_TERRAIN_SEGMENTS[0];

  return getForkliftSurfaceProfile(segment.surfaceId);
}
