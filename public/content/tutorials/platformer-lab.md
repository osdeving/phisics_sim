# Plataforma 2D

Esta cena agora ja funciona como laboratorio do framework de platformer em cima do `ventania3d`. A fase e montada por dados, nao por corpos soltos na cena, e usa o mesmo `PlatformerController` que pode ser reaproveitado em outras fases.

## O que tem de especial aqui

- o personagem e um `rigid body` real, nao um ponto sem colisao
- o corpo usa uma forma composta parecida com capsula para reduzir agarramento em quinas
- o controller resolve aceleracao horizontal, `coyote time`, `jump buffer`, `jump cut`, `wall slide`, `wall jump`, `dash` e `ladder`
- o framework liga e desliga colisao com `one-way platforms` por layer/mask conforme estado do player
- a fase tem `moving platform carry`, `checkpoint`, hazard, pickup, `projectile emitter` e porta de saida
- o layout da fase vem de um loader por dados em `src/ventania3d/framework/platformer/level.ts`
- o editor leve usa os drag handles da app para mover spawn, plataformas, ladder, checkpoint, goal e turret
- o gap principal e validado por uma analise de salto que considera corpo e sprite

## Como ler a fisica da cena

O motor continua fazendo o trabalho pesado:

- colisao e impulso
- atrito
- correcao de penetracao
- `CCD/TOI` translacional
- `raycast`, `circle cast` e `shape cast`
- eventos de contato

O `PlatformerController` entra por cima dessa base para transformar input em movimento legivel de platformer.

### Por que o corpo nao e um retangulo seco

Um box puro tende a agarrar mais em bordas e a responder pior quando passa por transicoes de piso e rampa. Por isso o personagem foi montado com:

- um bloco central
- um circulo superior
- um circulo inferior

Na pratica isso funciona como uma capsula 2D aproximada.

### Como o `one-way` foi implementado

Como o motor ainda nao tem pre-solve dedicado por contato, o framework usa uma regra pragmatica:

- quando o player esta subindo, em ladder ou em `drop-through`, a layer `one-way` sai da mascara de colisao
- quando ele esta caindo ou ja apoiado na plataforma, a layer volta

Nao e a solucao mais geral possivel, mas ja reproduz o comportamento esperado de jogo sem espalhar hack pela cena.

### O que ladder, carry e projetil fazem

- `ladder`: entra como sensor; o controller cancela a gravidade e passa a comandar a velocidade vertical
- `moving platform carry`: depois do step, o framework soma ao jogador o delta do suporte cinemático para evitar escorregao visual
- `projectile`: o turret emite um rigid body dinamico com sensor, layer propria e `CCD`, entao o impacto usa o pipeline normal do motor em vez de query manual

### Como a fase valida o pulo antes

O editor nao fica no chute. Ele calcula um envelope de salto usando:

- velocidade horizontal maxima
- `jumpSpeed`
- gravidade
- multiplicador de queda
- `dash`
- largura/altura efetivas do corpo e do sprite

Com isso ele responde se um link entre duas plataformas:

- cabe em salto puro
- precisa de `dash`
- ou ja saiu do envelope tecnico

## O que a fase prova

Ela nao serve so para jogar. Serve para validar o framework:

- rampa
- `one-way platform`
- moving platform com carry
- parede para `wall slide`
- `wall jump`
- `ladder`
- `dash`
- `checkpoint`
- `projectile emitter`
- analise de salto
- editor leve por drag
- sensores de hazard, pickup e saida
- camera seguindo personagem

Se esse pacote evoluir para fases maiores, esta cena ja funciona como regressao automatizada e visual do controller.
