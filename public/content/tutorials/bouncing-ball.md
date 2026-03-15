# Bola quicando

## Ideia central
Essa cena junta dois assuntos importantes: **queda livre** e **colisão com restituição**. Entre um quique e outro, a bola se comporta como um projétil sob ação da gravidade. No instante do contato com o chão, ocorre uma troca rápida de velocidade causada pelo impulso do solo.

O resultado é uma sequência de arcos cada vez menores quando o choque não é perfeitamente elástico.

## Coeficiente de restituição
$$
e = \frac{v_{\text{afastamento}}}{v_{\text{aproximação}}}
$$

$$
h_{n+1} = e^2 h_n
$$

## Interpretação física
- Se `e = 1`, o choque idealmente não perde energia mecânica.
- Se `0 < e < 1`, parte da energia mecânica se dissipa no impacto.
- Quanto menor o valor de `e`, menor será a altura do próximo quique.

## O que está acontecendo entre os impactos
Entre colisões, a bola obedece às equações usuais da queda livre. Isso significa que o movimento horizontal e o movimento vertical podem ser analisados separadamente:

$$
x = x_0 + v_x t
$$

$$
y = y_0 + v_y t - \frac{1}{2}gt^2
$$

## O que observar na cena
1. A trilha mostra que cada salto forma um novo arco.
2. A componente vertical da velocidade muda de sentido ao tocar o chão.
3. A componente horizontal tende a permanecer mais parecida de um quique para outro no modelo simplificado.
4. A altura máxima dos saltos vai diminuindo quando `e < 1`.

## Como interpretar como em um livro
1. Analise primeiro a fase aérea.
2. Depois trate o impacto como um evento curto que altera a velocidade.
3. Use `e` para ligar a velocidade antes e depois do choque.
4. Compare a nova velocidade com a altura que a bola alcança em seguida.

## Ligação com energia
A diminuição da altura máxima é uma forma visual de mostrar que parte da energia mecânica foi dissipada durante o choque. Em problemas reais, essa perda pode virar som, calor, deformação e vibração.

## Erro comum
> Dizer que a bola “ganha força para cima” depois do impacto. O que acontece é que o solo exerce um impulso durante o contato, invertendo a componente vertical da velocidade.
