# Travessia de rio

## Ideia central
Aqui o problema não é 1D puro. O barco tem uma velocidade para atravessar o rio, enquanto a corrente empurra lateralmente.

O resultado correto vem da **composição vetorial**.

## Soma vetorial

$$
\vec{v}_{solo} = \vec{v}_{barco/agua} + \vec{v}_{corrente}
$$

## Tempo de travessia
Para atravessar, importa apenas a componente perpendicular à margem:

$$
t = \frac{L}{v_{\perp}}
$$

## Deriva lateral
Enquanto o barco cruza o rio, a corrente o empurra:

$$
\Delta x = v_{corrente} t
$$

## Velocidade resultante

$$
v = \sqrt{v_{\perp}^2 + v_{corrente}^2}
$$

## Leitura mental
- O tempo depende só da componente transversal.
- A corrente não ajuda a cruzar.
- A corrente só gera deriva lateral.

## Como resolver na prática
1. Separe as componentes.
2. Use a componente transversal para o tempo.
3. Use esse tempo para calcular a deriva.
4. Se quiser, calcule a resultante pela soma vetorial.

## Erro comum
> Usar a velocidade resultante para calcular o tempo de travessia.
