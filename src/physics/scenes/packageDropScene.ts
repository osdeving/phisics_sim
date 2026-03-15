import {
  applyForce,
  createParticleBody,
  integrateSemiImplicitEuler,
  ParticleBody,
} from "../core/body";
import { gravityForce } from "../core/forces";
import { formatQuantity } from "../core/units";
import { clamp, toRadians } from "../math/scalar";
import { Vector2 } from "../math/Vector2";
import {
  drawArrow,
  drawGrid,
  drawGround,
  drawLineWorld,
  drawScenicBackdrop,
  drawSpriteAtWorld,
  drawWorldLabel,
} from "../render/canvasPrimitives";
import {
  getPlaneSpriteFilter,
  PLANE_SKIN_CHOICES,
} from "../render/itemSkins";
import { SceneDefinition, ScenePanelData, SceneState } from "./types";

interface PackageDropState extends SceneState {
  planeX: number;
  initialPlaneX: number;
  planeY: number;
  packageBody: ParticleBody;
  groundY: number;
  trail: Vector2[];
  time: number;
  frameCounter: number;
}

const PACKAGE_RELEASE_OFFSET_Y = 0.34;

function getState(state: SceneState) {
  return state as PackageDropState;
}

function computeProjectileAnswer(config: Record<string, number>) {
  const angle = toRadians(config.throwAngle);
  const verticalUp = config.throwSpeed * Math.sin(angle);
  const horizontalSpeed =
    config.planeSpeed + config.throwSpeed * Math.cos(angle);
  const time =
    (verticalUp +
      Math.sqrt(verticalUp ** 2 + 2 * config.gravity * config.releaseHeight)) /
    config.gravity;
  const range = horizontalSpeed * time;
  return { time, range, horizontalSpeed, verticalUp };
}

function buildPanel(
  state: PackageDropState,
  config: Record<string, number>,
): ScenePanelData {
  const answer = computeProjectileAnswer(config);
  const relativeX = state.packageBody.position.x - state.planeX;
  const altitude = Math.max(0, state.groundY - state.packageBody.position.y);
  const impactX = state.initialPlaneX + answer.range;

  return {
    metrics: [
      {
        label: "Altitude do pacote",
        value: formatQuantity(altitude, "m"),
        helper: "Altura atual medida até o chão.",
      },
      {
        label: "Alcance previsto",
        value: formatQuantity(answer.range, "m"),
        helper: `O alvo teórico no solo fica em x ≈ ${impactX.toFixed(2)} m.`,
      },
      {
        label: "Tempo de voo",
        value: formatQuantity(answer.time, "s"),
        helper: "Resultado da equação vertical com aceleração constante.",
      },
      {
        label: "No referencial do avião",
        value: formatQuantity(relativeX, "m"),
        helper:
          "Se o ar for ignorado e não houver arremesso relativo, o pacote cai quase na vertical no referencial do piloto.",
      },
    ],
    formulas: [
      {
        title: "Tempo até o solo",
        formula: "$$h + v_{0y}t - \\frac{1}{2}gt^2 = 0$$",
        explanation: "A equação vertical entrega o tempo de voo do pacote.",
      },
      {
        title: "Alcance horizontal",
        formula: `$$x = v_{0x}t = ${answer.horizontalSpeed.toFixed(2)} \\cdot ${answer.time.toFixed(2)}$$`,
        explanation:
          "No eixo horizontal não há aceleração neste modelo simplificado.",
      },
      {
        title: "Referenciais",
        formula: "$$\\vec{v}_{rel} = \\vec{v}_{pacote} - \\vec{v}_{aviao}$$",
        explanation:
          "Trocar o observador altera a decomposição da trajetória, mas não o evento físico.",
      },
    ],
    concept: [
      {
        title: "Mesmo evento, duas leituras",
        body: "No solo a trajetória é parabólica. No referencial do avião, o mesmo pacote pode parecer cair quase verticalmente se não houver velocidade relativa adicional.",
      },
    ],
    studyNotes: [
      {
        title: "Ajuste o vetor de lançamento",
        body: "Arraste o vetor laranja preso ao avião para mudar velocidade relativa e ângulo do pacote em tempo real.",
      },
    ],
    loopSteps: [
      {
        title: "1. Definir velocidade inicial",
        body: "A velocidade horizontal do avião se soma à velocidade relativa do lançamento.",
      },
      {
        title: "2. Aplicar gravidade",
        body: "Só a componente vertical sofre aceleração constante para baixo.",
      },
      {
        title: "3. Renderizar duas leituras",
        body: "A vista principal mostra o solo; o inset mostra o movimento relativo ao avião.",
      },
    ],
    exercises: [
      {
        title: "Pacote da Cruz Vermelha",
        prompt: `Um avião voa a ${config.planeSpeed.toFixed(1)} m/s e solta um pacote a ${config.releaseHeight.toFixed(1)} m de altura. Onde ele cai?`,
        answer: `Ele leva cerca de ${answer.time.toFixed(2)} s para atingir o solo e percorre aproximadamente ${answer.range.toFixed(2)} m na horizontal.`,
        steps: [
          "Resolva primeiro o movimento vertical para obter o tempo.",
          "Use esse tempo no movimento horizontal uniforme.",
          "Compare a parábola no solo com a queda aparente no referencial do avião.",
        ],
      },
    ],
    intuition: [
      {
        title: "A horizontal segue, a vertical cai",
        body: "O pacote não “perde” instantaneamente a velocidade do avião ao ser solto. Ele mantém a velocidade horizontal e só começa a ganhar velocidade vertical por causa da gravidade.",
      },
    ],
    engineering: [
      {
        title: "Lançamento e envelope de soltura",
        body: "Problemas desse tipo aparecem em lançamento aéreo, drones, entregas balísticas controladas e cálculo preliminar de envelope de soltura.",
      },
    ],
    pitfalls: [
      {
        title: "Erro clássico de referencial",
        body: "Do solo a curva é parabólica. Do avião, sem velocidade relativa extra, o pacote parece cair quase em linha reta. O evento é o mesmo; muda só o observador.",
      },
    ],
    references: [
      {
        src: `${import.meta.env.BASE_URL}assets/references/projectile-motion.svg`,
        title: "Diagrama aberto de lançamento oblíquo",
        description:
          "Imagem aberta usada para reforçar a separação entre movimento horizontal uniforme e movimento vertical acelerado.",
        href: "https://commons.wikimedia.org/wiki/File:Horizontal-projectile-motion.svg",
      },
    ],
  };
}

export const packageDropScene: SceneDefinition = {
  id: "package-drop",
  title: "Pacote lançado do avião",
  subtitle: "Lançamento oblíquo + referencial",
  accent: "#ff8c8c",
  category: "Cinemática 2D",
  summary:
    "O clássico problema do pacote lançado por um avião, com direito a resposta pronta e uma janela mostrando como solo e piloto enxergam a mesma trajetória.",
  worldWidth: 18,
  worldHeight: 10,
  keyboardHints: [
    "Arraste o vetor de lançamento",
    "Observe o inset do piloto",
    "Use a timeline para rever a queda",
  ],
  defaults: {
    planeSkin: 0,
    planeSpeed: 42,
    throwSpeed: 0,
    throwAngle: 0,
    releaseHeight: 5.5,
    gravity: 9.81,
  },
  controls: [
    {
      key: "planeSkin",
      label: "Tema da aeronave",
      min: 0,
      max: 2,
      step: 1,
      unit: "",
      description: "Primeiro bloco da biblioteca visual de aeronaves.",
      choices: PLANE_SKIN_CHOICES,
    },
    {
      key: "planeSpeed",
      label: "Velocidade do avião",
      min: 10,
      max: 80,
      step: 0.5,
      unit: "m/s",
      description: "Velocidade horizontal da aeronave.",
    },
    {
      key: "throwSpeed",
      label: "Velocidade relativa do lançamento",
      min: 0,
      max: 35,
      step: 0.5,
      unit: "m/s",
      description: "Módulo do vetor lançado do avião.",
    },
    {
      key: "throwAngle",
      label: "Ângulo do lançamento",
      min: -80,
      max: 80,
      step: 1,
      unit: "°",
      description: "Ângulo relativo ao eixo horizontal do avião.",
    },
    {
      key: "releaseHeight",
      label: "Altura de soltura",
      min: 1.5,
      max: 7,
      step: 0.1,
      unit: "m",
      description: "Altura acima do chão.",
    },
    {
      key: "gravity",
      label: "Gravidade",
      min: 1,
      max: 20,
      step: 0.1,
      unit: "m/s²",
      description: "Aceleração vertical.",
    },
  ],
  createState: (config) => {
    const groundY = 8.8;
    const planeX = 2.6;
    const planeY = groundY - config.releaseHeight - PACKAGE_RELEASE_OFFSET_Y;
    const angle = toRadians(config.throwAngle);
    const initialVelocity = new Vector2(
      config.planeSpeed + config.throwSpeed * Math.cos(angle),
      -config.throwSpeed * Math.sin(angle),
    );
    const packageStart = new Vector2(planeX, planeY + PACKAGE_RELEASE_OFFSET_Y);
    return {
      planeX,
      initialPlaneX: planeX,
      planeY,
      packageBody: createParticleBody({
        mass: 5,
        radius: 0.24,
        restitution: 0,
        position: packageStart,
        velocity: initialVelocity,
      }),
      groundY,
      trail: [packageStart],
      time: 0,
      frameCounter: 0,
    };
  },
  step: ({ state, config, dt }) => {
    const scene = getState(state);
    scene.planeX += config.planeSpeed * dt;
    applyForce(
      scene.packageBody,
      gravityForce(scene.packageBody, config.gravity),
    );
    integrateSemiImplicitEuler(scene.packageBody, dt);

    if (
      scene.packageBody.position.y + scene.packageBody.radius >=
      scene.groundY
    ) {
      scene.packageBody.position = scene.packageBody.position.withY(
        scene.groundY - scene.packageBody.radius,
      );
      scene.packageBody.velocity = Vector2.zero();
    }

    scene.time += dt;
    scene.frameCounter += 1;
    if (scene.frameCounter % 2 === 0) {
      scene.trail.push(
        new Vector2(scene.packageBody.position.x, scene.packageBody.position.y),
      );
      if (scene.trail.length > 220) {
        scene.trail.shift();
      }
    }
  },
  render: ({ ctx, state, viewport, sprites, config }) => {
    const scene = getState(state);
    const answer = computeProjectileAnswer(config);
    const planePosition = new Vector2(scene.planeX, scene.planeY);
    const impactX = scene.initialPlaneX + answer.range;

    drawScenicBackdrop(ctx, viewport, {
      groundY: scene.groundY,
      hillHeight: 1,
      treeSpacing: 3.9,
    });
    drawGrid(ctx, viewport, 1);
    drawGround(ctx, viewport, scene.groundY, "Solo");
    scene.trail.forEach((point, index) => {
      const next = scene.trail[index + 1];
      if (!next) {
        return;
      }
      drawLineWorld(
        ctx,
        viewport,
        point,
        next,
        "rgba(255, 203, 132, 0.28)",
        2.5,
      );
    });
    drawSpriteAtWorld(
      ctx,
      viewport,
      sprites.plane,
      planePosition,
      2.85,
      1.3,
      0,
      "#9dd7ff",
      false,
      getPlaneSpriteFilter(config.planeSkin ?? 0),
    );
    drawSpriteAtWorld(
      ctx,
      viewport,
      sprites.package,
      scene.packageBody.position,
      0.72,
      0.56,
      0,
      "#ffffff",
    );
    drawArrow(
      ctx,
      viewport,
      planePosition,
      scene.packageBody.velocity.scale(0.05),
      "#ffbf69",
      "v",
    );
    drawLineWorld(
      ctx,
      viewport,
      new Vector2(impactX, scene.groundY - 0.7),
      new Vector2(impactX, scene.groundY),
      "rgba(255, 191, 105, 0.6)",
      2,
    );
    drawWorldLabel(
      ctx,
      viewport,
      new Vector2(impactX - 0.6, scene.groundY - 0.9),
      "impacto teórico",
    );

    const insetWidth = 260;
    const insetHeight = 180;
    const insetX = viewport.width - insetWidth - 28;
    const insetY = viewport.height - insetHeight - 28;
    ctx.save();
    ctx.fillStyle = "rgba(4, 8, 14, 0.72)";
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(insetX, insetY, insetWidth, insetHeight, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "600 14px Inter, sans-serif";
    ctx.fillText("Referencial do avião", insetX + 16, insetY + 24);

    const rel = scene.packageBody.position.subtract(planePosition);
    const centerX = insetX + insetWidth * 0.48;
    const centerY = insetY + 54;
    ctx.strokeStyle = "rgba(125, 205, 255, 0.22)";
    ctx.beginPath();
    ctx.moveTo(centerX, insetY + 36);
    ctx.lineTo(centerX, insetY + insetHeight - 20);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff8f8f";
    ctx.beginPath();
    ctx.arc(centerX + rel.x * 18, centerY + rel.y * 18, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  buildPanelData: (state, config) => buildPanel(getState(state), config),
  getDragHandles: (state, config) => {
    const scene = getState(state);
    const angle = toRadians(config.throwAngle);
    const relativeVector = new Vector2(
      config.throwSpeed * Math.cos(angle),
      -config.throwSpeed * Math.sin(angle),
    ).scale(0.08);
    return [
      {
        id: "launch",
        position: new Vector2(scene.planeX, scene.planeY).add(relativeVector),
        anchor: new Vector2(scene.planeX, scene.planeY),
        label: "lançamento",
        radius: 0.17,
        color: "#ffbf69",
        style: "vector",
      },
    ];
  },
  onDrag: ({ state, config, worldPoint }) => {
    const scene = getState(state);
    const origin = new Vector2(
      scene.planeX,
      scene.groundY - config.releaseHeight,
    );
    const relativeVector = worldPoint.subtract(origin).scale(1 / 0.08);
    const speed = clamp(relativeVector.length, 0, 35);
    const angle =
      Math.atan2(-relativeVector.y, relativeVector.x) * (180 / Math.PI);

    scene.initialPlaneX = scene.planeX;
    scene.planeY = scene.groundY - config.releaseHeight;
    scene.packageBody.position = new Vector2(scene.planeX, scene.planeY);
    scene.packageBody.velocity = new Vector2(
      config.planeSpeed + relativeVector.x,
      relativeVector.y,
    );
    scene.packageBody.acceleration = Vector2.zero();
    scene.trail = [new Vector2(scene.planeX, scene.planeY)];
    scene.time = 0;

    return {
      configPatch: {
        throwSpeed: speed,
        throwAngle: clamp(angle, -80, 80),
      },
    };
  },
  getCameraWindow: (state) => {
    const scene = getState(state);
    const focusX = Math.max(
      9,
      Math.max(scene.packageBody.position.x, scene.planeX) + 4,
    );
    return {
      center: new Vector2(focusX, 5),
      width: 18,
      height: 10,
    };
  },
};
