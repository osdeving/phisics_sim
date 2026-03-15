import { Vector2 } from '../math/Vector2';
import { RenderViewport } from '../scenes/types';
import { metersToPixels, worldToScreen } from './viewport';

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function drawGrid(ctx: CanvasRenderingContext2D, viewport: RenderViewport, step = 1) {
  ctx.save();
  ctx.strokeStyle = 'rgba(178, 206, 255, 0.08)';
  ctx.lineWidth = 1;

  const startX = Math.floor(viewport.worldMinX / step) * step;
  const endX = Math.ceil(viewport.worldMaxX / step) * step;
  const startY = Math.floor(viewport.worldMinY / step) * step;
  const endY = Math.ceil(viewport.worldMaxY / step) * step;

  for (let x = startX; x <= endX; x += step) {
    const from = worldToScreen(viewport, new Vector2(x, viewport.worldMinY));
    const to = worldToScreen(viewport, new Vector2(x, viewport.worldMaxY));
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  for (let y = startY; y <= endY; y += step) {
    const from = worldToScreen(viewport, new Vector2(viewport.worldMinX, y));
    const to = worldToScreen(viewport, new Vector2(viewport.worldMaxX, y));
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawGround(
  ctx: CanvasRenderingContext2D,
  viewport: RenderViewport,
  groundY: number,
  label?: string,
) {
  const from = worldToScreen(viewport, new Vector2(viewport.worldMinX, groundY));
  const to = worldToScreen(viewport, new Vector2(viewport.worldMaxX, groundY));
  const height = viewport.height - from.y;

  ctx.save();
  ctx.fillStyle = 'rgba(34, 53, 84, 0.8)';
  ctx.fillRect(0, from.y, viewport.width, height);

  ctx.strokeStyle = 'rgba(118, 181, 255, 0.66)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();

  if (label) {
    ctx.fillStyle = 'rgba(235, 244, 255, 0.92)';
    ctx.font = '600 14px Inter, sans-serif';
    ctx.fillText(label, from.x + 10, from.y - 12);
  }
  ctx.restore();
}

export function drawArrow(
  ctx: CanvasRenderingContext2D,
  viewport: RenderViewport,
  origin: Vector2,
  vector: Vector2,
  color: string,
  label?: string,
) {
  const start = worldToScreen(viewport, origin);
  const end = worldToScreen(viewport, origin.add(vector));
  const direction = end.subtract(start).normalized();
  const normal = direction.perpendicular();
  const headSize = 10;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(end.x - direction.x * headSize + normal.x * headSize * 0.5, end.y - direction.y * headSize + normal.y * headSize * 0.5);
  ctx.lineTo(end.x - direction.x * headSize - normal.x * headSize * 0.5, end.y - direction.y * headSize - normal.y * headSize * 0.5);
  ctx.closePath();
  ctx.fill();

  if (label) {
    ctx.font = '600 13px Inter, sans-serif';
    ctx.fillText(label, end.x + 8, end.y - 8);
  }
  ctx.restore();
}

export function drawCircleBody(
  ctx: CanvasRenderingContext2D,
  viewport: RenderViewport,
  center: Vector2,
  radius: number,
  color: string,
) {
  const screen = worldToScreen(viewport, center);
  const pixelRadius = metersToPixels(viewport, radius);

  ctx.save();
  const gradient = ctx.createRadialGradient(
    screen.x - pixelRadius * 0.25,
    screen.y - pixelRadius * 0.3,
    pixelRadius * 0.2,
    screen.x,
    screen.y,
    pixelRadius,
  );
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.1, color);
  gradient.addColorStop(1, '#0b1831');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, pixelRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.stroke();
  ctx.restore();
}

export function drawSpriteAtWorld(
  ctx: CanvasRenderingContext2D,
  viewport: RenderViewport,
  sprite: HTMLImageElement | undefined,
  center: Vector2,
  width: number,
  height: number,
  rotation = 0,
  fallbackColor = '#6dd6ff',
  flipX = false,
) {
  const screen = worldToScreen(viewport, center);
  const pixelWidth = metersToPixels(viewport, width);
  const pixelHeight = metersToPixels(viewport, height);

  ctx.save();
  ctx.translate(screen.x, screen.y);
  ctx.rotate(rotation);
  ctx.scale(flipX ? -1 : 1, 1);

  if (sprite) {
    ctx.drawImage(sprite, -pixelWidth / 2, -pixelHeight / 2, pixelWidth, pixelHeight);
  } else {
    roundedRectPath(ctx, -pixelWidth / 2, -pixelHeight / 2, pixelWidth, pixelHeight, 14);
    ctx.fillStyle = fallbackColor;
    ctx.fill();
  }

  ctx.restore();
}

export function drawLineWorld(
  ctx: CanvasRenderingContext2D,
  viewport: RenderViewport,
  start: Vector2,
  end: Vector2,
  color: string,
  width = 3,
) {
  const from = worldToScreen(viewport, start);
  const to = worldToScreen(viewport, end);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

export function drawSpring(
  ctx: CanvasRenderingContext2D,
  viewport: RenderViewport,
  start: Vector2,
  end: Vector2,
  amplitude = 0.16,
  coils = 12,
) {
  const direction = end.subtract(start);
  const unit = direction.normalized();
  const normal = unit.perpendicular();
  const segmentLength = direction.length / coils;

  ctx.save();
  ctx.strokeStyle = '#88f0ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let index = 0; index <= coils; index += 1) {
    const base = start.add(unit.scale(segmentLength * index));
    const offset =
      index === 0 || index === coils
        ? Vector2.zero()
        : normal.scale(index % 2 === 0 ? -amplitude : amplitude);
    const point = worldToScreen(viewport, base.add(offset));
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  }
  ctx.stroke();
  ctx.restore();
}

export function drawWorldLabel(
  ctx: CanvasRenderingContext2D,
  viewport: RenderViewport,
  position: Vector2,
  text: string,
) {
  const screen = worldToScreen(viewport, position);
  ctx.save();
  ctx.font = '600 13px Inter, sans-serif';
  ctx.fillStyle = 'rgba(247, 251, 255, 0.92)';
  ctx.fillText(text, screen.x, screen.y);
  ctx.restore();
}
