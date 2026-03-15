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

interface ScenicBackdropOptions {
  groundY: number;
  sunPosition?: Vector2;
  hillHeight?: number;
  treeBaseY?: number;
  treeSpacing?: number;
}

function drawCloudSilhouette(
  ctx: CanvasRenderingContext2D,
  viewport: RenderViewport,
  center: Vector2,
  scale = 1,
) {
  const lobes = [
    { x: -0.34, y: 0.02, r: 0.22 },
    { x: -0.1, y: -0.12, r: 0.28 },
    { x: 0.2, y: -0.04, r: 0.24 },
    { x: 0.42, y: 0.06, r: 0.18 },
  ];

  ctx.save();
  ctx.fillStyle = "rgba(240, 247, 255, 0.16)";
  ctx.beginPath();
  lobes.forEach((lobe, index) => {
    const point = worldToScreen(
      viewport,
      new Vector2(center.x + lobe.x * scale, center.y + lobe.y * scale),
    );
    const radius = metersToPixels(viewport, lobe.r * scale);
    if (index === 0) {
      ctx.moveTo(point.x + radius, point.y);
    }
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  });
  ctx.fill();
  ctx.restore();
}

function drawTreeSilhouette(
  ctx: CanvasRenderingContext2D,
  viewport: RenderViewport,
  base: Vector2,
  scale = 1,
) {
  const trunkTop = worldToScreen(viewport, new Vector2(base.x, base.y - 0.45 * scale));
  const trunkBottom = worldToScreen(viewport, base);
  const canopy = worldToScreen(viewport, new Vector2(base.x, base.y - 0.95 * scale));
  const canopyLeft = worldToScreen(viewport, new Vector2(base.x - 0.36 * scale, base.y - 0.52 * scale));
  const canopyRight = worldToScreen(viewport, new Vector2(base.x + 0.36 * scale, base.y - 0.52 * scale));

  ctx.save();
  ctx.strokeStyle = "rgba(72, 49, 28, 0.86)";
  ctx.lineWidth = Math.max(2, metersToPixels(viewport, 0.08 * scale));
  ctx.beginPath();
  ctx.moveTo(trunkTop.x, trunkTop.y);
  ctx.lineTo(trunkBottom.x, trunkBottom.y);
  ctx.stroke();

  ctx.fillStyle = "rgba(54, 110, 72, 0.8)";
  ctx.beginPath();
  ctx.moveTo(canopy.x, canopy.y);
  ctx.lineTo(canopyRight.x, canopyRight.y);
  ctx.lineTo(canopyLeft.x, canopyLeft.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawScenicBackdrop(
  ctx: CanvasRenderingContext2D,
  viewport: RenderViewport,
  options: ScenicBackdropOptions,
) {
  const hillHeight = options.hillHeight ?? 1.2;
  const treeBaseY = options.treeBaseY ?? options.groundY;
  const treeSpacing = options.treeSpacing ?? 3.4;
  const hillBaseline = options.groundY - 0.25;
  const hillPoints = [
    new Vector2(viewport.worldMinX - 1, hillBaseline),
    new Vector2(viewport.worldMinX + viewport.worldWidth * 0.18, hillBaseline - hillHeight * 0.65),
    new Vector2(viewport.worldMinX + viewport.worldWidth * 0.42, hillBaseline - hillHeight),
    new Vector2(viewport.worldMinX + viewport.worldWidth * 0.7, hillBaseline - hillHeight * 0.72),
    new Vector2(viewport.worldMaxX + 1, hillBaseline),
  ].map((point) => worldToScreen(viewport, point));

  ctx.save();
  ctx.fillStyle = "rgba(62, 92, 121, 0.16)";
  ctx.beginPath();
  ctx.moveTo(hillPoints[0].x, hillPoints[0].y);
  hillPoints.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.lineTo(viewport.width, viewport.height);
  ctx.lineTo(0, viewport.height);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const sunInsetX = Math.max(1.5, viewport.worldWidth * 0.12);
  const sun = options.sunPosition ?? new Vector2(viewport.worldMaxX - sunInsetX, viewport.worldMinY + 1.1);
  const sunScreen = worldToScreen(viewport, sun);
  const sunRadius = metersToPixels(viewport, 0.44);
  const sunGlow = ctx.createRadialGradient(
    sunScreen.x,
    sunScreen.y,
    sunRadius * 0.3,
    sunScreen.x,
    sunScreen.y,
    sunRadius * 2.4,
  );
  sunGlow.addColorStop(0, "rgba(255, 223, 150, 0.72)");
  sunGlow.addColorStop(1, "rgba(255, 223, 150, 0)");
  ctx.save();
  ctx.fillStyle = sunGlow;
  ctx.beginPath();
  ctx.arc(sunScreen.x, sunScreen.y, sunRadius * 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 226, 152, 0.92)";
  ctx.beginPath();
  ctx.arc(sunScreen.x, sunScreen.y, sunRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const cloudBaseY = viewport.worldMinY + 0.95;
  const cloudSpan = Math.max(3.8, viewport.worldWidth / 4.5);
  const firstCloudX = viewport.worldMinX + 1.8;
  for (let x = firstCloudX; x <= viewport.worldMaxX; x += cloudSpan) {
    const wave = ((Math.round(x * 10) % 5) - 2) * 0.08;
    const scale = 0.9 + ((Math.round(x * 6) % 3) * 0.15);
    drawCloudSilhouette(
      ctx,
      viewport,
      new Vector2(x, cloudBaseY + wave),
      scale,
    );
  }

  const startX = Math.floor((viewport.worldMinX + 0.6) / treeSpacing) * treeSpacing;
  for (let x = startX; x <= viewport.worldMaxX + treeSpacing; x += treeSpacing) {
    const jitter = ((Math.round(x * 10) % 3) - 1) * 0.18;
    const scale = 0.8 + ((Math.round(x * 7) % 4) * 0.08);
    drawTreeSilhouette(ctx, viewport, new Vector2(x + jitter, treeBaseY), scale);
  }
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
  filter = "none",
) {
  const screen = worldToScreen(viewport, center);
  const pixelWidth = metersToPixels(viewport, width);
  const pixelHeight = metersToPixels(viewport, height);

  ctx.save();
  ctx.translate(screen.x, screen.y);
  ctx.rotate(rotation);
  ctx.scale(flipX ? -1 : 1, 1);
  ctx.filter = filter;

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
