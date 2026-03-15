import { solveCantileverSupport } from "../core/solvers";
import { formatQuantity } from "../core/units";
import { clamp } from "../math/scalar";
import { Vector2 } from "../math/Vector2";
import {
  drawArrow,
  drawGrid,
  drawLineWorld,
  drawSpriteAtWorld,
} from "../render/canvasPrimitives";
import { SceneDefinition, ScenePanelData, SceneState } from "./types";

interface WallBracketState extends SceneState {
  wallX: number;
  beamY: number;
}

function getState(state: SceneState) {
  return state as WallBracketState;
}

function buildPanel(
  state: WallBracketState,
  config: Record<string, number>,
): ScenePanelData {
  const support = solveCantileverSupport(config.weight, config.armLength);
  const boltForce =
    config.boltSpacing === 0 ? 0 : support.bendingMoment / config.boltSpacing;

  return {
    metrics: [
      {
        label: "Peso do letreiro",
        value: formatQuantity(config.weight, "N"),
        helper: "Carga vertical aplicada na ponta do suporte.",
      },
      {
        label: "Braço de alavanca",
        value: formatQuantity(config.armLength, "m"),
        helper: "Distância do peso até a parede.",
      },
      {
        label: "Esforço cortante",
        value: formatQuantity(support.shearForce, "N"),
        helper: "Reação vertical total na parede.",
      },
      {
        label: "Momento na parede",
        value: formatQuantity(support.bendingMoment, "N·m"),
        helper: "M = W · L no engaste.",
      },
    ],
    formulas: [
      {
        title: "Momento do peso",
        formula: "$$M = WL$$",
        explanation:
          "Quanto maior o braço, maior o torque exigido da fixação na parede.",
      },
      {
        title: "Par de parafusos",
        formula: "$$F_{par} = \\frac{M}{d}$$",
        explanation:
          "Se dois parafusos resistem ao momento como um binário, a força interna cresce quando o espaçamento diminui.",
      },
      {
        title: "Cortante",
        formula: "$$V = W$$",
        explanation:
          "Sem outras cargas verticais, a reação cortante total deve equilibrar o peso do letreiro.",
      },
    ],
    concept: [
      {
        title: "Peso gera momento",
        body: "Não basta saber “quanto pesa”. Em suportes e parafusos, a distância da carga até a parede transforma peso em torque.",
      },
    ],
    studyNotes: [
      {
        title: "Engenharia básica do suporte",
        body: "A parede precisa fornecer uma força vertical para segurar o peso e também um binário interno para impedir a rotação do conjunto.",
      },
    ],
    loopSteps: [
      {
        title: "1. Aplicar a carga",
        body: "O letreiro exerce um peso W para baixo na extremidade do braço.",
      },
      {
        title: "2. Calcular momento",
        body: "A parede recebe M = W·L como exigência de equilíbrio rotacional.",
      },
      {
        title: "3. Estimar esforço nos parafusos",
        body: "O momento é convertido em um par de forças internas separado pela distância entre parafusos.",
      },
    ],
    exercises: [
      {
        title: "Parafuso na parede",
        prompt: `Se o letreiro pesa ${config.weight.toFixed(1)} N e o braço mede ${config.armLength.toFixed(2)} m, qual momento chega à parede?`,
        answer: `${support.bendingMoment.toFixed(2)} N·m. Com parafusos separados por ${config.boltSpacing.toFixed(2)} m, cada um participa de um binário equivalente a ${boltForce.toFixed(2)} N.`,
      },
    ],
    intuition: [
      {
        title: "Braço longo castiga muito",
        body: "Dobrar o braço dobra o momento, mesmo que o peso não mude. É por isso que cargas afastadas da base são tão críticas.",
      },
    ],
    engineering: [
      {
        title: "Suportes, mãos francesas e fixações",
        body: "O raciocínio aqui é o mesmo usado em consoles, suportes de placa, prateleiras e muitos detalhes de projeto mecânico/civil.",
      },
    ],
    pitfalls: [
      {
        title: "Olhar só para a força vertical",
        body: "Um suporte pode até resistir ao peso em termos de força, mas falhar por causa do momento excessivo no engaste.",
      },
    ],
    references: [
      {
        src: `${import.meta.env.BASE_URL}assets/references/free-body-diagram.svg`,
        title: "Diagrama de corpo livre e equilíbrio",
        description:
          "A mesma lógica de componentes e momento aparece em suportes e fixações.",
        href: "https://commons.wikimedia.org/wiki/File:Free_body.svg",
      },
    ],
  };
}

export const wallBracketScene: SceneDefinition = {
  id: "wall-bracket",
  title: "Suporte na parede",
  subtitle: "Peso, momento e parafusos",
  accent: "#ff9b9b",
  category: "Estática / estruturas",
  summary:
    "Um letreiro preso a uma parede por um braço horizontal. A cena mostra peso, cortante, momento e o papel do espaçamento entre parafusos.",
  worldWidth: 16,
  worldHeight: 10,
  keyboardHints: [
    "Arraste o peso",
    "Arraste o braço",
    "Pense em força + momento",
  ],
  defaults: {
    weight: 220,
    armLength: 3,
    boltSpacing: 1.2,
  },
  controls: [
    {
      key: "weight",
      label: "Peso do letreiro",
      min: 40,
      max: 500,
      step: 5,
      unit: "N",
      description: "Carga vertical aplicada ao suporte.",
    },
    {
      key: "armLength",
      label: "Comprimento do braço",
      min: 1,
      max: 5,
      step: 0.1,
      unit: "m",
      description: "Distância entre parede e letreiro.",
    },
    {
      key: "boltSpacing",
      label: "Espaçamento entre parafusos",
      min: 0.4,
      max: 2.5,
      step: 0.05,
      unit: "m",
      description: "Separação vertical entre fixações.",
    },
  ],
  createState: () => ({
    wallX: 2.4,
    beamY: 4.5,
  }),
  step: () => {},
  render: ({ ctx, state, viewport, sprites, config }) => {
    const scene = getState(state);
    const beamEnd = new Vector2(scene.wallX + config.armLength, scene.beamY);
    const topBolt = new Vector2(
      scene.wallX,
      scene.beamY - config.boltSpacing / 2,
    );
    const bottomBolt = new Vector2(
      scene.wallX,
      scene.beamY + config.boltSpacing / 2,
    );
    const boltForce =
      solveCantileverSupport(config.weight, config.armLength).bendingMoment /
      config.boltSpacing;

    drawGrid(ctx, viewport, 1);
    drawLineWorld(
      ctx,
      viewport,
      new Vector2(scene.wallX, 1.2),
      new Vector2(scene.wallX, 8.6),
      "#d8f4ff",
      5,
    );
    drawLineWorld(
      ctx,
      viewport,
      new Vector2(scene.wallX, scene.beamY),
      beamEnd,
      "#ffffff",
      4,
    );
    drawSpriteAtWorld(
      ctx,
      viewport,
      sprites.crate,
      beamEnd.add(new Vector2(0.55, 0)),
      1.1,
      1.1,
      0,
      "#ff9b9b",
    );
    drawArrow(
      ctx,
      viewport,
      beamEnd.add(new Vector2(0.55, 0)),
      new Vector2(0, config.weight * 0.004),
      "#ffbf69",
      "W",
    );
    drawArrow(
      ctx,
      viewport,
      topBolt,
      new Vector2(-boltForce * 0.003, 0),
      "#69e2ff",
      "Tensão",
    );
    drawArrow(
      ctx,
      viewport,
      bottomBolt,
      new Vector2(boltForce * 0.003, 0),
      "#69e2ff",
      "Compressão",
    );
  },
  buildPanelData: (state, config) => buildPanel(getState(state), config),
  getDragHandles: (state, config) => {
    const scene = getState(state);
    const beamEnd = new Vector2(scene.wallX + config.armLength, scene.beamY);
    return [
      {
        id: "arm",
        anchor: new Vector2(scene.wallX, scene.beamY),
        position: beamEnd,
        label: "L",
        radius: 0.16,
        color: "#ffffff",
        style: "vector",
      },
      {
        id: "weight",
        anchor: beamEnd.add(new Vector2(0.55, 0)),
        position: beamEnd.add(new Vector2(0.55, config.weight * 0.004)),
        label: "W",
        radius: 0.16,
        color: "#ffbf69",
        style: "vector",
      },
    ];
  },
  onDrag: ({ handleId, state, worldPoint }) => {
    const scene = getState(state);
    if (handleId === "arm") {
      return {
        configPatch: { armLength: clamp(worldPoint.x - scene.wallX, 1, 5) },
      };
    }
    if (handleId === "weight") {
      return {
        configPatch: {
          weight: clamp((worldPoint.y - scene.beamY) / 0.004, 40, 500),
        },
      };
    }
  },
  resetOnConfigChange: false,
};
