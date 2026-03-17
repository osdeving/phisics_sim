# Algebra base

## Escopo
Esta parte cobre:

- equacoes do 1º grau
- equacoes do 2º grau
- produtos notaveis
- fatoracao
- produto nulo
- cuidados de sinal e equivalencia

O objetivo e construir a base que aparece depois em funcoes, fisica, geometria analitica e manipulacao de formulas.

---

## 1. Igualdade e principio de equivalencia

Uma equacao e uma igualdade com pelo menos uma incognita.

Resolver uma equacao significa encontrar os valores que tornam a igualdade verdadeira.

Exemplo:

$$
2x + 5 = 13
$$

Se fizermos a mesma operacao nos dois lados, a igualdade continua equivalente.

### Regras basicas de equivalencia

- somar o mesmo numero nos dois lados
- subtrair o mesmo numero nos dois lados
- multiplicar os dois lados por um mesmo numero nao nulo
- dividir os dois lados por um mesmo numero nao nulo

### Cuidado

- nao se divide por zero
- ao multiplicar ou dividir desigualdades por numero negativo, o sinal muda; em equacoes, isso nao ocorre porque o sinal e de igualdade

---

## 2. Equacao do 1º grau

Forma geral:

$$
ax + b = 0, \quad a \neq 0
$$

Solucao:

$$
x = -\frac{b}{a}
$$

### Exemplo

$$
3x - 9 = 0
$$

$$
3x = 9
$$

$$
x = 3
$$

### Com parenteses

Use distributiva:

$$
2(x+3)=10
$$

$$
2x+6=10
$$

$$
2x=4
$$

$$
x=2
$$

### Com fracoes

Pode usar MMC para eliminar denominadores:

$$
\frac{x}{2}+\frac{3}{4}=2
$$

Multiplicando tudo por 4:

$$
2x + 3 = 8
$$

$$
2x = 5
$$

$$
x = \frac{5}{2}
$$

---

## 3. Equacao do 2º grau

Forma geral:

$$
ax^2 + bx + c = 0, \quad a \neq 0
$$

### Discriminante

$$
\Delta = b^2 - 4ac
$$

### Formula de Bhaskara

$$
x = \frac{-b \pm \sqrt{\Delta}}{2a}
$$

### Interpretacao do discriminante

- se $$\Delta > 0$$, duas raizes reais distintas
- se $$\Delta = 0$$, uma raiz real dupla
- se $$\Delta < 0$$, nao ha raiz real

### Exemplo

$$
x^2 - 5x + 6 = 0
$$

Temos:

- $$a=1$$
- $$b=-5$$
- $$c=6$$

Logo:

$$
\Delta = (-5)^2 - 4 \cdot 1 \cdot 6 = 25 - 24 = 1
$$

$$
x = \frac{5 \pm 1}{2}
$$

Raizes:

$$
x_1 = 3,\quad x_2 = 2
$$

---

## 4. Produtos notaveis

Produtos notaveis sao identidades algébricas que aparecem com muita frequencia.

### 4.1 Quadrado da soma

$$
(a+b)^2 = a^2 + 2ab + b^2
$$

### 4.2 Quadrado da diferenca

$$
(a-b)^2 = a^2 - 2ab + b^2
$$

### 4.3 Soma pela diferenca

$$
(a+b)(a-b) = a^2 - b^2
$$

### 4.4 Cubo da soma

$$
(a+b)^3 = a^3 + 3a^2b + 3ab^2 + b^3
$$

### 4.5 Cubo da diferenca

$$
(a-b)^3 = a^3 - 3a^2b + 3ab^2 - b^3
$$

### Erros classicos

- achar que $$ (a+b)^2 = a^2 + b^2 $$
- esquecer o termo do meio $$2ab$$
- trocar sinais no quadrado da diferenca

---

## 5. Fatoracao

Fatorar e escrever uma expressao como produto.

Isso ajuda a:

- simplificar expressoes
- resolver equacoes
- cortar fatores em fracoes algebricas
- reconhecer padroes

### 5.1 Fator comum em evidencia

$$
ax + ay = a(x+y)
$$

Exemplo:

$$
6x + 9 = 3(2x+3)
$$

### 5.2 Agrupamento

$$
ax + ay + bx + by = a(x+y) + b(x+y) = (a+b)(x+y)
$$

Exemplo:

$$
x^2 + 3x + 2x + 6 = x(x+3) + 2(x+3) = (x+2)(x+3)
$$

### 5.3 Diferenca de quadrados

$$
a^2 - b^2 = (a-b)(a+b)
$$

Exemplo:

$$
x^2 - 16 = (x-4)(x+4)
$$

### 5.4 Trinomio quadrado perfeito

Se a expressao tiver o formato:

$$
a^2 + 2ab + b^2
$$

entao:

$$
a^2 + 2ab + b^2 = (a+b)^2
$$

E se tiver:

$$
a^2 - 2ab + b^2
$$

entao:

$$
a^2 - 2ab + b^2 = (a-b)^2
$$

Exemplos:

$$
x^2 + 6x + 9 = (x+3)^2
$$

$$
x^2 - 10x + 25 = (x-5)^2
$$

### 5.5 Trinomio do 2º grau

Para fatorar:

$$
x^2 + Sx + P
$$

procure dois numeros cuja:

- soma seja $$S$$
- produto seja $$P$$

Exemplo:

$$
x^2 - 7x + 12
$$

Queremos dois numeros com soma $$-7$$ e produto $$12$$:

- $$-3$$
- $$-4$$

Logo:

$$
x^2 - 7x + 12 = (x-3)(x-4)
$$

---

## 6. Produto nulo

Se:

$$
A \cdot B = 0
$$

entao:

$$
A = 0 \quad \text{ou} \quad B = 0
$$

Isso e muito usado depois da fatoracao.

### Exemplo

$$
(x-2)(x+5)=0
$$

Logo:

$$
x-2=0 \Rightarrow x=2
$$

ou

$$
x+5=0 \Rightarrow x=-5
$$

---

## 7. Estrategia de resolucao

Quando voce ve uma equacao algébrica:

1. remova parenteses
2. reduza termos semelhantes
3. organize os termos
4. observe se da para fatorar
5. veja se e 1º grau, 2º grau ou produto nulo
6. resolva
7. confira a resposta

---

## 8. Erros mais comuns

- perder sinal ao mover termo
- errar distributiva
- esquecer o $$2ab$$ nos quadrados notaveis
- cancelar termo somado como se fosse fator
- usar Bhaskara sem antes organizar a equacao na forma $$ax^2+bx+c=0$$
- esquecer de testar resultado quando a conta ficou longa

---

## 9. Formulas para memorizar

$$
ax+b=0 \Rightarrow x=-\frac{b}{a}
$$

$$
\Delta=b^2-4ac
$$

$$
x=\frac{-b\pm\sqrt{\Delta}}{2a}
$$

$$
(a+b)^2=a^2+2ab+b^2
$$

$$
(a-b)^2=a^2-2ab+b^2
$$

$$
(a+b)(a-b)=a^2-b^2
$$

$$
a^2+2ab+b^2=(a+b)^2
$$

$$
a^2-2ab+b^2=(a-b)^2
$$

---

## 10. Frase mental

> Primeiro simplifique. Depois reconheca o padrao. So entao resolva.
