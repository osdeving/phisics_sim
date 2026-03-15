import { Vector2 } from '../math/Vector2';
import { RenderViewport } from '../scenes/types';

export function worldToScreen(viewport: RenderViewport, position: Vector2) {
  return new Vector2(
    viewport.offsetX + (position.x - viewport.worldMinX) * viewport.scale,
    viewport.offsetY + (position.y - viewport.worldMinY) * viewport.scale,
  );
}

export function metersToPixels(viewport: RenderViewport, meters: number) {
  return meters * viewport.scale;
}

export function screenToWorld(viewport: RenderViewport, x: number, y: number) {
  return new Vector2(
    viewport.worldMinX + (x - viewport.offsetX) / viewport.scale,
    viewport.worldMinY + (y - viewport.offsetY) / viewport.scale,
  );
}
