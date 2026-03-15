import { clamp } from "../math/scalar";
import { Vector2 } from "../math/Vector2";
import { formatQuantity } from "../core/units";
import {
  drawArrow,
  drawGrid,
  drawGround,
  drawScenicBackdrop,
  drawSpriteAtWorld,
  drawWorldLabel,
} from "../render/canvasPrimitives";
import { SceneDefinition, ScenePanelData, SceneState } from "./types";

interface TrainCollisionState extends SceneState {
  leftX: number;
  rightX: number;
  trackY: number;
  trainLength: number;
  collided: boolean;
  time: number;
}

function getState(state: SceneState) {
  return state as TrainCollisionState;
}

function separation(state: TrainCollisionState) {
  return Math.max(0, state.rightX - state.leftX - state.trainLength);
}

function buildPanel(
  state: TrainCollisionState,
  config: Record<string, number>,
): ScenePanelData {
  const gap = separation(state);
  const meetTime = gap / (config.speedLeft + config.speedRight);
  const meetX = state.leftX + config.speedLeft * meetTime;

  return {
    metrics: [
      {
        label: "Separação atual",
        value: formatQuantity(gap, "m"),
        helper: "Distância restante entre as frentes dos trens.",
      },
      {
        label: "Velocidade relativa",
        value: formatQuantity(config.speedLeft + config.speedRight, "m/s"),
        helper: "Quando se aproximam, as velocidades somam.",
      },
      {
        label: "Tempo até o choque",
        value: state.collided ? "0.00 s" : formatQuantity(meetTime, "s"),
        helper: "Predição clássica do encontro em MRU.",
      },
      {
        label: "Posição prevista do choque",
        value: formatQuantity(meetX, "m"),
        helper: "Coordenada medida a partir do início da pista.",
      },
    ],
    formulas: [
      {
        title: "Movimento uniforme",
        formula: "$$x = x_0 + vt$$",
        explanation:
          "Cada trem avança com velocidade constante ao longo dos trilhos.",
      },
      {
        title: "Tempo de encontro",
        formula: "$$t = \\frac{d}{v_1 + v_2}$$",
        explanation:
          "Se eles vêm em sentidos opostos, a distância fecha com a soma das velocidades.",
      },
      {
        title: "Ponto de colisão",
        formula: "$$x_{col} = x_{10} + v_1 t$$",
        explanation:
          "Basta usar o tempo de encontro em qualquer uma das duas equações horárias.",
      },
    ],
    concept: [
      {
        title: "Exercício clássico de cinemática",
        body: "Essa é a versão animada do problema em que dois móveis partem de pontos diferentes e se aproximam com velocidades constantes.",
      },
    ],
    studyNotes: [
      {
        title: "Velocidade relativa",
        body: "Quando os corpos vêm um ao encontro do outro, a velocidade relativa é a soma dos módulos. Quando andam no mesmo sentido, é a diferença.",
      },
    ],
    loopSteps: [
      {
        title: "1. Avançar os dois MRUs",
        body: "Cada trem muda só a posição, porque a aceleração é zero.",
      },
      {
        title: "2. Medir a separação",
        body: "A cada frame a distância restante entre as frentes é recalculada.",
      },
      {
        title: "3. Detectar choque",
        body: "Quando a separação zera, a animação congela o encontro.",
      },
    ],
    exercises: [
      {
        title: "Quando os trens se encontram?",
        prompt: `Com separação atual de ${gap.toFixed(2)} m, v₁ = ${config.speedLeft.toFixed(2)} m/s e v₂ = ${config.speedRight.toFixed(2)} m/s, quando ocorre o choque?`,
        answer: `t = d / (v₁ + v₂) = ${gap.toFixed(2)} / ${(config.speedLeft + config.speedRight).toFixed(2)} ≈ ${meetTime.toFixed(2)} s.`,
      },
    ],
  };
}

export const trainCollisionScene: SceneDefinition = {
  id: "train-collision",
  title: "Choque de trens",
  subtitle: "MRU, velocidade relativa e encontro",
  accent: "#ffdd7a",
  category: "Cinemática 1D",
  summary:
    "O clássico problema de dois trens em sentidos opostos, agora com timeline, ponto previsto de choque e resposta automática.",
  worldWidth: 22,
  worldHeight: 8,
  keyboardHints: [
    "Arraste posições e vetores",
    "Velocidade relativa",
    "Timeline volta no tempo",
  ],
  defaults: {
    initialGap: 14,
    speedLeft: 5.5,
    speedRight: 7.5,
  },
  controls: [
    {
      key: "initialGap",
      label: "Separação inicial",
      min: 6,
      max: 18,
      step: 0.1,
      unit: "m",
      description: "Use reset ou drag para reposicionar os trens.",
    },
    {
      key: "speedLeft",
      label: "Velocidade do trem A",
      min: 1,
      max: 18,
      step: 0.1,
      unit: "m/s",
      description: "Trem que vem da esquerda.",
    },
    {
      key: "speedRight",
      label: "Velocidade do trem B",
      min: 1,
      max: 18,
      step: 0.1,
      unit: "m/s",
      description: "Trem que vem da direita.",
    },
  ],
  createState: (config) => ({
    leftX: 2.8,
    rightX: 2.8 + config.initialGap,
    trackY: 6.2,
    trainLength: 2.2,
    collided: false,
    time: 0,
  }),
  step: ({ state, config, dt }) => {
    const scene = getState(state);
    if (scene.collided) {
      return;
    }

    scene.leftX += config.speedLeft * dt;
    scene.rightX -= config.speedRight * dt;
    scene.time += dt;

    if (separation(scene) <= 0) {
      const meetCenter = (scene.leftX + scene.rightX) * 0.5;
      scene.leftX = meetCenter - scene.trainLength * 0.5;
      scene.rightX = meetCenter + scene.trainLength * 0.5;
      scene.collided = true;
    }
  },
  render: ({ ctx, state, viewport, sprites, config }) => {
    const scene = getState(state);
    drawScenicBackdrop(ctx, viewport, {
      groundY: scene.trackY,
      hillHeight: 1.05,
      treeSpacing: 4.3,
    });
    drawGrid(ctx, viewport, 1);
    drawGround(ctx, viewport, scene.trackY, "Linha férrea");

    const leftCenter = new Vector2(scene.leftX, scene.trackY - 0.65);
    const rightCenter = new Vector2(scene.rightX, scene.trackY - 0.65);
    const predictedTime =
      separation(scene) / (config.speedLeft + config.speedRight);
    const predictedX = leftCenter.x + config.speedLeft * predictedTime;

    drawSpriteAtWorld(
      ctx,
      viewport,
      sprites.train,
      leftCenter,
      2.4,
      1.28,
      0,
      "#66d7ff",
    );
    drawSpriteAtWorld(
      ctx,
      viewport,
      sprites.train,
      rightCenter,
      2.4,
      1.28,
      0,
      "#ffb36a",
      true,
    );
    drawArrow(
      ctx,
      viewport,
      leftCenter,
      new Vector2(config.speedLeft * 0.18, 0),
      "#7ef4ff",
      "v₁",
    );
    drawArrow(
      ctx,
      viewport,
      rightCenter,
      new Vector2(-config.speedRight * 0.18, 0),
      "#ffbf69",
      "v₂",
    );
    drawWorldLabel(
      ctx,
      viewport,
      new Vector2(predictedX, 1.3),
      "choque previsto",
    );
  },
  buildPanelData: (state, config) => buildPanel(getState(state), config),
  getDragHandles: (state, config) => {
    const scene = getState(state);
    return [
      {
        id: "left-train",
        position: new Vector2(scene.leftX, scene.trackY - 0.65),
        label: "trem A",
        radius: 0.18,
        color: "#7ef4ff",
        style: "point",
      },
      {
        id: "right-train",
        position: new Vector2(scene.rightX, scene.trackY - 0.65),
        label: "trem B",
        radius: 0.18,
        color: "#ffbf69",
        style: "point",
      },
      {
        id: "left-speed",
        position: new Vector2(
          scene.leftX + config.speedLeft * 0.18,
          scene.trackY - 1.25,
        ),
        anchor: new Vector2(scene.leftX, scene.trackY - 1.25),
        label: "v₁",
        radius: 0.15,
        color: "#7ef4ff",
        style: "vector",
      },
      {
        id: "right-speed",
        position: new Vector2(
          scene.rightX - config.speedRight * 0.18,
          scene.trackY - 1.25,
        ),
        anchor: new Vector2(scene.rightX, scene.trackY - 1.25),
        label: "v₂",
        radius: 0.15,
        color: "#ffbf69",
        style: "vector",
      },
    ];
  },
  onDrag: ({ handleId, state, config, worldPoint }) => {
    const scene = getState(state);
    scene.collided = false;
    scene.time = 0;

    if (handleId === "left-train") {
      scene.leftX = clamp(
        worldPoint.x,
        1.8,
        scene.rightX - scene.trainLength - 1,
      );
    }
    if (handleId === "right-train") {
      scene.rightX = clamp(
        worldPoint.x,
        scene.leftX + scene.trainLength + 1,
        20,
      );
    }
    if (handleId === "left-speed") {
      return {
        configPatch: {
          speedLeft: clamp((worldPoint.x - scene.leftX) / 0.18, 1, 18),
        },
      };
    }
    if (handleId === "right-speed") {
      return {
        configPatch: {
          speedRight: clamp((scene.rightX - worldPoint.x) / 0.18, 1, 18),
        },
      };
    }
  },
};
