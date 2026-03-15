import { formatQuantity } from "../core/units";
import { resolveVectorComponents, solveResultantVector } from "../core/solvers";
import { clamp, toRadians } from "../math/scalar";
import { Vector2 } from "../math/Vector2";
import {
  drawArrow,
  drawGrid,
  drawLineWorld,
  drawWorldLabel,
} from "../render/canvasPrimitives";
import { SceneDefinition, ScenePanelData, SceneState } from "./types";

interface VectorLabState extends SceneState {
  origin: Vector2;
}

function getState(state: SceneState) {
  return state as VectorLabState;
}

function toWorldVector(mathVector: Vector2) {
  return new Vector2(mathVector.x, -mathVector.y);
}

function toMathVector(origin: Vector2, worldPoint: Vector2) {
  return new Vector2(worldPoint.x - origin.x, origin.y - worldPoint.y);
}

function buildPanel(
  state: VectorLabState,
  config: Record<string, number>,
): ScenePanelData {
  const vectorA = resolveVectorComponents(
    config.magnitudeA,
    toRadians(config.angleA),
  );
  const vectorB = resolveVectorComponents(
    config.magnitudeB,
    toRadians(config.angleB),
  );
  const resultant = solveResultantVector(vectorA, vectorB).resultant;
  const difference = vectorA.subtract(vectorB);

  return {
    metrics: [
      {
        label: "Vetor A",
        value: `(${vectorA.x.toFixed(2)}, ${vectorA.y.toFixed(2)})`,
        helper: "Componentes cartesianas do primeiro vetor.",
      },
      {
        label: "Vetor B",
        value: `(${vectorB.x.toFixed(2)}, ${vectorB.y.toFixed(2)})`,
        helper: "Componentes cartesianas do segundo vetor.",
      },
      {
        label: "Resultante",
        value: formatQuantity(resultant.length, "u"),
        helper: `A + B = (${resultant.x.toFixed(2)}, ${resultant.y.toFixed(2)})`,
      },
      {
        label: "Diferença",
        value: `(${difference.x.toFixed(2)}, ${difference.y.toFixed(2)})`,
        helper:
          "A − B é útil para deslocamento relativo e velocidade relativa.",
      },
    ],
    formulas: [
      {
        title: "Soma vetorial",
        formula: "$$\\vec{R} = \\vec{A} + \\vec{B}$$",
        explanation:
          "Somamos componente a componente: Rx = Ax + Bx e Ry = Ay + By.",
      },
      {
        title: "Componentes",
        formula: "$$A_x = A\\cos\\theta,\\; A_y = A\\sin\\theta$$",
        explanation:
          "A decomposição em eixos é a base de quase toda a mecânica de Halliday e Resnick.",
      },
      {
        title: "Módulo",
        formula: "$$|R| = \\sqrt{R_x^2 + R_y^2}$$",
        explanation:
          "Depois de decompor e somar, reconstruímos o tamanho do vetor pelo teorema de Pitágoras.",
      },
    ],
    concept: [
      {
        title: "A linguagem da mecânica",
        body: "Força, velocidade, aceleração, deslocamento e momento aparecem como vetores. Antes da dinâmica, dominar soma, subtração e componentes é essencial.",
        bullets: [
          "Seta = direção + sentido + módulo.",
          "Componentes revelam quanto do vetor atua em cada eixo.",
          "O paralelogramo é a leitura geométrica da soma vetorial.",
        ],
      },
    ],
    studyNotes: [
      {
        title: "Como Halliday costuma tratar",
        body: "Primeiro escolhemos um sistema de eixos, depois projetamos tudo em x e y. Só no fim recombinamos os resultados.",
        bullets: [
          "Desenhe os eixos antes de escrever equações.",
          "Projete cada vetor separadamente.",
          "Some apenas grandezas do mesmo eixo.",
        ],
      },
    ],
    loopSteps: [
      {
        title: "1. Ler magnitude e ângulo",
        body: "Cada vetor nasce da forma polar: módulo + direção.",
      },
      {
        title: "2. Converter para componentes",
        body: "A geometria vira álgebra usando seno e cosseno.",
      },
      {
        title: "3. Construir soma e diferença",
        body: "A cena desenha o paralelogramo e a resultante no mesmo plano.",
      },
    ],
    exercises: [
      {
        title: "Soma de forças em um nó",
        prompt:
          "Se duas forças A e B atuam sobre um anel, qual é a força resultante sobre ele?",
        answer: `Com os valores atuais, a resultante tem módulo ${resultant.length.toFixed(2)} u e ângulo ${((resultant.angle * 180) / Math.PI).toFixed(1)}°.`,
      },
    ],
    intuition: [
      {
        title: "Projeções contam a história",
        body: "Mesmo um vetor enorme pode quase não influenciar um eixo se estiver quase perpendicular a ele. É por isso que “ver só o desenho” engana tanto em exercícios.",
      },
    ],
    engineering: [
      {
        title: "Estática e estruturas",
        body: "Em cabos, tirantes, treliças e parafusos, quase tudo começa decompondo forças em eixos adequados antes de impor equilíbrio.",
      },
    ],
    pitfalls: [
      {
        title: "Erro clássico",
        body: "Misturar o sinal da componente vertical com a convenção do desenho. Aqui o cálculo segue a convenção matemática, com y positivo para cima.",
      },
    ],
    references: [
      {
        src: `${import.meta.env.BASE_URL}assets/references/vector-addition.svg`,
        title: "Diagrama clássico de soma vetorial",
        description: "Referência visual aberta para a regra do paralelogramo.",
        href: "https://commons.wikimedia.org/wiki/File:Vector_Addition.svg",
      },
    ],
  };
}

export const vectorLabScene: SceneDefinition = {
  id: "vector-lab",
  title: "Vetores e componentes",
  subtitle: "Soma, subtração e projeções",
  accent: "#69e2ff",
  category: "Álgebra vetorial",
  summary:
    "Um laboratório visual para aprender a somar, subtrair e decompor vetores — a base de toda a mecânica newtoniana.",
  worldWidth: 16,
  worldHeight: 10,
  keyboardHints: [
    "Arraste as pontas dos vetores",
    "Observe componentes e resultante",
    "Use como aquecimento para as outras cenas",
  ],
  defaults: {
    magnitudeA: 4.5,
    angleA: 35,
    magnitudeB: 3.8,
    angleB: 125,
  },
  controls: [
    {
      key: "magnitudeA",
      label: "Módulo de A",
      min: 0.5,
      max: 8,
      step: 0.1,
      unit: "u",
      description: "Tamanho do vetor A.",
    },
    {
      key: "angleA",
      label: "Ângulo de A",
      min: -170,
      max: 170,
      step: 1,
      unit: "°",
      description: "Ângulo medido a partir do eixo +x.",
    },
    {
      key: "magnitudeB",
      label: "Módulo de B",
      min: 0.5,
      max: 8,
      step: 0.1,
      unit: "u",
      description: "Tamanho do vetor B.",
    },
    {
      key: "angleB",
      label: "Ângulo de B",
      min: -170,
      max: 170,
      step: 1,
      unit: "°",
      description: "Ângulo medido a partir do eixo +x.",
    },
  ],
  createState: () => ({
    origin: new Vector2(5.8, 7.2),
  }),
  step: () => {},
  render: ({ ctx, state, viewport, config }) => {
    const scene = getState(state);
    const vectorA = resolveVectorComponents(
      config.magnitudeA,
      toRadians(config.angleA),
    );
    const vectorB = resolveVectorComponents(
      config.magnitudeB,
      toRadians(config.angleB),
    );
    const resultant = vectorA.add(vectorB);
    const origin = scene.origin;
    const worldA = toWorldVector(vectorA);
    const worldB = toWorldVector(vectorB);
    const worldR = toWorldVector(resultant);

    drawGrid(ctx, viewport, 1);
    drawArrow(ctx, viewport, origin, worldA, "#6ee7ff", "A");
    drawArrow(ctx, viewport, origin, worldB, "#ffbf69", "B");
    drawArrow(ctx, viewport, origin, worldR, "#ffffff", "A + B");
    drawLineWorld(
      ctx,
      viewport,
      origin.add(worldA),
      origin.add(worldA).add(worldB),
      "rgba(255,255,255,0.22)",
      2,
    );
    drawLineWorld(
      ctx,
      viewport,
      origin.add(worldB),
      origin.add(worldB).add(worldA),
      "rgba(255,255,255,0.22)",
      2,
    );
    drawWorldLabel(
      ctx,
      viewport,
      new Vector2(0.8, 0.95),
      "Convenção do cálculo: y positivo para cima; tela só espelha o eixo vertical",
    );
  },
  buildPanelData: (state, config) => buildPanel(getState(state), config),
  getDragHandles: (state, config) => {
    const scene = getState(state);
    const vectorA = resolveVectorComponents(
      config.magnitudeA,
      toRadians(config.angleA),
    );
    const vectorB = resolveVectorComponents(
      config.magnitudeB,
      toRadians(config.angleB),
    );
    return [
      {
        id: "vector-a",
        anchor: scene.origin,
        position: scene.origin.add(toWorldVector(vectorA)),
        label: "A",
        color: "#6ee7ff",
        radius: 0.16,
        style: "vector",
      },
      {
        id: "vector-b",
        anchor: scene.origin,
        position: scene.origin.add(toWorldVector(vectorB)),
        label: "B",
        color: "#ffbf69",
        radius: 0.16,
        style: "vector",
      },
    ];
  },
  onDrag: ({ handleId, state, worldPoint }) => {
    const scene = getState(state);
    const mathVector = toMathVector(scene.origin, worldPoint);
    const magnitude = clamp(mathVector.length, 0.5, 8);
    const angle = clamp((mathVector.angle * 180) / Math.PI, -170, 170);

    if (handleId === "vector-a") {
      return { configPatch: { magnitudeA: magnitude, angleA: angle } };
    }
    if (handleId === "vector-b") {
      return { configPatch: { magnitudeB: magnitude, angleB: angle } };
    }
  },
  resetOnConfigChange: false,
};
