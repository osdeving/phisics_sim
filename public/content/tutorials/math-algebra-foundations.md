# Algebra base para fisica

## Escopo
Esta parte cobre:

- principio de equivalencia
- equacoes do 1o grau
- equacoes do 2o grau
- produtos notaveis
- fatoracao
- produto nulo
- cuidados com sinal

Tudo isso aparece o tempo todo em mecanica. Antes de falar em MRU, MRUV, queda livre ou leis de Newton, o aluno precisa conseguir reorganizar formulas, isolar variaveis e reconhecer padroes algebricos.

---

## 1. Por que algebra e base da fisica

Em fisica escolar, a maior parte das formulas nao chega para ser decorada: chega para ser manipulada.

Voce ve algo como:

$$
s = s_0 + vt
$$

e precisa tirar:

- o tempo $$t$$
- a velocidade $$v$$
- a posicao inicial $$s_0$$

O mesmo acontece em:

$$
F = ma
$$

$$
P = mg
$$

$$
v^2 = v_0^2 + 2a\Delta s
$$

Sem algebra, a formula fica parada. Com algebra, ela vira ferramenta.

---

## 2. Igualdade e principio de equivalencia

Uma equacao e uma igualdade com incognita.

Resolver uma equacao significa encontrar os valores que tornam a igualdade verdadeira.

O principio central e:

> o que voce faz de um lado, precisa fazer do outro.

### Regras basicas de equivalencia

- somar o mesmo numero nos dois lados
- subtrair o mesmo numero nos dois lados
- multiplicar os dois lados por um mesmo numero nao nulo
- dividir os dois lados por um mesmo numero nao nulo

### Exemplo de fisica

No MRU:

$$
s = s_0 + vt
$$

Se queremos isolar $$t$$:

$$
s - s_0 = vt
$$

$$
t = \frac{s - s_0}{v}
$$

Essa conta e pura algebra, mas e ela que permite responder perguntas como:

- quanto tempo o carro levou?
- em que instante o movel chegou ao ponto pedido?

### Cuidado

- nunca divida por zero
- preste atencao a parenteses e sinais
- em desigualdades, multiplicar por numero negativo inverte o sinal; em equacoes isso nao acontece

---

## 3. Equacao do 1o grau

Forma geral:

$$
ax + b = 0, \quad a \neq 0
$$

Solucao:

$$
x = -\frac{b}{a}
$$

### Exemplo com cinematica

Um corpo faz MRU com:

$$
s_0 = 20 \text{ m}, \quad v = 10 \text{ m/s}
$$

Queremos saber quando ele chega a:

$$
s = 120 \text{ m}
$$

Montando a equacao:

$$
120 = 20 + 10t
$$

$$
100 = 10t
$$

$$
t = 10 \text{ s}
$$

### Exemplo com distributiva

Suponha que, depois de reorganizar uma conta de forcas, voce chegue a:

$$
2(x + 3) = 14
$$

Aplicando distributiva:

$$
2x + 6 = 14
$$

$$
2x = 8
$$

$$
x = 4
$$

### Exemplo com fracao

Se em uma etapa voce obtiver:

$$
\frac{t}{2} + \frac{3}{4} = 2
$$

elimine os denominadores multiplicando tudo por 4:

$$
2t + 3 = 8
$$

$$
2t = 5
$$

$$
t = \frac{5}{2} \text{ s}
$$

---

## 4. Equacao do 2o grau

Forma geral:

$$
ax^2 + bx + c = 0, \quad a \neq 0
$$

Ela aparece muito quando a posicao depende de $$t^2$$, como no MRUV e na queda livre.

### Exemplo classico de mecanica

Considere:

$$
h(t) = 20 + 15t - 5t^2
$$

Essa pode ser uma altura em funcao do tempo.

Para descobrir quando o corpo toca o solo, impomos:

$$
h = 0
$$

Logo:

$$
20 + 15t - 5t^2 = 0
$$

Multiplicando por $$-1$$ e dividindo por 5:

$$
t^2 - 3t - 4 = 0
$$

### Resolvendo por fatoracao

Queremos dois numeros cujo produto seja $$-4$$ e cuja soma seja $$-3$$:

$$
-4 \text{ e } 1
$$

Entao:

$$
t^2 - 3t - 4 = (t-4)(t+1)
$$

Pelo produto nulo:

$$
t-4 = 0 \quad \text{ou} \quad t+1 = 0
$$

$$
t = 4 \quad \text{ou} \quad t = -1
$$

Em fisica, geralmente descartamos o tempo negativo quando o contexto comeca em $$t=0$$.

Resposta fisica:

$$
t = 4 \text{ s}
$$

### Bhaskara

Quando a fatoracao nao sai rapido, usamos:

$$
\Delta = b^2 - 4ac
$$

$$
x = \frac{-b \pm \sqrt{\Delta}}{2a}
$$

### Interpretacao do discriminante

- se $$\Delta > 0$$, duas raizes reais distintas
- se $$\Delta = 0$$, uma raiz real dupla
- se $$\Delta < 0$$, nao ha raiz real

Na leitura fisica, isso pode significar:

- dois instantes possiveis
- um instante unico
- nenhum instante real compativel com a situacao

---

## 5. Produtos notaveis

Produtos notaveis aparecem porque muitas expressoes da fisica tem quadrados e diferencas de quadrados.

### 5.1 Quadrado da soma

$$
(a+b)^2 = a^2 + 2ab + b^2
$$

### 5.2 Quadrado da diferenca

$$
(a-b)^2 = a^2 - 2ab + b^2
$$

### 5.3 Soma pela diferenca

$$
(a+b)(a-b) = a^2 - b^2
$$

### 5.4 Cubo da soma

$$
(a+b)^3 = a^3 + 3a^2b + 3ab^2 + b^3
$$

### 5.5 Cubo da diferenca

$$
(a-b)^3 = a^3 - 3a^2b + 3ab^2 - b^3
$$

### Onde isso aparece em mecanica

Se:

$$
v = v_0 - gt
$$

entao:

$$
v^2 = (v_0 - gt)^2 = v_0^2 - 2v_0gt + g^2t^2
$$

Esse tipo de expansao aparece em deducoes e simplificacoes.

Outra identidade muito importante:

$$
v^2 - v_0^2 = (v-v_0)(v+v_0)
$$

Ela ajuda a reconhecer padroes ligados a formulas como a de Torricelli.

### Erros classicos

- achar que $$ (a+b)^2 = a^2 + b^2 $$
- esquecer o termo do meio $$2ab$$
- trocar sinais no quadrado da diferenca

---

## 6. Fatoracao

Fatorar e escrever uma expressao como produto.

Isso ajuda a:

- simplificar contas
- enxergar fatores comuns
- usar produto nulo
- cancelar fatores em fracoes algebricas

### 6.1 Fator comum

$$
ma + mg = m(a+g)
$$

Isso e muito comum em mecanica: a mesma massa aparece multiplicando varios termos.

### 6.2 Agrupamento

$$
ax + ay + bx + by = a(x+y) + b(x+y) = (a+b)(x+y)
$$

### 6.3 Diferenca de quadrados

$$
a^2 - b^2 = (a-b)(a+b)
$$

Exemplo fisico:

$$
v^2 - v_0^2 = (v-v_0)(v+v_0)
$$

### 6.4 Trinomio quadratico

$$
x^2 + bx + c
$$

Quando possivel, procure dois numeros cujo produto seja $$c$$ e cuja soma seja $$b$$.

Exemplo:

$$
t^2 - 3t - 4 = (t-4)(t+1)
$$

---

## 7. Produto nulo

Se:

$$
AB = 0
$$

entao:

$$
A = 0 \quad \text{ou} \quad B = 0
$$

Essa regra vale quando a expressao ja esta em forma de produto.

Exemplo:

$$
(t-4)(t+1)=0
$$

Logo:

$$
t=4 \quad \text{ou} \quad t=-1
$$

Na fisica, depois disso ainda vem a leitura do contexto: nem toda raiz matematica faz sentido fisico.

---

## 8. Checklist de algebra para fisica

Quando aparecer uma formula de mecanica, pense nesta ordem:

1. qual variavel eu preciso isolar?
2. a equacao e linear ou quadratica?
3. existe fator comum ou produto notavel escondido?
4. alguma raiz encontrada precisa ser descartada pelo contexto?
5. os sinais e as unidades continuam coerentes?

---

## 9. Frases para guardar

- algebra em fisica e linguagem operacional
- isolar variavel e tao importante quanto substituir numeros
- quadrado de soma nao e soma de quadrados
- fatorar antes costuma simplificar muito
- raiz matematica nem sempre vira resposta fisica
