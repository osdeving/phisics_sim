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

## Observações didáticas

- o código da física contém comentários explicando o raciocínio newtoniano
- a maioria das cenas privilegia equações físicas explícitas em vez de atalhos visuais
- o player guarda histórico para permitir voltar, pausar e avançar frame a frame
- várias cenas aceitam drag direto em vetores/objetos para alterar grandezas no próprio canvas

## Assets visuais

Os SVGs em `public/assets` são locais e empacotados junto com o projeto. Também pesquisei referências abertas para futuras trocas ou refinamentos visuais:

- Wikimedia Commons — polias/diagramas mecânicos: `https://commons.wikimedia.org/wiki/File:Pulley0.svg`
- Wikimedia Commons — elementos vetoriais simples: `https://commons.wikimedia.org/wiki/File:Wooden_bucket.svg`
- FreeSVG — ilustrações mecânicas e veiculares: `https://freesvg.org/`

Nesta sandbox os downloads externos estavam bloqueados, então os sprites finais do projeto foram desenhados localmente em SVG para manter o app pronto para uso offline.
