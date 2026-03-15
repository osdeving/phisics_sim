export const VEHICLE_SKIN_CHOICES = [
  { label: "Cupê azul", value: 0 },
  { label: "Táxi dourado", value: 1 },
  { label: "Pickup vermelha", value: 2 },
];

export const PLANE_SKIN_CHOICES = [
  { label: "Carga branca", value: 0 },
  { label: "Correio laranja", value: 1 },
  { label: "Resgate azul", value: 2 },
];

export function getVehicleSpriteFilter(skin: number) {
  switch (skin) {
    case 1:
      return "hue-rotate(-18deg) saturate(1.3) brightness(1.04)";
    case 2:
      return "hue-rotate(148deg) saturate(1.4) brightness(0.98)";
    default:
      return "none";
  }
}

export function getPlaneSpriteFilter(skin: number) {
  switch (skin) {
    case 1:
      return "hue-rotate(-42deg) saturate(1.45) brightness(1.02)";
    case 2:
      return "hue-rotate(168deg) saturate(1.2) brightness(1)";
    default:
      return "none";
  }
}
