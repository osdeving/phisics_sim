import { Vector3 } from "../../math/Vector3";

export interface PlatformerJumpDesignOptions {
  gravity: number;
  jumpSpeed: number;
  maxRunSpeed: number;
  fallGravityMultiplier?: number;
  dashSpeed?: number;
  dashDuration?: number;
  bodyWidth: number;
  bodyHeight: number;
  spriteWidth?: number;
  spriteHeight?: number;
}

export interface PlatformerJumpSurface {
  id: string;
  left: number;
  right: number;
  top: number;
}

export interface PlatformerJumpDesignMetrics {
  effectiveWidth: number;
  effectiveHeight: number;
  gravityUp: number;
  gravityDown: number;
  timeToApex: number;
  apexHeight: number;
  totalAirTime: number;
  maxTravel: number;
  maxTravelWithDash: number;
}

export interface PlatformerJumpLinkAnalysis {
  direction: "left" | "right";
  requiredTravel: number;
  horizontalGap: number;
  verticalDelta: number;
  targetTime: number | null;
  targetTimeWithDash: number | null;
  reachable: boolean;
  reachableWithDash: boolean;
  requiredDash: boolean;
  reason: string;
  landingWindow: number;
  previewPoints: Vector3[];
}

export function computePlatformerJumpDesignMetrics(
  options: PlatformerJumpDesignOptions,
): PlatformerJumpDesignMetrics {
  const gravityUp = Math.max(0.01, Math.abs(options.gravity));
  const gravityDown =
    gravityUp * Math.max(1, options.fallGravityMultiplier ?? 1.8);
  const timeToApex = options.jumpSpeed / gravityUp;
  const apexHeight = (options.jumpSpeed * options.jumpSpeed) / (2 * gravityUp);
  const totalAirTime =
    timeToApex + Math.sqrt((2 * apexHeight) / Math.max(gravityDown, 1e-6));
  const effectiveWidth = Math.max(
    options.bodyWidth,
    options.spriteWidth ?? options.bodyWidth,
  );
  const effectiveHeight = Math.max(
    options.bodyHeight,
    options.spriteHeight ?? options.bodyHeight,
  );
  const maxTravel = options.maxRunSpeed * totalAirTime;
  const dashDuration = Math.max(0, options.dashDuration ?? 0);
  const dashSpeed = options.dashSpeed ?? options.maxRunSpeed;

  return {
    effectiveWidth,
    effectiveHeight,
    gravityUp,
    gravityDown,
    timeToApex,
    apexHeight,
    totalAirTime,
    maxTravel,
    maxTravelWithDash: maxTravel + dashDuration * dashSpeed,
  };
}

function getTargetTimes(
  startCenterY: number,
  targetCenterY: number,
  metrics: PlatformerJumpDesignMetrics,
  jumpSpeed: number,
) {
  const ascentTimes: number[] = [];
  const delta = startCenterY - targetCenterY;
  const a = 0.5 * metrics.gravityUp;
  const b = -jumpSpeed;
  const c = delta;
  const discriminant = b * b - 4 * a * c;

  if (discriminant >= 0) {
    const rootA = (-b - Math.sqrt(discriminant)) / (2 * a);
    const rootB = (-b + Math.sqrt(discriminant)) / (2 * a);
    [rootA, rootB].forEach((candidate) => {
      if (candidate >= -1e-6 && candidate <= metrics.timeToApex + 1e-6) {
        ascentTimes.push(Math.max(0, candidate));
      }
    });
  }

  const apexCenterY = startCenterY - metrics.apexHeight;
  const descentTimes: number[] = [];
  if (targetCenterY >= apexCenterY - 1e-6) {
    const deltaFromApex = Math.max(0, targetCenterY - apexCenterY);
    descentTimes.push(
      metrics.timeToApex +
        Math.sqrt((2 * deltaFromApex) / Math.max(metrics.gravityDown, 1e-6)),
    );
  }

  const candidates = [...ascentTimes, ...descentTimes].filter(Number.isFinite);
  if (candidates.length === 0) {
    return [];
  }

  return [...new Set(candidates.map((value) => Number(value.toFixed(6))))].sort(
    (first, second) => first - second,
  );
}

function sampleJumpArc(
  startCenter: Vector3,
  totalTime: number,
  horizontalSpeed: number,
  options: PlatformerJumpDesignOptions,
  metrics: PlatformerJumpDesignMetrics,
  direction: "left" | "right",
) {
  const points: Vector3[] = [];
  const count = 18;
  const directionSign = direction === "right" ? 1 : -1;

  for (let index = 0; index <= count; index += 1) {
    const t = (totalTime * index) / count;
    let y = startCenter.y;

    if (t <= metrics.timeToApex) {
      y =
        startCenter.y -
        options.jumpSpeed * t +
        0.5 * metrics.gravityUp * t * t;
    } else {
      const fallTime = t - metrics.timeToApex;
      const apexCenterY = startCenter.y - metrics.apexHeight;
      y = apexCenterY + 0.5 * metrics.gravityDown * fallTime * fallTime;
    }

    points.push(
      new Vector3(
        startCenter.x + directionSign * horizontalSpeed * t,
        y,
        0,
      ),
    );
  }

  return points;
}

export function analyzePlatformerJumpLink(
  from: PlatformerJumpSurface,
  to: PlatformerJumpSurface,
  options: PlatformerJumpDesignOptions,
): PlatformerJumpLinkAnalysis {
  const metrics = computePlatformerJumpDesignMetrics(options);
  const direction = to.left >= from.left ? "right" : "left";
  const startCenterX =
    direction === "right"
      ? from.right - metrics.effectiveWidth * 0.5
      : from.left + metrics.effectiveWidth * 0.5;
  const targetCenterX =
    direction === "right"
      ? to.left + metrics.effectiveWidth * 0.5
      : to.right - metrics.effectiveWidth * 0.5;
  const startCenterY = from.top - metrics.effectiveHeight * 0.5;
  const targetCenterY = to.top - metrics.effectiveHeight * 0.5;
  const rawGap =
    direction === "right" ? to.left - from.right : from.left - to.right;
  const horizontalGap = Math.max(0, rawGap);
  const requiredTravel = Math.abs(targetCenterX - startCenterX);
  const landingWindow = Math.max(0, to.right - to.left - metrics.effectiveWidth);
  const verticalDelta = to.top - from.top;
  const candidateTimes = getTargetTimes(
    startCenterY,
    targetCenterY,
    metrics,
    options.jumpSpeed,
  );
  const targetTime = candidateTimes.length > 0 ? candidateTimes[candidateTimes.length - 1] : null;
  const dashDuration = Math.max(0, options.dashDuration ?? 0);
  const targetTimeWithDash = targetTime === null ? null : targetTime + dashDuration;
  const reachable =
    targetTime !== null && options.maxRunSpeed * targetTime >= requiredTravel - 1e-6;
  const reachableWithDash =
    targetTime !== null &&
    options.maxRunSpeed * targetTime + (options.dashSpeed ?? options.maxRunSpeed) * dashDuration >=
      requiredTravel - 1e-6;

  let reason = "salto cabe no envelope atual";
  if (landingWindow <= 0) {
    reason = "sprite/collider ocupam mais largura do que a plataforma de pouso";
  } else if (targetTime === null) {
    reason = "altura alvo fica fora da parabola maxima";
  } else if (!reachableWithDash) {
    reason = "distancia horizontal excede corrida + dash";
  } else if (!reachable) {
    reason = "distancia horizontal exige dash";
  }

  return {
    direction,
    requiredTravel,
    horizontalGap,
    verticalDelta,
    targetTime,
    targetTimeWithDash,
    reachable,
    reachableWithDash,
    requiredDash: !reachable && reachableWithDash,
    reason,
    landingWindow,
    previewPoints:
      targetTime === null
        ? []
        : sampleJumpArc(
            new Vector3(startCenterX, startCenterY, 0),
            targetTime,
            options.maxRunSpeed,
            options,
            metrics,
            direction,
          ),
  };
}
