# Laboratorio da engine

Esta cena existe para validar o `ventania3d` como motor, nao so como base da empilhadeira. Ela junta tres frentes do pacote novo:

- `CCD/TOI` para segurar um projetil muito rapido antes de atravessar uma parede fina
- `shape cast` convexo para prever impacto de um poligono orientado
- `circle cast` como referencia de um sensor arredondado no mesmo corredor

## O que olhar primeiro

Na pista superior, o projetil e relancado varias vezes contra uma parede extremamente fina. O objetivo nao e a estetica do tiro; e provar que o motor encontra o primeiro instante de impacto dentro do frame, em vez de mover tudo e descobrir tarde demais que o corpo ja cruzou a barreira.

No corredor inferior, duas queries varrem o cenario:

- o `shape cast` usa um poligono convexo com rotacao propria
- o `circle cast` usa um volume circular equivalente

Ambos desenham a linha de varredura, o ponto de hit, a normal e a posicao final prevista.

## Como usar os controles

- reduza `Espessura da parede` para aproximar o caso classico de tunneling
- aumente `Velocidade do tiro` para forcar ainda mais o CCD
- mude `Forma do shape cast` e `Rotacao do poligono` para ver como o instante de contato muda
- ajuste `Angulo do cast` para atingir outros obstaculos no corredor

## Leitura fisica

O `CCD/TOI` parte da mesma ideia de cinemática basica: a posicao avanca com o tempo, entao o contato pode ser procurado no intervalo continuo do frame. Em vez de testar so o estado final, o motor busca o primeiro `t` em que as formas se encostam.

No `shape cast`, o raciocinio vem do `SAT` varrido: cada eixo produz uma janela de entrada e saida. Se todas as janelas se sobrepoem, existe impacto futuro; o maior instante de entrada vira o primeiro contato valido.

## Por que essa cena importa

Build verde sozinho nao prova fisica. Esta tela faz a ponte entre:

- teste automatizado do motor
- validacao visual do comportamento
- uso real das APIs publicas do `ventania3d`

Quando `CCD`, `shape cast` ou eventos de contato mudarem, esta deve ser uma das primeiras cenas a abrir para detectar regressao.
