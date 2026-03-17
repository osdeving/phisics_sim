import { formatNumber } from "../core/units";
import { Vector2 } from "../math/Vector2";
import {
  drawArrow,
  drawCircleBody,
  drawGrid,
  drawGround,
  drawLineWorld,
  drawScenicBackdrop,
  drawSpriteAtWorld,
  drawWorldLabel,
} from "../render/canvasPrimitives";
import { worldToScreen } from "../render/viewport";
import {
  SceneDefinition,
  ScenePanelData,
  SceneRenderArgs,
  SceneState,
  SliderControl,
  SpriteAtlas,
} from "./types";

type LaneKind = "road" | "track" | "river" | "sky";
type SceneSpriteKey = "car" | "train" | "boat" | "plane";

interface Units {
  position: string;
  velocity: string;
  time: string;
}

interface ActorVisual {
  label: string;
  arrowLabel: string;
  color: string;
  sprite?: SceneSpriteKey;
  width?: number;
  height?: number;
  radius?: number;
  flipWithVelocity?: boolean;
}

interface EncounterSceneState extends SceneState {
  time: number;
  positionFirst: number;
  positionSecond: number;
  eventReached: boolean;
}

interface SeparationSceneState extends SceneState {
  time: number;
  positionFirst: number;
  positionSecond: number;
  eventReached: boolean;
}

interface RoundTripSceneState extends SceneState {
  time: number;
  downstreamProgress: number;
  upstreamProgress: number;
}

interface RiverCrossingClassicState extends SceneState {
  time: number;
  position: Vector2;
  trail: Vector2[];
  arrived: boolean;
}

interface AirplaneWindSceneState extends SceneState {
  time: number;
  eastProgress: number;
  westProgress: number;
}

interface TrainPassengerSceneState extends SceneState {
  phase: number;
  time: number;
}

interface EncounterSceneOptions {
  id: string;
  title: string;
  subtitle: string;
  accent: string;
  summary: string;
  laneKind: LaneKind;
  timeScale: number;
  units: Units;
  firstActor: ActorVisual;
  secondActor: ActorVisual;
  defaults: Record<string, number>;
  controls: SliderControl[];
  secondDirection: "left" | "right";
  eventName: string;
  eventPositionName: string;
  mentalCue: string;
  studyNote: string;
  pitfall: string;
  intuition?: string;
  loopLabel: string;
  exerciseTitle: string;
}

interface SeparationSceneOptions {
  id: string;
  title: string;
  subtitle: string;
  accent: string;
  summary: string;
  laneKind: LaneKind;
  timeScale: number;
  units: Units;
  firstActor: ActorVisual;
  secondActor: ActorVisual;
  defaults: Record<string, number>;
  controls: SliderControl[];
  motionKind: "opposite" | "same";
  targetLabel: string;
  mentalCue: string;
  studyNote: string;
  pitfall: string;
  intuition?: string;
  loopLabel: string;
  exerciseTitle: string;
}

function compactNumber(value: number, digits = 2) {
  const rounded = Number(value.toFixed(digits));
  if (Number.isInteger(rounded)) {
    return String(rounded);
  }

  return rounded
    .toFixed(digits)
    .replace(/0+$/, "")
    .replace(/\.$/, "");
}

function formatSceneQuantity(value: number, unit: string, digits = 2) {
  return `${formatNumber(value, digits)} ${unit}`;
}

function describeLinearEquation(symbol: string, initial: number, velocity: number) {
  const initialText = compactNumber(initial);
  const speedText = compactNumber(Math.abs(velocity));
  const sign = velocity >= 0 ? "+" : "-";
  return `${symbol} = ${initialText} ${sign} ${speedText}t`;
}

function ratioWithin(value: number, min: number, max: number) {
  if (Math.abs(max - min) < 1e-6) {
    return 0.5;
  }

  return (value - min) / (max - min);
}

function mapToWorld(value: number, min: number, max: number, worldMin: number, worldMax: number) {
  return worldMin + ratioWithin(value, min, max) * (worldMax - worldMin);
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function getEncounterState(state: SceneState) {
  return state as EncounterSceneState;
}

function getSeparationState(state: SceneState) {
  return state as SeparationSceneState;
}

function getRoundTripState(state: SceneState) {
  return state as RoundTripSceneState;
}

function getRiverCrossingClassicState(state: SceneState) {
  return state as RiverCrossingClassicState;
}

function getAirplaneWindState(state: SceneState) {
  return state as AirplaneWindSceneState;
}

function getTrainPassengerState(state: SceneState) {
  return state as TrainPassengerSceneState;
}

function laneGeometry(kind: LaneKind) {
  switch (kind) {
    case "sky":
      return { laneY: 4.5, laneStart: 2, laneEnd: 20 };
    case "river":
      return { laneY: 4.85, laneStart: 2, laneEnd: 20 };
    default:
      return { laneY: 5.25, laneStart: 2, laneEnd: 20 };
  }
}

function drawWaterLane(
  ctx: CanvasRenderingContext2D,
  viewport: SceneRenderArgs["viewport"],
  laneY: number,
  label: string,
  flowDirection = 1,
) {
  const left = worldToScreen(viewport, new Vector2(1.4, laneY - 0.8));
  const right = worldToScreen(viewport, new Vector2(20.6, laneY + 0.8));
  const gradient = ctx.createLinearGradient(left.x, left.y, right.x, right.y);
  gradient.addColorStop(0, "rgba(57, 166, 255, 0.45)");
  gradient.addColorStop(0.55, "rgba(18, 117, 220, 0.35)");
  gradient.addColorStop(1, "rgba(12, 76, 170, 0.48)");

  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(left.x, left.y, right.x - left.x, right.y - left.y);
  ctx.restore();

  drawLineWorld(ctx, viewport, new Vector2(1.4, laneY - 0.8), new Vector2(20.6, laneY - 0.8), "#cfefff", 3);
  drawLineWorld(ctx, viewport, new Vector2(1.4, laneY + 0.8), new Vector2(20.6, laneY + 0.8), "#cfefff", 3);
  drawWorldLabel(ctx, viewport, new Vector2(1.8, laneY - 1.1), label);

  for (let x = 3; x <= 19; x += 2.8) {
    drawArrow(
      ctx,
      viewport,
      new Vector2(x, laneY + 0.15),
      new Vector2(flowDirection * 0.85, 0),
      "rgba(221, 245, 255, 0.6)",
      undefined,
    );
  }
}

function drawSkyLane(
  ctx: CanvasRenderingContext2D,
  viewport: SceneRenderArgs["viewport"],
  laneY: number,
  label: string,
) {
  drawWorldLabel(ctx, viewport, new Vector2(1.8, laneY - 0.9), label);
  drawLineWorld(ctx, viewport, new Vector2(2, laneY), new Vector2(20, laneY), "rgba(220, 237, 255, 0.28)", 2);
}

function drawTrackTicks(
  ctx: CanvasRenderingContext2D,
  viewport: SceneRenderArgs["viewport"],
  laneStart: number,
  laneEnd: number,
  laneY: number,
) {
  for (let x = laneStart + 0.4; x <= laneEnd - 0.4; x += 0.9) {
    drawLineWorld(ctx, viewport, new Vector2(x, laneY + 0.54), new Vector2(x, laneY + 0.95), "rgba(214, 187, 138, 0.42)", 2);
  }
}

function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  viewport: SceneRenderArgs["viewport"],
  kind: LaneKind,
  label: string,
) {
  const { laneY } = laneGeometry(kind);
  drawScenicBackdrop(ctx, viewport, {
    groundY: kind === "sky" ? 7.3 : 6.75,
    treeSpacing: kind === "sky" ? 4.6 : 3.8,
    hillHeight: kind === "sky" ? 0.85 : 1.05,
    treeBaseY: kind === "sky" ? 7.15 : undefined,
  });
  drawGrid(ctx, viewport, 1);

  if (kind === "river") {
    drawWaterLane(ctx, viewport, laneY, label);
    return;
  }

  if (kind === "sky") {
    drawSkyLane(ctx, viewport, laneY, label);
    return;
  }

  drawGround(ctx, viewport, 6.75, label);
  drawLineWorld(ctx, viewport, new Vector2(2, laneY + 0.62), new Vector2(20, laneY + 0.62), kind === "track" ? "#d5e8ff" : "rgba(229, 236, 249, 0.3)", kind === "track" ? 2.5 : 2);
  if (kind === "track") {
    drawLineWorld(ctx, viewport, new Vector2(2, laneY + 0.9), new Vector2(20, laneY + 0.9), "#d5e8ff", 2.5);
    drawTrackTicks(ctx, viewport, 2, 20, laneY);
  }
}

function drawDistanceSpan(
  ctx: CanvasRenderingContext2D,
  viewport: SceneRenderArgs["viewport"],
  fromX: number,
  toX: number,
  y: number,
  label: string,
) {
  drawLineWorld(ctx, viewport, new Vector2(fromX, y), new Vector2(toX, y), "rgba(248, 238, 197, 0.9)", 2);
  drawLineWorld(ctx, viewport, new Vector2(fromX, y - 0.18), new Vector2(fromX, y + 0.18), "rgba(248, 238, 197, 0.9)", 2);
  drawLineWorld(ctx, viewport, new Vector2(toX, y - 0.18), new Vector2(toX, y + 0.18), "rgba(248, 238, 197, 0.9)", 2);
  drawWorldLabel(ctx, viewport, new Vector2((fromX + toX) * 0.5 - 0.35, y - 0.24), label);
}

function spriteForVisual(sprites: SpriteAtlas, visual: ActorVisual) {
  if (!visual.sprite) {
    return undefined;
  }

  return sprites[visual.sprite];
}

function drawActor(
  ctx: CanvasRenderingContext2D,
  viewport: SceneRenderArgs["viewport"],
  sprites: SpriteAtlas,
  visual: ActorVisual,
  worldPosition: Vector2,
  velocity: number,
  maxReferenceSpeed: number,
) {
  if (visual.sprite) {
    drawSpriteAtWorld(
      ctx,
      viewport,
      spriteForVisual(sprites, visual),
      worldPosition,
      visual.width ?? 1.8,
      visual.height ?? 1.1,
      0,
      visual.color,
      Boolean(visual.flipWithVelocity && velocity < 0),
    );
  } else {
    drawCircleBody(ctx, viewport, worldPosition, visual.radius ?? 0.28, visual.color);
  }

  drawWorldLabel(ctx, viewport, worldPosition.add(new Vector2(-0.28, -0.78)), visual.label);

  const speedMagnitude = Math.abs(velocity);
  const reference = Math.max(maxReferenceSpeed, 1);
  const arrowLength = 0.6 + (speedMagnitude / reference) * 1.5;
  const direction = velocity < 0 ? -1 : 1;
  drawArrow(
    ctx,
    viewport,
    worldPosition.add(new Vector2(0, -0.38)),
    new Vector2(direction * arrowLength, 0),
    visual.color,
    visual.arrowLabel,
  );
}

function drawAxisExtents(
  ctx: CanvasRenderingContext2D,
  viewport: SceneRenderArgs["viewport"],
  laneStart: number,
  laneEnd: number,
  laneY: number,
  minPosition: number,
  maxPosition: number,
  unit: string,
) {
  drawWorldLabel(ctx, viewport, new Vector2(laneStart - 0.2, laneY + 1.18), `${compactNumber(minPosition)} ${unit}`);
  drawWorldLabel(ctx, viewport, new Vector2(laneEnd - 1.6, laneY + 1.18), `${compactNumber(maxPosition)} ${unit}`);
}

function deriveEncounter(config: Record<string, number>, secondDirection: "left" | "right") {
  const initialGap = config.initialGap;
  const velocityFirst = config.speedFirst;
  const velocitySecond = secondDirection === "left" ? -config.speedSecond : config.speedSecond;
  const relativeSpeed = velocityFirst - velocitySecond;
  const eventTime = relativeSpeed > 0 ? initialGap / relativeSpeed : null;
  const eventPosition = eventTime === null ? null : velocityFirst * eventTime;

  return {
    initialGap,
    velocityFirst,
    velocitySecond,
    relativeSpeed,
    eventTime,
    eventPosition,
  };
}

function deriveSeparation(config: Record<string, number>, motionKind: "opposite" | "same") {
  const velocityFirst = config.speedFirst;
  const velocitySecond = motionKind === "opposite" ? -config.speedSecond : config.speedSecond;
  const relativeSpeed = Math.abs(velocityFirst - velocitySecond);
  const observationTime = config.observationTime;
  const targetDistance = config.targetDistance;
  const separationAtObservation = relativeSpeed * observationTime;
  const targetTime = relativeSpeed > 0 ? targetDistance / relativeSpeed : null;

  return {
    velocityFirst,
    velocitySecond,
    relativeSpeed,
    observationTime,
    targetDistance,
    separationAtObservation,
    targetTime,
  };
}

function buildEncounterScene(options: EncounterSceneOptions): SceneDefinition {
  const { laneY, laneStart, laneEnd } = laneGeometry(options.laneKind);

  function buildPanel(state: EncounterSceneState, config: Record<string, number>): ScenePanelData {
    const derived = deriveEncounter(config, options.secondDirection);
    const currentGap = Math.max(0, state.positionSecond - state.positionFirst);
    const sign = options.secondDirection === "left" ? "+" : "-";
    const secondEquation = describeLinearEquation("s_2", config.initialGap, derived.velocitySecond);

    return {
      metrics: [
        {
          label: "Separação atual",
          value: formatSceneQuantity(currentGap, options.units.position),
          helper: "Distância entre os dois móveis ao longo do eixo horizontal.",
        },
        {
          label: "Velocidade relativa",
          value:
            derived.relativeSpeed > 0
              ? formatSceneQuantity(derived.relativeSpeed, options.units.velocity)
              : "Não fecha",
          helper:
            options.secondDirection === "left"
              ? "Como vêm um contra o outro, os módulos das velocidades se somam."
              : "Como seguem no mesmo sentido, vale só a vantagem do mais rápido.",
        },
        {
          label: `Tempo do ${options.eventName}`,
          value:
            derived.eventTime === null
              ? "Não ocorre"
              : formatSceneQuantity(derived.eventTime, options.units.time),
          helper: "A condição do problema é s₁ = s₂.",
        },
        {
          label: options.eventPositionName,
          value:
            derived.eventPosition === null
              ? "Indefinida"
              : formatSceneQuantity(derived.eventPosition, options.units.position),
          helper: "Substitua o tempo do encontro em qualquer uma das equações horárias.",
        },
      ],
      formulas: [
        {
          title: "Modo longo",
          formula: "$$s = s_0 + vt$$",
          explanation:
            "Escreva uma equação horária para cada móvel. Em MRU a posição varia linearmente com o tempo.",
        },
        {
          title: `Condição de ${options.eventName}`,
          formula: "$$s_1 = s_2$$",
          explanation:
            "O evento acontece quando as duas posições coincidem no mesmo instante.",
        },
        {
          title: "Velocidade relativa",
          formula: `$$v_{rel} = v_1 ${sign} v_2$$`,
          explanation:
            options.secondDirection === "left"
              ? "Em encontro frontal, a distância fecha pelos dois móveis."
              : "Em perseguição, a distância fecha apenas pela vantagem do mais rápido.",
        },
      ],
      concept: [
        {
          title: "Leitura mental",
          body: options.mentalCue,
        },
      ],
      studyNotes: [
        {
          title: "SOVETE + velocidade relativa",
          body: options.studyNote,
        },
      ],
      loopSteps: [
        {
          title: "1. Recalcular x(t) de cada móvel",
          body: "A cena não integra aceleração: as duas posições são obtidas diretamente das equações horárias.",
        },
        {
          title: "2. Medir a distância restante",
          body: "A cada frame a separação no eixo horizontal é recalculada para destacar a velocidade relativa.",
        },
        {
          title: "3. Travar no evento",
          body: options.loopLabel,
        },
      ],
      exercises: [
        derived.eventTime === null || derived.eventPosition === null
          ? {
              title: options.exerciseTitle,
              prompt: "Com os valores atuais, o móvel de trás não consegue fechar a distância.",
              answer: "A velocidade relativa ficou nula ou negativa, então não existe encontro no modelo atual.",
              steps: [
                `Cheque o sinal: v_rel = ${compactNumber(config.speedFirst)} ${sign} ${compactNumber(config.speedSecond)} = ${compactNumber(derived.relativeSpeed)} ${options.units.velocity}.`,
                "Se v_rel <= 0, a separação não diminui até zero.",
              ],
            }
          : {
              title: options.exerciseTitle,
              prompt: `No instante t = 0, o primeiro móvel parte de s = 0 e o segundo de s = ${compactNumber(config.initialGap)} ${options.units.position}. Quando ocorre o ${options.eventName} e em qual posição?`,
              answer: `O ${options.eventName} acontece em ${compactNumber(derived.eventTime)} ${options.units.time}, na posição ${compactNumber(derived.eventPosition)} ${options.units.position}.`,
              steps: [
                `Leitura mental: ${options.mentalCue}`,
                `Modo longo: ${describeLinearEquation("s_1", 0, derived.velocityFirst)} e ${secondEquation}.`,
                `Iguale as posições: s_1 = s_2. Com os valores atuais, isso vira t = ${compactNumber(config.initialGap)} / ${compactNumber(derived.relativeSpeed)} = ${compactNumber(derived.eventTime)} ${options.units.time}.`,
                `Modo curto: v_rel = ${compactNumber(config.speedFirst)} ${sign} ${compactNumber(config.speedSecond)} = ${compactNumber(derived.relativeSpeed)} ${options.units.velocity}.`,
                `${options.eventPositionName}: s = ${compactNumber(config.speedFirst)} * ${compactNumber(derived.eventTime)} = ${compactNumber(derived.eventPosition)} ${options.units.position}.`,
              ],
            },
      ],
      intuition: options.intuition
        ? [
            {
              title: "Frase para guardar",
              body: options.intuition,
            },
          ]
        : undefined,
      pitfalls: [
        {
          title: "Pegadinha clássica",
          body: options.pitfall,
        },
      ],
    };
  }

  return {
    id: options.id,
    title: options.title,
    subtitle: options.subtitle,
    accent: options.accent,
    category: "Movimento relativo",
    summary: options.summary,
    worldWidth: 22,
    worldHeight: 8,
    keyboardHints: ["Use os sliders", "Compare longo x curto", "Observe a separação"],
    defaults: options.defaults,
    controls: options.controls,
    createState: (config) => ({
      time: 0,
      positionFirst: 0,
      positionSecond: config.initialGap,
      eventReached: false,
    }),
    step: ({ state, config, dt }) => {
      const scene = getEncounterState(state);
      if (scene.eventReached) {
        return;
      }

      const derived = deriveEncounter(config, options.secondDirection);
      const nextTime = scene.time + dt * options.timeScale;

      if (derived.eventTime !== null && nextTime >= derived.eventTime) {
        scene.time = derived.eventTime;
        scene.positionFirst = derived.eventPosition ?? 0;
        scene.positionSecond = derived.eventPosition ?? 0;
        scene.eventReached = true;
        return;
      }

      scene.time = nextTime;
      scene.positionFirst = derived.velocityFirst * scene.time;
      scene.positionSecond = config.initialGap + derived.velocitySecond * scene.time;
    },
    render: ({ ctx, state, config, viewport, sprites }) => {
      const scene = getEncounterState(state);
      const derived = deriveEncounter(config, options.secondDirection);
      const minPosition = Math.min(0, scene.positionFirst, scene.positionSecond) - Math.max(config.initialGap * 0.15, 1);
      const maxCandidate = Math.max(config.initialGap, scene.positionFirst, scene.positionSecond, derived.eventPosition ?? config.initialGap);
      const maxPosition = maxCandidate + Math.max(config.initialGap * 0.15, 1);
      const worldFirstX = mapToWorld(scene.positionFirst, minPosition, maxPosition, laneStart, laneEnd);
      const worldSecondX = mapToWorld(scene.positionSecond, minPosition, maxPosition, laneStart, laneEnd);
      const maxSpeed = Math.max(config.speedFirst, config.speedSecond);

      drawBackdrop(ctx, viewport, options.laneKind, options.laneKind === "track" ? "Trilho do exercício" : options.laneKind === "river" ? "Rio do exercício" : "Eixo do exercício");
      drawAxisExtents(ctx, viewport, laneStart, laneEnd, laneY, minPosition, maxPosition, options.units.position);

      if (derived.eventPosition !== null) {
        const eventWorldX = mapToWorld(derived.eventPosition, minPosition, maxPosition, laneStart, laneEnd);
        drawLineWorld(ctx, viewport, new Vector2(eventWorldX, laneY - 1.1), new Vector2(eventWorldX, laneY + 0.85), "rgba(250, 228, 163, 0.38)", 2);
        drawWorldLabel(ctx, viewport, new Vector2(eventWorldX - 0.2, laneY - 1.35), options.eventName);
      }

      if (Math.abs(worldSecondX - worldFirstX) > 0.4) {
        drawDistanceSpan(
          ctx,
          viewport,
          Math.min(worldFirstX, worldSecondX),
          Math.max(worldFirstX, worldSecondX),
          laneY - 1.05,
          `${compactNumber(Math.max(0, scene.positionSecond - scene.positionFirst))} ${options.units.position}`,
        );
      }

      drawActor(ctx, viewport, sprites, options.firstActor, new Vector2(worldFirstX, laneY), derived.velocityFirst, maxSpeed);
      drawActor(ctx, viewport, sprites, options.secondActor, new Vector2(worldSecondX, laneY), derived.velocitySecond, maxSpeed);
    },
    buildPanelData: (state, config) => buildPanel(getEncounterState(state), config),
  };
}

function buildSeparationScene(options: SeparationSceneOptions): SceneDefinition {
  const { laneY, laneStart, laneEnd } = laneGeometry(options.laneKind);

  function buildPanel(state: SeparationSceneState, config: Record<string, number>): ScenePanelData {
    const derived = deriveSeparation(config, options.motionKind);
    const secondEquation = describeLinearEquation("s_2", 0, derived.velocitySecond);
    const relationSymbol = options.motionKind === "opposite" ? "+" : "-";
    const currentDistance = Math.abs(state.positionFirst - state.positionSecond);

    return {
      metrics: [
        {
          label: "Separação atual",
          value: formatSceneQuantity(currentDistance, options.units.position),
          helper: "A distância é o módulo da diferença entre as posições dos dois móveis.",
        },
        {
          label: "Velocidade relativa",
          value:
            derived.relativeSpeed > 0
              ? formatSceneQuantity(derived.relativeSpeed, options.units.velocity)
              : "Nula",
          helper:
            options.motionKind === "opposite"
              ? "Como os móveis se afastam em sentidos opostos, as velocidades se somam."
              : "No mesmo sentido, a separação cresce só pela vantagem do mais rápido.",
        },
        {
          label: `Distância após ${compactNumber(config.observationTime)} ${options.units.time}`,
          value: formatSceneQuantity(derived.separationAtObservation, options.units.position),
          helper: "Esse é o resultado pedido no enunciado do exercício.",
        },
        {
          label: `Tempo para ${compactNumber(config.targetDistance)} ${options.units.position}`,
          value:
            derived.targetTime === null
              ? "Não cresce"
              : formatSceneQuantity(derived.targetTime, options.units.time),
          helper: "Basta dividir a distância alvo pela taxa com que a separação cresce.",
        },
      ],
      formulas: [
        {
          title: "Equações horárias",
          formula: "$$s = s_0 + vt$$",
          explanation: "Cada móvel continua em MRU; o que muda é a forma de comparar as posições.",
        },
        {
          title: "Separação",
          formula: "$$d = |s_1 - s_2|$$",
          explanation: "A distância entre eles é o módulo da diferença entre as duas funções horárias.",
        },
        {
          title: "Velocidade relativa",
          formula: `$$v_{rel} = v_1 ${relationSymbol} v_2$$`,
          explanation:
            options.motionKind === "opposite"
              ? "Sentidos opostos fazem a distância crescer pelos dois ao mesmo tempo."
              : "Mesmo sentido significa olhar apenas para a diferença entre as velocidades.",
        },
      ],
      concept: [
        {
          title: "Leitura mental",
          body: options.mentalCue,
        },
      ],
      studyNotes: [
        {
          title: "Dois jeitos de resolver",
          body: options.studyNote,
        },
      ],
      loopSteps: [
        {
          title: "1. Avançar os dois MRUs",
          body: "A posição de cada móvel cresce linearmente com o tempo da cena.",
        },
        {
          title: "2. Comparar as posições",
          body: "A simulação mede |s₁ - s₂| para transformar duas equações em uma única distância.",
        },
        {
          title: "3. Destacar o alvo",
          body: options.loopLabel,
        },
      ],
      exercises: [
        derived.targetTime === null
          ? {
              title: options.exerciseTitle,
              prompt: "Com esses valores, a separação não cresce porque as velocidades ficaram iguais.",
              answer: "O movimento relativo ficou nulo.",
              steps: [
                `Cheque a taxa relativa: v_rel = ${compactNumber(derived.relativeSpeed)} ${options.units.velocity}.`,
                "Se v_rel = 0, a distância entre os móveis não aumenta.",
              ],
            }
          : {
              title: options.exerciseTitle,
              prompt: `Partindo do mesmo ponto, qual a distância após ${compactNumber(config.observationTime)} ${options.units.time} e em quanto tempo eles atingem ${compactNumber(config.targetDistance)} ${options.units.position}?`,
              answer: `Após ${compactNumber(config.observationTime)} ${options.units.time} a separação vale ${compactNumber(derived.separationAtObservation)} ${options.units.position}. Para atingir ${compactNumber(config.targetDistance)} ${options.units.position}, o tempo é ${compactNumber(derived.targetTime)} ${options.units.time}.`,
              steps: [
                `Leitura mental: ${options.mentalCue}`,
                `Modo longo: ${describeLinearEquation("s_1", 0, derived.velocityFirst)} e ${secondEquation}.`,
                `Substitua em d = |s_1 - s_2|. Com os valores atuais, fica d = ${compactNumber(derived.relativeSpeed)}t.`,
                `Após ${compactNumber(config.observationTime)} ${options.units.time}: d = ${compactNumber(derived.relativeSpeed)} * ${compactNumber(config.observationTime)} = ${compactNumber(derived.separationAtObservation)} ${options.units.position}.`,
                `Modo curto: v_rel = ${compactNumber(config.speedFirst)} ${relationSymbol} ${compactNumber(config.speedSecond)} = ${compactNumber(derived.relativeSpeed)} ${options.units.velocity}.`,
                `Tempo para o alvo: t = ${compactNumber(config.targetDistance)} / ${compactNumber(derived.relativeSpeed)} = ${compactNumber(derived.targetTime)} ${options.units.time}.`,
              ],
            },
      ],
      intuition: options.intuition
        ? [
            {
              title: "Frase para guardar",
              body: options.intuition,
            },
          ]
        : undefined,
      pitfalls: [
        {
          title: "Pegadinha clássica",
          body: options.pitfall,
        },
      ],
    };
  }

  return {
    id: options.id,
    title: options.title,
    subtitle: options.subtitle,
    accent: options.accent,
    category: "Movimento relativo",
    summary: options.summary,
    worldWidth: 22,
    worldHeight: 8,
    keyboardHints: ["Compare as posições", "Leia a distância entre os móveis", "Observe o alvo"],
    defaults: options.defaults,
    controls: options.controls,
    createState: () => ({
      time: 0,
      positionFirst: 0,
      positionSecond: 0,
      eventReached: false,
    }),
    step: ({ state, config, dt }) => {
      const scene = getSeparationState(state);
      if (scene.eventReached) {
        return;
      }

      const derived = deriveSeparation(config, options.motionKind);
      const nextTime = scene.time + dt * options.timeScale;

      if (derived.targetTime !== null && nextTime >= derived.targetTime) {
        scene.time = derived.targetTime;
        scene.positionFirst = derived.velocityFirst * scene.time;
        scene.positionSecond = derived.velocitySecond * scene.time;
        scene.eventReached = true;
        return;
      }

      scene.time = nextTime;
      scene.positionFirst = derived.velocityFirst * scene.time;
      scene.positionSecond = derived.velocitySecond * scene.time;
    },
    render: ({ ctx, state, config, viewport, sprites }) => {
      const scene = getSeparationState(state);
      const derived = deriveSeparation(config, options.motionKind);
      const maxDistance = Math.max(
        derived.targetDistance,
        derived.separationAtObservation,
        Math.abs(scene.positionFirst - scene.positionSecond),
        1,
      );

      const minPosition = options.motionKind === "opposite" ? -maxDistance * 0.6 : 0;
      const maxPosition =
        options.motionKind === "opposite"
          ? maxDistance * 0.6
          : Math.max(scene.positionFirst, scene.positionSecond, derived.separationAtObservation) + maxDistance * 0.2;

      const worldFirstX = mapToWorld(scene.positionFirst, minPosition, maxPosition, laneStart, laneEnd);
      const worldSecondX = mapToWorld(scene.positionSecond, minPosition, maxPosition, laneStart, laneEnd);
      const maxSpeed = Math.max(config.speedFirst, config.speedSecond);

      drawBackdrop(ctx, viewport, options.laneKind, "Eixo do exercício");
      drawAxisExtents(ctx, viewport, laneStart, laneEnd, laneY, minPosition, maxPosition, options.units.position);

      const originWorldX = mapToWorld(0, minPosition, maxPosition, laneStart, laneEnd);
      drawLineWorld(ctx, viewport, new Vector2(originWorldX, laneY - 1.0), new Vector2(originWorldX, laneY + 0.8), "rgba(255, 255, 255, 0.16)", 2);
      drawWorldLabel(ctx, viewport, new Vector2(originWorldX - 0.22, laneY - 1.22), "origem");

      if (Math.abs(worldSecondX - worldFirstX) > 0.3) {
        drawDistanceSpan(
          ctx,
          viewport,
          Math.min(worldFirstX, worldSecondX),
          Math.max(worldFirstX, worldSecondX),
          laneY - 1.05,
          `${compactNumber(Math.abs(scene.positionFirst - scene.positionSecond))} ${options.units.position}`,
        );
      }

      drawActor(ctx, viewport, sprites, options.firstActor, new Vector2(worldFirstX, laneY), derived.velocityFirst, maxSpeed);
      drawActor(ctx, viewport, sprites, options.secondActor, new Vector2(worldSecondX, laneY), derived.velocitySecond, maxSpeed);
    },
    buildPanelData: (state, config) => buildPanel(getSeparationState(state), config),
  };
}

function deriveRoundTrip(config: Record<string, number>) {
  const downstreamSpeed = config.boatStillSpeed + config.currentSpeed;
  const upstreamSpeed = config.boatStillSpeed - config.currentSpeed;
  const downstreamTime = config.distance / downstreamSpeed;
  const upstreamTime = config.distance / upstreamSpeed;

  return {
    downstreamSpeed,
    upstreamSpeed,
    downstreamTime,
    upstreamTime,
    slowerLeg: upstreamTime > downstreamTime ? "subindo o rio" : "descendo o rio",
  };
}

const boatCurrentRoundTripScene: SceneDefinition = {
  id: "boat-current-roundtrip",
  title: "Barco e correnteza",
  subtitle: "Ida e volta entre dois portos",
  accent: "#6fe0ff",
  category: "Movimento relativo",
  summary:
    "A mesma distância entre os portos produz tempos diferentes porque a velocidade do barco na margem muda quando a corrente ajuda ou atrapalha.",
  worldWidth: 22,
  worldHeight: 8,
  keyboardHints: ["Compare ida e volta", "Veja qual trecho demora mais", "Observe as duas velocidades na margem"],
  defaults: {
    distance: 24,
    boatStillSpeed: 10,
    currentSpeed: 2,
  },
  controls: [
    {
      key: "distance",
      label: "Distância entre os portos",
      min: 8,
      max: 40,
      step: 1,
      unit: "km",
      description: "Trecho medido ao longo do rio entre A e B.",
    },
    {
      key: "boatStillSpeed",
      label: "Velocidade do barco na água",
      min: 6,
      max: 20,
      step: 0.5,
      unit: "km/h",
      description: "Velocidade relativa à água parada.",
    },
    {
      key: "currentSpeed",
      label: "Correnteza",
      min: 0,
      max: 4,
      step: 0.5,
      unit: "km/h",
      description: "Velocidade da água em relação à margem.",
    },
  ],
  createState: () => ({
    time: 0,
    downstreamProgress: 0,
    upstreamProgress: 0,
  }),
  step: ({ state, config, dt }) => {
    const scene = getRoundTripState(state);
    const derived = deriveRoundTrip(config);
    const maxTime = Math.max(derived.downstreamTime, derived.upstreamTime);
    if (scene.time >= maxTime) {
      scene.time = maxTime;
      scene.downstreamProgress = 1;
      scene.upstreamProgress = 1;
      return;
    }

    scene.time += dt * 0.75;
    scene.downstreamProgress = Math.min(scene.time / derived.downstreamTime, 1);
    scene.upstreamProgress = Math.min(scene.time / derived.upstreamTime, 1);
  },
  render: ({ ctx, state, config, viewport, sprites }) => {
    const scene = getRoundTripState(state);
    const derived = deriveRoundTrip(config);
    const leftPort = 2.8;
    const rightPort = 19.2;
    const topY = 3.3;
    const bottomY = 5.8;

    drawScenicBackdrop(ctx, viewport, {
      groundY: 7.05,
      hillHeight: 0.92,
      treeSpacing: 4.1,
    });
    drawGrid(ctx, viewport, 1);
    drawWaterLane(ctx, viewport, topY, "Trecho descendo o rio");
    drawWaterLane(ctx, viewport, bottomY, "Trecho subindo o rio");

    drawWorldLabel(ctx, viewport, new Vector2(leftPort - 0.2, topY - 1.2), "Porto A");
    drawWorldLabel(ctx, viewport, new Vector2(rightPort - 0.2, topY - 1.2), "Porto B");
    drawWorldLabel(ctx, viewport, new Vector2(leftPort - 0.2, bottomY + 1.0), "Porto A");
    drawWorldLabel(ctx, viewport, new Vector2(rightPort - 0.2, bottomY + 1.0), "Porto B");

    const downstreamX = lerp(leftPort, rightPort, scene.downstreamProgress);
    const upstreamX = lerp(rightPort, leftPort, scene.upstreamProgress);

    drawDistanceSpan(ctx, viewport, leftPort, rightPort, topY - 1.0, `${compactNumber(config.distance)} km`);
    drawDistanceSpan(ctx, viewport, leftPort, rightPort, bottomY - 1.0, `${compactNumber(config.distance)} km`);

    drawSpriteAtWorld(ctx, viewport, sprites.boat, new Vector2(downstreamX, topY), 1.7, 1.1, 0, "#6fe0ff", false);
    drawArrow(ctx, viewport, new Vector2(downstreamX, topY - 0.45), new Vector2(1.55, 0), "#96f4ff", `v = ${compactNumber(derived.downstreamSpeed)}`);

    drawSpriteAtWorld(ctx, viewport, sprites.boat, new Vector2(upstreamX, bottomY), 1.7, 1.1, 0, "#8fd4ff", true);
    drawArrow(ctx, viewport, new Vector2(upstreamX, bottomY - 0.45), new Vector2(-1.25, 0), "#ffd17a", `v = ${compactNumber(derived.upstreamSpeed)}`);
  },
  buildPanelData: (state, config) => {
    const derived = deriveRoundTrip(config);

    return {
      metrics: [
        {
          label: "Velocidade descendo",
          value: formatSceneQuantity(derived.downstreamSpeed, "km/h"),
          helper: "Na margem, corrente e barco têm o mesmo sentido.",
        },
        {
          label: "Tempo descendo",
          value: formatSceneQuantity(derived.downstreamTime, "h"),
          helper: "t = d / v usando a velocidade em relação à margem.",
        },
        {
          label: "Velocidade subindo",
          value: formatSceneQuantity(derived.upstreamSpeed, "km/h"),
          helper: "Na subida, a corrente reduz a velocidade observada na margem.",
        },
        {
          label: "Tempo subindo",
          value: formatSceneQuantity(derived.upstreamTime, "h"),
          helper: "Esse é o trecho mais lento do problema clássico.",
        },
      ],
      formulas: [
        {
          title: "Velocidade na margem",
          formula: "$$v_{margem} = v_{barco/agua} \\pm v_{corrente}$$",
          explanation: "A correnteza soma na descida e subtrai na subida.",
        },
        {
          title: "Tempo de viagem",
          formula: "$$t = \\frac{d}{v}$$",
          explanation: "Depois de achar a velocidade na margem, o problema volta a ser um MRU simples.",
        },
        {
          title: "Modo longo",
          formula: "$$s = s_0 + vt$$",
          explanation: "Também é possível escrever uma equação para a ida e outra para a volta, medindo posição na margem.",
        },
      ],
      concept: [
        {
          title: "Leitura mental",
          body: "A grande pegadinha é separar a velocidade do barco em relação à água da velocidade do barco em relação à margem.",
        },
      ],
      studyNotes: [
        {
          title: "Como decidir rápido",
          body: "Descendo o rio, some. Subindo o rio, subtraia. Só depois calcule o tempo com t = d / v.",
        },
      ],
      loopSteps: [
        {
          title: "1. Montar as duas velocidades",
          body: "A cena calcula simultaneamente a velocidade da ida e a da volta em relação à margem.",
        },
        {
          title: "2. Animar os dois trechos",
          body: "Os dois barcos percorrem a mesma distância, mas em durações diferentes.",
        },
        {
          title: "3. Fixar o contraste",
          body: "O barco da descida chega antes e espera o da subida, destacando a diferença de tempo.",
        },
      ],
      exercises: [
        {
          title: "Quanto tempo em cada trecho?",
          prompt: `A distância entre A e B é ${compactNumber(config.distance)} km, o barco faz ${compactNumber(config.boatStillSpeed)} km/h na água parada e a correnteza vale ${compactNumber(config.currentSpeed)} km/h.`,
          answer: `Descendo o rio: ${compactNumber(derived.downstreamTime)} h. Subindo o rio: ${compactNumber(derived.upstreamTime)} h. O trecho mais demorado é ${derived.slowerLeg}.`,
          steps: [
            `Modo curto: v_desc = ${compactNumber(config.boatStillSpeed)} + ${compactNumber(config.currentSpeed)} = ${compactNumber(derived.downstreamSpeed)} km/h.`,
            `Modo curto: v_sub = ${compactNumber(config.boatStillSpeed)} - ${compactNumber(config.currentSpeed)} = ${compactNumber(derived.upstreamSpeed)} km/h.`,
            `Tempo descendo: t = ${compactNumber(config.distance)} / ${compactNumber(derived.downstreamSpeed)} = ${compactNumber(derived.downstreamTime)} h.`,
            `Tempo subindo: t = ${compactNumber(config.distance)} / ${compactNumber(derived.upstreamSpeed)} = ${compactNumber(derived.upstreamTime)} h.`,
            `Modo longo: escreva s = 0 + ${compactNumber(derived.downstreamSpeed)}t para a ida e s = ${compactNumber(config.distance)} - ${compactNumber(derived.upstreamSpeed)}t para a volta.`,
          ],
        },
      ],
      intuition: [
        {
          title: "Frase para guardar",
          body: "No rio, quase sempre existem duas velocidades: a do barco na água e a do barco na margem.",
        },
      ],
      pitfalls: [
        {
          title: "Pegadinha clássica",
          body: "Usar a velocidade do barco na água diretamente em t = d / v. A pergunta quase sempre quer a velocidade em relação à margem.",
        },
      ],
    };
  },
};

function deriveRiverCrossingClassic(config: Record<string, number>) {
  const crossingTime = config.riverWidth / config.boatSpeed;
  const drift = config.currentSpeed * crossingTime;
  const resultant = Math.hypot(config.boatSpeed, config.currentSpeed);

  return {
    crossingTime,
    drift,
    resultant,
  };
}

const riverCrossingClassicScene: SceneDefinition = {
  id: "river-crossing-classic",
  title: "Travessia de rio",
  subtitle: "Barco para o norte, corrente para leste",
  accent: "#78efd0",
  category: "Movimento relativo",
  summary:
    "A largura depende só da componente transversal da velocidade; a corrente cria deriva lateral, não acelera a travessia.",
  worldWidth: 22,
  worldHeight: 10,
  keyboardHints: ["Olhe as componentes", "A travessia usa só a velocidade transversal", "A corrente vira deriva"],
  defaults: {
    riverWidth: 80,
    boatSpeed: 4,
    currentSpeed: 3,
  },
  controls: [
    {
      key: "riverWidth",
      label: "Largura do rio",
      min: 40,
      max: 120,
      step: 5,
      unit: "m",
      description: "Distância entre as duas margens.",
    },
    {
      key: "boatSpeed",
      label: "Velocidade para atravessar",
      min: 2,
      max: 6,
      step: 0.2,
      unit: "m/s",
      description: "Componente perpendicular à margem.",
    },
    {
      key: "currentSpeed",
      label: "Corrente para leste",
      min: 0,
      max: 5,
      step: 0.2,
      unit: "m/s",
      description: "Empurra o barco ao longo do rio.",
    },
  ],
  createState: () => ({
    time: 0,
    position: new Vector2(0, 0),
    trail: [new Vector2(0, 0)],
    arrived: false,
  }),
  step: ({ state, config, dt }) => {
    const scene = getRiverCrossingClassicState(state);
    if (scene.arrived) {
      return;
    }

    const nextTime = scene.time + dt;
    const nextPosition = new Vector2(config.currentSpeed * nextTime, config.boatSpeed * nextTime);

    if (nextPosition.y >= config.riverWidth) {
      const derived = deriveRiverCrossingClassic(config);
      scene.time = derived.crossingTime;
      scene.position = new Vector2(derived.drift, config.riverWidth);
      scene.trail.push(scene.position);
      scene.arrived = true;
      return;
    }

    scene.time = nextTime;
    scene.position = nextPosition;
    scene.trail.push(nextPosition);
    if (scene.trail.length > 180) {
      scene.trail.shift();
    }
  },
  render: ({ ctx, state, config, viewport, sprites }) => {
    const scene = getRiverCrossingClassicState(state);
    const derived = deriveRiverCrossingClassic(config);
    const waterLeft = 5;
    const waterRight = 17.5;
    const waterTop = 1.5;
    const waterBottom = 8.7;
    const xMax = Math.max(derived.drift, scene.position.x, 10) + 10;
    const mapPoint = (point: Vector2) =>
      new Vector2(
        mapToWorld(point.x, 0, xMax, waterLeft + 0.8, waterRight - 0.8),
        mapToWorld(point.y, 0, config.riverWidth, waterBottom - 0.4, waterTop + 0.4),
      );

    drawScenicBackdrop(ctx, viewport, {
      groundY: waterBottom + 0.4,
      treeSpacing: 4.5,
      hillHeight: 0.85,
      treeBaseY: waterTop - 0.05,
    });
    drawGrid(ctx, viewport, 1);

    const topLeft = worldToScreen(viewport, new Vector2(waterLeft, waterTop));
    const bottomRight = worldToScreen(viewport, new Vector2(waterRight, waterBottom));
    const waterGradient = ctx.createLinearGradient(topLeft.x, topLeft.y, bottomRight.x, bottomRight.y);
    waterGradient.addColorStop(0, "rgba(77, 183, 255, 0.46)");
    waterGradient.addColorStop(0.6, "rgba(17, 109, 214, 0.35)");
    waterGradient.addColorStop(1, "rgba(12, 75, 173, 0.52)");
    ctx.save();
    ctx.fillStyle = waterGradient;
    ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
    ctx.restore();

    drawLineWorld(ctx, viewport, new Vector2(waterLeft, waterTop), new Vector2(waterRight, waterTop), "#d6f3ff", 3);
    drawLineWorld(ctx, viewport, new Vector2(waterLeft, waterBottom), new Vector2(waterRight, waterBottom), "#d6f3ff", 3);
    drawWorldLabel(ctx, viewport, new Vector2(waterLeft - 0.35, waterBottom + 0.3), "Margem de partida");
    drawWorldLabel(ctx, viewport, new Vector2(waterLeft - 0.35, waterTop - 0.2), "Margem oposta");

    scene.trail.forEach((point, index) => {
      if (index === 0) {
        return;
      }

      const previous = mapPoint(scene.trail[index - 1]);
      const current = mapPoint(point);
      drawLineWorld(ctx, viewport, previous, current, "rgba(255, 247, 189, 0.62)", 2);
    });

    const boatWorld = mapPoint(scene.position);
    drawSpriteAtWorld(ctx, viewport, sprites.boat, boatWorld, 1.4, 0.9, 0, "#78efd0");
    drawArrow(ctx, viewport, boatWorld.add(new Vector2(-0.15, 0.45)), new Vector2(0, -1.55), "#9df2ff", "v_barco");
    drawArrow(ctx, viewport, boatWorld.add(new Vector2(-0.15, 0.45)), new Vector2(1.35, 0), "#ffd580", "v_corr");
    drawArrow(ctx, viewport, boatWorld.add(new Vector2(-0.15, 0.45)), new Vector2(1.35, -1.55), "#ffffff", "v_solo");

    const finalWorld = mapPoint(new Vector2(derived.drift, config.riverWidth));
    drawLineWorld(ctx, viewport, new Vector2(finalWorld.x, waterTop + 0.2), new Vector2(finalWorld.x, waterBottom - 0.2), "rgba(255, 216, 127, 0.34)", 2);
    drawWorldLabel(ctx, viewport, new Vector2(finalWorld.x - 0.3, waterTop - 0.45), "ponto de chegada");
    drawWorldLabel(ctx, viewport, new Vector2(waterRight - 2.1, waterBottom + 0.6), `${compactNumber(derived.drift)} m de deriva`);
  },
  buildPanelData: (state, config) => {
    const derived = deriveRiverCrossingClassic(config);

    return {
      metrics: [
        {
          label: "Tempo de travessia",
          value: formatSceneQuantity(derived.crossingTime, "s"),
          helper: "Depende apenas da componente perpendicular à margem.",
        },
        {
          label: "Deriva para leste",
          value: formatSceneQuantity(derived.drift, "m"),
          helper: "A corrente desloca o barco ao longo do rio durante o tempo de travessia.",
        },
        {
          label: "Velocidade resultante",
          value: formatSceneQuantity(derived.resultant, "m/s"),
          helper: "Soma vetorial de barco na água com correnteza.",
        },
        {
          label: "Componente transversal",
          value: formatSceneQuantity(config.boatSpeed, "m/s"),
          helper: "É ela que decide quando o barco chega à outra margem.",
        },
      ],
      formulas: [
        {
          title: "Tempo para cruzar",
          formula: "$$t = \\frac{L}{v_{\\perp}}$$",
          explanation: "A velocidade que cruza o rio é só a componente perpendicular à margem.",
        },
        {
          title: "Deriva",
          formula: "$$\\Delta x = v_{corrente} t$$",
          explanation: "Enquanto o barco atravessa, a água continua empurrando para leste.",
        },
        {
          title: "Resultante",
          formula: "$$v = \\sqrt{v_{\\perp}^2 + v_{corrente}^2}$$",
          explanation: "A velocidade observada na margem é a hipotenusa do triângulo formado pelas componentes.",
        },
      ],
      concept: [
        {
          title: "Leitura mental",
          body: "Aqui não é soma ou subtração em 1D. É composição vetorial: uma componente para atravessar, outra para derivar.",
        },
      ],
      studyNotes: [
        {
          title: "Como não errar",
          body: "Para achar o tempo, ignore a hipotenusa e use só a componente que cruza o rio. Depois use esse tempo para calcular a deriva.",
        },
      ],
      loopSteps: [
        {
          title: "1. Construir os vetores",
          body: "A cena monta v_barco, v_corrente e v_solo em um mesmo ponto.",
        },
        {
          title: "2. Atualizar a posição na margem",
          body: "A posição cresce em x pela corrente e em y pela travessia.",
        },
        {
          title: "3. Fixar o desembarque",
          body: "Quando y atinge a largura do rio, a animação congela a chegada com a deriva final.",
        },
      ],
      exercises: [
        {
          title: "Quanto tempo cruza e quanto deriva?",
          prompt: `O rio corre a ${compactNumber(config.currentSpeed)} m/s para leste, o barco aponta para o norte com ${compactNumber(config.boatSpeed)} m/s e a largura vale ${compactNumber(config.riverWidth)} m.`,
          answer: `A travessia leva ${compactNumber(derived.crossingTime)} s, a deriva final é ${compactNumber(derived.drift)} m e a velocidade resultante na margem é ${compactNumber(derived.resultant)} m/s.`,
          steps: [
            `Tempo de travessia: t = ${compactNumber(config.riverWidth)} / ${compactNumber(config.boatSpeed)} = ${compactNumber(derived.crossingTime)} s.`,
            `Deriva: d = ${compactNumber(config.currentSpeed)} * ${compactNumber(derived.crossingTime)} = ${compactNumber(derived.drift)} m.`,
            `Resultante: v = sqrt(${compactNumber(config.boatSpeed)}^2 + ${compactNumber(config.currentSpeed)}^2) = ${compactNumber(derived.resultant)} m/s.`,
            "Pegadinha: usar a velocidade resultante para calcular o tempo. Quem cruza o rio é só a componente perpendicular à margem.",
          ],
        },
      ],
      intuition: [
        {
          title: "Frase para guardar",
          body: "A corrente não ajuda a atravessar; ela só ajuda a derivar.",
        },
      ],
      pitfalls: [
        {
          title: "Pegadinha clássica",
          body: "Usar a hipotenusa para o tempo de travessia. Isso mistura a componente útil de travessia com a componente lateral.",
        },
      ],
    };
  },
};

function deriveAirplaneWind(config: Record<string, number>) {
  const eastGroundSpeed = config.airSpeed + config.windSpeed;
  const westGroundSpeed = config.airSpeed - config.windSpeed;
  const eastTime = config.routeDistance / eastGroundSpeed;
  const westTime = config.routeDistance / westGroundSpeed;

  return {
    eastGroundSpeed,
    westGroundSpeed,
    eastTime,
    westTime,
  };
}

const airplaneWindScene: SceneDefinition = {
  id: "airplane-wind",
  title: "Avião e vento",
  subtitle: "Velocidade no ar versus velocidade no solo",
  accent: "#ffd781",
  category: "Movimento relativo",
  summary:
    "Dois casos em paralelo mostram como vento a favor e vento contra alteram a velocidade observada no solo mesmo com a mesma velocidade no ar.",
  worldWidth: 22,
  worldHeight: 8,
  keyboardHints: ["Compare leste e oeste", "Mesmo avião, dois resultados", "Ar não é solo"],
  defaults: {
    airSpeed: 200,
    windSpeed: 50,
    routeDistance: 250,
  },
  controls: [
    {
      key: "airSpeed",
      label: "Velocidade do avião no ar",
      min: 120,
      max: 320,
      step: 10,
      unit: "km/h",
      description: "Velocidade do avião em relação ao ar.",
    },
    {
      key: "windSpeed",
      label: "Velocidade do vento para leste",
      min: 0,
      max: 100,
      step: 5,
      unit: "km/h",
      description: "Empurra o avião para leste no referencial do solo.",
    },
    {
      key: "routeDistance",
      label: "Trecho de comparação",
      min: 100,
      max: 400,
      step: 25,
      unit: "km",
      description: "Usado apenas para comparar o tempo de cada caso.",
    },
  ],
  createState: () => ({
    time: 0,
    eastProgress: 0,
    westProgress: 0,
  }),
  step: ({ state, config, dt }) => {
    const scene = getAirplaneWindState(state);
    const derived = deriveAirplaneWind(config);
    const maxTime = Math.max(derived.eastTime, derived.westTime);
    if (scene.time >= maxTime) {
      scene.time = maxTime;
      scene.eastProgress = 1;
      scene.westProgress = 1;
      return;
    }

    scene.time += dt * 0.7;
    scene.eastProgress = Math.min(scene.time / derived.eastTime, 1);
    scene.westProgress = Math.min(scene.time / derived.westTime, 1);
  },
  render: ({ ctx, state, config, viewport, sprites }) => {
    const scene = getAirplaneWindState(state);
    const derived = deriveAirplaneWind(config);
    const centerX = 11;
    const eastEndX = 19.2;
    const westEndX = 2.8;
    const eastY = 3.2;
    const westY = 5.8;

    drawScenicBackdrop(ctx, viewport, {
      groundY: 7.2,
      hillHeight: 0.76,
      treeSpacing: 4.6,
      treeBaseY: 7.05,
    });
    drawGrid(ctx, viewport, 1);
    drawSkyLane(ctx, viewport, eastY, "Caso 1: aponta para leste");
    drawSkyLane(ctx, viewport, westY, "Caso 2: aponta para oeste");

    for (let x = 4; x <= 18; x += 3) {
      drawArrow(ctx, viewport, new Vector2(x, eastY - 0.55), new Vector2(1.15, 0), "rgba(255, 217, 154, 0.55)", "vento");
      drawArrow(ctx, viewport, new Vector2(x, westY - 0.55), new Vector2(1.15, 0), "rgba(255, 217, 154, 0.55)");
    }

    drawWorldLabel(ctx, viewport, new Vector2(centerX - 0.28, eastY + 0.75), "origem");
    drawWorldLabel(ctx, viewport, new Vector2(centerX - 0.28, westY + 0.75), "origem");

    const eastX = lerp(centerX, eastEndX, scene.eastProgress);
    const westX = lerp(centerX, westEndX, scene.westProgress);
    drawSpriteAtWorld(ctx, viewport, sprites.plane, new Vector2(eastX, eastY), 1.5, 1.15, 0, "#ffd781");
    drawArrow(ctx, viewport, new Vector2(eastX, eastY - 0.42), new Vector2(1.75, 0), "#fff1cc", `v_solo = ${compactNumber(derived.eastGroundSpeed)}`);
    drawSpriteAtWorld(ctx, viewport, sprites.plane, new Vector2(westX, westY), 1.5, 1.15, 0, "#91dcff", true);
    drawArrow(ctx, viewport, new Vector2(westX, westY - 0.42), new Vector2(-1.25, 0), "#d8f6ff", `v_solo = ${compactNumber(derived.westGroundSpeed)}`);
  },
  buildPanelData: (state, config) => {
    const derived = deriveAirplaneWind(config);

    return {
      metrics: [
        {
          label: "Velocidade no ar",
          value: formatSceneQuantity(config.airSpeed, "km/h"),
          helper: "É a velocidade em relação à massa de ar.",
        },
        {
          label: "Vento para leste",
          value: formatSceneQuantity(config.windSpeed, "km/h"),
          helper: "O vento soma num caso e subtrai no outro.",
        },
        {
          label: "Solo indo para leste",
          value: formatSceneQuantity(derived.eastGroundSpeed, "km/h"),
          helper: "Caso com vento a favor.",
        },
        {
          label: "Solo indo para oeste",
          value: formatSceneQuantity(derived.westGroundSpeed, "km/h"),
          helper: "Caso com vento contra.",
        },
      ],
      formulas: [
        {
          title: "Vento a favor",
          formula: "$$v_{solo} = v_{ar} + v_{vento}$$",
          explanation: "Quando o avião aponta no mesmo sentido do vento, as velocidades se somam.",
        },
        {
          title: "Vento contra",
          formula: "$$v_{solo} = v_{ar} - v_{vento}$$",
          explanation: "Quando o avião aponta contra o vento, o solo enxerga uma velocidade menor.",
        },
        {
          title: "Tempo para um trecho fixo",
          formula: "$$t = \\frac{d}{v_{solo}}$$",
          explanation: "Um mesmo percurso no solo demora mais quando a velocidade observada no solo cai.",
        },
      ],
      concept: [
        {
          title: "Leitura mental",
          body: "A velocidade do avião no ar não é automaticamente a velocidade no solo. O vento muda o resultado observado no chão.",
        },
      ],
      studyNotes: [
        {
          title: "Como decidir rápido",
          body: "Mesmo sentido do vento: soma. Sentido oposto ao vento: subtrai. Sempre cheque em relação a quem a velocidade foi fornecida.",
        },
      ],
      loopSteps: [
        {
          title: "1. Montar os dois casos",
          body: "A cena calcula ao mesmo tempo o caso do voo para leste e o caso do voo para oeste.",
        },
        {
          title: "2. Animar no solo",
          body: "Os aviões se movem usando a velocidade em relação ao solo, não a velocidade no ar.",
        },
        {
          title: "3. Comparar tempos",
          body: "O caso com maior velocidade no solo termina primeiro para o mesmo trecho escolhido.",
        },
      ],
      exercises: [
        {
          title: "Qual a velocidade no solo em cada caso?",
          prompt: `O avião voa a ${compactNumber(config.airSpeed)} km/h em relação ao ar e o vento sopra a ${compactNumber(config.windSpeed)} km/h para leste.`,
          answer: `Apontando para leste, a velocidade no solo é ${compactNumber(derived.eastGroundSpeed)} km/h. Apontando para oeste, a velocidade no solo é ${compactNumber(derived.westGroundSpeed)} km/h.`,
          steps: [
            `Caso 1: v_solo = ${compactNumber(config.airSpeed)} + ${compactNumber(config.windSpeed)} = ${compactNumber(derived.eastGroundSpeed)} km/h.`,
            `Caso 2: v_solo = ${compactNumber(config.airSpeed)} - ${compactNumber(config.windSpeed)} = ${compactNumber(derived.westGroundSpeed)} km/h.`,
            `Se quiser comparar um trecho de ${compactNumber(config.routeDistance)} km, os tempos ficam ${compactNumber(derived.eastTime)} h para leste e ${compactNumber(derived.westTime)} h para oeste.`,
          ],
        },
      ],
      intuition: [
        {
          title: "Frase para guardar",
          body: "Velocidade do avião quase sempre precisa do complemento: em relação ao ar ou em relação ao solo?",
        },
      ],
      pitfalls: [
        {
          title: "Pegadinha clássica",
          body: "Tomar a velocidade no ar como se fosse a velocidade observada no solo.",
        },
      ],
    };
  },
};

function deriveTrainPassenger(config: Record<string, number>) {
  return {
    forwardGroundSpeed: config.trainSpeed + config.passengerSpeed,
    backwardGroundSpeed: config.trainSpeed - config.passengerSpeed,
  };
}

const trainPassengerScene: SceneDefinition = {
  id: "train-passenger",
  title: "Trem e passageiro",
  subtitle: "Velocidade depende do referencial",
  accent: "#b0f3ff",
  category: "Movimento relativo",
  summary:
    "O passageiro anda dentro do trem, mas o observador na estação enxerga a soma ou a diferença entre as duas velocidades.",
  worldWidth: 22,
  worldHeight: 8,
  keyboardHints: ["Veja o trem como referencial intermediário", "Frente soma", "Trás subtrai"],
  defaults: {
    trainSpeed: 80,
    passengerSpeed: 5,
  },
  controls: [
    {
      key: "trainSpeed",
      label: "Velocidade do trem",
      min: 30,
      max: 140,
      step: 5,
      unit: "km/h",
      description: "Velocidade do trem em relação ao solo.",
    },
    {
      key: "passengerSpeed",
      label: "Velocidade do passageiro no trem",
      min: 1,
      max: 10,
      step: 0.5,
      unit: "km/h",
      description: "Velocidade do passageiro em relação ao vagão.",
    },
  ],
  createState: () => ({
    phase: 0,
    time: 0,
  }),
  step: ({ state, config, dt }) => {
    const scene = getTrainPassengerState(state);
    scene.time += dt;
    scene.phase = (scene.phase + dt * (0.08 + config.trainSpeed * 0.00025)) % 1;
  },
  render: ({ ctx, state, config, viewport, sprites }) => {
    const scene = getTrainPassengerState(state);
    const derived = deriveTrainPassenger(config);
    const trainX = lerp(3.2, 18.6, scene.phase);
    const trainY = 5.2;

    drawScenicBackdrop(ctx, viewport, {
      groundY: 6.8,
      hillHeight: 1.0,
      treeSpacing: 4.1,
    });
    drawGrid(ctx, viewport, 1);
    drawGround(ctx, viewport, 6.8, "Via férrea");
    drawLineWorld(ctx, viewport, new Vector2(2, 5.85), new Vector2(20, 5.85), "#d6ebff", 2.5);
    drawLineWorld(ctx, viewport, new Vector2(2, 6.15), new Vector2(20, 6.15), "#d6ebff", 2.5);
    drawTrackTicks(ctx, viewport, 2, 20, 5.25);

    drawSpriteAtWorld(ctx, viewport, sprites.train, new Vector2(trainX, trainY), 3.1, 1.45, 0, "#9fe4ff");
    drawArrow(ctx, viewport, new Vector2(trainX, trainY - 0.72), new Vector2(2.0, 0), "#9fe4ff", `trem = ${compactNumber(config.trainSpeed)}`);

    const frontPassenger = new Vector2(trainX + 0.6, trainY - 0.08);
    const backPassenger = new Vector2(trainX - 0.45, trainY + 0.14);
    drawCircleBody(ctx, viewport, frontPassenger, 0.12, "#8ff6ab");
    drawCircleBody(ctx, viewport, backPassenger, 0.12, "#ffbf7c");
    drawWorldLabel(ctx, viewport, frontPassenger.add(new Vector2(0.14, -0.2)), "+5 no trem");
    drawWorldLabel(ctx, viewport, backPassenger.add(new Vector2(0.14, -0.2)), "-5 no trem");

    drawArrow(ctx, viewport, new Vector2(4.4, 2.35), new Vector2(3.2, 0), "#8ff6ab", `solo = ${compactNumber(derived.forwardGroundSpeed)}`);
    drawArrow(ctx, viewport, new Vector2(4.4, 3.05), new Vector2(2.8, 0), "#ffbf7c", `solo = ${compactNumber(derived.backwardGroundSpeed)}`);
    drawWorldLabel(ctx, viewport, new Vector2(4.2, 1.7), "Referencial da estacao");
  },
  buildPanelData: (state, config) => {
    const derived = deriveTrainPassenger(config);

    return {
      metrics: [
        {
          label: "Velocidade do trem",
          value: formatSceneQuantity(config.trainSpeed, "km/h"),
          helper: "Referencial do solo.",
        },
        {
          label: "Passageiro no vagão",
          value: formatSceneQuantity(config.passengerSpeed, "km/h"),
          helper: "Referencial interno do trem.",
        },
        {
          label: "Passageiro para a frente",
          value: formatSceneQuantity(derived.forwardGroundSpeed, "km/h"),
          helper: "Solo enxerga soma das velocidades.",
        },
        {
          label: "Passageiro para trás",
          value: formatSceneQuantity(derived.backwardGroundSpeed, "km/h"),
          helper: "Solo enxerga subtração.",
        },
      ],
      formulas: [
        {
          title: "Passageiro para a frente",
          formula: "$$v_{solo} = v_{trem} + v_{pass/trem}$$",
          explanation: "Movimentos no mesmo sentido fazem o observador externo somar as velocidades.",
        },
        {
          title: "Passageiro para trás",
          formula: "$$v_{solo} = v_{trem} - v_{pass/trem}$$",
          explanation: "Quando o passageiro anda para trás, ele continua indo para a frente no solo, mas mais devagar.",
        },
        {
          title: "Referencial",
          formula: "$$\\vec{v}_{A/C} = \\vec{v}_{A/B} + \\vec{v}_{B/C}$$",
          explanation: "Essa é a regra geral de composição de velocidades entre referenciais.",
        },
      ],
      concept: [
        {
          title: "Leitura mental",
          body: "Aqui a resposta muda só porque o referencial muda. No trem o passageiro anda a 5 km/h; na estação ele herda o movimento do trem inteiro.",
        },
      ],
      studyNotes: [
        {
          title: "Como resolver rápido",
          body: "Se o passageiro anda para a frente do trem, some. Se anda para trás, subtraia. A pergunta quer velocidade em relação ao solo.",
        },
      ],
      loopSteps: [
        {
          title: "1. Mover o trem",
          body: "A animação mantém o vagão deslizando para reforçar o referencial do solo.",
        },
        {
          title: "2. Marcar os dois casos",
          body: "Dois passageiros virtuais representam andar para a frente e andar para trás dentro do trem.",
        },
        {
          title: "3. Projetar no solo",
          body: "As setas superiores mostram o que um observador parado na estação realmente mede.",
        },
      ],
      exercises: [
        {
          title: "Qual a velocidade do passageiro em relação ao solo?",
          prompt: `O trem move-se a ${compactNumber(config.trainSpeed)} km/h em relação ao solo e o passageiro anda a ${compactNumber(config.passengerSpeed)} km/h dentro do trem.`,
          answer: `Andando para a frente: ${compactNumber(derived.forwardGroundSpeed)} km/h. Andando para trás: ${compactNumber(derived.backwardGroundSpeed)} km/h.`,
          steps: [
            `Para a frente: ${compactNumber(config.trainSpeed)} + ${compactNumber(config.passengerSpeed)} = ${compactNumber(derived.forwardGroundSpeed)} km/h.`,
            `Para trás: ${compactNumber(config.trainSpeed)} - ${compactNumber(config.passengerSpeed)} = ${compactNumber(derived.backwardGroundSpeed)} km/h.`,
            "A pegadinha é sempre a mesma: velocidade depende do referencial adotado.",
          ],
        },
      ],
      intuition: [
        {
          title: "Frase para guardar",
          body: "O passageiro nunca esquece o movimento do trem quando é visto da estação.",
        },
      ],
      pitfalls: [
        {
          title: "Pegadinha clássica",
          body: "Responder 5 km/h para os dois casos. Isso vale apenas no referencial do vagão.",
        },
      ],
    };
  },
  resetOnConfigChange: false,
};

const headOnScene = buildEncounterScene({
  id: "relative-head-on",
  title: "Encontro frontal",
  subtitle: "Dois trens, choque e soma de velocidades",
  accent: "#ffde89",
  summary:
    "O padrão clássico de encontro frontal: as posições se igualam e a distância inicial fecha pela soma das velocidades.",
  laneKind: "track",
  timeScale: 1.1,
  units: {
    position: "m",
    velocity: "m/s",
    time: "s",
  },
  firstActor: {
    label: "trem A",
    arrowLabel: "v_A",
    color: "#7fe7ff",
    sprite: "train",
    width: 2.4,
    height: 1.25,
  },
  secondActor: {
    label: "trem B",
    arrowLabel: "v_B",
    color: "#ffb86f",
    sprite: "train",
    width: 2.4,
    height: 1.25,
    flipWithVelocity: true,
  },
  defaults: {
    initialGap: 600,
    speedFirst: 20,
    speedSecond: 10,
  },
  controls: [
    {
      key: "initialGap",
      label: "Distância inicial",
      min: 200,
      max: 900,
      step: 20,
      unit: "m",
      description: "Distância entre os dois trens no instante t = 0.",
    },
    {
      key: "speedFirst",
      label: "Velocidade do trem A",
      min: 5,
      max: 40,
      step: 1,
      unit: "m/s",
      description: "Trem que parte da esquerda e avança para a direita.",
    },
    {
      key: "speedSecond",
      label: "Velocidade do trem B",
      min: 5,
      max: 30,
      step: 1,
      unit: "m/s",
      description: "Trem que parte da direita e avança para a esquerda.",
    },
  ],
  secondDirection: "left",
  eventName: "choque",
  eventPositionName: "Posição do choque",
  mentalCue:
    "Encontro frontal: as posições vão se igualar em algum instante e, no modo curto, a distância fecha pela soma das velocidades.",
  studyNote:
    "No modo longo, escreva s_A = s_0A + v_A t e s_B = s_0B + v_B t. No modo curto, use v_rel = v_A + v_B porque os móveis vêm um contra o outro.",
  pitfall:
    "Subtrair as velocidades como se fosse perseguição. Em encontro frontal, a distância é “comida” pelos dois móveis.",
  intuition: "Encontro frontal: a distância fecha pelos dois.",
  loopLabel: "Quando a separação chega a zero, a cena fixa a colisão prevista.",
  exerciseTitle: "Quando e onde ocorre o choque?",
});

const pursuitScene = buildEncounterScene({
  id: "relative-pursuit",
  title: "Perseguicao",
  subtitle: "Carro alcanca caminhao no mesmo sentido",
  accent: "#9ad9ff",
  summary:
    "O caso clássico de alcance: os dois móveis andam para a direita e o carro só fecha a distância pela diferença entre as velocidades.",
  laneKind: "road",
  timeScale: 1.2,
  units: {
    position: "m",
    velocity: "m/s",
    time: "s",
  },
  firstActor: {
    label: "carro A",
    arrowLabel: "v_A",
    color: "#84d8ff",
    sprite: "car",
    width: 2.1,
    height: 1.1,
  },
  secondActor: {
    label: "caminhao C",
    arrowLabel: "v_C",
    color: "#ffc98d",
    sprite: "car",
    width: 2.35,
    height: 1.18,
  },
  defaults: {
    initialGap: 100,
    speedFirst: 25,
    speedSecond: 15,
  },
  controls: [
    {
      key: "initialGap",
      label: "Vantagem inicial do caminhao",
      min: 40,
      max: 220,
      step: 10,
      unit: "m",
      description: "Quanto o caminhao ja esta a frente em t = 0.",
    },
    {
      key: "speedFirst",
      label: "Velocidade do carro",
      min: 10,
      max: 40,
      step: 1,
      unit: "m/s",
      description: "Carro que vem atras tentando alcancar.",
    },
    {
      key: "speedSecond",
      label: "Velocidade do caminhao",
      min: 5,
      max: 30,
      step: 1,
      unit: "m/s",
      description: "Movel que ja saiu na frente.",
    },
  ],
  secondDirection: "right",
  eventName: "alcance",
  eventPositionName: "Ponto do alcance",
  mentalCue:
    "Perseguicao no mesmo sentido: a distancia fecha so pela vantagem do carro sobre o caminhao.",
  studyNote:
    "O modo longo iguala as duas posicoes. O modo curto usa v_rel = v_carro - v_caminhao porque ambos seguem para a mesma direita.",
  pitfall:
    "Somar as velocidades so porque existem dois moveis. Quando os dois andam no mesmo sentido, quem conta e a diferenca.",
  intuition: "Perseguicao: a distancia fecha so pela vantagem.",
  loopLabel: "Quando as posicoes coincidem, a cena marca o ponto do alcance.",
  exerciseTitle: "Quando o carro alcanca o caminhao?",
});

const oppositeSeparationScene = buildSeparationScene({
  id: "relative-opposite-separation",
  title: "Afastamento oposto",
  subtitle: "Dois ciclistas saem do mesmo ponto",
  accent: "#90f0c8",
  summary:
    "Saindo da mesma origem e em sentidos opostos, a separacao cresce pela soma das velocidades.",
  laneKind: "road",
  timeScale: 1.2,
  units: {
    position: "m",
    velocity: "m/s",
    time: "s",
  },
  firstActor: {
    label: "ciclista A",
    arrowLabel: "v_A",
    color: "#8ff0c3",
    radius: 0.24,
  },
  secondActor: {
    label: "ciclista B",
    arrowLabel: "v_B",
    color: "#ffd88a",
    radius: 0.24,
  },
  defaults: {
    speedFirst: 12,
    speedSecond: 8,
    observationTime: 15,
    targetDistance: 300,
  },
  controls: [
    {
      key: "speedFirst",
      label: "Velocidade de A",
      min: 4,
      max: 20,
      step: 1,
      unit: "m/s",
      description: "A segue para a direita.",
    },
    {
      key: "speedSecond",
      label: "Velocidade de B",
      min: 2,
      max: 16,
      step: 1,
      unit: "m/s",
      description: "B segue para a esquerda.",
    },
    {
      key: "observationTime",
      label: "Tempo de observacao",
      min: 5,
      max: 30,
      step: 1,
      unit: "s",
      description: "Instante para responder “qual a distancia apos t”.",
    },
    {
      key: "targetDistance",
      label: "Distancia alvo",
      min: 100,
      max: 500,
      step: 20,
      unit: "m",
      description: "Separacao pedida na segunda parte do exercicio.",
    },
  ],
  motionKind: "opposite",
  targetLabel: "Separacao alvo",
  mentalCue:
    "Partem juntos e se afastam em sentidos opostos: a separacao cresce pela soma das velocidades.",
  studyNote:
    "No modo longo, escreva s_A = 12t e s_B = -8t. No modo curto, use v_rel = 12 + 8 porque um vai para cada lado.",
  pitfall:
    "Subtrair so porque existem duas velocidades. Em sentidos opostos, a distancia cresce pelos dois ao mesmo tempo.",
  intuition: "Sentidos opostos: a distancia cresce pelos dois.",
  loopLabel: "A cena para no instante em que a separacao atinge o alvo escolhido.",
  exerciseTitle: "Qual a separacao e quando chega ao alvo?",
});

const sameDirectionSeparationScene = buildSeparationScene({
  id: "relative-same-direction-separation",
  title: "Afastamento no mesmo sentido",
  subtitle: "Dois carros saem do mesmo posto",
  accent: "#c8ddff",
  summary:
    "Quando os dois saem juntos para a mesma direcao, a separacao cresce so pela diferenca entre as velocidades.",
  laneKind: "road",
  timeScale: 4.8,
  units: {
    position: "m",
    velocity: "m/s",
    time: "s",
  },
  firstActor: {
    label: "carro A",
    arrowLabel: "v_A",
    color: "#b7ebff",
    sprite: "car",
    width: 2.1,
    height: 1.1,
  },
  secondActor: {
    label: "carro B",
    arrowLabel: "v_B",
    color: "#ffd59b",
    sprite: "car",
    width: 2.1,
    height: 1.1,
  },
  defaults: {
    speedFirst: 30,
    speedSecond: 20,
    observationTime: 12,
    targetDistance: 500,
  },
  controls: [
    {
      key: "speedFirst",
      label: "Velocidade de A",
      min: 10,
      max: 40,
      step: 1,
      unit: "m/s",
      description: "Carro mais rapido.",
    },
    {
      key: "speedSecond",
      label: "Velocidade de B",
      min: 5,
      max: 35,
      step: 1,
      unit: "m/s",
      description: "Carro mais lento, na mesma direcao.",
    },
    {
      key: "observationTime",
      label: "Tempo de observacao",
      min: 4,
      max: 20,
      step: 1,
      unit: "s",
      description: "Instante para responder a primeira pergunta.",
    },
    {
      key: "targetDistance",
      label: "Distancia alvo",
      min: 100,
      max: 700,
      step: 25,
      unit: "m",
      description: "Separacao da segunda pergunta.",
    },
  ],
  motionKind: "same",
  targetLabel: "Separacao alvo",
  mentalCue:
    "Mesmo sentido: a distancia cresce apenas pela vantagem do carro mais rapido sobre o mais lento.",
  studyNote:
    "No modo longo, escreva s_A = 30t e s_B = 20t. No modo curto, use v_rel = 30 - 20 porque os dois seguem para a direita.",
  pitfall:
    "Somar as velocidades so por haver dois carros. Aqui ambos andam para o mesmo lado.",
  intuition: "Mesmo sentido: a distancia cresce pela vantagem.",
  loopLabel: "Quando a diferenca entre as posicoes atinge o valor alvo, a cena congela esse instante.",
  exerciseTitle: "Quanto se afastam e quando chegam a 500 m?",
});

const boatBuoyScene = buildEncounterScene({
  id: "boat-buoy",
  title: "Barco e boia",
  subtitle: "Encontro no rio com correnteza",
  accent: "#7de6ff",
  summary:
    "A boia tambem se move no referencial da margem: ela desce com a correnteza, entao o barco a alcanca pela diferenca entre as velocidades na margem.",
  laneKind: "river",
  timeScale: 0.7,
  units: {
    position: "km",
    velocity: "km/h",
    time: "h",
  },
  firstActor: {
    label: "barco",
    arrowLabel: "v_barco",
    color: "#79e8ff",
    sprite: "boat",
    width: 1.7,
    height: 1.1,
  },
  secondActor: {
    label: "boia",
    arrowLabel: "v_boia",
    color: "#ffd27e",
    radius: 0.22,
  },
  defaults: {
    initialGap: 20,
    speedFirst: 12,
    speedSecond: 4,
  },
  controls: [
    {
      key: "initialGap",
      label: "Boia a frente",
      min: 5,
      max: 40,
      step: 1,
      unit: "km",
      description: "Distancia inicial entre o barco e a boia ao longo do rio.",
    },
    {
      key: "speedFirst",
      label: "Velocidade do barco na margem",
      min: 6,
      max: 18,
      step: 0.5,
      unit: "km/h",
      description: "Barco descendo o rio no referencial da margem.",
    },
    {
      key: "speedSecond",
      label: "Velocidade da boia",
      min: 1,
      max: 8,
      step: 0.5,
      unit: "km/h",
      description: "A boia acompanha a correnteza.",
    },
  ],
  secondDirection: "right",
  eventName: "encontro",
  eventPositionName: "Posicao do encontro",
  mentalCue:
    "A boia nao esta parada: ela se move com a agua. O barco so fecha a distancia pela diferenca entre a sua velocidade na margem e a da boia.",
  studyNote:
    "No modo longo, escreva s_barco = 12t e s_boia = 20 + 4t. No modo curto, use v_rel = 12 - 4 porque ambos seguem rio abaixo.",
  pitfall:
    "Tratar a boia como se estivesse parada. Ela nao tem motor, mas tem velocidade em relacao a margem.",
  intuition: "No rio, ate a boia tem velocidade em relacao a margem.",
  loopLabel: "Quando o barco encosta na boia, a animacao para no ponto do encontro.",
  exerciseTitle: "Quando o barco alcanca a boia?",
});

export const relativeMotionScenes = [
  headOnScene,
  pursuitScene,
  oppositeSeparationScene,
  sameDirectionSeparationScene,
  boatCurrentRoundTripScene,
  boatBuoyScene,
  riverCrossingClassicScene,
  airplaneWindScene,
  trainPassengerScene,
];
