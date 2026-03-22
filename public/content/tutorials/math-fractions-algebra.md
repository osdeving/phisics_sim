# Fracoes e manipulacoes algebricas para fisica

## Escopo
Esta parte cobre:

- fracao como divisao
- fracoes equivalentes
- simplificacao
- soma e subtracao
- multiplicacao e divisao
- MMC
- fracoes algebricas
- restricoes de denominador
- racionalizacao

Em mecanica, fracoes nao sao detalhe. Elas aparecem em velocidade media, aceleracao media, densidade, pressao, inclinacao, rendimento, conversao de unidades e isolamento de formulas.

---

## 1. Ideia central

Uma fracao representa divisao:

$$
\frac{a}{b} = a \div b
$$

com a condicao:

$$
b \neq 0
$$

### Leitura fisica

Quase toda taxa da fisica tem forma de fracao:

$$
v_{med} = \frac{\Delta s}{\Delta t}
$$

$$
a_{med} = \frac{\Delta v}{\Delta t}
$$

$$
\rho = \frac{m}{V}
$$

Ou seja: entender fracao e entender como a fisica compara grandezas.

---

## 2. Fracoes equivalentes e simplificacao

Fracoes equivalentes representam o mesmo numero.

Exemplo:

$$
\frac{1}{2} = \frac{2}{4} = \frac{3}{6}
$$

Isso acontece quando multiplicamos ou dividimos numerador e denominador pelo mesmo numero nao nulo.

### Exemplo fisico

Se um movel anda:

$$
\frac{20}{4} \text{ m/s}
$$

entao:

$$
\frac{20}{4} = \frac{10}{2} = 5
$$

Logo a velocidade e:

$$
5 \text{ m/s}
$$

### Simplificacao

Simplificar e dividir numerador e denominador pelo mesmo fator.

Exemplo:

$$
\frac{18}{24} = \frac{3}{4}
$$

porque dividimos ambos por 6.

---

## 3. Soma e subtracao de fracoes

### 3.1 Denominadores iguais

$$
\frac{a}{m} + \frac{b}{m} = \frac{a+b}{m}
$$

$$
\frac{a}{m} - \frac{b}{m} = \frac{a-b}{m}
$$

### Exemplo com deslocamento fracionado

Um carrinho percorre:

$$
\frac{3}{7} \text{ da pista}
$$

e depois mais:

$$
\frac{2}{7} \text{ da pista}
$$

Total:

$$
\frac{3}{7} + \frac{2}{7} = \frac{5}{7}
$$

### 3.2 Denominadores diferentes

Use denominador comum.

$$
\frac{a}{b} + \frac{c}{d} = \frac{ad+bc}{bd}
$$

$$
\frac{a}{b} - \frac{c}{d} = \frac{ad-bc}{bd}
$$

### Exemplo com trecho de percurso

Se um corpo percorre:

$$
\frac{1}{2} \text{ do trajeto}
$$

e depois mais:

$$
\frac{1}{3} \text{ do trajeto}
$$

entao:

$$
\frac{1}{2} + \frac{1}{3} = \frac{3}{6} + \frac{2}{6} = \frac{5}{6}
$$

Ele ja percorreu:

$$
\frac{5}{6}
$$

do total.

### MMC

Uma forma mais organizada e usar o minimo multiplo comum dos denominadores.

Exemplo:

$$
\frac{3}{4} + \frac{5}{6}
$$

MMC de 4 e 6: 12

$$
\frac{3}{4} = \frac{9}{12}
$$

$$
\frac{5}{6} = \frac{10}{12}
$$

$$
\frac{9}{12} + \frac{10}{12} = \frac{19}{12}
$$

---

## 4. Multiplicacao de fracoes

Multiplica numerador por numerador e denominador por denominador:

$$
\frac{a}{b} \cdot \frac{c}{d} = \frac{ac}{bd}
$$

### Exemplo de escala fisica

Se uma velocidade vale:

$$
\frac{3}{4} \text{ de } 20 \text{ m/s}
$$

entao:

$$
\frac{3}{4}\cdot 20 = 15 \text{ m/s}
$$

### Simplificacao cruzada

Quando houver fatores comuns, voce pode simplificar antes de multiplicar.

Exemplo:

$$
\frac{6}{15}\cdot\frac{10}{9}
$$

Podemos simplificar:

- 6 com 9
- 10 com 15

Isso reduz a conta antes do produto final.

---

## 5. Divisao de fracoes

Dividir por uma fracao e multiplicar pelo inverso:

$$
\frac{a}{b} \div \frac{c}{d} = \frac{a}{b}\cdot\frac{d}{c}
$$

com:

$$
c \neq 0,\quad d \neq 0
$$

### Exemplo com velocidade media

Se um corpo percorre:

$$
30 \text{ m}
$$

em:

$$
\frac{3}{2} \text{ s}
$$

entao:

$$
v_{med} = \frac{30}{3/2} = 30 \cdot \frac{2}{3} = 20 \text{ m/s}
$$

Esse tipo de conta aparece muito quando o tempo vem em forma fracionaria.

---

## 6. Sinal em fracoes

As formas abaixo sao equivalentes:

$$
-\frac{a}{b} = \frac{-a}{b} = \frac{a}{-b}
$$

Mas:

$$
\frac{-a}{-b} = \frac{a}{b}
$$

### Leitura fisica

Em mecanica, o sinal pode indicar:

- sentido do movimento
- direcao da aceleracao
- trabalho positivo ou negativo

Entao sinal em fracao nao e detalhe grafico. Ele altera a interpretacao fisica.

---

## 7. Fracoes algebricas

Sao fracoes com letras no numerador, no denominador ou em ambos.

Exemplo muito util em fisica:

$$
\frac{v^2 - v_0^2}{v-v_0}
$$

Essa expressao aparece quando voce usa diferenca de quadrados:

$$
v^2 - v_0^2 = (v-v_0)(v+v_0)
$$

Logo:

$$
\frac{v^2 - v_0^2}{v-v_0} = \frac{(v-v_0)(v+v_0)}{v-v_0} = v+v_0
$$

desde que:

$$
v-v_0 \neq 0
$$

ou seja:

$$
v \neq v_0
$$

### Restricao fundamental

O denominador nao pode ser zero.

Essa restricao deve ser mantida durante toda a resolucao, mesmo depois de simplificar.

### Regra de ouro

Cancelamento so vale entre fatores.

Por isso:

$$
\frac{x^2-9}{x^2-3x}
$$

precisa ser fatorada antes:

$$
\frac{(x-3)(x+3)}{x(x-3)}
$$

e so depois pode simplificar.

---

## 8. Operacoes com expressoes fracionarias

Quando varias fracoes aparecem numa mesma formula fisica, siga esta ordem:

1. registre restricoes do denominador
2. fatorize o que puder
3. ache o MMC se for soma ou subtracao
4. simplifique apenas fatores
5. substitua valores so no final, se possivel

Isso evita erro de arredondamento e deixa a estrutura da conta visivel.

---

## 9. Racionalizacao

Racionalizar e tirar radical do denominador.

### Caso simples

$$
\frac{1}{\sqrt{2}} = \frac{1}{\sqrt{2}}\cdot\frac{\sqrt{2}}{\sqrt{2}} = \frac{\sqrt{2}}{2}
$$

### Onde isso aparece em fisica

Em decomposicao de vetores a 45 graus:

$$
\cos 45^\circ = \frac{\sqrt{2}}{2}
$$

e tambem:

$$
\cos 45^\circ = \frac{1}{\sqrt{2}}
$$

As duas formas sao equivalentes, mas a forma racionalizada costuma ser preferida:

$$
\frac{\sqrt{2}}{2}
$$

Se uma forca $$F$$ faz 45 graus com o eixo, entao:

$$
F_x = F\cos 45^\circ = \frac{F\sqrt{2}}{2}
$$

---

## 10. Checklist de fracoes para fisica

- fracao e divisao com unidade
- denominador nunca zera
- soma e subtracao pedem denominador comum
- divisao por fracao vira multiplicacao pelo inverso
- em expressao algebrica, so se cancela fator
- racionalizacao aparece em trigonometria e vetores

---

## 11. Frases para guardar

- velocidade, aceleracao e densidade sao fracoes com significado fisico
- quem nao domina fracao costuma travar no meio da formula, nao no conceito
- soma nao cancela
- fatora primeiro, corta depois
