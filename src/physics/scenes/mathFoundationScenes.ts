import { Vector2 } from "../math/Vector2";
import {
  drawGrid,
  drawScenicBackdrop,
  drawWorldLabel,
} from "../render/canvasPrimitives";
import { worldToScreen } from "../render/viewport";
import {
  SceneDefinition,
  ScenePanelData,
  SceneRenderArgs,
  SceneState,
} from "./types";

interface StudySceneOptions {
  id: string;
  title: string;
  subtitle: string;
  accent: string;
  summary: string;
  stageLabel: string;
  highlights: string[];
  formulaTags: string[];
  panel: ScenePanelData;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
      return;
    }

    lines.push(current);
    current = word;
  });

  if (current) {
    lines.push(current);
  }

  return lines;
}

function drawRoundedPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawStudyBoard(
  args: SceneRenderArgs,
  options: StudySceneOptions,
) {
  const { ctx, viewport } = args;
  const topLeft = worldToScreen(viewport, new Vector2(2.1, 1.0));
  const bottomRight = worldToScreen(viewport, new Vector2(19.9, 6.9));
  const width = bottomRight.x - topLeft.x;
  const height = bottomRight.y - topLeft.y;
  const accent = options.accent;

  ctx.save();
  drawRoundedPanel(ctx, topLeft.x, topLeft.y, width, height, 26);
  ctx.fillStyle = "rgba(250, 252, 255, 0.95)";
  ctx.fill();
  ctx.strokeStyle = "rgba(22, 32, 51, 0.16)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const gridColor = "rgba(55, 88, 132, 0.09)";
  for (let x = topLeft.x + 24; x < bottomRight.x; x += 34) {
    ctx.beginPath();
    ctx.strokeStyle = gridColor;
    ctx.moveTo(x, topLeft.y);
    ctx.lineTo(x, bottomRight.y);
    ctx.stroke();
  }
  for (let y = topLeft.y + 24; y < bottomRight.y; y += 34) {
    ctx.beginPath();
    ctx.strokeStyle = gridColor;
    ctx.moveTo(topLeft.x, y);
    ctx.lineTo(bottomRight.x, y);
    ctx.stroke();
  }

  ctx.fillStyle = accent;
  drawRoundedPanel(ctx, topLeft.x + 20, topLeft.y + 18, 110, 34, 17);
  ctx.fill();
  ctx.fillStyle = "#07111f";
  ctx.font = "700 17px Inter, sans-serif";
  ctx.fillText("BASE", topLeft.x + 50, topLeft.y + 41);

  ctx.fillStyle = "#121826";
  ctx.font = "700 28px Inter, sans-serif";
  ctx.fillText(options.title, topLeft.x + 20, topLeft.y + 90);

  ctx.fillStyle = "rgba(24, 33, 49, 0.84)";
  ctx.font = "600 16px Inter, sans-serif";
  ctx.fillText(options.subtitle, topLeft.x + 20, topLeft.y + 118);

  ctx.fillStyle = "rgba(30, 41, 59, 0.86)";
  ctx.font = "600 13px Inter, sans-serif";
  ctx.fillText(options.stageLabel, topLeft.x + width - 150, topLeft.y + 40);

  ctx.fillStyle = "#0f1726";
  ctx.font = "700 16px Inter, sans-serif";
  ctx.fillText("Mapa rapido", topLeft.x + 20, topLeft.y + 164);

  ctx.font = "500 15px Inter, sans-serif";
  const bulletLeft = topLeft.x + 26;
  let bulletY = topLeft.y + 196;
  options.highlights.forEach((item) => {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(bulletLeft, bulletY - 5, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(18, 24, 38, 0.92)";
    const lines = wrapText(ctx, item, width - 88);
    lines.forEach((line, index) => {
      ctx.fillText(line, bulletLeft + 14, bulletY + index * 18);
    });
    bulletY += Math.max(28, lines.length * 18 + 10);
  });

  ctx.fillStyle = "#0f1726";
  ctx.font = "700 16px Inter, sans-serif";
  ctx.fillText("Formulas-chave", topLeft.x + 20, bottomRight.y - 122);

  let chipX = topLeft.x + 20;
  let chipY = bottomRight.y - 92;
  ctx.font = "700 13px Inter, sans-serif";
  options.formulaTags.forEach((tag) => {
    const chipWidth = ctx.measureText(tag).width + 24;
    if (chipX + chipWidth > bottomRight.x - 20) {
      chipX = topLeft.x + 20;
      chipY += 38;
    }

    ctx.fillStyle = "rgba(13, 24, 44, 0.08)";
    drawRoundedPanel(ctx, chipX, chipY, chipWidth, 28, 14);
    ctx.fill();
    ctx.strokeStyle = "rgba(32, 47, 74, 0.12)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#162132";
    ctx.fillText(tag, chipX + 12, chipY + 18);
    chipX += chipWidth + 10;
  });

  ctx.restore();
}

function buildStudyScene(options: StudySceneOptions): SceneDefinition {
  return {
    id: options.id,
    title: options.title,
    subtitle: options.subtitle,
    accent: options.accent,
    category: "Matematica base",
    summary: options.summary,
    worldWidth: 22,
    worldHeight: 8,
    keyboardHints: [
      "Abra a aba Didatico",
      "Use como base de revisao",
      "Resolva o exercicio ao final",
    ],
    defaults: {},
    controls: [],
    createState: () => ({}),
    step: () => {},
    render: (args) => {
      const { ctx, viewport } = args;
      drawScenicBackdrop(ctx, viewport, {
        groundY: 7.1,
        hillHeight: 0.92,
        treeSpacing: 4.5,
      });
      drawGrid(ctx, viewport, 1);
      drawStudyBoard(args, options);
      drawWorldLabel(ctx, viewport, new Vector2(2.2, 7.45), "Teoria de apoio para a parte matematica da base");
    },
    buildPanelData: () => options.panel,
    autoLoopDefault: false,
  };
}

const algebraFoundationScene = buildStudyScene({
  id: "math-algebra-foundations",
  title: "Algebra Base",
  subtitle: "Equacoes, produtos notaveis e fatoracao",
  accent: "#ffd36f",
  summary:
    "Resumo teorico da base algébrica: equacoes de 1º e 2º grau, identidades notaveis e tecnicas de fatoracao.",
  stageLabel: "Base (i)",
  highlights: [
    "Equacao e uma igualdade com incognita; resolver e encontrar os valores que tornam a igualdade verdadeira.",
    "Produtos notaveis servem para expandir rapido e reconhecer padroes importantes de quadrados e diferenca de quadrados.",
    "Fatorar e escrever uma expressao como produto, o caminho natural para simplificar e resolver varias equacoes.",
    "Sempre respeite as equivalencias: o que faz de um lado, precisa fazer do outro.",
  ],
  formulaTags: [
    "(a+b)^2 = a^2 + 2ab + b^2",
    "(a-b)^2 = a^2 - 2ab + b^2",
    "(a+b)(a-b) = a^2 - b^2",
    "ax^2 + bx + c = 0",
  ],
  panel: {
    metrics: [
      {
        label: "Blocos centrais",
        value: "3",
        helper: "Equacoes, produtos notaveis e fatoracao formam o nucleo dessa base.",
      },
      {
        label: "Equacoes cobertas",
        value: "1º e 2º grau",
        helper: "Com principios de equivalencia, delta e produto nulo.",
      },
      {
        label: "Padroes notaveis",
        value: "4 principais",
        helper: "Quadrado da soma, quadrado da diferenca, soma pela diferenca e cubos.",
      },
      {
        label: "Objetivo",
        value: "Reconhecer estrutura",
        helper: "A maior habilidade aqui e enxergar o formato da expressao antes de manipular.",
      },
    ],
    formulas: [
      {
        title: "Equacao do 1º grau",
        formula: "$$ax + b = 0 \\Rightarrow x = -\\frac{b}{a}$$",
        explanation:
          "Toda equacao linear pode ser resolvida isolando a incognita com operacoes equivalentes.",
      },
      {
        title: "Bhaskara",
        formula:
          "$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$",
        explanation:
          "Para equacoes do 2º grau, o discriminante decide quantidade e natureza das raizes.",
      },
      {
        title: "Diferenca de quadrados",
        formula: "$$a^2 - b^2 = (a-b)(a+b)$$",
        explanation:
          "Esse e um dos padroes de fatoracao mais usados em simplificacao e resolucao de equacoes.",
      },
    ],
    concept: [
      {
        title: "O que dominar nesta etapa",
        body: "Identificar o tipo de equacao, reorganizar termos, reconhecer produtos notaveis e saber quando transformar soma em produto por fatoracao.",
      },
    ],
    studyNotes: [
      {
        title: "Metodo seguro",
        body: "Primeiro reduza termos semelhantes, depois observe se existe fator comum ou padrao notavel, e so entao escolha a tecnica de resolucao.",
      },
    ],
    loopSteps: [
      {
        title: "1. Simplifique a expressao",
        body: "Retire parenteses, reduza termos semelhantes e organize por grau.",
      },
      {
        title: "2. Reconheca o formato",
        body: "Veja se e linear, quadratica ou se pode ser fatorada antes de resolver.",
      },
      {
        title: "3. Resolva e confira",
        body: "Substitua a resposta na equacao original sempre que possivel.",
      },
    ],
    exercises: [
      {
        title: "Fatoracao + produto nulo",
        prompt: "Resolva x^2 - 5x + 6 = 0.",
        answer: "Fatorando: (x-2)(x-3)=0, logo x=2 ou x=3.",
        steps: [
          "Procure dois numeros cujo produto seja 6 e cuja soma seja -5.",
          "Escreva x^2 - 5x + 6 = (x-2)(x-3).",
          "Use o principio do produto nulo.",
        ],
      },
    ],
    intuition: [
      {
        title: "Olhar estrutural",
        body: "Muita conta de algebra fica simples quando voce para de ver termos isolados e passa a ver padroes inteiros.",
      },
    ],
    engineering: [
      {
        title: "Por que isso volta em fisica",
        body: "Quase toda modelagem basica em cinemática, ótica e circuitos exige isolamento de variavel, resolucao de equacoes e simplificacao algébrica.",
      },
    ],
    pitfalls: [
      {
        title: "Erro comum",
        body: "Trocar sinal ao passar termo de um lado para o outro ou aplicar produto notavel em ordem errada.",
      },
    ],
  },
});

const fractionsScene = buildStudyScene({
  id: "math-fractions-algebra",
  title: "Fracoes e Manipulacoes",
  subtitle: "Operacoes, MMC e simplificacao algebrica",
  accent: "#74e1ff",
  summary:
    "Base de fracoes numericas e algebricas: simplificacao, MMC, soma, multiplicacao, divisao, fracoes algebricas e racionalizacao.",
  stageLabel: "Base (ii)",
  highlights: [
    "Fracao representa divisao; o denominador nunca pode ser zero.",
    "Somar e subtrair fracoes pede denominador comum; multiplicar e dividir seguem regras proprias.",
    "Fracoes algebricas exigem fatoracao para simplificar com seguranca.",
    "Antes de cortar termos, transforme soma em produto. Cancelamento so vale entre fatores.",
  ],
  formulaTags: [
    "\\frac{a}{b} + \\frac{c}{d} = \\frac{ad+bc}{bd}",
    "\\frac{a}{b} \\cdot \\frac{c}{d} = \\frac{ac}{bd}",
    "\\frac{a}{b} \\div \\frac{c}{d} = \\frac{ad}{bc}",
    "b \\neq 0, d \\neq 0",
  ],
  panel: {
    metrics: [
      {
        label: "Operacoes obrigatorias",
        value: "4",
        helper: "Simplificar, somar, multiplicar e dividir sao indispensaveis.",
      },
      {
        label: "Ferramenta-chave",
        value: "MMC",
        helper: "Essencial para soma e subtracao com denominadores diferentes.",
      },
      {
        label: "Regra mais negligenciada",
        value: "Nao cortar soma",
        helper: "Cancelamento e permitido apenas entre fatores multiplicativos.",
      },
      {
        label: "Meta",
        value: "Manipular sem erro",
        helper: "Fracoes aparecem o tempo todo em formulas fisicas e mudanca de unidades.",
      },
    ],
    formulas: [
      {
        title: "Soma de fracoes",
        formula:
          "$$\\frac{a}{b}+\\frac{c}{d}=\\frac{ad+bc}{bd}$$",
        explanation:
          "Com denominadores diferentes, leve tudo para um denominador comum antes de somar.",
      },
      {
        title: "Divisao de fracoes",
        formula:
          "$$\\frac{a}{b}\\div\\frac{c}{d}=\\frac{a}{b}\\cdot\\frac{d}{c}$$",
        explanation:
          "Dividir por fracao e multiplicar pelo inverso multiplicativo.",
      },
      {
        title: "Fracao algebrica",
        formula:
          "$$\\frac{x^2-9}{x^2-3x}=\\frac{(x-3)(x+3)}{x(x-3)}$$",
        explanation:
          "Fatore antes de simplificar; depois preserve as restricoes do denominador.",
      },
    ],
    concept: [
      {
        title: "O que realmente importa",
        body: "Entender denominador comum, equivalencia de fracoes, restricao de dominio e a diferenca entre fator e termo somado.",
      },
    ],
    studyNotes: [
      {
        title: "Checklist rapido",
        body: "Veja se da para simplificar, ache o MMC quando necessario, e so corte fatores iguais depois de fatorar o numerador e o denominador.",
      },
    ],
    loopSteps: [
      {
        title: "1. Observe o tipo de operacao",
        body: "Soma e subtracao pedem denominador comum; multiplicacao e divisao nao.",
      },
      {
        title: "2. Fatore se for algebrica",
        body: "Sem fatorar, voce corre o risco de cancelar o que nao pode.",
      },
      {
        title: "3. Registre restricoes",
        body: "Qualquer valor que zera o denominador continua proibido, mesmo apos simplificar.",
      },
    ],
    exercises: [
      {
        title: "Fracao algebrica",
        prompt: "Simplifique (x^2 - 9) / (x^2 - 3x).",
        answer: "A forma simplificada e (x+3)/x, com x diferente de 0 e 3.",
        steps: [
          "Fatore o numerador: x^2 - 9 = (x-3)(x+3).",
          "Fatore o denominador: x^2 - 3x = x(x-3).",
          "Cancele o fator comum (x-3), mantendo as restricoes originais.",
        ],
      },
    ],
    intuition: [
      {
        title: "Regra de ouro",
        body: "Somou? Nao corta. Fatorou? Ahi sim voce pode simplificar.",
      },
    ],
    engineering: [
      {
        title: "Por que isso volta em fisica",
        body: "Expressões com densidade, vazao, velocidade media, resistência equivalente e unidades compostas exigem dominio total de fracoes.",
      },
    ],
    pitfalls: [
      {
        title: "Erro comum",
        body: "Cancelar x em expressoes como (x+2)/x ou esquecer que denominador zero invalida a expressao.",
      },
    ],
  },
});

const proportionalityScene = buildStudyScene({
  id: "math-proportionality",
  title: "Proporcionalidade",
  subtitle: "Razoes, proporcoes, regra de tres e porcentagem",
  accent: "#7df0ba",
  summary:
    "Relacoes proporcionais diretas e inversas, escalas, taxas, porcentagem e leitura de razoes.",
  stageLabel: "Base (iii)",
  highlights: [
    "Razao compara grandezas; proporcao e igualdade entre duas razoes.",
    "Diretamente proporcional: se uma dobra, a outra dobra. Inversamente proporcional: se uma dobra, a outra cai pela metade.",
    "Regra de tres funciona porque preserva a proporcionalidade do problema.",
    "Porcentagem e apenas uma razao sobre 100, e deve ser tratada como numero.",
  ],
  formulaTags: [
    "\\frac{a}{b} = \\frac{c}{d}",
    "ad = bc",
    "y = kx",
    "y = \\frac{k}{x}",
  ],
  panel: {
    metrics: [
      {
        label: "Nucleo do tema",
        value: "Razao e proporcao",
        helper: "O resto do assunto se organiza em volta dessas duas ideias.",
      },
      {
        label: "Tipos principais",
        value: "Direta / inversa",
        helper: "Reconhecer o tipo da relacao e o primeiro passo da conta.",
      },
      {
        label: "Aplicacoes base",
        value: "Porcentagem e escala",
        helper: "Duas formas recorrentes de proporcionalidade no ensino medio.",
      },
      {
        label: "Ferramenta rapida",
        value: "Produto dos meios",
        helper: "Se a/b = c/d, entao ad = bc.",
      },
    ],
    formulas: [
      {
        title: "Proporcao",
        formula: "$$\\frac{a}{b}=\\frac{c}{d} \\Rightarrow ad=bc$$",
        explanation:
          "A multiplicacao cruzada e valida porque as duas razoes representam o mesmo valor.",
      },
      {
        title: "Direta",
        formula: "$$y = kx$$",
        explanation:
          "A razao y/x permanece constante quando as grandezas sao diretamente proporcionais.",
      },
      {
        title: "Inversa",
        formula: "$$y = \\frac{k}{x}$$",
        explanation:
          "O produto xy permanece constante quando as grandezas sao inversamente proporcionais.",
      },
    ],
    concept: [
      {
        title: "O que enxergar primeiro",
        body: "Antes de montar conta, decida se as grandezas crescem juntas, diminuem juntas ou uma cresce enquanto a outra diminui.",
      },
    ],
    studyNotes: [
      {
        title: "Regra de tres com criterio",
        body: "Monte a tabela, alinhe grandezas da mesma especie e so cruzar depois de verificar se a relacao e direta ou inversa.",
      },
    ],
    loopSteps: [
      {
        title: "1. Defina a relacao",
        body: "Classifique a variacao como direta ou inversa.",
      },
      {
        title: "2. Monte a proporcao",
        body: "Escreva a igualdade entre razoes equivalentes ou a constancia do produto.",
      },
      {
        title: "3. Resolva a incognita",
        body: "Aplique produto dos meios ou isole a variavel na expressao.",
      },
    ],
    exercises: [
      {
        title: "Regra de tres simples",
        prompt: "Se 4 cadernos custam 36 reais, quanto custam 7 cadernos?",
        answer: "63 reais.",
        steps: [
          "A relacao e diretamente proporcional.",
          "Monte 4/36 = 7/x ou 36/4 = x/7.",
          "Resolva: x = 63.",
        ],
      },
    ],
    intuition: [
      {
        title: "Teste mental",
        body: "Se dobrar uma grandeza, o que voce espera da outra? Essa pergunta ja revela o tipo de proporcionalidade.",
      },
    ],
    engineering: [
      {
        title: "Por que isso volta em fisica",
        body: "Escalas de mapa, densidade, velocidade media, leis experimentais e conversoes percentuais dependem de raciocinio proporcional.",
      },
    ],
    pitfalls: [
      {
        title: "Erro comum",
        body: "Montar regra de tres direta em um problema que e inversamente proporcional, como operarios versus tempo.",
      },
    ],
  },
});

const powersRootsScene = buildStudyScene({
  id: "math-powers-roots",
  title: "Potenciacao e Radiciacao",
  subtitle: "Leis de expoentes, raizes e expoente fracionario",
  accent: "#c8a7ff",
  summary:
    "Conjunto completo das leis de potenciacao e radiciacao: expoente zero, negativo, fracionario, propriedades de raizes e racionalizacao.",
  stageLabel: "Base (iv)",
  highlights: [
    "Potenciação compacta multiplicacoes repetidas; radiciacao e o processo inverso em varios contextos.",
    "Regras de expoentes dependem da estrutura: mesma base, potencia de potencia, potencia de produto e quociente.",
    "Expoente negativo indica inverso; expoente fracionario conecta potencia e raiz.",
    "Em radicais, simplifique fatorando, extraia quadrados perfeitos e racionalize quando necessario.",
  ],
  formulaTags: [
    "a^m \\cdot a^n = a^{m+n}",
    "\\frac{a^m}{a^n} = a^{m-n}",
    "(a^m)^n = a^{mn}",
    "a^{1/n} = \\sqrt[n]{a}",
  ],
  panel: {
    metrics: [
      {
        label: "Regras essenciais",
        value: "8+",
        helper: "Multiplicacao, divisao, potencia de potencia, expoente zero, negativo e fracionario.",
      },
      {
        label: "Ponte central",
        value: "Expoente fracionario",
        helper: "Liga diretamente potencia e raiz.",
      },
      {
        label: "Operacoes com radicais",
        value: "Produto / quociente / simplificacao",
        helper: "Fundamentais para evitar contas desnecessarias.",
      },
      {
        label: "Meta",
        value: "Reescrever expressoes",
        helper: "O grande ganho aqui e transformar formas diferentes numa forma comparavel.",
      },
    ],
    formulas: [
      {
        title: "Mesma base",
        formula: "$$a^m \\cdot a^n = a^{m+n}$$",
        explanation:
          "Ao multiplicar potencias de mesma base, conserve a base e some os expoentes.",
      },
      {
        title: "Expoente negativo",
        formula: "$$a^{-n}=\\frac{1}{a^n}$$",
        explanation:
          "Expoente negativo nao produz numero negativo por si so; ele indica inverso multiplicativo.",
      },
      {
        title: "Raiz como potencia",
        formula: "$$\\sqrt[n]{a^m}=a^{m/n}$$",
        explanation:
          "Essa equivalencia costuma simplificar muito operacoes mistas entre potencia e radical.",
      },
    ],
    concept: [
      {
        title: "O que dominar nesta etapa",
        body: "Saber reescrever expressoes usando as leis de expoentes e identificar quando uma raiz pode ser simplificada ou racionalizada.",
      },
    ],
    studyNotes: [
      {
        title: "Roteiro seguro",
        body: "Primeiro observe a base, depois o tipo de operacao. Nunca some expoentes se as bases forem diferentes.",
      },
    ],
    loopSteps: [
      {
        title: "1. Identifique a estrutura",
        body: "Mesma base? Potencia elevada a potencia? Produto dentro do parenteses?",
      },
      {
        title: "2. Escolha a lei correta",
        body: "Cada formato pede uma regra especifica; o erro mais comum e misturar regras parecidas.",
      },
      {
        title: "3. Simplifique a forma final",
        body: "Troque radical por expoente fracionario ou o inverso, se isso deixar a expressao mais limpa.",
      },
    ],
    exercises: [
      {
        title: "Leis de expoentes",
        prompt: "Simplifique a^3 · a^-5 · a^2.",
        answer: "a^0 = 1, desde que a seja diferente de zero.",
        steps: [
          "Some os expoentes porque a base e a mesma: 3 + (-5) + 2 = 0.",
          "Use a^0 = 1 para a ≠ 0.",
        ],
      },
    ],
    intuition: [
      {
        title: "Regra estrutural",
        body: "Em potencia, a pergunta certa e: a base se repetiu ou mudou? Quase toda regra depende disso.",
      },
    ],
    engineering: [
      {
        title: "Por que isso volta em fisica",
        body: "Notacao cientifica, conversoes de unidades, ondas, escalas logaritmicas e formulas com raiz aparecem o tempo todo.",
      },
    ],
    pitfalls: [
      {
        title: "Erro comum",
        body: "Aplicar a^m + a^n = a^{m+n}, o que e falso. Soma de potencias nao segue a regra da multiplicacao.",
      },
    ],
  },
});

const geometryTrigScene = buildStudyScene({
  id: "math-geometry-trigonometry",
  title: "Geometria e Trigonometria",
  subtitle: "Figuras planas, areas, angulos e razoes trigonometricas",
  accent: "#ff9ec2",
  summary:
    "Base de geometria plana e trigonometria: angulos, triangulos, areas, circunferencia, Pitagoras e seno, cosseno e tangente.",
  stageLabel: "Base (v)",
  highlights: [
    "Geometria plana organiza medidas de comprimento, angulo, area e propriedades de figuras no plano.",
    "Triangulos concentram grande parte da base: soma dos angulos internos, classificacao, congruencia e semelhanca.",
    "Teorema de Pitagoras e a ponte entre geometria e trigonometria no triangulo retangulo.",
    "Seno, cosseno e tangente relacionam lados e angulos e aparecem em decomposicao vetorial e analise de inclinacao.",
  ],
  formulaTags: [
    "a^2 = b^2 + c^2",
    "\\sin \\theta = \\frac{cat. oposto}{hipotenusa}",
    "\\cos \\theta = \\frac{cat. adj.}{hipotenusa}",
    "\\tan \\theta = \\frac{cat. oposto}{cat. adj.}",
  ],
  panel: {
    metrics: [
      {
        label: "Eixo central",
        value: "Triangulos",
        helper: "Boa parte da geometria plana e da trigonometria passa por eles.",
      },
      {
        label: "Ferramenta-chave",
        value: "Pitagoras",
        helper: "Base para diagonais, distancias e trigonometria no triangulo retangulo.",
      },
      {
        label: "Razoes trigonometricas",
        value: "sen, cos, tg",
        helper: "Essenciais para decompor vetores e resolver problemas inclinados.",
      },
      {
        label: "Aplicacoes basicas",
        value: "Area e inclinacao",
        helper: "Duas frentes onde o assunto aparece com mais frequencia.",
      },
    ],
    formulas: [
      {
        title: "Pitagoras",
        formula: "$$h^2 = c_1^2 + c_2^2$$",
        explanation:
          "Vale em todo triangulo retangulo e permite relacionar os tres lados.",
      },
      {
        title: "Area do triangulo",
        formula: "$$A = \\frac{b \\cdot h}{2}$$",
        explanation:
          "Uma das formulas mais recorrentes em geometria plana.",
      },
      {
        title: "Tangente",
        formula:
          "$$\\tan\\theta = \\frac{\\text{cateto oposto}}{\\text{cateto adjacente}}$$",
        explanation:
          "Especialmente util quando se quer relacionar inclinacao com razao entre variacao vertical e horizontal.",
      },
    ],
    concept: [
      {
        title: "O que dominar nesta etapa",
        body: "Medidas de figuras planas, propriedades de triangulos e o significado geometrico de seno, cosseno e tangente.",
      },
    ],
    studyNotes: [
      {
        title: "Ordem segura",
        body: "Primeiro desenhe a figura, identifique angulos e lados conhecidos, depois escolha entre area, Pitagoras, semelhanca ou trigonometria.",
      },
    ],
    loopSteps: [
      {
        title: "1. Modele a figura",
        body: "Transforme o texto do problema em um desenho com medidas e angulos marcados.",
      },
      {
        title: "2. Escolha a relacao",
        body: "Use area, Pitagoras ou uma razao trigonometrica de acordo com o dado e o que falta.",
      },
      {
        title: "3. Confira unidades e sentido",
        body: "Comprimento, area e angulo nao podem ser misturados sem criterio.",
      },
    ],
    exercises: [
      {
        title: "Pitagoras",
        prompt: "Num triangulo retangulo com catetos 6 e 8, quanto mede a hipotenusa?",
        answer: "10.",
        steps: [
          "Aplique h^2 = 6^2 + 8^2 = 36 + 64 = 100.",
          "Extraia a raiz: h = 10.",
        ],
      },
    ],
    intuition: [
      {
        title: "Leitura espacial",
        body: "Quando o problema fala de inclinacao ou alcance, quase sempre ha um triangulo escondido pedindo para ser desenhado.",
      },
    ],
    engineering: [
      {
        title: "Por que isso volta em fisica",
        body: "Vetores, planos inclinados, lancamento obliquo, torque e estatica usam trigonometria e geometria o tempo todo.",
      },
    ],
    pitfalls: [
      {
        title: "Erro comum",
        body: "Usar seno no lugar de cosseno sem definir em relacao a qual angulo o lado e oposto ou adjacente.",
      },
    ],
  },
});

const functionsScene = buildStudyScene({
  id: "math-functions-foundation",
  title: "Funcoes Basicas",
  subtitle: "Afim, quadratica, graficos e propriedades",
  accent: "#9fb6ff",
  summary:
    "Teoria de funcao, dominio, imagem, funcao afim e quadratica, leitura de graficos, raiz, vertice, crescimento e concavidade.",
  stageLabel: "Base (vi)",
  highlights: [
    "Funcao associa cada valor de entrada a um unico valor de saida.",
    "Na funcao afim, o coeficiente angular controla a inclinacao da reta e o coeficiente linear marca o corte no eixo y.",
    "Na quadratica, o sinal de a define a concavidade; delta, raizes e vertice descrevem a forma da parabola.",
    "Grafico e propriedades andam juntos: crescimento, decrescimento, zeros, dominio, imagem e intervalos de sinal.",
  ],
  formulaTags: [
    "f(x) = ax + b",
    "f(x) = ax^2 + bx + c",
    "x_v = -\\frac{b}{2a}",
    "y_v = -\\frac{\\Delta}{4a}",
  ],
  panel: {
    metrics: [
      {
        label: "Funcoes foco",
        value: "Afim e quadratica",
        helper: "As duas mais basicas e mais cobradas nessa etapa.",
      },
      {
        label: "Leitura grafica",
        value: "Zeros, vertice e inclinacao",
        helper: "Sao os elementos mais importantes para interpretar o grafico.",
      },
      {
        label: "Perguntas tipicas",
        value: "Cresce? zera? onde atinge extremo?",
        helper: "Quase todo exercicio gira em torno dessas tres leituras.",
      },
      {
        label: "Ponte com fisica",
        value: "Reta e parabola",
        helper: "Grafico de MRU e parabola de MRUV aparecem diretamente depois.",
      },
    ],
    formulas: [
      {
        title: "Funcao afim",
        formula: "$$f(x)=ax+b$$",
        explanation:
          "O grafico e uma reta. O coeficiente a mede a inclinacao e b e o intercepto em y.",
      },
      {
        title: "Funcao quadratica",
        formula: "$$f(x)=ax^2+bx+c$$",
        explanation:
          "O grafico e uma parabola; o sinal de a define se a concavidade aponta para cima ou para baixo.",
      },
      {
        title: "Vertice da parabola",
        formula:
          "$$x_v=-\\frac{b}{2a},\\quad y_v=-\\frac{\\Delta}{4a}$$",
        explanation:
          "O vertice concentra o valor minimo ou maximo da funcao quadratica.",
      },
    ],
    concept: [
      {
        title: "O que dominar nesta etapa",
        body: "Conceito de funcao, leitura de grafico, interpretacao de coeficientes e propriedades basicas das funcoes afim e quadratica.",
      },
    ],
    studyNotes: [
      {
        title: "Jeito certo de estudar",
        body: "Nao memorize so formulas; sempre conecte cada coeficiente a um efeito visivel no grafico.",
      },
    ],
    loopSteps: [
      {
        title: "1. Identifique o tipo",
        body: "Veja se a expressao e linear, quadratica ou outra classe.",
      },
      {
        title: "2. Extraia propriedades",
        body: "Leia coeficientes, raizes, concavidade, vertice, crescimento e cortes com os eixos.",
      },
      {
        title: "3. Relacione formula e grafico",
        body: "A interpretacao so fica solida quando forma analitica e representacao grafica conversam.",
      },
    ],
    exercises: [
      {
        title: "Leitura de funcao afim",
        prompt: "Na funcao f(x)=3x-6, qual a raiz e o que o coeficiente 3 representa?",
        answer: "A raiz e x=2, e o 3 representa a inclinacao da reta.",
        steps: [
          "Para a raiz, imponha f(x)=0: 3x-6=0.",
          "Resolva x=2.",
          "O coeficiente angular positivo indica reta crescente.",
        ],
      },
    ],
    intuition: [
      {
        title: "Leitura grafica",
        body: "Toda funcao conta uma historia de entrada e saida; o grafico mostra essa historia sem precisar recalcular ponto por ponto.",
      },
    ],
    engineering: [
      {
        title: "Por que isso volta em fisica",
        body: "Relacoes lineares e quadraticas aparecem em movimento, energia, eletricidade, optica e ajuste de dados experimentais.",
      },
    ],
    pitfalls: [
      {
        title: "Erro comum",
        body: "Confundir raiz da funcao com intercepto em y ou esquecer que o vertice da parabola depende de a e b ao mesmo tempo.",
      },
    ],
  },
});

export const mathFoundationScenes = [
  algebraFoundationScene,
  fractionsScene,
  proportionalityScene,
  powersRootsScene,
  geometryTrigScene,
  functionsScene,
];
