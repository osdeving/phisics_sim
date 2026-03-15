import { solveStaticLoadBalance } from "../core/solvers";
import { formatQuantity } from "../core/units";
import { clamp, toRadians } from "../math/scalar";
import { Vector2 } from "../math/Vector2";
import {
  drawArrow,
  drawCircleBody,
  drawGrid,
  drawLineWorld,
  drawWorldLabel,
} from "../render/canvasPrimitives";
import { SceneDefinition, ScenePanelData, SceneState } from "./types";

interface CableStaticsState extends SceneState {
  origin: Vector2;
}

function getState(state: SceneState) {
  return state as CableStaticsState;
}

function forceFromPolar(magnitude: number, angleDeg: number) {
  return Vector2.fromPolar(magnitude, toRadians(angleDeg));
}

function toWorld(force: Vector2) {
  return new Vector2(force.x, -force.y);
}

function buildPanel(
  state: CableStaticsState,
  config: Record<string, number>,
): ScenePanelData {
  const leftForce = forceFromPolar(config.forceLeft, config.angleLeft);
  const rightForce = forceFromPolar(config.forceRight, config.angleRight);
  const solution = solveStaticLoadBalance([leftForce, rightForce]);

  return {
    metrics: [
      {
        label: "Força esquerda",
        value: `(${leftForce.x.toFixed(2)}, ${leftForce.y.toFixed(2)}) N`,
        helper: "Componentes da tração esquerda.",
      },
      {
        label: "Força direita",
        value: `(${rightForce.x.toFixed(2)}, ${rightForce.y.toFixed(2)}) N`,
        helper: "Componentes da tração direita.",
      },
      {
        label: "Resultante",
        value: formatQuantity(solution.resultant.length, "N"),
        helper: `ΣF = (${solution.resultant.x.toFixed(2)}, ${solution.resultant.y.toFixed(2)}) N`,
      },
      {
        label: "Força de equilíbrio",
        value: formatQuantity(solution.equilibriumForce.length, "N"),
        helper: "A força que zeraria a soma vetorial.",
      },
    ],
    formulas: [
      {
        title: "Equilíbrio estático",
        formula: "$$\\sum \\vec{F} = \\vec{0}$$",
        explanation:
          "Se o anel permanecer em repouso, a soma vetorial de todas as forças deve ser nula.",
      },
      {
        title: "Componentes",
        formula: "$$\\sum F_x = 0,\\; \\sum F_y = 0$$",
        explanation:
          "Na prática, problemas de cabos e anéis viram dois balanços escalares.",
      },
      {
        title: "Força equilibrante",
        formula: "$$\\vec{F}_{eq} = -(\\vec{F}_1 + \\vec{F}_2)$$",
        explanation:
          "A equilibrante tem mesmo módulo da resultante e direção oposta.",
      },
    ],
    concept: [
      {
        title: "Problema clássico de engenharia vetorial",
        body: "Dois trabalhadores, dois cabos, um anel. O objetivo é enxergar a resultante e a força que faltaria para equilíbrio.",
      },
    ],
    studyNotes: [
      {
        title: "Leitura Halliday + engenharia",
        body: "Desenhe o diagrama de corpo livre, escolha eixos convenientes e escreva ΣFx, ΣFy. Essa sequência resolve uma enorme família de exercícios.",
      },
    ],
    loopSteps: [
      {
        title: "1. Definir duas trações",
        body: "Cada cabo é configurado por módulo e ângulo.",
      },
      {
        title: "2. Somar componentes",
        body: "A resultante é calculada componente a componente.",
      },
      {
        title: "3. Exibir a equilibrante",
        body: "A seta vermelha mostra a força que faltaria para zerar a soma.",
      },
    ],
    exercises: [
      {
        title: "Dois homens puxam um cabo",
        prompt:
          "Com as duas trações atuais, o anel entra em equilíbrio ou ainda sobra uma resultante?",
        answer: solution.isBalanced
          ? "As forças já estão praticamente em equilíbrio."
          : `Ainda sobra uma resultante de ${solution.resultant.length.toFixed(2)} N; seria preciso aplicar uma força oposta a ela.`,
      },
    ],
    intuition: [
      {
        title: "Nem toda força “grande” domina",
        body: "Se duas forças quase se opõem, elas podem se cancelar fortemente. O que importa é a geometria da composição, não só o módulo isolado.",
      },
    ],
    engineering: [
      {
        title: "Cabos, ganchos e nós estruturais",
        body: "Treliças, içamento, tirantes e suportes articulados usam exatamente esse raciocínio de resultante e equilibrante.",
      },
    ],
    pitfalls: [
      {
        title: "Somar módulos em vez de vetores",
        body: "Em estática vetorial, a direção é tudo. Somar “120 N + 90 N = 210 N” raramente resolve o problema real.",
      },
    ],
    references: [
      {
        src: `${import.meta.env.BASE_URL}assets/references/free-body-diagram.svg`,
        title: "Exemplo de diagrama de corpo livre",
        description:
          "Imagem aberta usada como apoio visual para lembrar o passo zero de qualquer problema de estática.",
        href: "https://commons.wikimedia.org/wiki/File:Free_body.svg",
      },
    ],
  };
}

export const cableStaticsScene: SceneDefinition = {
  id: "cable-statics",
  title: "Cabos e resultante",
  subtitle: "Dois homens puxando um anel",
  accent: "#ffb56f",
  category: "Estática vetorial",
  summary:
    "Um caso clássico de engenharia: duas trações agem em um anel, e a cena mostra a resultante e a força equilibrante necessária.",
  worldWidth: 16,
  worldHeight: 10,
  keyboardHints: [
    "Arraste as pontas dos cabos",
    "Veja a equilibrante em vermelho",
    "Pense em ΣFx = 0 e ΣFy = 0",
  ],
  defaults: {
    forceLeft: 140,
    angleLeft: 145,
    forceRight: 110,
    angleRight: 20,
  },
  controls: [
    {
      key: "forceLeft",
      label: "Tração esquerda",
      min: 20,
      max: 250,
      step: 1,
      unit: "N",
      description: "Módulo da força à esquerda.",
    },
    {
      key: "angleLeft",
      label: "Ângulo esquerdo",
      min: 95,
      max: 175,
      step: 1,
      unit: "°",
      description: "Direção da força esquerda.",
    },
    {
      key: "forceRight",
      label: "Tração direita",
      min: 20,
      max: 250,
      step: 1,
      unit: "N",
      description: "Módulo da força à direita.",
    },
    {
      key: "angleRight",
      label: "Ângulo direito",
      min: 5,
      max: 85,
      step: 1,
      unit: "°",
      description: "Direção da força direita.",
    },
  ],
  createState: () => ({
    origin: new Vector2(8, 6),
  }),
  step: () => {},
  render: ({ ctx, state, viewport, config }) => {
    const scene = getState(state);
    const leftForce = forceFromPolar(config.forceLeft, config.angleLeft);
    const rightForce = forceFromPolar(config.forceRight, config.angleRight);
    const solution = solveStaticLoadBalance([leftForce, rightForce]);

    drawGrid(ctx, viewport, 1);
    drawCircleBody(ctx, viewport, scene.origin, 0.14, "#ffffff");
    drawArrow(
      ctx,
      viewport,
      scene.origin,
      toWorld(leftForce).scale(0.02),
      "#69e2ff",
      "F₁",
    );
    drawArrow(
      ctx,
      viewport,
      scene.origin,
      toWorld(rightForce).scale(0.02),
      "#ffbf69",
      "F₂",
    );
    drawArrow(
      ctx,
      viewport,
      scene.origin,
      toWorld(solution.resultant).scale(0.02),
      "#ffffff",
      "ΣF",
    );
    drawArrow(
      ctx,
      viewport,
      scene.origin,
      toWorld(solution.equilibriumForce).scale(0.02),
      "#ff7a7a",
      "F_eq",
    );
    drawWorldLabel(
      ctx,
      viewport,
      new Vector2(0.8, 0.95),
      "Diagrama de corpo livre no anel central",
    );
  },
  buildPanelData: (state, config) => buildPanel(getState(state), config),
  getDragHandles: (state, config) => {
    const scene = getState(state);
    return [
      {
        id: "left-force",
        anchor: scene.origin,
        position: scene.origin.add(
          toWorld(forceFromPolar(config.forceLeft, config.angleLeft)).scale(
            0.02,
          ),
        ),
        label: "F₁",
        radius: 0.16,
        color: "#69e2ff",
        style: "vector",
      },
      {
        id: "right-force",
        anchor: scene.origin,
        position: scene.origin.add(
          toWorld(forceFromPolar(config.forceRight, config.angleRight)).scale(
            0.02,
          ),
        ),
        label: "F₂",
        radius: 0.16,
        color: "#ffbf69",
        style: "vector",
      },
    ];
  },
  onDrag: ({ handleId, worldPoint, state }) => {
    const scene = getState(state);
    const mathVector = new Vector2(
      worldPoint.x - scene.origin.x,
      scene.origin.y - worldPoint.y,
    ).scale(1 / 0.02);
    const magnitude = clamp(mathVector.length, 20, 250);
    const angle = clamp(
      (mathVector.angle * 180) / Math.PI,
      handleId === "left-force" ? 95 : 5,
      handleId === "left-force" ? 175 : 85,
    );

    if (handleId === "left-force") {
      return { configPatch: { forceLeft: magnitude, angleLeft: angle } };
    }
    if (handleId === "right-force") {
      return { configPatch: { forceRight: magnitude, angleRight: angle } };
    }
  },
  resetOnConfigChange: false,
};
