# Suporte na parede

## Ideia central
Em suportes engastados, o problema não se resume ao valor do peso. O ponto decisivo costuma ser o **momento** produzido pela carga em relação à parede. Quanto maior a distância da carga ao engaste, maior a exigência estrutural.

Esse é um tema típico de estática aplicada e mostra por que “quanto pesa” não é a única pergunta relevante em projeto estrutural.

## Equações essenciais
$$
M = WL
$$

$$
F_{par} = \frac{M}{d}
$$

## Interpretação física
- `W` representa o peso aplicado.
- `L` é o braço de alavanca até a parede.
- `M` é o momento fletor exigido no engaste.
- `d` é o espaçamento entre parafusos ou pontos de reação do binário resistente.

## Como resolver o problema
1. Identifique o peso aplicado na extremidade do braço.
2. Meça a distância da carga até a parede.
3. Calcule o momento `M = WL`.
4. Se houver dois parafusos atuando como binário, estime a força interna com `F = M/d`.
5. Interprete se o sistema está mais exigido por força ou por momento.

## O que observar na cena
1. Aumentar o braço aumenta o momento na mesma proporção.
2. Aumentar o peso também aumenta linearmente o momento.
3. Diminuir o espaçamento entre parafusos faz crescer a força interna equivalente no par resistente.

## Leitura conceitual importante
Um suporte pode até resistir à força vertical total e ainda assim falhar por momento excessivo. Em engenharia, muitas falhas não vêm do valor puro da carga, mas do braço de alavanca associado a ela.

## Erro comum
> Olhar apenas para a força vertical e esquecer que a carga afastada da base cria um torque significativo na fixação.
