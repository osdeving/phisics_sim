import { RenderViewport } from "../../physics/scenes/types";
import { metersToPixels, worldToScreen } from "../../physics/render/viewport";
import { ColliderSnapshot, RigidBody } from "../dynamics/RigidBody";
import { Vector2 } from "../../physics/math/Vector2";
import { Vector3 } from "../math/Vector3";

function toVector2(vector: Vector3) {
  return new Vector2(vector.x, vector.y);
}

export function drawBodyCollider(
  ctx: CanvasRenderingContext2D,
  viewport: RenderViewport,
  snapshot: ColliderSnapshot,
  fillStyle: string,
  strokeStyle = "rgba(255,255,255,0.75)",
) {
  ctx.save();
  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = 2;

  if (snapshot.shape.kind === "circle") {
    const center = worldToScreen(viewport, toVector2(snapshot.shape.center));
    const radius = metersToPixels(viewport, snapshot.shape.radius);
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  snapshot.shape.points.forEach((point, index) => {
    const screen = worldToScreen(viewport, toVector2(point));
    if (index === 0) {
      ctx.moveTo(screen.x, screen.y);
    } else {
      ctx.lineTo(screen.x, screen.y);
    }
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawBodyCenter(
  ctx: CanvasRenderingContext2D,
  viewport: RenderViewport,
  body: RigidBody,
  color = "#f6fbff",
) {
  const center = worldToScreen(viewport, toVector2(body.position));
  const axis = body.worldPoint(new Vector3(0.45, 0, 0));
  const axisScreen = worldToScreen(viewport, toVector2(axis));

  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(center.x, center.y, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(center.x, center.y);
  ctx.lineTo(axisScreen.x, axisScreen.y);
  ctx.stroke();
  ctx.restore();
}

