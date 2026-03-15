import { clamp, toRadians } from "../math/scalar";
import { Vector2 } from "../math/Vector2";
import { formatQuantity } from "../core/units";
import {
  drawArrow,
  drawGrid,
  drawLineWorld,
  drawSpriteAtWorld,
  drawWorldLabel,
} from "../render/canvasPrimitives";
import { SceneDefinition, ScenePanelData, SceneState } from "./types";

interface RiverState extends SceneState {
  boatPosition: Vector2;
  startPosition: Vector2;
  topBankY: number;
  bottomBankY: number;
  time: number;
  trail: Vector2[];
  hasArrived: boolean;
}

function getState(state: SceneState) {
  return state as RiverState;
}

function velocityVectors(config: Record<string, number>) {
  const heading = toRadians(config.heading);
  const relative = new Vector2(
    -config.boatSpeed * Math.sin(heading),
    -config.boatSpeed * Math.cos(heading),
  );
  const current = new Vector2(config.currentSpeed, 0);
  return { relative, current, resultant: relative.add(current) };
}

function buildPanel(
  state: RiverState,
  config: Record<string, number>,
): ScenePanelData {
  const { relative, current, resultant } = velocityVectors(config);
  const drift = state.boatPosition.x - state.startPosition.x;
  const crossingDistance = state.bottomBankY - state.topBankY;
  const crossingTime = crossingDistance / Math.abs(resultant.y || 1e-6);
  const predictedDrift = resultant.x * crossingTime;

  return {
    metrics: [
      {
        label: "Velocidade do barco na água",
        value: formatQuantity(relative.length, "m/s"),
        helper: "Velocidade relativa à água parada.",
      },
      {
        label: "Correnteza",
        value: formatQuantity(current.length, "m/s"),
        helper: "Velocidade da água empurrando o barco rio abaixo.",
      },
      {
        label: "Velocidade resultante",
        value: formatQuantity(resultant.length, "m/s"),
        helper: "Soma vetorial vista do solo.",
      },
      {
        label: "Deriva lateral",
        value: formatQuantity(drift, "m"),
        helper: "Deslocamento causado pela corrente durante a travessia.",
      },
    ],
    formulas: [
      {
        title: "Composição vetorial",
        formula:
          "$$\\vec{v}_{solo} = \\vec{v}_{b/agua} + \\vec{v}_{corrente}$$",
        explanation:
          "Essa é a essência dos problemas clássicos de rio e barco.",
      },
      {
        title: "Tempo de travessia",
        formula: "$$t = \\frac{\\text{largura}}{|v_y|}$$",
        explanation:
          "A componente vertical da velocidade resultante decide quanto tempo o barco leva para atravessar.",
      },
      {
        title: "Deriva",
        formula: "$$\\Delta x = v_{corrente}t$$",
        explanation:
          "Se o barco apontar reto para a outra margem, a corrente cria um desvio horizontal proporcional ao tempo.",
      },
    ],
    concept: [
      {
        title: "Velocidade relativa",
        body: "O piloto sente o barco se movendo com velocidade em relação à água, mas o observador na margem enxerga a soma com a correnteza.",
      },
    ],
    studyNotes: [
      {
        title: "Anule a deriva",
        body: "Aponte o barco um pouco contra a corrente até a componente horizontal da velocidade relativa cancelar a velocidade do rio.",
      },
    ],
    loopSteps: [
      {
        title: "1. Somar vetores",
        body: "A velocidade do barco e a da corrente são somadas para formar a velocidade no solo.",
      },
      {
        title: "2. Integrar a posição",
        body: "Como estamos em vista superior, a animação usa só translação no plano.",
      },
      {
        title: "3. Medir deriva e tempo",
        body: "A margem oposta fecha a travessia e destaca o efeito da correnteza.",
      },
    ],
    exercises: [
      {
        title: "Barco e rio",
        prompt:
          "Se o barco aponta exatamente para a outra margem, qual o desvio lateral ao fim da travessia?",
        answer: `Com os valores atuais, o barco leva cerca de ${crossingTime.toFixed(2)} s para cruzar e deriva aproximadamente ${predictedDrift.toFixed(2)} m no referencial da margem.`,
      },
    ],
    intuition: [
      {
        title: "A corrente não “empurra para baixo”",
        body: "A travessia depende da componente perpendicular à margem. A corrente só desloca o barco ao longo do rio; ela não ajuda a cruzar.",
      },
    ],
    engineering: [
      {
        title: "Velocidade relativa em navegação e controle",
        body: "Esse mesmo raciocínio aparece em navegação fluvial, drones com vento lateral e veículos autônomos compensando correntes externas.",
      },
    ],
    pitfalls: [
      {
        title: "Usar só a velocidade do rio na deriva",
        body: "A deriva final depende da componente horizontal da velocidade resultante no solo, não apenas da correnteza isolada.",
      },
    ],
    references: [
      {
        src: `${import.meta.env.BASE_URL}assets/references/boat-flow-vectors.svg`,
        title: "Vetores de velocidade em barco e correnteza",
        description:
          "Referência aberta para reforçar a diferença entre velocidade relativa à água e velocidade vista da margem.",
        href: "https://commons.wikimedia.org/wiki/File:Academ_Speed_vectors_about_a_boat_in_a_flow.svg",
      },
    ],
  };
}

export const riverCrossingScene: SceneDefinition = {
  id: "river-crossing",
  title: "Barco atravessando o rio",
  subtitle: "Velocidade relativa e deriva",
  accent: "#66f0c7",
  category: "Referenciais",
  summary:
    "O problema clássico de barco e rio com soma vetorial, deriva lateral e vetor de corrente arrastável diretamente no canvas.",
  worldWidth: 16,
  worldHeight: 10,
  keyboardHints: [
    "Arraste o rumo do barco",
    "Arraste a correnteza",
    "Observe a deriva na margem",
  ],
  defaults: {
    riverWidth: 6.5,
    boatSpeed: 3.8,
    currentSpeed: 1.2,
    heading: 0,
  },
  controls: [
    {
      key: "riverWidth",
      label: "Largura do rio",
      min: 3,
      max: 8,
      step: 0.1,
      unit: "m",
      description: "Distância entre as margens.",
    },
    {
      key: "boatSpeed",
      label: "Velocidade do barco",
      min: 1,
      max: 8,
      step: 0.1,
      unit: "m/s",
      description: "Módulo relativo à água.",
    },
    {
      key: "currentSpeed",
      label: "Velocidade da corrente",
      min: 0,
      max: 4,
      step: 0.1,
      unit: "m/s",
      description: "Empurra o barco rio abaixo.",
    },
    {
      key: "heading",
      label: "Ângulo do rumo",
      min: -70,
      max: 70,
      step: 1,
      unit: "°",
      description: "0° = apontando reto para a outra margem.",
    },
  ],
  createState: (config) => {
    const bottomBankY = 8.5;
    const topBankY = bottomBankY - config.riverWidth;
    const startPosition = new Vector2(4.2, bottomBankY - 0.45);
    return {
      boatPosition: startPosition,
      startPosition,
      topBankY,
      bottomBankY,
      time: 0,
      trail: [startPosition],
      hasArrived: false,
    };
  },
  step: ({ state, config, dt }) => {
    const scene = getState(state);
    scene.topBankY = scene.bottomBankY - config.riverWidth;
    const { resultant } = velocityVectors(config);
    const goalY = scene.topBankY + 0.45;

    if (scene.hasArrived || scene.boatPosition.y <= goalY) {
      scene.boatPosition = scene.boatPosition.withY(goalY);
      scene.hasArrived = true;
      return;
    }

    const nextPosition = scene.boatPosition.add(resultant.scale(dt));
    if (nextPosition.y <= goalY) {
      const verticalStep = scene.boatPosition.y - nextPosition.y;
      const fraction =
        verticalStep <= 1e-6
          ? 1
          : clamp((scene.boatPosition.y - goalY) / verticalStep, 0, 1);
      scene.boatPosition = scene.boatPosition
        .add(resultant.scale(dt * fraction))
        .withY(goalY);
      scene.hasArrived = true;
    } else {
      scene.boatPosition = nextPosition;
    }

    scene.time += dt;
    scene.trail.push(scene.boatPosition);
    if (scene.trail.length > 200) {
      scene.trail.shift();
    }
  },
  render: ({ ctx, state, viewport, sprites, config }) => {
    const scene = getState(state);
    const { relative, current, resultant } = velocityVectors(config);
    const leftBankX = viewport.worldMinX + 0.8;
    const rightBankX = viewport.worldMaxX - 0.8;
    const hudOrigin = new Vector2(
      viewport.worldMinX + 0.8,
      viewport.worldMinY + 0.95,
    );
    drawGrid(ctx, viewport, 1);

    ctx.save();
    const left =
      viewport.offsetX + (leftBankX - viewport.worldMinX) * viewport.scale;
    const top = viewport.offsetY + scene.topBankY * viewport.scale;
    const width = (rightBankX - leftBankX) * viewport.scale;
    const height = (scene.bottomBankY - scene.topBankY) * viewport.scale;
    const waterGradient = ctx.createLinearGradient(
      left,
      top,
      left,
      top + height,
    );
    waterGradient.addColorStop(0, "rgba(56, 163, 255, 0.45)");
    waterGradient.addColorStop(0.55, "rgba(22, 114, 216, 0.38)");
    waterGradient.addColorStop(1, "rgba(14, 78, 176, 0.5)");
    ctx.fillStyle = waterGradient;
    ctx.fillRect(left, top, width, height);

    const flowShift = (scene.time * 84) % 72;
    for (let y = top + 10; y < top + height - 10; y += 16) {
      ctx.strokeStyle = "rgba(220, 245, 255, 0.2)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let x = left - 36; x <= left + width + 36; x += 12) {
        const wave = Math.sin((x + flowShift + y * 0.35) * 0.055) * 2.2;
        const px = x + flowShift;
        const py = y + wave;
        if (x === left - 36) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
    }
    ctx.restore();

    drawLineWorld(
      ctx,
      viewport,
      new Vector2(leftBankX, scene.topBankY),
      new Vector2(rightBankX, scene.topBankY),
      "#e4f7ff",
      4.5,
    );
    drawLineWorld(
      ctx,
      viewport,
      new Vector2(leftBankX, scene.bottomBankY),
      new Vector2(rightBankX, scene.bottomBankY),
      "#e4f7ff",
      4.5,
    );

    for (
      let markerX = leftBankX + 1.6;
      markerX < rightBankX - 0.8;
      markerX += 2.6
    ) {
      drawArrow(
        ctx,
        viewport,
        new Vector2(markerX, scene.topBankY + 0.65),
        new Vector2(0.75, 0),
        "rgba(255, 216, 143, 0.9)",
      );
    }

    scene.trail.forEach((point, index) => {
      const next = scene.trail[index + 1];
      if (next) {
        drawLineWorld(ctx, viewport, point, next, "rgba(216,244,255,0.18)", 2);
      }
    });

    drawSpriteAtWorld(
      ctx,
      viewport,
      sprites.boat,
      scene.boatPosition,
      1.1,
      1.1,
      toRadians(config.heading),
      "#66f0c7",
    );
    drawArrow(
      ctx,
      viewport,
      scene.boatPosition,
      relative.scale(0.2),
      "#66f0c7",
      "v barco",
    );
    drawArrow(
      ctx,
      viewport,
      scene.boatPosition,
      current.scale(0.35),
      "#ffbf69",
      "v rio",
    );
    drawArrow(
      ctx,
      viewport,
      scene.boatPosition,
      resultant.scale(0.2),
      "#ffffff",
      "v solo",
    );
    drawWorldLabel(
      ctx,
      viewport,
      hudOrigin,
      "Vista superior: rio, correnteza e rumo do barco",
    );
  },
  buildPanelData: (state, config) => buildPanel(getState(state), config),
  getDragHandles: (state, config) => {
    const scene = getState(state);
    const { relative } = velocityVectors(config);
    return [
      {
        id: "heading",
        position: scene.startPosition.add(relative.scale(0.24)),
        anchor: scene.startPosition,
        label: "rumo",
        radius: 0.16,
        color: "#66f0c7",
        style: "vector",
      },
      {
        id: "current",
        position: new Vector2(
          2.1 + config.currentSpeed * 0.42,
          scene.topBankY - 0.7,
        ),
        anchor: new Vector2(2.1, scene.topBankY - 0.7),
        label: "rio",
        radius: 0.16,
        color: "#ffbf69",
        style: "vector",
      },
    ];
  },
  onDrag: ({ handleId, state, worldPoint, config }) => {
    const scene = getState(state);
    if (handleId === "heading") {
      const origin = scene.startPosition;
      const vector = worldPoint.subtract(origin).scale(1 / 0.24);
      const heading = clamp(
        Math.atan2(-vector.x, -vector.y) * (180 / Math.PI),
        -70,
        70,
      );
      scene.boatPosition = scene.startPosition;
      scene.time = 0;
      scene.trail = [scene.startPosition];
      scene.hasArrived = false;
      return { configPatch: { heading } };
    }

    if (handleId === "current") {
      const currentSpeed = clamp((worldPoint.x - 2.1) / 0.42, 0, 4);
      scene.boatPosition = scene.startPosition;
      scene.time = 0;
      scene.trail = [scene.startPosition];
      scene.hasArrived = false;
      return { configPatch: { currentSpeed } };
    }
  },
  getCameraWindow: (state) => {
    const scene = getState(state);
    return {
      center: new Vector2(
        scene.boatPosition.x + 3.8,
        (scene.topBankY + scene.bottomBankY) * 0.5,
      ),
      width: 16,
      height: 10,
    };
  },
};
