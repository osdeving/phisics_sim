import { useCallback, useEffect, useRef, useState } from "react";
import { cloneSceneState } from "../physics/core/cloneState";
import { Vector2 } from "../physics/math/Vector2";
import { drawArrow, drawWorldLabel } from "../physics/render/canvasPrimitives";
import { screenToWorld } from "../physics/render/viewport";
import {
  InputState,
  RenderViewport,
  SceneDefinition,
  ScenePanelData,
  SceneState,
  SpriteAtlas,
} from "../physics/scenes/types";

const FIXED_DT = 1 / 60;
const MAX_HISTORY = 1200;
const RATE_OPTIONS = [0.25, 0.5, 1, 1.5, 2];
const PANEL_PUBLISH_INTERVAL = 1 / 12;
const TIMELINE_PUBLISH_INTERVAL = 1 / 15;
const ZOOM_MIN = 0.75;
const ZOOM_MAX = 2.2;
const AUTO_LOOP_STAGNANT_STEPS = 90;

interface SimulationStageProps {
  scene: SceneDefinition;
  config: Record<string, number>;
  onTelemetry: (panel: ScenePanelData) => void;
  onConfigPatch: (patch: Partial<Record<string, number>>) => void;
}

interface HistoryEntry {
  state: SceneState;
  time: number;
}

interface CanvasSize {
  width: number;
  height: number;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function assetUrl(path: string) {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return `${import.meta.env.BASE_URL}${normalized}`;
}

function buildViewport(
  scene: SceneDefinition,
  width: number,
  height: number,
  state: SceneState,
  config: Record<string, number>,
  zoom: number,
): RenderViewport {
  const padding = 28;
  const cameraWindow = scene.getCameraWindow?.(state, config);
  const baseWorldWidth = cameraWindow?.width ?? scene.worldWidth;
  const baseWorldHeight = cameraWindow?.height ?? scene.worldHeight;
  const visibleWorldWidth = baseWorldWidth / zoom;
  const visibleWorldHeight = baseWorldHeight / zoom;
  const scale = Math.min(
    (width - padding * 2) / visibleWorldWidth,
    (height - padding * 2) / visibleWorldHeight,
  );
  const centerX = cameraWindow?.center.x ?? visibleWorldWidth * 0.5;
  const centerY = cameraWindow?.center.y ?? visibleWorldHeight * 0.5;
  const worldMinX = centerX - visibleWorldWidth * 0.5;
  const worldMinY = centerY - visibleWorldHeight * 0.5;

  return {
    width,
    height,
    scale,
    offsetX: (width - visibleWorldWidth * scale) * 0.5,
    offsetY: (height - visibleWorldHeight * scale) * 0.5,
    worldMinX,
    worldMinY,
    worldMaxX: worldMinX + visibleWorldWidth,
    worldMaxY: worldMinY + visibleWorldHeight,
    worldWidth: visibleWorldWidth,
    worldHeight: visibleWorldHeight,
  };
}

function useKeyboardInput(inputRef: React.MutableRefObject<InputState>) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "ArrowLeft" || event.code === "KeyA") {
        inputRef.current.left = true;
      }
      if (event.code === "ArrowRight" || event.code === "KeyD") {
        inputRef.current.right = true;
      }
      if (
        event.code === "Space" ||
        event.code === "ArrowUp" ||
        event.code === "KeyW"
      ) {
        inputRef.current.jump = true;
      }
      if (
        event.code === "KeyR" ||
        event.code === "PageUp" ||
        event.code === "KeyW"
      ) {
        inputRef.current.liftUp = true;
      }
      if (
        event.code === "KeyF" ||
        event.code === "PageDown" ||
        event.code === "KeyS"
      ) {
        inputRef.current.liftDown = true;
      }
      if (
        event.code === "KeyT" ||
        event.code === "KeyE" ||
        event.code === "KeyZ"
      ) {
        inputRef.current.tiltUp = true;
      }
      if (
        event.code === "KeyG" ||
        event.code === "KeyQ" ||
        event.code === "KeyX"
      ) {
        inputRef.current.tiltDown = true;
      }
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
        inputRef.current.boost = true;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "ArrowLeft" || event.code === "KeyA") {
        inputRef.current.left = false;
      }
      if (event.code === "ArrowRight" || event.code === "KeyD") {
        inputRef.current.right = false;
      }
      if (
        event.code === "Space" ||
        event.code === "ArrowUp" ||
        event.code === "KeyW"
      ) {
        inputRef.current.jump = false;
      }
      if (
        event.code === "KeyR" ||
        event.code === "PageUp" ||
        event.code === "KeyW"
      ) {
        inputRef.current.liftUp = false;
      }
      if (
        event.code === "KeyF" ||
        event.code === "PageDown" ||
        event.code === "KeyS"
      ) {
        inputRef.current.liftDown = false;
      }
      if (
        event.code === "KeyT" ||
        event.code === "KeyE" ||
        event.code === "KeyZ"
      ) {
        inputRef.current.tiltUp = false;
      }
      if (
        event.code === "KeyG" ||
        event.code === "KeyQ" ||
        event.code === "KeyX"
      ) {
        inputRef.current.tiltDown = false;
      }
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
        inputRef.current.boost = false;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [inputRef]);
}

function useCanvasSize(containerRef: React.RefObject<HTMLDivElement>) {
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({
    width: 1280,
    height: 760,
  });

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const updateSize = () => {
      const width = Math.max(320, node.clientWidth);
      const height = Math.max(520, Math.min(860, width * 0.6));
      setCanvasSize({ width, height });
    };

    updateSize();

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(node);
    window.addEventListener("resize", updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, [containerRef]);

  return canvasSize;
}

function drawDragHandles(
  ctx: CanvasRenderingContext2D,
  viewport: RenderViewport,
  handles: NonNullable<SceneDefinition["getDragHandles"]> extends (
    ...args: never[]
  ) => infer T
    ? T
    : never,
  activeHandleId: string | null,
  hoveredHandleId: string | null,
) {
  handles.forEach((handle) => {
    const screenX = viewport.offsetX + handle.position.x * viewport.scale;
    const screenY = viewport.offsetY + handle.position.y * viewport.scale;
    const radius = (handle.radius ?? 0.15) * viewport.scale;
    const isActive = handle.id === activeHandleId;
    const isHovered = handle.id === hoveredHandleId;

    if (handle.style === "vector" && handle.anchor) {
      drawArrow(
        ctx,
        viewport,
        handle.anchor,
        handle.position.subtract(handle.anchor),
        isActive ? "#ffffff" : (handle.color ?? "#7ce5ff"),
        handle.label,
      );
      return;
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
    ctx.fillStyle = isActive ? "#ffffff" : (handle.color ?? "#7ce5ff");
    ctx.globalAlpha = isActive || isHovered ? 0.92 : 0.72;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(6, 14, 27, 0.8)";
    ctx.stroke();
    ctx.restore();

    drawWorldLabel(
      ctx,
      viewport,
      handle.position.add(new Vector2(0.14, -0.16)),
      handle.label,
    );
  });
}

function buildLoopSignature(state: SceneState) {
  return JSON.stringify(state, (key, value) => {
    if (key === "time" || key === "frameCounter") {
      return undefined;
    }
    if (typeof value === "number") {
      return Number(value.toFixed(4));
    }
    return value;
  });
}

export function SimulationStage({
  scene,
  config,
  onTelemetry,
  onConfigPatch,
}: SimulationStageProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<SceneState>(scene.createState(config));
  const inputRef = useRef<InputState>({
    left: false,
    right: false,
    jump: false,
    liftUp: false,
    liftDown: false,
    tiltUp: false,
    tiltDown: false,
    boost: false,
  });
  const configRef = useRef(config);
  const spriteRef = useRef<SpriteAtlas>({});
  const historyRef = useRef<HistoryEntry[]>([]);
  const frameIndexRef = useRef(0);
  const timeRef = useRef(0);
  const previousConfigRef = useRef(config);
  const previousSceneIdRef = useRef(scene.id);
  const lastPanelPublishRef = useRef(-Infinity);
  const lastTimelinePublishRef = useRef(-Infinity);
  const stagnantStepsRef = useRef(0);
  const lastLoopSignatureRef = useRef("");
  const pointerDragRef = useRef<{ handleId: string; pointerId: number } | null>(
    null,
  );
  const canvasSize = useCanvasSize(stageRef);

  const [panel, setPanel] = useState<ScenePanelData>(() =>
    scene.buildPanelData(stateRef.current, config),
  );
  const [isPlaying, setIsPlaying] = useState(true);
  const [autoLoop, setAutoLoop] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [timeline, setTimeline] = useState({ index: 0, length: 1, time: 0 });
  const [hoveredHandleId, setHoveredHandleId] = useState<string | null>(null);
  const [hoveredHandleStyle, setHoveredHandleStyle] = useState<
    "vector" | "point" | null
  >(null);

  useKeyboardInput(inputRef);

  const resolveViewport = useCallback(
    () =>
      buildViewport(
        scene,
        canvasSize.width,
        canvasSize.height,
        stateRef.current,
        configRef.current,
        zoom,
      ),
    [canvasSize.height, canvasSize.width, scene, zoom],
  );

  const publishPanel = useCallback(
    (force = false) => {
      if (
        !force &&
        timeRef.current - lastPanelPublishRef.current < PANEL_PUBLISH_INTERVAL
      ) {
        return;
      }

      lastPanelPublishRef.current = timeRef.current;
      const nextPanel = scene.buildPanelData(
        stateRef.current,
        configRef.current,
      );
      setPanel(nextPanel);
      onTelemetry(nextPanel);
    },
    [onTelemetry, scene],
  );

  const publishTimeline = useCallback((force = false) => {
    if (
      !force &&
      timeRef.current - lastTimelinePublishRef.current <
        TIMELINE_PUBLISH_INTERVAL
    ) {
      return;
    }

    lastTimelinePublishRef.current = timeRef.current;
    setTimeline({
      index: frameIndexRef.current,
      length: historyRef.current.length,
      time: timeRef.current,
    });
  }, []);

  const pushHistory = useCallback(() => {
    if (frameIndexRef.current < historyRef.current.length - 1) {
      historyRef.current.splice(frameIndexRef.current + 1);
    }

    historyRef.current.push({
      state: cloneSceneState(stateRef.current),
      time: timeRef.current,
    });

    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    }

    frameIndexRef.current = historyRef.current.length - 1;
    publishTimeline();
  }, [publishTimeline]);

  const resetScene = useCallback(() => {
    stateRef.current = scene.createState(configRef.current);
    timeRef.current = 0;
    lastPanelPublishRef.current = -Infinity;
    lastTimelinePublishRef.current = -Infinity;
    historyRef.current = [
      {
        state: cloneSceneState(stateRef.current),
        time: 0,
      },
    ];
    frameIndexRef.current = 0;
    stagnantStepsRef.current = 0;
    lastLoopSignatureRef.current = buildLoopSignature(stateRef.current);
    publishTimeline(true);
    publishPanel(true);
  }, [publishPanel, publishTimeline, scene]);

  const restoreHistory = useCallback(
    (index: number) => {
      const entry = historyRef.current[index];
      if (!entry) {
        return;
      }

      stateRef.current = cloneSceneState(entry.state);
      timeRef.current = entry.time;
      frameIndexRef.current = index;
      publishTimeline(true);
      publishPanel(true);
    },
    [publishPanel, publishTimeline],
  );

  const stepOnce = useCallback(() => {
    setIsPlaying(false);
    if (frameIndexRef.current < historyRef.current.length - 1) {
      restoreHistory(frameIndexRef.current + 1);
      return;
    }

    scene.step({
      state: stateRef.current,
      config: configRef.current,
      dt: FIXED_DT,
      input: inputRef.current,
    });
    timeRef.current += FIXED_DT;
    pushHistory();
    publishPanel(true);
  }, [publishPanel, pushHistory, restoreHistory, scene]);

  useEffect(() => {
    configRef.current = config;

    // When switching scenes, stateRef still points to the previous scene until resetScene runs.
    // Skip this publish to avoid calling buildPanelData with mismatched scene/state shapes.
    if (previousSceneIdRef.current !== scene.id) {
      previousSceneIdRef.current = scene.id;
      return;
    }

    publishPanel(true);
  }, [config, publishPanel, scene.id]);

  useEffect(() => {
    const previousConfig = previousConfigRef.current;
    const changed = JSON.stringify(previousConfig) !== JSON.stringify(config);
    previousConfigRef.current = config;

    if (
      !changed ||
      pointerDragRef.current ||
      scene.resetOnConfigChange === false
    ) {
      return;
    }

    resetScene();
  }, [config, resetScene, scene.resetOnConfigChange]);

  useEffect(() => {
    let active = true;

    Promise.all([
      loadImage(assetUrl("assets/car.svg")),
      loadImage(assetUrl("assets/crate.svg")),
      loadImage(assetUrl("assets/bucket.svg")),
      loadImage(assetUrl("assets/pulley.svg")),
      loadImage(assetUrl("assets/plane.svg")),
      loadImage(assetUrl("assets/train.svg")),
      loadImage(assetUrl("assets/boat.svg")),
      loadImage(assetUrl("assets/package.svg")),
    ])
      .then(
        ([car, crate, bucket, pulley, plane, train, boat, packageSprite]) => {
          if (!active) {
            return;
          }

          spriteRef.current = {
            car,
            crate,
            bucket,
            pulley,
            plane,
            train,
            boat,
            package: packageSprite,
          };
        },
      )
      .catch(() => {
        if (!active) {
          return;
        }

        spriteRef.current = {};
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setIsPlaying(true);
    setPlaybackRate(1);
    setZoom(1);
    setAutoLoop(scene.autoLoopDefault ?? true);
    resetScene();
  }, [resetScene, scene]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(canvasSize.width * dpr);
    canvas.height = Math.round(canvasSize.height * dpr);
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    let frameId = 0;
    let lastTimestamp = performance.now();
    let accumulator = 0;

    const renderFrame = () => {
      const viewport = resolveViewport();
      context.clearRect(0, 0, canvasSize.width, canvasSize.height);
      scene.render({
        ctx: context,
        state: stateRef.current,
        config: configRef.current,
        viewport,
        sprites: spriteRef.current,
      });

      const dragHandles =
        scene.getDragHandles?.(stateRef.current, configRef.current) ?? [];
      drawDragHandles(
        context,
        viewport,
        dragHandles,
        pointerDragRef.current?.handleId ?? null,
        hoveredHandleId,
      );
    };

    const loop = (timestamp: number) => {
      const delta = Math.min((timestamp - lastTimestamp) / 1000, 0.08);
      lastTimestamp = timestamp;
      accumulator += delta * playbackRate;

      if (isPlaying && !pointerDragRef.current) {
        while (accumulator >= FIXED_DT) {
          scene.step({
            state: stateRef.current,
            config: configRef.current,
            dt: FIXED_DT,
            input: inputRef.current,
          });
          timeRef.current += FIXED_DT;
          pushHistory();

          if (autoLoop) {
            const nextSignature = buildLoopSignature(stateRef.current);
            if (nextSignature === lastLoopSignatureRef.current) {
              stagnantStepsRef.current += 1;
            } else {
              stagnantStepsRef.current = 0;
            }

            lastLoopSignatureRef.current = nextSignature;

            if (
              stagnantStepsRef.current >= AUTO_LOOP_STAGNANT_STEPS &&
              historyRef.current.length > 4
            ) {
              restoreHistory(0);
              stagnantStepsRef.current = 0;
              accumulator = 0;
              break;
            }
          }

          accumulator -= FIXED_DT;
        }
      } else {
        accumulator = 0;
      }

      renderFrame();
      publishPanel();
      publishTimeline();
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [
    canvasSize.height,
    canvasSize.width,
    hoveredHandleId,
    isPlaying,
    playbackRate,
    pushHistory,
    resolveViewport,
    scene,
    publishPanel,
    publishTimeline,
    autoLoop,
    restoreHistory,
  ]);

  const getWorldPointFromEvent = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const viewport = resolveViewport();
      const rect = event.currentTarget.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * canvasSize.width;
      const y = ((event.clientY - rect.top) / rect.height) * canvasSize.height;
      return screenToWorld(viewport, x, y);
    },
    [canvasSize.height, canvasSize.width, resolveViewport],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!scene.getDragHandles || !scene.onDrag) {
      return;
    }

    const worldPoint = getWorldPointFromEvent(event);
    const handles = scene.getDragHandles(stateRef.current, configRef.current);
    const picked = handles.find(
      (handle) =>
        handle.position.subtract(worldPoint).length <= (handle.radius ?? 0.18),
    );

    if (!picked) {
      return;
    }

    pointerDragRef.current = {
      handleId: picked.id,
      pointerId: event.pointerId,
    };
    setHoveredHandleId(picked.id);
    setHoveredHandleStyle(picked.style ?? "point");
    setIsPlaying(false);
    event.currentTarget.setPointerCapture(event.pointerId);

    const result = scene.onDrag({
      handleId: picked.id,
      worldPoint,
      state: stateRef.current,
      config: configRef.current,
      phase: "start",
    });

    if (result?.configPatch) {
      onConfigPatch(result.configPatch);
    }
    publishPanel(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const worldPoint = getWorldPointFromEvent(event);
    const handles =
      scene.getDragHandles?.(stateRef.current, configRef.current) ?? [];

    if (pointerDragRef.current && scene.onDrag) {
      const result = scene.onDrag({
        handleId: pointerDragRef.current.handleId,
        worldPoint,
        state: stateRef.current,
        config: configRef.current,
        phase: "move",
      });

      if (result?.configPatch) {
        onConfigPatch(result.configPatch);
      }
      publishPanel(true);
      return;
    }

    const hoveredHandle = handles.find(
      (handle) =>
        handle.position.subtract(worldPoint).length <= (handle.radius ?? 0.18),
    );
    setHoveredHandleId(hoveredHandle?.id ?? null);
    setHoveredHandleStyle(
      (hoveredHandle?.style as "vector" | "point" | undefined) ?? null,
    );
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pointerDragRef.current || !scene.onDrag) {
      return;
    }

    const worldPoint = getWorldPointFromEvent(event);
    const handleId = pointerDragRef.current.handleId;

    scene.onDrag({
      handleId,
      worldPoint,
      state: stateRef.current,
      config: configRef.current,
      phase: "end",
    });

    pointerDragRef.current = null;
    setHoveredHandleId(null);
    setHoveredHandleStyle(null);
    pushHistory();
    publishPanel(true);
  };

  return (
    <section className="card workspace-stage">
      <div className="workspace-stage__topbar">
        <div className="stage-player">
          <span className="stage-player__scene-tag">{scene.title}</span>
          <div className="stage-player__row">
            <button
              type="button"
              className="player-button"
              onClick={() => {
                setIsPlaying(false);
                restoreHistory(Math.max(0, frameIndexRef.current - 1));
              }}
            >
              ⏮
            </button>
            <button
              type="button"
              className="player-button is-primary"
              onClick={() => setIsPlaying((value) => !value)}
            >
              {isPlaying ? "⏸" : "▶"}
            </button>
            <button type="button" className="player-button" onClick={stepOnce}>
              ⏭
            </button>
            <button
              type="button"
              className="player-button"
              onClick={resetScene}
            >
              ↺
            </button>
            <button
              type="button"
              className={`player-button ${autoLoop ? "is-active" : ""}`}
              onClick={() => setAutoLoop((value) => !value)}
            >
              loop
            </button>
            {RATE_OPTIONS.map((rate) => (
              <button
                key={rate}
                type="button"
                className={`rate-pill ${rate === playbackRate ? "is-active" : ""}`}
                onClick={() => setPlaybackRate(rate)}
              >
                {rate}x
              </button>
            ))}
            <button
              type="button"
              className="rate-pill"
              onClick={() =>
                setZoom((value) =>
                  Math.max(ZOOM_MIN, Number((value - 0.1).toFixed(2))),
                )
              }
            >
              zoom-
            </button>
            <button
              type="button"
              className="rate-pill"
              onClick={() => setZoom(1)}
            >
              {zoom.toFixed(2)}x
            </button>
            <button
              type="button"
              className="rate-pill"
              onClick={() =>
                setZoom((value) =>
                  Math.min(ZOOM_MAX, Number((value + 0.1).toFixed(2))),
                )
              }
            >
              zoom+
            </button>
          </div>
        </div>
      </div>

      <div ref={stageRef} className="workspace-stage__canvas-wrap">
        <canvas
          ref={canvasRef}
          className="simulation-canvas"
          style={{
            cursor: pointerDragRef.current
              ? "grabbing"
              : hoveredHandleId
                ? hoveredHandleStyle === "vector"
                  ? "pointer"
                  : "grab"
                : "default",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            if (!pointerDragRef.current) {
              setHoveredHandleId(null);
              setHoveredHandleStyle(null);
            }
          }}
        />

        <div className="canvas-overlay canvas-overlay--left">
          {panel.metrics.slice(0, 4).map((metric) => (
            <div key={metric.label} className="hud-chip">
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
          ))}
        </div>

        <div className="canvas-overlay canvas-overlay--right">
          {scene.keyboardHints.map((hint) => (
            <span key={hint} className="keyboard-hint">
              {hint}
            </span>
          ))}
          <span className="keyboard-hint">
            {hoveredHandleId
              ? hoveredHandleStyle === "vector"
                ? "Arraste a seta"
                : "Arraste o ponto"
              : "Clique e arraste vetores/objetos"}
          </span>
        </div>
      </div>

      <div className="timeline-row">
        <div className="timeline-meta">
          <strong>{isPlaying ? "Rodando" : "Pausado"}</strong>
          <span>{timeline.time.toFixed(2)} s</span>
          <span>
            frame {timeline.index + 1}/{timeline.length}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(0, timeline.length - 1)}
          step={1}
          value={timeline.index}
          onChange={(event) => {
            setIsPlaying(false);
            restoreHistory(Number(event.target.value));
          }}
        />
      </div>
    </section>
  );
}
