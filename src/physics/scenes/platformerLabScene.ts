import { formatQuantity } from "../core/units";
import { clamp } from "../math/scalar";
import { Vector2 } from "../math/Vector2";
import {
  drawArrow,
  drawGrid,
  drawLineWorld,
  drawScenicBackdrop,
  drawSpriteAtWorld,
  drawWorldLabel,
} from "../render/canvasPrimitives";
import {
  SceneCameraWindow,
  SceneDefinition,
  SceneDragArgs,
  SceneDragHandle,
  ScenePanelData,
  SceneState,
  SpriteAtlas,
} from "./types";
import {
  Vector3,
  PLATFORMER_ENVIRONMENT_MASK,
  PLATFORMER_LAYERS,
  PLATFORMER_PLAYER_COLLISION_MASK,
  PlatformerController,
  type PlatformerJumpLinkAnalysis,
  type PlatformerLevelDefinition,
  type PlatformerLevelRuntime,
  type PlatformerMovingPlatformRuntime,
  type PlatformerStripRuntime,
  analyzePlatformerJumpLink,
  applyPlatformerLevelEditorDrag,
  buildPlatformerLevel,
  buildPlatformerLevelEditorHandles,
  collectPlatformerCheckpoint,
  clonePlatformerLevelDefinition,
  finalizePlatformerLevelStep,
  finalizePlatformerProjectiles,
  preparePlatformerLevelStep,
  readPlatformerCommands,
  resetPlatformerProjectiles,
  respawnPlatformerBody,
  spawnPlatformerProjectile,
  updatePlatformerProjectileEmitters,
} from "../../ventania3d";

const PLAYER_ID = "platformer-player";
const EXIT_ID = "platformer-exit";
const PLAYER_WIDTH = 0.72;
const PLAYER_HEIGHT = 1.52;
const PLAYER_SPRITE_WIDTH = 1.2;
const PLAYER_SPRITE_HEIGHT = 1.6;

type LevelStripLike = Pick<
  PlatformerStripRuntime | PlatformerMovingPlatformRuntime,
  "bodyId" | "tilesWide" | "tilesHigh" | "theme" | "collision"
>;

interface JumpPreview {
  id: string;
  label: string;
  fromId: string;
  toId: string;
  analysis: PlatformerJumpLinkAnalysis;
}

interface PlatformerLabState extends SceneState {
  definition: PlatformerLevelDefinition;
  level: PlatformerLevelRuntime;
  controller: PlatformerController;
  jumpPreviews: JumpPreview[];
  exitUnlocked: boolean;
  completed: boolean;
  deaths: number;
  elapsedTime: number;
  animationTime: number;
  lastHazardId: string | null;
  activeCheckpointId: string | null;
  projectileHits: number;
  lastHint: string;
}

function getState(state: SceneState) {
  return state as PlatformerLabState;
}

function getPlayer(scene: PlatformerLabState) {
  return scene.level.world.getBody(PLAYER_ID);
}

function getSurface(
  definition: PlatformerLevelDefinition,
  surfaceId: string,
) {
  const strip =
    definition.strips?.find((entry) => entry.id === surfaceId) ??
    definition.movingPlatforms?.find((entry) => entry.id === surfaceId);

  if (!strip) {
    return null;
  }

  return {
    id: surfaceId,
    left: strip.x,
    right: strip.x + strip.tilesWide,
    top: strip.y,
  };
}

function buildJumpPreviews(
  definition: PlatformerLevelDefinition,
  config: Record<string, number>,
) {
  const surfacePairs = [
    {
      id: "jump-rise",
      label: "subida inicial",
      fromId: "platformer-step-a",
      toId: "platformer-mid-ledge",
    },
    {
      id: "jump-final",
      label: "gap final",
      fromId: "platformer-upper-ledge",
      toId: "platformer-goal-platform",
    },
  ];

  return surfacePairs
    .map((pair) => {
      const from = getSurface(definition, pair.fromId);
      const to = getSurface(definition, pair.toId);
      if (!from || !to) {
        return null;
      }

      return {
        ...pair,
        analysis: analyzePlatformerJumpLink(from, to, {
          gravity: config.gravity,
          jumpSpeed: config.jumpSpeed,
          maxRunSpeed: config.runSpeed,
          fallGravityMultiplier: 1.8,
          dashSpeed: config.dashSpeed,
          dashDuration: 0.14,
          bodyWidth: PLAYER_WIDTH,
          bodyHeight: PLAYER_HEIGHT,
          spriteWidth: PLAYER_SPRITE_WIDTH,
          spriteHeight: PLAYER_SPRITE_HEIGHT,
        }),
      };
    })
    .filter((entry): entry is JumpPreview => Boolean(entry));
}

function createBaseLevelDefinition(config: Record<string, number>) {
  return {
    gravity: config.gravity,
    broadPhaseCellSize: 2.4,
    maxSubsteps: 4,
    maxToiIterations: 6,
    spawnPoint: new Vector3(1.8, 9.1, 0),
    strips: [
      {
        id: "platformer-floor-left",
        x: 0,
        y: 10,
        tilesWide: 8,
        tilesHigh: 2,
        theme: "grass" as const,
      },
      {
        id: "platformer-step-a",
        x: 4,
        y: 8,
        tilesWide: 2,
        tilesHigh: 1,
        theme: "grass" as const,
      },
      {
        id: "platformer-oneway-start",
        x: 6.2,
        y: 6.45,
        tilesWide: 3,
        tilesHigh: 1,
        theme: "grass" as const,
        collision: "one-way" as const,
      },
      {
        id: "platformer-mid-ledge",
        x: 11,
        y: 8,
        tilesWide: 3,
        tilesHigh: 1,
        theme: "stone" as const,
      },
      {
        id: "platformer-landing",
        x: 18.8,
        y: 9,
        tilesWide: 4,
        tilesHigh: 2,
        theme: "stone" as const,
      },
      {
        id: "platformer-wall-left",
        x: 20,
        y: 6,
        tilesWide: 1,
        tilesHigh: 4,
        theme: "stone" as const,
      },
      {
        id: "platformer-wall-right",
        x: 22,
        y: 4,
        tilesWide: 1,
        tilesHigh: 6,
        theme: "stone" as const,
      },
      {
        id: "platformer-tower-base",
        x: 24.5,
        y: 9,
        tilesWide: 3,
        tilesHigh: 2,
        theme: "stone" as const,
      },
      {
        id: "platformer-upper-ledge",
        x: 25.2,
        y: 4.1,
        tilesWide: 3,
        tilesHigh: 1,
        theme: "grass" as const,
      },
      {
        id: "platformer-goal-platform",
        x: 32,
        y: 4.1,
        tilesWide: 3,
        tilesHigh: 1,
        theme: "grass" as const,
      },
    ],
    movingPlatforms: [
      {
        id: "platformer-moving-a",
        x: 15.4,
        y: 6.7,
        tilesWide: 2,
        tilesHigh: 1,
        theme: "stone" as const,
        axis: "x" as const,
        min: 16.4,
        max: 19.6,
        speed: config.platformSpeed,
      },
    ],
    slopes: [
      {
        id: "platformer-slope-a",
        position: new Vector3(9.5, 9, 0),
        points: [
          new Vector3(-1.5, 1, 0),
          new Vector3(1.5, 1, 0),
          new Vector3(1.5, -1, 0),
        ],
      },
    ],
    spikes: [
      {
        id: "platformer-spikes-gap",
        x: 14,
        y: 9.2,
        count: 3,
      },
    ],
    gems: [
      {
        id: "platformer-gem-1",
        position: new Vector3(7.65, 5.7, 0),
      },
      {
        id: "platformer-gem-2",
        position: new Vector3(16.6, 5.75, 0),
      },
      {
        id: "platformer-gem-3",
        position: new Vector3(27.3, 3.05, 0),
      },
    ],
    ladders: [
      {
        id: "platformer-ladder-a",
        x: 25.35,
        y: 5.2,
        width: 0.9,
        height: 4.7,
      },
    ],
    checkpoints: [
      {
        id: "platformer-checkpoint-a",
        position: new Vector3(26.7, 7.9, 0),
        label: "checkpoint 1",
      },
    ],
    projectileEmitters: [
      {
        id: "platformer-emitter-a",
        position: new Vector3(34.3, 3.25, 0),
        direction: new Vector3(-1, 0, 0),
        speed: 11.5,
        interval: 1.25,
        startDelay: 1.2,
        radius: 0.14,
        ttl: 2.6,
        owner: "hazard" as const,
        color: "#ff9c6b",
      },
    ],
    goal: {
      id: EXIT_ID,
      position: new Vector3(33.5, 3.2, 0),
      width: 0.9,
      height: 1.8,
    },
  } satisfies PlatformerLevelDefinition;
}

function buildScene(
  config: Record<string, number>,
  incomingDefinition?: PlatformerLevelDefinition,
) {
  const definition = clonePlatformerLevelDefinition(
    incomingDefinition ?? createBaseLevelDefinition(config),
  );
  definition.gravity = config.gravity;
  definition.movingPlatforms?.forEach((platform) => {
    if (platform.id === "platformer-moving-a") {
      platform.speed = config.platformSpeed;
    }
  });

  const level = buildPlatformerLevel(definition, {
    player: {
      id: PLAYER_ID,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      mass: 1,
      collisionLayer: PLATFORMER_LAYERS.player,
      collisionMask: PLATFORMER_PLAYER_COLLISION_MASK,
      userData: {
        kind: "platformer-player",
      },
    },
  });

  const controller = new PlatformerController({
    bodyId: PLAYER_ID,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    environmentMask: PLATFORMER_ENVIRONMENT_MASK,
    bodyCollisionMask: PLATFORMER_PLAYER_COLLISION_MASK,
    oneWayLayer: PLATFORMER_LAYERS.oneWay,
    maxRunSpeed: config.runSpeed,
    jumpSpeed: config.jumpSpeed,
    wallSlideSpeed: config.wallSlideSpeed,
    dashSpeed: config.dashSpeed,
    climbSpeed: config.climbSpeed,
    airAcceleration: 20 + config.airControl * 14,
    airDeceleration: 14 + config.airControl * 8,
    groundAcceleration: 40 + config.airControl * 8,
    groundDeceleration: 54,
    fallGravityMultiplier: 1.8,
    lowJumpGravityMultiplier: 2.5,
    coyoteTime: 0.11,
    jumpBufferTime: 0.12,
    dashCooldown: 0.26,
    dashDuration: 0.14,
    maxAirDashes: 1,
    dropThroughTime: 0.24,
  });

  level.world.detectContacts();
  controller.postStep(level.world, {
    supportMotion: level.supportMotion,
  });

  return {
    definition,
    level,
    controller,
    jumpPreviews: buildJumpPreviews(definition, config),
  };
}

function rebuildScene(
  scene: PlatformerLabState,
  config: Record<string, number>,
  definition: PlatformerLevelDefinition,
  hint: string,
) {
  const built = buildScene(config, definition);
  scene.definition = built.definition;
  scene.level = built.level;
  scene.controller = built.controller;
  scene.jumpPreviews = built.jumpPreviews;
  scene.exitUnlocked = false;
  scene.completed = false;
  scene.elapsedTime = 0;
  scene.animationTime = 0;
  scene.activeCheckpointId = null;
  scene.lastHazardId = null;
  scene.lastHint = hint;
}

function respawnPlayer(scene: PlatformerLabState) {
  resetPlatformerProjectiles(scene.level);
  respawnPlatformerBody(scene.level, PLAYER_ID, scene.level.spawnPoint);
  scene.controller.reset(scene.level.world);
  scene.level.world.detectContacts();
  scene.controller.postStep(scene.level.world, {
    supportMotion: scene.level.supportMotion,
  });
}

function drawPlatformStrip(
  ctx: CanvasRenderingContext2D,
  viewport: Parameters<typeof drawGrid>[1],
  sprites: SpriteAtlas,
  scene: PlatformerLabState,
  strip: LevelStripLike,
) {
  const body = scene.level.world.getBody(strip.bodyId);
  if (!body) {
    return;
  }

  const topSprite =
    strip.theme === "grass"
      ? sprites.platformerTileGrass
      : sprites.platformerTileStoneGrass;
  const fillSprite =
    strip.theme === "grass"
      ? sprites.platformerTileDirt
      : sprites.platformerTileStone;
  const isOneWay = strip.collision === "one-way";
  const left = body.position.x - strip.tilesWide * 0.5;
  const top = isOneWay ? body.position.y - 0.14 : body.position.y - strip.tilesHigh * 0.5;
  const rows = isOneWay ? 1 : strip.tilesHigh;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < strip.tilesWide; column += 1) {
      drawSpriteAtWorld(
        ctx,
        viewport,
        row === 0 ? topSprite : fillSprite,
        new Vector2(left + column + 0.5, top + row + 0.5),
        1,
        1,
        0,
        row === 0 ? "#88d476" : "#b88956",
      );
    }
  }

  if (isOneWay) {
    drawLineWorld(
      ctx,
      viewport,
      new Vector2(left, top + 0.18),
      new Vector2(left + strip.tilesWide, top + 0.18),
      "rgba(139, 240, 255, 0.9)",
      3,
    );
    drawWorldLabel(
      ctx,
      viewport,
      new Vector2(left + 0.1, top - 0.2),
      "one-way",
    );
  }
}

function drawSlope(
  ctx: CanvasRenderingContext2D,
  viewport: Parameters<typeof drawGrid>[1],
  scene: PlatformerLabState,
  slopeId: string,
  fillStyle: string,
  strokeStyle: string,
) {
  const body = scene.level.world.getBody(slopeId);
  const snapshot = body?.getSnapshots()[0];
  if (!snapshot || snapshot.shape.kind !== "polygon") {
    return;
  }

  ctx.save();
  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = 2;
  ctx.beginPath();
  snapshot.shape.points.forEach((point, index) => {
    const screenX =
      viewport.offsetX + (point.x - viewport.worldMinX) * viewport.scale;
    const screenY =
      viewport.offsetY + (point.y - viewport.worldMinY) * viewport.scale;
    if (index === 0) {
      ctx.moveTo(screenX, screenY);
    } else {
      ctx.lineTo(screenX, screenY);
    }
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawLadder(
  ctx: CanvasRenderingContext2D,
  viewport: Parameters<typeof drawGrid>[1],
  scene: PlatformerLabState,
  ladderId: string,
) {
  const ladder = scene.level.ladders.find((entry) => entry.bodyId === ladderId);
  if (!ladder) {
    return;
  }

  const active = scene.controller.ladderBodyId === ladder.bodyId;
  const left = ladder.x + 0.18;
  const right = ladder.x + ladder.width - 0.18;
  const top = ladder.y;
  const bottom = ladder.y + ladder.height;
  const color = active ? "rgba(255, 214, 120, 0.95)" : "rgba(229, 201, 150, 0.78)";

  drawLineWorld(ctx, viewport, new Vector2(left, top), new Vector2(left, bottom), color, 3);
  drawLineWorld(ctx, viewport, new Vector2(right, top), new Vector2(right, bottom), color, 3);

  for (let rungY = top + 0.35; rungY < bottom - 0.1; rungY += 0.55) {
    drawLineWorld(
      ctx,
      viewport,
      new Vector2(left, rungY),
      new Vector2(right, rungY),
      color,
      2,
    );
  }

  if (active) {
    drawWorldLabel(
      ctx,
      viewport,
      new Vector2(ladder.x - 0.45, ladder.y - 0.25),
      scene.controller.climbing ? "climbing" : "ladder",
    );
  }
}

function drawCheckpoint(
  ctx: CanvasRenderingContext2D,
  viewport: Parameters<typeof drawGrid>[1],
  checkpoint: PlatformerLabState["level"]["checkpoints"][number],
) {
  const poleX = checkpoint.position.x - 0.16;
  const topY = checkpoint.position.y - checkpoint.height * 0.5;
  const bottomY = checkpoint.position.y + checkpoint.height * 0.5;
  const flagColor = checkpoint.reached ? "#ffd86d" : "rgba(180, 198, 214, 0.86)";

  drawLineWorld(
    ctx,
    viewport,
    new Vector2(poleX, topY),
    new Vector2(poleX, bottomY),
    "rgba(220, 232, 244, 0.9)",
    3,
  );
  drawLineWorld(
    ctx,
    viewport,
    new Vector2(poleX, topY + 0.1),
    new Vector2(poleX + 0.52, topY + 0.22),
    flagColor,
    5,
  );
  drawWorldLabel(
    ctx,
    viewport,
    new Vector2(checkpoint.position.x - 0.5, topY - 0.18),
    checkpoint.reached ? "respawn ativo" : checkpoint.label ?? "checkpoint",
  );
}

function drawProjectileEmitter(
  ctx: CanvasRenderingContext2D,
  viewport: Parameters<typeof drawGrid>[1],
  position: Vector2,
  direction: number,
) {
  const screenX = viewport.offsetX + (position.x - viewport.worldMinX) * viewport.scale;
  const screenY = viewport.offsetY + (position.y - viewport.worldMinY) * viewport.scale;
  const width = 0.55 * viewport.scale;
  const height = 0.3 * viewport.scale;

  ctx.save();
  ctx.fillStyle = "rgba(255, 156, 107, 0.9)";
  ctx.beginPath();
  ctx.moveTo(screenX + width * 0.5 * direction, screenY);
  ctx.lineTo(screenX - width * 0.4 * direction, screenY - height);
  ctx.lineTo(screenX - width * 0.4 * direction, screenY + height);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawProjectiles(
  ctx: CanvasRenderingContext2D,
  viewport: Parameters<typeof drawGrid>[1],
  scene: PlatformerLabState,
) {
  scene.level.projectileEmitters.forEach((emitter) => {
    drawProjectileEmitter(
      ctx,
      viewport,
      new Vector2(emitter.position.x, emitter.position.y),
      emitter.direction.x >= 0 ? 1 : -1,
    );
    drawWorldLabel(
      ctx,
      viewport,
      new Vector2(emitter.position.x - 0.4, emitter.position.y - 0.4),
      "turret",
    );
  });

  scene.level.projectiles.forEach((projectile) => {
    const body = scene.level.world.getBody(projectile.bodyId);
    if (!body) {
      return;
    }

    const screenX = viewport.offsetX + (body.position.x - viewport.worldMinX) * viewport.scale;
    const screenY = viewport.offsetY + (body.position.y - viewport.worldMinY) * viewport.scale;
    ctx.save();
    ctx.fillStyle = projectile.color;
    ctx.beginPath();
    ctx.arc(screenX, screenY, projectile.radius * viewport.scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawJumpPreview(
  ctx: CanvasRenderingContext2D,
  viewport: Parameters<typeof drawGrid>[1],
  preview: JumpPreview,
) {
  if (preview.analysis.previewPoints.length < 2) {
    return;
  }

  const color = preview.analysis.reachable
    ? "rgba(126, 225, 138, 0.9)"
    : preview.analysis.reachableWithDash
      ? "rgba(255, 216, 109, 0.92)"
      : "rgba(255, 124, 124, 0.92)";

  for (let index = 1; index < preview.analysis.previewPoints.length; index += 1) {
    const previous = preview.analysis.previewPoints[index - 1];
    const current = preview.analysis.previewPoints[index];
    drawLineWorld(
      ctx,
      viewport,
      new Vector2(previous.x, previous.y),
      new Vector2(current.x, current.y),
      color,
      2,
    );
  }

  const lastPoint = preview.analysis.previewPoints[preview.analysis.previewPoints.length - 1];
  drawWorldLabel(
    ctx,
    viewport,
    new Vector2(lastPoint.x - 0.15, lastPoint.y - 0.28),
    preview.analysis.reachable
      ? `${preview.label}: ok`
      : preview.analysis.reachableWithDash
        ? `${preview.label}: dash`
        : `${preview.label}: falha`,
  );
}

function buildPanel(scene: PlatformerLabState): ScenePanelData {
  const player = getPlayer(scene);
  const horizontalSpeed = player ? Math.abs(player.velocity.x) : 0;
  const verticalSpeed = player?.velocity.y ?? 0;
  const collected = scene.level.gems.filter((gem) => gem.collected).length;
  const dashReady = scene.controller.dashCooldownTimer <= 1e-6;
  const finalGap = scene.jumpPreviews.find((entry) => entry.id === "jump-final");

  return {
    metrics: [
      {
        label: "Velocidade horizontal",
        value: formatQuantity(horizontalSpeed, "m/s"),
        helper: "Sai do controller com aceleracao progressiva, sem teleporte de velocidade.",
      },
      {
        label: "Velocidade vertical",
        value: formatQuantity(Math.abs(verticalSpeed), "m/s"),
        helper: verticalSpeed < 0 ? "Modulo da subida." : "Modulo da queda ou do climb.",
      },
      {
        label: "Dash",
        value: dashReady ? "pronto" : "cooldown",
        helper: scene.controller.dashing
          ? "Dash horizontal ativo; a gravidade e cancelada durante o burst."
          : "Use Shift para atravessar o gap final quando a analise marcar 'dash'.",
      },
      {
        label: "Projetis ativos",
        value: `${scene.level.projectiles.length}`,
        helper: scene.level.projectileImpacts.length > 0
          ? `Ultimo impacto: ${scene.level.projectileImpacts[0].otherBodyId.replace("platformer-", "")}.`
          : "Turret usa CCD do motor para nao atravessar piso nem player.",
      },
      {
        label: "Suporte",
        value: scene.controller.groundBodyId
          ? scene.controller.groundBodyId.replace("platformer-", "")
          : "sem apoio",
        helper: "Se o suporte for cinemático, o controller soma o delta da plataforma ao pose do jogador.",
      },
      {
        label: "Gap final",
        value: finalGap
          ? finalGap.analysis.reachable
            ? "salto puro"
            : finalGap.analysis.reachableWithDash
              ? "precisa dash"
              : "fora do envelope"
          : "sem analise",
        helper: finalGap
          ? `Gap ${formatQuantity(finalGap.analysis.horizontalGap, "m")} com sprite/collider incluidos no calculo.`
          : "A analise de layout usa width/height do corpo e do sprite para ser conservadora.",
      },
      {
        label: "Checkpoint",
        value: scene.activeCheckpointId
          ? scene.activeCheckpointId.replace("platformer-", "")
          : "spawn inicial",
        helper: "Cada checkpoint troca o ponto de respawn sem resetar gemas ja coletadas.",
      },
      {
        label: "Gemas",
        value: `${collected}/${scene.level.gems.length}`,
        helper: scene.exitUnlocked
          ? "A porta foi liberada."
          : "Colete todas para abrir a saida.",
      },
      {
        label: "Status",
        value: scene.completed ? "fase concluida" : "em curso",
        helper: scene.lastHint,
      },
    ],
    formulas: [
      {
        title: "Aceleracao horizontal",
        formula: "$$v_x \\leftarrow \\operatorname{moveTowards}(v_x, v_{alvo}, a\\,dt)$$",
        explanation:
          "O player acelera ate a velocidade alvo com limite por frame, em vez de trocar de velocidade num salto duro.",
      },
      {
        title: "Envelope de pulo",
        formula: "$$d_{max} \\approx v_{run} t_{ar} + v_{dash} t_{dash}$$",
        explanation:
          "O editor calcula o alcance horizontal usando tempo de voo, corrida maxima e dash, mas tambem desconta largura efetiva do corpo/sprite na janela de pouso.",
      },
      {
        title: "One-way",
        formula: "$$\\text{colide} \\iff v_y \\ge 0 \\land \\text{ha plataforma abaixo}$$",
        explanation:
          "Sem pre-solve por contato, a regra pratica do framework liga a layer one-way so quando o personagem esta caindo ou ja apoiado nela.",
      },
      {
        title: "Ladder",
        formula: "$$F_{anti-g} = -m\\,g$$",
        explanation:
          "Durante o climb, o controller aplica uma forca que cancela a gravidade e passa a comandar a velocidade vertical diretamente.",
      },
      {
        title: "Carry da plataforma",
        formula: "$$x_{player} \\leftarrow x_{player} + \\Delta x_{platform}$$",
        explanation:
          "Depois do step do mundo, o framework soma ao jogador o delta do suporte cinemático. Isso reduz escorregao visual e perda de contato.",
      },
    ],
    concept: [
      {
        title: "Framework em cima do motor",
        body: "O personagem continua sendo rigid body real. O framework nao substitui a fisica; ele organiza comando, sensores, projeteis, estados e regras tipicas de platformer.",
      },
      {
        title: "Fase por dados e editor leve",
        body: "A cena monta strips, moving platforms, ladders, checkpoint, turret e goal a partir de uma definicao de fase. Os handles de drag editam essa definicao e rebuildam a cena na hora.",
      },
      {
        title: "Salto validado antes",
        body: "O layout nao depende so do 'olhometro'. A cena calcula links de pulo levando em conta velocidade maxima, gravidade, dash, largura do corpo e margem visual do sprite.",
      },
    ],
    studyNotes: [
      {
        title: "Teste o one-way",
        body: "Suba na plataforma azul com pulo vindo de baixo. Depois use baixo + pulo para atravessar de volta sem desligar a fisica do resto da fase.",
      },
      {
        title: "Observe o carry",
        body: "Pare na plataforma movel sem input horizontal e repare que o personagem acompanha o suporte. Isso e feito como regra de framework apos o solver.",
      },
      {
        title: "Mexa no mapa",
        body: "Arraste spawn, plataforma final, moving platform, ladder, checkpoint ou turret. A cena rebuilda a fase e recalcula o envelope de pulo na hora.",
      },
    ],
    loopSteps: [
      {
        title: "1. Preparar a fase",
        body: "O loader atualiza moving platforms, limpa impactos antigos e mantem a fase como dados editaveis.",
      },
      {
        title: "2. Emitir projeteis",
        body: "Os emitters contam cooldown e criam balas sensoriais dinamicas com camada propria.",
      },
      {
        title: "3. Atualizar o controller",
        body: "Aqui entram coyote time, jump buffer, wall slide, dash, ladder, one-way e gating de mask do player.",
      },
      {
        title: "4. Rodar o mundo",
        body: "O ventania3d integra forcas, CCD, colisao, solver e eventos de contato do jeito padrao do motor.",
      },
      {
        title: "5. Fechar o frame",
        body: "O framework calcula carry, processa impactos de projetil, le sensores e atualiza respawn e analises de salto.",
      },
    ],
    exercises: [
      {
        title: "Por que sprite entra no calculo",
        prompt: "Por que o editor desconta largura efetiva do corpo e do sprite ao analisar a janela de pouso entre duas plataformas?",
        answer: "Porque um salto pode ser fisicamente possivel pelo collider, mas visualmente ruim se o sprite ficar pendurado demais na borda. A margem extra evita layout enganoso.",
      },
      {
        title: "Projetil com sensor",
        prompt: "Qual a vantagem de usar projetil como rigid body com sensor em vez de so mover um ponto e fazer query manual?",
        answer: "Ele reaproveita CCD, broad-phase, eventos de contato e layers do proprio motor. A cena so decide o que fazer no impacto.",
      },
      {
        title: "Editor por dados",
        prompt: "Por que editar a fase em uma definicao de dados e melhor do que sair arrastando bodies soltos diretamente no mundo?",
        answer: "Porque a fase continua serializavel, previsivel e reconstruivel. O editor vira uma camada em cima de dados, nao um estado oculto do runtime.",
      },
    ],
    engineering: [
      {
        title: "Framework mais reutilizavel",
        body: "Agora o mesmo pacote cobre controller, loader de fase, projectile emitters, analise de salto e editor leve por handles.",
      },
      {
        title: "Cena mais honesta para level design",
        body: "O gap final nao foi escolhido no chute. Ele passa por um verificador que responde se cabe salto puro, se precisa dash ou se ficou impossivel.",
      },
    ],
    pitfalls: [
      {
        title: "Analise de salto nao substitui playtest",
        body: "O envelope matematico tira erro grosseiro de layout, mas ainda nao mede timing humano, risco de projetil e dificuldade percebida. Ele e filtro tecnico, nao juiz final de game feel.",
      },
    ],
  };
}

export const platformerLabScene: SceneDefinition = {
  id: "platformer-lab",
  title: "Plataforma 2D",
  subtitle: "Framework, projeteis e editor leve",
  accent: "#8bf0ff",
  category: "Engine",
  summary:
    "Cena jogavel de plataforma em cima do ventania3d: capsule controller, one-way, carry de moving platform, ladder, dash, projetil de turret, analise de salto e editor por drag em cima da fase por dados.",
  worldWidth: 37,
  worldHeight: 13,
  keyboardHints: [
    "A/D ou setas para andar",
    "Espaco para pular",
    "Shift para dash",
    "W/S ou PgUp/PgDn para subir e descer ladder",
    "Seta para baixo + pulo para atravessar one-way",
    "Arraste os handles para editar a fase",
  ],
  defaults: {
    runSpeed: 7,
    jumpSpeed: 9,
    gravity: 22,
    wallSlideSpeed: 2.9,
    platformSpeed: 1.7,
    airControl: 0.65,
    dashSpeed: 12.4,
    climbSpeed: 4.1,
  },
  controls: [
    {
      key: "runSpeed",
      label: "Velocidade",
      min: 3,
      max: 10,
      step: 0.1,
      unit: "m/s",
      description: "Velocidade alvo no plano horizontal.",
    },
    {
      key: "jumpSpeed",
      label: "Impulso do pulo",
      min: 5,
      max: 13,
      step: 0.1,
      unit: "m/s",
      description: "Velocidade inicial de subida gerada pelo jump.",
    },
    {
      key: "gravity",
      label: "Gravidade",
      min: 8,
      max: 32,
      step: 0.1,
      unit: "m/s²",
      description: "Afeta queda, apex do salto e leitura geral do platformer.",
    },
    {
      key: "wallSlideSpeed",
      label: "Wall slide",
      min: 1,
      max: 6,
      step: 0.1,
      unit: "m/s",
      description: "Limite de velocidade vertical ao deslizar na parede.",
    },
    {
      key: "platformSpeed",
      label: "Plataforma movel",
      min: 0.5,
      max: 3.5,
      step: 0.1,
      unit: "m/s",
      description: "Velocidade da plataforma cinemática sobre o fosso.",
    },
    {
      key: "airControl",
      label: "Controle no ar",
      min: 0,
      max: 1,
      step: 0.05,
      unit: "",
      description: "Escala quanta autoridade horizontal o personagem mantém fora do solo.",
    },
    {
      key: "dashSpeed",
      label: "Dash",
      min: 8,
      max: 18,
      step: 0.1,
      unit: "m/s",
      description: "Velocidade horizontal do burst usado para fechar o ultimo gap.",
    },
    {
      key: "climbSpeed",
      label: "Climb",
      min: 2,
      max: 7,
      step: 0.1,
      unit: "m/s",
      description: "Velocidade vertical ao subir ou descer escadas.",
    },
  ],
  createState: (config) => {
    const built = buildScene(config);
    return {
      ...built,
      exitUnlocked: false,
      completed: false,
      deaths: 0,
      elapsedTime: 0,
      animationTime: 0,
      lastHazardId: null,
      activeCheckpointId: null,
      projectileHits: 0,
      lastHint:
        "Teste a one-way azul, use a plataforma movel, desvie do turret e arraste os handles para ver a analise de pulo mudar.",
    } satisfies PlatformerLabState;
  },
  step: ({ state, config, dt, input }) => {
    const scene = getState(state);
    const player = getPlayer(scene);

    scene.level.world.gravity = new Vector3(0, config.gravity, 0);

    if (scene.completed) {
      return;
    }

    preparePlatformerLevelStep(scene.level);
    updatePlatformerProjectileEmitters(scene.level, dt);
    scene.controller.preStep(scene.level.world, readPlatformerCommands(input), dt);
    scene.level.world.step(dt, 1);
    finalizePlatformerLevelStep(scene.level);
    finalizePlatformerProjectiles(scene.level, dt);
    scene.controller.postStep(scene.level.world, {
      dt,
      supportMotion: scene.level.supportMotion,
    });

    scene.elapsedTime += dt;
    scene.animationTime +=
      dt * Math.max(0.4, Math.abs(player?.velocity.x ?? 0) * 0.25);

    const livePlayer = getPlayer(scene);
    if (!livePlayer) {
      return;
    }

    if (livePlayer.position.y > 14.4) {
      scene.deaths += 1;
      scene.lastHazardId = "queda";
      scene.lastHint = "Caiu fora do mapa. O respawn volta para o ultimo checkpoint.";
      respawnPlayer(scene);
      return;
    }

    if (scene.level.projectileImpacts.length > 0) {
      for (const impact of scene.level.projectileImpacts) {
        if (impact.otherBodyId === PLAYER_ID) {
          scene.deaths += 1;
          scene.projectileHits += 1;
          scene.lastHazardId = impact.projectileId;
          scene.lastHint = "Projetil acertou o player. O turret usa corpo dinamico com sensor e evento de contato.";
          respawnPlayer(scene);
          return;
        }

        if (
          impact.otherBodyId !== EXIT_ID &&
          !impact.otherBodyId.startsWith("platformer-gem-")
        ) {
          scene.lastHint = `Projetil colidiu com ${impact.otherBodyId.replace("platformer-", "")}.`;
        }
      }
    }

    for (const contact of scene.level.world.contactEvents.begin) {
      const involvesPlayer =
        contact.bodyAId === PLAYER_ID || contact.bodyBId === PLAYER_ID;
      if (!involvesPlayer) {
        continue;
      }

      const otherId = contact.bodyAId === PLAYER_ID ? contact.bodyBId : contact.bodyAId;

      if (otherId.startsWith("platformer-gem-")) {
        const gem = scene.level.gems.find((entry) => entry.bodyId === otherId);
        if (gem && !gem.collected) {
          gem.collected = true;
          scene.lastHint = "Gema coletada. Falta pouco para abrir a porta.";
        }
        continue;
      }

      if (otherId.startsWith("platformer-spikes")) {
        scene.deaths += 1;
        scene.lastHazardId = otherId;
        scene.lastHint = "Espinho tocado. O respawn manteve checkpoint e gemas.";
        respawnPlayer(scene);
        return;
      }

      if (otherId.startsWith("platformer-checkpoint")) {
        const checkpoint = collectPlatformerCheckpoint(scene.level, otherId);
        if (checkpoint) {
          scene.activeCheckpointId = checkpoint.id;
          scene.lastHint = "Checkpoint ativado. Agora o respawn vem daqui.";
        }
        continue;
      }

      if (otherId === EXIT_ID) {
        const allCollected = scene.level.gems.every((gem) => gem.collected);
        if (allCollected) {
          scene.completed = true;
          scene.lastHint = "Fase concluida. O framework agora cobre controller, projeteis, editor e validacao de salto.";
        } else {
          scene.lastHint = "A porta reconheceu o contato, mas ainda faltam gemas.";
        }
      }
    }

    scene.exitUnlocked = scene.level.gems.every((gem) => gem.collected);
  },
  render: ({ ctx, state, viewport, sprites }) => {
    const scene = getState(state);
    const player = getPlayer(scene);

    drawScenicBackdrop(ctx, viewport, {
      groundY: 12.1,
      hillHeight: 1.1,
      treeSpacing: 5.8,
    });
    drawGrid(ctx, viewport, 1);

    scene.level.strips.forEach((strip) => {
      drawPlatformStrip(ctx, viewport, sprites, scene, strip);
    });
    scene.level.movingPlatforms.forEach((platform) => {
      drawPlatformStrip(ctx, viewport, sprites, scene, platform);
      drawLineWorld(
        ctx,
        viewport,
        new Vector2(platform.min, scene.level.world.getBody(platform.bodyId)?.position.y ?? 0),
        new Vector2(platform.max, scene.level.world.getBody(platform.bodyId)?.position.y ?? 0),
        "rgba(139, 240, 255, 0.28)",
        2,
      );
    });
    scene.level.slopes.forEach((slope) => {
      drawSlope(ctx, viewport, scene, slope.bodyId, slope.fillStyle, slope.strokeStyle);
    });
    scene.level.ladders.forEach((ladder) => {
      drawLadder(ctx, viewport, scene, ladder.bodyId);
    });
    scene.jumpPreviews.forEach((preview) => {
      drawJumpPreview(ctx, viewport, preview);
    });

    scene.level.spikes.forEach((strip) => {
      for (let index = 0; index < strip.count; index += 1) {
        drawSpriteAtWorld(
          ctx,
          viewport,
          sprites.platformerSpikes,
          new Vector2(strip.x + index + 0.5, strip.y + 0.5),
          1,
          1,
          0,
          "#dcecff",
        );
      }
    });

    scene.level.gems.forEach((gem, index) => {
      if (gem.collected) {
        return;
      }

      const bob = Math.sin(scene.elapsedTime * 3 + index) * 0.08;
      drawSpriteAtWorld(
        ctx,
        viewport,
        sprites.platformerGem,
        new Vector2(gem.position.x, gem.position.y + bob),
        0.65,
        0.65,
        0,
        "#5dc8ff",
      );
    });

    scene.level.checkpoints.forEach((checkpoint) => {
      drawCheckpoint(ctx, viewport, checkpoint);
    });

    drawProjectiles(ctx, viewport, scene);

    const doorBody = scene.level.goalBodyId
      ? scene.level.world.getBody(scene.level.goalBodyId)
      : null;
    if (doorBody) {
      drawSpriteAtWorld(
        ctx,
        viewport,
        sprites.platformerDoor,
        new Vector2(doorBody.position.x, doorBody.position.y),
        1.15,
        1.95,
        0,
        scene.exitUnlocked ? "#ffd86d" : "#6f7688",
      );
      drawWorldLabel(
        ctx,
        viewport,
        new Vector2(doorBody.position.x - 0.35, doorBody.position.y - 1.1),
        scene.exitUnlocked ? "porta aberta" : "faltam gemas",
      );
    }

    if (player) {
      const animationState = scene.controller.getAnimationState(scene.level.world);
      const runFrame = Math.floor(scene.animationTime * 8) % 2;
      const sprite =
        animationState === "run"
          ? runFrame === 0
            ? sprites.platformerPlayerRun1
            : sprites.platformerPlayerRun2
          : animationState === "jump"
            ? sprites.platformerPlayerJump
            : animationState === "fall"
              ? sprites.platformerPlayerFall
              : animationState === "slide" ||
                  animationState === "skid" ||
                  animationState === "dash"
                ? sprites.platformerPlayerSkid
                : sprites.platformerPlayerIdle;

      drawSpriteAtWorld(
        ctx,
        viewport,
        sprite,
        new Vector2(player.position.x, player.position.y - 0.06),
        PLAYER_SPRITE_WIDTH,
        PLAYER_SPRITE_HEIGHT,
        0,
        scene.controller.climbing ? "#ffe19a" : "#6de2ff",
        scene.controller.facing < 0,
      );

      if (scene.controller.dashing) {
        drawLineWorld(
          ctx,
          viewport,
          new Vector2(player.position.x - scene.controller.dashDirection * 1.2, player.position.y - 0.2),
          new Vector2(player.position.x, player.position.y - 0.2),
          "rgba(139, 240, 255, 0.85)",
          4,
        );
      }

      drawArrow(
        ctx,
        viewport,
        new Vector2(player.position.x, player.position.y - 1.2),
        new Vector2(
          scene.controller.facing * Math.min(Math.abs(player.velocity.x) / 6, 1.3),
          0,
        ),
        "#8bf0ff",
        scene.controller.dashing ? "dash" : "vx",
      );

      const probeStart = new Vector2(
        player.position.x,
        player.position.y + PLAYER_HEIGHT * 0.5 - scene.controller.sensorRadius,
      );
      const groundProbeLength =
        scene.controller.groundProbeDistance ?? scene.controller.sensorDistance;
      drawLineWorld(
        ctx,
        viewport,
        probeStart,
        new Vector2(probeStart.x, probeStart.y + groundProbeLength),
        "rgba(139, 240, 255, 0.78)",
        2,
      );

      const leftProbeStart = new Vector2(
        player.position.x - PLAYER_WIDTH * 0.5 + scene.controller.sensorRadius,
        player.position.y,
      );
      const leftLength =
        scene.controller.leftProbeDistance ?? scene.controller.sensorDistance;
      drawLineWorld(
        ctx,
        viewport,
        leftProbeStart,
        new Vector2(leftProbeStart.x - leftLength, leftProbeStart.y),
        "rgba(255, 214, 120, 0.55)",
        2,
      );

      const rightProbeStart = new Vector2(
        player.position.x + PLAYER_WIDTH * 0.5 - scene.controller.sensorRadius,
        player.position.y,
      );
      const rightLength =
        scene.controller.rightProbeDistance ?? scene.controller.sensorDistance;
      drawLineWorld(
        ctx,
        viewport,
        rightProbeStart,
        new Vector2(rightProbeStart.x + rightLength, rightProbeStart.y),
        "rgba(255, 214, 120, 0.55)",
        2,
      );
    }
  },
  buildPanelData: (state) => buildPanel(getState(state)),
  getDragHandles: (state) => {
    const scene = getState(state);
    return buildPlatformerLevelEditorHandles(scene.definition).map(
      (handle): SceneDragHandle => ({
        id: handle.id,
        position: new Vector2(handle.position.x, handle.position.y),
        label: handle.label,
        color: handle.color,
      }),
    );
  },
  onDrag: ({ handleId, state, config, worldPoint }: SceneDragArgs) => {
    const scene = getState(state);
    const nextDefinition = applyPlatformerLevelEditorDrag(
      scene.definition,
      handleId,
      new Vector3(worldPoint.x, worldPoint.y, 0),
      0.1,
    );
    rebuildScene(
      scene,
      config,
      nextDefinition,
      `Editor: ${handleId} movido. Envelope de salto recalculado com collider e sprite.`,
    );
    return {
      pauseSimulation: true,
    };
  },
  getCameraWindow: (state): SceneCameraWindow => {
    const scene = getState(state);
    const player = getPlayer(scene);
    const centerX = clamp(player?.position.x ?? 8, 7.5, 29.5);
    return {
      center: new Vector2(centerX, 6.5),
      width: 15,
      height: 9.5,
    };
  },
  autoLoopDefault: false,
};
