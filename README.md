# Physics Sim Lab

Simulador 2D de mecânica clássica feito com `React + TypeScript + Canvas 2D`, com foco em unidades físicas consistentes, exercícios clássicos animados e código didático.

## O que o projeto entrega

- física em `m`, `s`, `kg`, `N`, `m/s` e `m/s²`
- loop com passo fixo em `1/60 s`
- integrador `semi-implicit Euler`
- renderização separada da simulação
- canvas central com timeline, play/pause, passo e voltar no tempo
- drag direto em vetores e objetos nas cenas que fazem sentido
- abas com mini tutorial, painel de fórmulas e exercícios resolvidos
- cenas para queda livre, quique, lançamento oblíquo, trens, rio, tração, plano inclinado, mola e polia
- cenas apoiadas no `ventania3d` para rigid bodies, contatos e juntas

## Como rodar

```bash
npm install
npm run dev
```

Para gerar build de produção:

```bash
npm run build
```

## Estrutura

- `src/physics/math` — vetores e utilitários escalares
- `src/physics/core` — corpos, forças, integradores e fórmulas
- `src/physics/scenes` — cada experimento com sua própria lógica física
- `src/physics/render` — conversão mundo → tela e primitivas do canvas
- `src/components` — UI, controles, métricas e tutorial
- `src/ventania3d` — motor físico 2D próprio para rigid bodies, colisão, casts espaciais, eventos de contato, constraints e framework de platformer

## Cenas incluídas

- `Queda livre e salto` — gravidade, força horizontal e impulso
- `Bola quicando` — restituição, trilha e energia perdida em choques
- `Pacote lançado do avião` — lançamento oblíquo e mudança de referencial
- `Carro rebocando caixote` — tração, resistência ao rolamento e arrasto
- `Plano inclinado` — decomposição do peso e atrito
- `Choque de trens` — MRU, velocidade relativa e ponto de encontro
- `Barco atravessando o rio` — soma vetorial e deriva
- `Mola e oscilação` — Lei de Hooke e amortecimento
- `Polia / Atwood` — sistema acoplado por corda ideal
- `Pêndulo de impacto` — rigid bodies, junta de distância, stack de caixas, circle cast e eventos de contato
- `Laboratorio da engine` — parede fina para CCD/TOI, corredor com shape cast convexo e comparacao com circle cast
- `Plataforma 2D` — framework de platformer com capsule composto, one-way platforms, moving platform carry, ladder, dash, checkpoint, projéteis, análise de salto e editor leve por drag

## Observações didáticas

- o código da física contém comentários explicando o raciocínio newtoniano
- a maioria das cenas privilegia equações físicas explícitas em vez de atalhos visuais
- o player guarda histórico para permitir voltar, pausar e avançar frame a frame
- várias cenas aceitam drag direto em vetores/objetos para alterar grandezas no próprio canvas

## Assets visuais

Os SVGs em `public/assets` são locais e empacotados junto com o projeto. A cena de plataforma também usa sprites CC0 importados para `public/assets/platformer`:

- Kenney / OpenGameArt — `Platformer Characters 1`: `https://opengameart.org/content/platformer-characters-1`
- Kenney / OpenGameArt — `Simplified Platformer Pack`: `https://opengameart.org/content/simplified-platformer-pack`
- Licença CC0 1.0: `https://creativecommons.org/publicdomain/zero/1.0/`

Também ficaram algumas referências abertas para futuras trocas ou refinamentos visuais:

- Wikimedia Commons — polias/diagramas mecânicos: `https://commons.wikimedia.org/wiki/File:Pulley0.svg`
- Wikimedia Commons — elementos vetoriais simples: `https://commons.wikimedia.org/wiki/File:Wooden_bucket.svg`
- FreeSVG — ilustrações mecânicas e veiculares: `https://freesvg.org/`
