export function formatNumber(value: number, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : '0.00';
}

export function formatQuantity(value: number, unit: string, digits = 2) {
  return `${formatNumber(value, digits)} ${unit}`;
}
