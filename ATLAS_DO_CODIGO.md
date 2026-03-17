# Atlas do Codigo - Physics Sim Lab

## Escopo deste atlas

Este atlas cobre todos os arquivos rastreados pelo Git no repositorio e explica:

- o papel de cada arquivo;
- como a arquitetura foi dividida;
- quais tecnicas de fisica aparecem no projeto;
- onde o codigo simplifica a fisica para ficar didatico e estavel;
- qual parte parece mais sofisticada e por que.

Arquivos gerados ou externos, como `dist/` e `node_modules/`, ficaram de fora porque nao sao codigo autoral do projeto.

## O que este projeto e

Este projeto e um laboratorio de fisica feito com `React + TypeScript + Canvas 2D`. A ideia central e separar:

- a casca da interface;
- o runtime da simulacao;
- um contrato comum para cenas;
- um conjunto de utilitarios matematicos e fisicos;
- e, em um caso especial, um motor fisico 2D proprio chamado `ventania3d`.

Em quase todas as cenas o app privilegia clareza didatica. Quando existe formula fechada, o codigo usa a formula diretamente. Quando o fenomeno pede evolucao temporal, forcas ou contato, o projeto vai para integracao numerica. Quando a cena precisa de corpo rigido, torque, atrito e colisao composta, ele sobe de nivel e usa o `ventania3d`.

## A historia do codigo

Se eu estivesse te mostrando esse projeto como autor, eu diria algo nessa linha:

> "Bom, eu usei React para montar a moldura da aplicacao, nao para fazer a fisica. React cuida de trocar de cena, guardar os sliders, mostrar tutorial, formulas e exercicios. A fisica de verdade fica fora dos componentes visuais."

> "A primeira decisao importante foi criar um contrato unico para todas as cenas em `src/physics/scenes/types.ts`. Com isso, toda cena precisa saber fazer quatro coisas: criar estado, avancar um passo de simulacao, desenhar no canvas e montar os dados didaticos do painel. Isso deixa o `SimulationStage` generico."

> "Depois eu fiz o runtime em `src/components/SimulationStage.tsx`. Ele e o coracao do laboratorio: roda com `dt` fixo de `1/60 s`, guarda historico para timeline e rewind, publica telemetria para o painel lateral, resolve drag de vetores/objetos e carrega os sprites."

> "Para as cenas mais classicas, eu preferi formula fechada em vez de solver numerico. Em MRU, MRUV, MCU, vetores, polia ideal, estaticas e suporte na parede, eu resolvo a fisica com equacoes analiticas porque isso fica mais fiel ao que o aluno ve no livro."

> "Quando eu quis mostrar forca acumulada, queda, quique, arrasto e salto, usei um solver simples de particula com integracao `semi-implicit Euler`. E a mesma ideia que aparece muito em engines e sandboxes: atualiza velocidade pela aceleracao e so depois atualiza posicao. E barato, estavel e muito mais honesto do que animar por interpolacao fake."

> "A parte mais complicada foi a cena da empilhadeira. Ali eu precisei de rigid body, torque, velocidade angular, atrito no contato, colisores compostos, queries no mundo, geometria de cilindro hidraulico e uma estimativa de tombamento. Por isso eu separei um motor fisico 2D proprio em `src/ventania3d`."

> "Na empilhadeira eu nao movo o chassi empurrando a posicao manualmente. Eu gero torque na roda, calculo slip entre roda e solo, limito a tracao por `mu*N` e aplico a forca no ponto de contato. Isso e bem mais proximo do raciocinio de uma engine. Depois, quando a pa encosta na carga ou no piso, o solver devolve a reacao e o corpo gira de verdade."

> "O tilt tambem nao e um angulo solto de slider. Eu tratei o tilt como comprimento de um cilindro hidraulico. A cena fecha essa geometria e procura o angulo que corresponde ao comprimento atual do pistao. E um detalhe de engenharia que deixa a animacao menos 'arcade'."

> "Depois eu comecei a empacotar a parte de gameplay em cima do motor. O primeiro framework mais claro virou o de plataforma 2D: `PlatformerController`, loader de fase por dados, `one-way platform`, `moving platform carry`, `ladder`, `dash` e `checkpoint`. A ideia foi provar que o `ventania3d` ja nao serve so para a empilhadeira; ele ja sustenta outro tipo de jogo."

> "No fim, o projeto virou duas coisas ao mesmo tempo: um app didatico para estudar fisica e um showcase de arquitetura de simulacao."

## A espinha dorsal da arquitetura

### 1. React organiza, mas nao resolve a fisica

- `src/main.tsx` monta o app.
- `src/App.tsx` escolhe a cena ativa, guarda configuracoes por cena e injeta tudo em `SimulationStage` e `InspectorDeck`.
- `src/components/*` formam a interface lateral, o menu de cenas, o renderer de formulas e o renderer de markdown.

### 2. `SceneDefinition` padroniza tudo

O tipo `SceneDefinition` e a peca mais importante da arquitetura. Cada cena define:

- `createState`
- `step`
- `render`
- `buildPanelData`
- opcionalmente `getDragHandles`, `onDrag`, `getCameraWindow`

Isso permite que o motor de apresentacao seja unico, enquanto o conteudo fisico muda de cena para cena.

### 3. `SimulationStage` e o runtime

`SimulationStage` faz tudo que uma pequena engine de exibicao precisa:

- loop com passo fixo;
- canvas responsivo;
- historico de estados para timeline;
- rewind/frame-step;
- zoom;
- controle de taxa de reproducao;
- leitura de teclado;
- drag handles no espaco do mundo;
- publicacao de metricas e formulas;
- camera dinamica.

### 4. Dois niveis de fisica

O projeto tem dois niveis bem claros:

- nivel 1: formulas e particulas em `src/physics/*`;
- nivel 2: rigidbody composto e contatos em `src/ventania3d/*`.

Isso e uma escolha boa de engenharia, porque a maioria das cenas nao precisa pagar a complexidade de uma engine completa.

## Tecnicas de fisica usadas no projeto

### Formulas fechadas

Usadas quando o fenomeno tem solucao analitica simples:

- MRU: `x = x0 + vt`
- MRUV: `x = x0 + v0 t + 1/2 a t^2`, `v = v0 + at`
- MCU: `v = omega r`, `a_c = v^2/r`
- Atwood: aceleracao e tensao por formula
- vetores: soma e decomposicao trigonometrica
- estatica de cabos: soma de vetores e equilibrante
- suporte na parede: cortante e momento

Vantagem: a cena fica igual ao raciocinio de livro-texto.

### Integracao numerica

Usada quando o estado evolui por forcas:

- queda livre;
- salto;
- bola quicando;
- pacote do aviao;
- tracao simplificada;
- mola amortecida;
- e parcialmente na empilhadeira.

O integrador principal nas cenas 2D simples e o `semi-implicit Euler`:

`v_{n+1} = v_n + a dt`

`x_{n+1} = x_n + v_{n+1} dt`

Esse metodo e muito comum em engines de jogo porque custa pouco e tende a se comportar melhor que o Euler explicito puro no mesmo passo.

### Rigid body 2D com notacao 3D

No `ventania3d`, apesar do nome, a simulacao pratica e planar. O projeto usa `Vector3` porque isso facilita:

- produto vetorial;
- torque;
- ponto de aplicacao de forca;
- velocidade angular;
- e uma futura extensao.

Na pratica, quase tudo acontece em `x/y`, com `z = 0`.

### Colisao e contato

O mini motor usa uma pipeline bem reconhecivel de engine:

- `AABB` para filtro grosseiro;
- broad-phase por grade espacial para reduzir pares candidatos;
- interseccao exata de circulo-circulo, circulo-poligono e poligono-poligono;
- SAT para escolher eixo de menor penetracao;
- manifold de contato com normal e pontos;
- cache persistente de contato com `warm starting`;
- solver iterativo de impulso normal;
- impulso tangencial para atrito;
- correcao posicional para tirar interpenetracao;
- eventos `begin/stay/end` de contato;
- sleeping para corpos quase parados.

Ele agora tambem tem filtros de colisao por layer/mask, raycast analitico contra circulos e poligonos convexos, `circle cast`, `shape cast` convexo, cache persistente de contato com `warm starting` e `CCD/TOI` translacional para reduzir tunneling.

### Atrito e tracao

A ideia aparece em dois niveis:

- nas cenas simples, como rolamento/arrasto escalar;
- na empilhadeira, como limitacao de tracao no contato da roda com o piso por `mu*N`.

Na cena da empilhadeira existe explicitamente o conceito de `slip`:

`slip = omega*R - v_contato`

Depois disso, a forca tangencial e limitada pelo atrito maximo. Isso e bem tipico de simulacao de veiculo simplificada.

### Geometria de atuador

Na empilhadeira, o lift e o tilt sao tratados como atuadores com curso, velocidade e amortecimento. O lift vira deslocamento vertical do carriage. O tilt nao e aplicado diretamente: o codigo calcula o comprimento do cilindro e acha o angulo do garfo que fecha essa geometria.

### Estatica simplificada de tombamento

A capacidade da empilhadeira nao e tirada de tabela real. O codigo faz uma estimativa estatica de momento em torno do eixo dianteiro:

- momento restaurador da empilhadeira;
- contra momento da carga;
- margem estatica restante.

E uma simplificacao, mas a logica e a mesma da engenharia: se o momento da carga supera o restaurador, o sistema entra em zona de tombamento.

## Simplificacoes intencionais

O projeto simplifica varias coisas, mas quase sempre de forma honesta:

- `y` cresce para baixo em varias cenas porque o canvas trabalha assim.
- O arrasto nas cenas simples e linear, nao quadratico.
- O problema do barco ignora hidrodinamica real e usa soma vetorial pura.
- O pacote do aviao ignora resistencia do ar.
- A mola e 1D.
- A polia e ideal: corda sem massa e polia sem inercia.
- O sistema de tracao do carro com caixote trata tudo como um corpo equivalente.
- O `shape cast` do `ventania3d` hoje cobre formas convexas do proprio motor, mas ainda nao virou um pipeline mais geral com rotacao continua durante o sweep.
- O broad-phase do mundo ja usa grade espacial, o que melhora bem o custo, mas ainda nao e um pipeline mais sofisticado de sweep-and-prune ou BVH.
- O `CCD/TOI` continuo atual cobre principalmente movimento translacional; a parte angular ainda nao entrou como CCD completo.

Essas simplificacoes nao traem a intuicao fisica. Elas cortam custo computacional e deixam o codigo ensinavel.

## Ordem recomendada de leitura

Se voce quiser estudar esse repositorio sem se perder, abra nessa ordem:

1. `src/App.tsx`
2. `src/physics/scenes/types.ts`
3. `src/components/SimulationStage.tsx`
4. `src/data/scenes.ts`
5. `src/physics/core/solvers.ts`
6. `src/physics/core/body.ts`
7. uma cena simples, como `src/physics/scenes/mruScene.ts`
8. uma cena com integracao, como `src/physics/scenes/freeFallScene.ts`
9. a cena pesada `src/physics/scenes/forkliftScene.ts`
10. `src/ventania3d/dynamics/World.ts`
11. `src/ventania3d/dynamics/RigidBody.ts`
12. `src/ventania3d/collision/intersections.ts`
13. `src/ventania3d/framework/platformer/CharacterController.ts`
14. `src/ventania3d/framework/platformer/level.ts`
15. `src/ventania3d/framework/platformer/design.ts`
16. `src/ventania3d/framework/platformer/projectiles.ts`
17. `src/ventania3d/framework/platformer/editor.ts`
18. `src/physics/scenes/platformerLabScene.ts`

## Atlas por arquivo

### Raiz e infraestrutura

- `.github/workflows/deploy-pages.yml`: workflow de CI/CD que faz `npm ci`, `npm run build` e publica `dist/` no GitHub Pages.
- `.gitignore`: ignora dependencias, build, arquivos locais de ambiente, logs e cobertura.
- `README.md`: apresenta o simulador, as cenas, a estrutura do projeto e as decisoes didaticas.
- `index.html`: pagina HTML base do Vite; define `root`, metadata e carrega `src/main.tsx`.
- `package.json`: scripts e dependencias do app. Aqui ficam React, ReactDOM, KaTeX, TypeScript e Vite.
- `package-lock.json`: lockfile do npm para reproduzir exatamente a arvore de dependencias.
- `tsconfig.json`: configuracao TypeScript estrita, sem emissao, com resolucao apropriada para Vite.
- `vite.config.ts`: configura Vite, plugin React, porta local e `base` dinamico para deploy em GitHub Pages.
- `ATLAS_DO_CODIGO.md`: este documento.

### Assets visuais em `public/assets`

- `public/assets/airplane_drop_simulator.svg`: arte auxiliar/legado relacionada ao tema do aviao; nao aparece referenciada pelo app atual.
- `public/assets/boat.svg`: sprite do barco usado na cena de travessia do rio.
- `public/assets/bucket.svg`: sprite do balde usado na cena da polia/Atwood.
- `public/assets/car.svg`: sprite do carro usado em MRU, MRUV e tracao.
- `public/assets/crate.svg`: sprite do caixote usado em varias cenas, inclusive suporte e empilhadeira.
- `public/assets/package.svg`: sprite do pacote usado na cena do aviao.
- `public/assets/plane.svg`: sprite do aviao usado na cena de pacote lancado.
- `public/assets/pulley.svg`: sprite da polia na cena de Atwood.
- `public/assets/train.svg`: sprite do trem usado na cena de choque de trens.

### Imagens de referencia em `public/assets/references`

- `public/assets/references/boat-flow-vectors.svg`: imagem aberta usada como apoio visual no tutorial de barco e correnteza.
- `public/assets/references/free-body-diagram.svg`: imagem aberta de diagrama de corpo livre, reaproveitada nas cenas de estatica.
- `public/assets/references/projectile-motion.svg`: imagem aberta para reforcar a separacao horizontal/vertical no lancamento obliquo.
- `public/assets/references/vector-addition.svg`: diagrama de soma vetorial usado como referencia no laboratorio de vetores.

### Tutoriais didaticos em `public/content/tutorials`

Todos esses arquivos sao carregados dinamicamente por `TutorialTabs.tsx`. Eles servem como camada textual didatica externa ao codigo da cena.

- `public/content/tutorials/bouncing-ball.md`: explicacao de quique, restituição, energia e leitura da cena da bola quicando.
- `public/content/tutorials/cable-statics.md`: texto didatico sobre equilibrio vetorial em cabos e anel.
- `public/content/tutorials/forklift-showcase.md`: walkthrough didatico da empilhadeira, com foco em rigid body, tracao, estabilidade e contatos.
- `public/content/tutorials/free-fall.md`: explica queda livre, salto, peso, `F = m a` e o integrador numerico.
- `public/content/tutorials/incline.md`: texto sobre plano inclinado, decomposicao do peso e atrito.
- `public/content/tutorials/mcu.md`: explicacao de velocidade angular, tangencial e aceleracao centripeta.
- `public/content/tutorials/mru.md`: texto de MRU, equacao horaria e leitura grafica.
- `public/content/tutorials/mruv.md`: texto de MRUV, Torricelli e graficos.
- `public/content/tutorials/package-drop.md`: explicacao do pacote lancado, referenciais e movimento obliquo.
- `public/content/tutorials/pulley.md`: texto da polia ideal e maquina de Atwood.
- `public/content/tutorials/river-crossing.md`: material didatico de barco, correnteza e soma vetorial.
- `public/content/tutorials/spring.md`: explicacao da mola, Lei de Hooke e amortecimento.
- `public/content/tutorials/traction.md`: texto sobre tracao, resistencia ao rolamento e arrasto.
- `public/content/tutorials/train-collision.md`: explicacao do encontro de dois trens por velocidade relativa.
- `public/content/tutorials/vector-lab.md`: tutorial de vetores, componentes, soma e erro comum de sinais.
- `public/content/tutorials/wall-bracket.md`: texto sobre suporte em parede, momento e parafusos.
- `public/content/tutorials/wrecking-ball.md`: tutorial do pendulo de impacto, mostrando junta, `circle cast`, eventos de contato e stack de caixas sobre o `ventania3d`.

### Entrada da aplicacao em `src`

- `src/main.tsx`: importa CSS global, CSS do KaTeX e monta o componente `App` em `#root`.
- `src/App.tsx`: orquestrador principal; guarda cena ativa, configuracoes por cena, painel por cena, normaliza sliders e injeta tudo em `SceneTabs`, `SimulationStage` e `InspectorDeck`.
- `src/styles.css`: sistema visual completo da aplicacao, incluindo layout principal, side menu, stage, overlays, cards, tabs e HUD.
- `src/vite-env.d.ts`: tipos de ambiente do Vite para o compilador TypeScript.
- `src/data/scenes.ts`: registro central com a ordem de exibicao das cenas.

### Componentes em `src/components`

- `src/components/ControlPanel.tsx`: renderiza sliders e grupos de escolha a partir da lista declarativa de controles da cena.
- `src/components/ExercisePanel.tsx`: mostra os exercicios resolvidos que cada cena monta em `buildPanelData`.
- `src/components/InspectorDeck.tsx`: abas laterais de painel, controles, tutorial e exercicios; e a casca principal do painel direito.
- `src/components/MarkdownDocument.tsx`: parser/renderizador markdown minimo proprio. Evita dependencia externa e suporta titulos, listas, quotes, links, inline code e formulas KaTeX.
- `src/components/MathFormula.tsx`: wrapper de KaTeX; normaliza delimitadores e tenta alinhar equacoes longas em modo display.
- `src/components/MetricsPanel.tsx`: componente legado/alternativo para mostrar metricas; hoje parece nao estar mais montado no fluxo principal.
- `src/components/OverviewPanel.tsx`: combina metricas e formulas em uma leitura rapida da cena.
- `src/components/SceneTabs.tsx`: menu lateral de cenas, com versao recolhida e modo mobile.
- `src/components/SimulationStage.tsx`: o runtime do laboratorio. Faz loop fixo, timeline, rewind, zoom, playback rate, resize, teclado, drag handles, carga de sprites e render do canvas.
- `src/components/TutorialTabs.tsx`: carrega o markdown didatico de cada cena e alterna entre tabs conceituais, formulas, solver, intuicao, engenharia e referencias.

### Math e utilitarios 2D em `src/physics/math`

- `src/physics/math/Vector2.ts`: vetor 2D imutavel com soma, subtracao, escala, modulo, angulo, normalizacao, perpendicular, rotacao e distancia.
- `src/physics/math/scalar.ts`: utilitarios escalares simples, como `clamp`, `signOrZero`, `toRadians` e `approxZero`.

### Core fisico em `src/physics/core`

- `src/physics/core/body.ts`: define um corpo de particula com massa, raio, velocidade, forca acumulada e integracao `semi-implicit Euler`.
- `src/physics/core/cloneState.ts`: clona estados de cena, inclusive `Vector2`, arrays, objetos e instancias com metodo `clone`, para viabilizar historico e rewind.
- `src/physics/core/forces.ts`: biblioteca pequena de forcas prontas, como gravidade, arrasto linear, mola e amortecedor.
- `src/physics/core/solvers.ts`: formulas fechadas de varias areas. E o livro-texto do projeto em forma de funcoes.
- `src/physics/core/units.ts`: formatacao numerica e de grandezas para a UI.

### Render 2D em `src/physics/render`

- `src/physics/render/canvasPrimitives.ts`: biblioteca de desenho no canvas. Faz grid, chao, fundo cenico, setas, linhas, mola, sprites, labels e corpos circulares.
- `src/physics/render/itemSkins.ts`: paletas e filtros CSS para variar carro e aviao sem precisar de multiplos sprites.
- `src/physics/render/viewport.ts`: converte coordenadas mundo-tela, pixels-metros e tela-mundo.

### Contrato das cenas em `src/physics/scenes`

- `src/physics/scenes/types.ts`: define `SceneDefinition`, estado de input, metadados de painel, drag handles, viewport e contratos de `step/render`.

### Cenas de fisica em `src/physics/scenes`

- `src/physics/scenes/vectorLabScene.ts`: laboratorio de vetores. Usa decomposicao polar-cartesiana e soma vetorial; e a base conceitual para quase todo o resto.
- `src/physics/scenes/mruScene.ts`: exemplo mais simples do projeto. MRU puro com formula analitica, carro e vetor de velocidade arrastavel.
- `src/physics/scenes/mruvScene.ts`: estende o MRU para aceleracao constante; mostra `v(t)` e `x(t)` por formula fechada.
- `src/physics/scenes/mcuScene.ts`: usa seno/cosseno para reconstruir movimento circular e desenha vetores tangencial e centripeto.
- `src/physics/scenes/freeFallScene.ts`: queda livre com particula, forca horizontal, arrasto e salto. Mostra claramente o uso do integrador numerico e do acumulo de forcas.
- `src/physics/scenes/bouncingBallScene.ts`: queda com colisao no solo e nas paredes, uso de restituição e trilha temporal.
- `src/physics/scenes/packageDropScene.ts`: lancamento obliquo com referencial do aviao, movimento relativo e camera que acompanha a acao.
- `src/physics/scenes/tractionScene.ts`: dinamica 1D simplificada de carro mais caixote como massa equivalente, com tracao, rolamento e arrasto.
- `src/physics/scenes/inclineScene.ts`: plano inclinado com decomposicao do peso e atrito; trabalha em coordenada ao longo da rampa.
- `src/physics/scenes/trainCollisionScene.ts`: encontro de dois MRUs com velocidade relativa e ponto previsto de choque.
- `src/physics/scenes/riverCrossingScene.ts`: soma vetorial de velocidade do barco com a correnteza; mede deriva e tempo de travessia.
- `src/physics/scenes/cableStaticsScene.ts`: estatica vetorial de duas tracoes em um anel, com resultante e equilibrante.
- `src/physics/scenes/wallBracketScene.ts`: estatica estrutural simplificada de um suporte em parede; foca em peso, cortante, momento e esforco no par de parafusos.
- `src/physics/scenes/springScene.ts`: oscilador massa-mola amortecido em 1D, com energia cinetica e potencial elastica.
- `src/physics/scenes/pulleyScene.ts`: maquina de Atwood com formula analitica para aceleracao e tensao.
- `src/physics/scenes/wreckingBallScene.ts`: nova cena de pendulo de impacto feita inteiramente sobre o `ventania3d`, usando `DistanceJoint`, colisao entre rigid bodies, `circle cast` para prever o primeiro contato e eventos `begin` para contar impactos reais.
- `src/physics/scenes/engineLabScene.ts`: laboratorio de regressao da engine. Prova `CCD/TOI`, `shape cast`, `circle cast` e eventos de contato em uma cena dedicada.
- `src/physics/scenes/platformerLabScene.ts`: primeira cena que trata o `ventania3d` como base de framework de jogo. Usa `PlatformerController`, loader de fase por dados, `one-way platform`, `moving platform carry`, `ladder`, `dash`, `checkpoint`, `projectile emitter`, analise de salto e um editor leve por drag.
- `src/physics/scenes/forkliftScene.ts`: cena mais complexa do projeto. Usa o `ventania3d` para rigdbody composto, atuadores internos, colisao, atrito, tracao por slip, suporte de carga, queries de contato e estimativa de tombamento.

### O que ha de especial em `forkliftScene.ts`

Esse arquivo merece destaque separado porque ele mistura varias camadas:

- cria um `PhysicsWorld`;
- monta a empilhadeira como um rigidbody composto por varios colliders;
- constroi pallets/cargas como corpos separados;
- move lift e tilt como atuadores com limites, velocidade e damping;
- recalcula a geometria da pa em tempo real;
- usa queries como `circleWithScene` e `rayWithScene`;
- calcula slip de roda;
- converte torque em tracao no contato;
- aplica suporte hidraulico simplificado a uma carga encaixada;
- mede folga do garfo, pitch do chassi, massa de carga ativa e capacidade estatica estimada.

Se voce quer entender a parte "mais engine" do projeto, esse e o arquivo.

### Motor `ventania3d` em `src/ventania3d`

#### Barrel e utilitarios de entrada

- `src/ventania3d/index.ts`: barrel file que reexporta quase tudo do motor, incluindo casts, eventos, framework de platformer e comandos.
- `src/ventania3d/input/commands.ts`: traduz `InputState` do app em comandos semanticos da empilhadeira e tambem em comandos de platformer (`move`, `vertical`, `jump`, `dash`).

#### Math do motor

- `src/ventania3d/math/Matrix3.ts`: matriz 3x3 para transformacoes afins 2D.
- `src/ventania3d/math/Transform2D.ts`: transformacao 2D com posicao e rotacao, incluindo composicao e inversa aplicada a ponto.
- `src/ventania3d/math/Vector3.ts`: vetor 3D usado como base do motor; oferece rotacao em Z, produto vetorial, projeção e utilitarios para torque 2D.
- `src/ventania3d/math/scalar.ts`: utilitarios numericos do motor, como `clamp`, `lerp`, `approxZero`, `normalizeAngle`, `safeDivide` e `square`.

#### Colisao

- `src/ventania3d/collision/Aabb.ts`: define `Aabb`, uniao de caixas e teste de sobreposicao para broad-phase.
- `src/ventania3d/collision/contact.ts`: tipos de manifold e ponto de contato.
- `src/ventania3d/collision/contact.ts`: tipos de manifold, ponto de contato e conjuntos de eventos `begin/persist/end`.
- `src/ventania3d/collision/filter.ts`: filtros de colisao e de query por `layer/mask`, alem de opcoes para ignorar corpos e sensores em consultas.
- `src/ventania3d/collision/intersections.ts`: narrow-phase do motor. Resolve circulo-circulo, circulo-poligono e poligono-poligono com SAT, clipping e composicao de material.
- `src/ventania3d/collision/queries.ts`: queries de cena. Implementa probe circular, raycast analitico, `circle cast` e `shape cast` contra formas convexas do motor, com filtros de camada e exclusao de corpos.
- `src/ventania3d/collision/response.ts`: utilitario para deslizar um vetor ao longo de uma superficie, removendo a componente que entra na normal.
- `src/ventania3d/collision/shapes.ts`: define circulos e poligonos, calcula area, inercia, normais, AABB e suporte; e onde a geometria do motor nasce.

#### Dinamica

- `src/ventania3d/dynamics/Joint.ts`: sistema minimo de juntas, com implementacao de `DistanceJoint`.
- `src/ventania3d/dynamics/Material.ts`: material fisico basico com densidade, atrito e restituição.
- `src/ventania3d/dynamics/RigidBody.ts`: classe principal do corpo rigido. Guarda massa, inercia, colliders, acumuladores, velocidade angular e metodos de forca/impulso.
- `src/ventania3d/dynamics/World.ts`: mundo fisico. Integra forcas, aplica juntas, detecta contatos, resolve impulsos, corrige penetracao e dorme corpos quase parados.
- `src/ventania3d/dynamics/World.ts`: mundo fisico. Integra forcas, aplica juntas, usa broad-phase por grade espacial para montar pares candidatos, reaproveita impulso por cache de contato e `warm starting`, faz `CCD/TOI` translacional, resolve impulsos, corrige penetracao, publica eventos `begin/persist/end` e dorme corpos quase parados.

#### Framework de platformer

- `src/ventania3d/framework/platformer/CharacterController.ts`: camada de gameplay em cima do motor. Cria o corpo tipo capsula e resolve aceleracao horizontal, `coyote time`, `jump buffer`, `wall slide`, `wall jump`, `dash`, `ladder`, `one-way/drop-through` e carry de plataforma movel.
- `src/ventania3d/framework/platformer/level.ts`: loader de fase por dados. Constrói strips, slopes, moving platforms, ladders, checkpoints, hazards, pickups, goal, projectile emitters e tambem concentra helpers de respawn e suporte cinemático.
- `src/ventania3d/framework/platformer/design.ts`: utilitarios de level design para platformer. Calcula envelope de salto, alcance horizontal com e sem dash e analisa se um link entre plataformas cabe considerando corpo e sprite.
- `src/ventania3d/framework/platformer/projectiles.ts`: camada reutilizavel de projeteis. Cria balas como rigid bodies com sensor, roda emitters por cooldown, processa impactos e limpa projeteis expirados.
- `src/ventania3d/framework/platformer/editor.ts`: editor leve orientado a dados. Gera handles para spawn, plataformas, ladder, checkpoint, goal e turret, e aplica drag reconstruindo a definicao da fase.
- `src/ventania3d/framework/platformer/index.ts`: reexporta o pacote de platformer para o resto da aplicacao.

#### Forcas e debug

- `src/ventania3d/forces/forces.ts`: helpers de forca para corpos rigidos, como gravidade e drag linear.
- `src/ventania3d/render/debugDraw.ts`: desenho de colliders e centro de massa no canvas para depuracao visual da engine.

## Arquivos mais importantes para abrir primeiro

Se eu tivesse de escolher os 10 arquivos que mais explicam o projeto, seriam:

1. `src/App.tsx`
2. `src/components/SimulationStage.tsx`
3. `src/physics/scenes/types.ts`
4. `src/data/scenes.ts`
5. `src/physics/core/solvers.ts`
6. `src/physics/core/body.ts`
7. `src/physics/scenes/freeFallScene.ts`
8. `src/physics/scenes/packageDropScene.ts`
9. `src/physics/scenes/forkliftScene.ts`
10. `src/ventania3d/dynamics/World.ts`

## Resumo franco do projeto

O projeto foi construido com uma separacao muito boa entre interface, runtime e fisica.

O que ele faz melhor:

- transforma teoria de livro em cena interativa;
- usa formula fechada quando isso deixa a aula mais clara;
- usa integracao numerica quando o fenomeno realmente pede evolucao temporal;
- sobe para rigidbody/contato so quando a cena realmente precisa;
- reaproveita o mesmo contrato de cena para tudo.

O ponto tecnicamente mais interessante:

- `SimulationStage.tsx` por ser o runtime generico;
- `forkliftScene.ts` por ser a integracao mais rica de fisica + visual + engenharia;
- `ventania3d/dynamics/World.ts` e `ventania3d/collision/intersections.ts` por implementarem a parte de engine.

Se eu tivesse de resumir a filosofia do codigo em uma frase, seria:

> "Quando a fisica cabe numa formula, eu uso a formula; quando ela precisa de estado e contato, eu resolvo o mundo."
