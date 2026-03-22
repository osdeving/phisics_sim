# Potenciacao e radiciacao para fisica

## Escopo
Esta parte cobre:

- definicao de potencia
- base e expoente
- leis da potenciacao
- expoente zero
- expoente negativo
- expoente fracionario
- radical
- simplificacao de raizes
- produto e quociente de radicais
- racionalizacao
- notacao cientifica

Em mecanica, potencias e raizes aparecem em energia cinetica, area, volume, Pitagoras, decomposicao vetorial, velocidade de queda e leitura de unidades.

---

## 1. Potencia

Potencia representa multiplicacao repetida:

$$
a^n = \underbrace{a\cdot a\cdot a\cdots a}_{n \text{ vezes}}
$$

### Elementos

- base: $$a$$
- expoente: $$n$$

### Exemplo fisico simples

Na energia cinetica:

$$
E_c = \frac{mv^2}{2}
$$

O termo $$v^2$$ mostra que a velocidade entra ao quadrado.

Se a velocidade dobra, a energia cinetica nao dobra: ela quadruplica.

Esse e um dos exemplos mais importantes de potencia na fisica.

---

## 2. Leis da potenciacao

### 2.1 Produto de potencias de mesma base

$$
a^m\cdot a^n = a^{m+n}
$$

Exemplo:

$$
10^3 \cdot 10^2 = 10^5
$$

Isso aparece em notacao cientifica e em conversao de ordens de grandeza.

### 2.2 Quociente de potencias de mesma base

$$
\frac{a^m}{a^n} = a^{m-n}, \quad a\neq0
$$

Exemplo:

$$
\frac{10^7}{10^3} = 10^4
$$

### 2.3 Potencia de potencia

$$
(a^m)^n = a^{mn}
$$

Exemplo:

$$
(t^2)^3 = t^6
$$

### 2.4 Potencia de um produto

$$
(ab)^n = a^n b^n
$$

Exemplo:

$$
(2v)^2 = 4v^2
$$

### 2.5 Potencia de um quociente

$$
\left(\frac{a}{b}\right)^n = \frac{a^n}{b^n}, \quad b\neq0
$$

Exemplo:

$$
\left(\frac{\Delta s}{\Delta t}\right)^2 = \frac{(\Delta s)^2}{(\Delta t)^2}
$$

### Cuidado

As regras acima valem para multiplicacao, divisao e parenteses.

Elas nao valem para soma:

$$
a^m + a^n \neq a^{m+n}
$$

---

## 3. Expoente zero

Para $$a\neq0$$:

$$
a^0 = 1
$$

### Por que?

Pela regra:

$$
\frac{a^m}{a^m} = a^{m-m} = a^0
$$

Mas tambem:

$$
\frac{a^m}{a^m} = 1
$$

Logo:

$$
a^0 = 1
$$

### Cuidado

$$
0^0
$$

nao entra nessa regra escolar simples.

---

## 4. Expoente negativo

Para $$a\neq0$$:

$$
a^{-n} = \frac{1}{a^n}
$$

Exemplo:

$$
2^{-3} = \frac{1}{2^3} = \frac{1}{8}
$$

### Leitura em fisica

Expoente negativo aparece muito em unidades:

- $$s^{-1}$$ significa $$1/s$$
- $$m^{-2}$$ significa $$1/m^2$$

Em gravitacao, eletricidade e campos, potencias negativas surgem com frequencia.

### Cuidado

Expoente negativo nao significa que o resultado final sera negativo.

Ele indica inverso.

---

## 5. Expoente fracionario

Temos:

$$
a^{1/n} = \sqrt[n]{a}
$$

e, mais geralmente:

$$
a^{m/n} = \sqrt[n]{a^m}
$$

Exemplos:

$$
16^{1/2} = \sqrt{16} = 4
$$

$$
27^{2/3} = \sqrt[3]{27^2} = 9
$$

### Leitura fisica

Se:

$$
v^2 = 2gh
$$

entao:

$$
v = (2gh)^{1/2} = \sqrt{2gh}
$$

Ou seja: a raiz quadrada e o mesmo que potencia com expoente $$1/2$$.

---

## 6. Radical

$$
\sqrt[n]{a}
$$

e o numero que elevado a $$n$$ produz $$a$$.

### Casos comuns

$$
\sqrt{a} = \sqrt[2]{a}
$$

### Condicoes usuais em reais

- se $$n$$ for par, o radicando precisa ser $$\geq 0$$
- se $$n$$ for impar, o radicando pode ser negativo

Exemplos:

$$
\sqrt{9}=3
$$

$$
\sqrt[3]{-8}=-2
$$

### Leitura fisica

Em mecanica, raizes aparecem em:

- modulo de vetores
- velocidade obtida por energia
- resultado do teorema de Pitagoras

---

## 7. Propriedades dos radicais

### 7.1 Produto

$$
\sqrt[n]{a}\cdot\sqrt[n]{b} = \sqrt[n]{ab}
$$

Exemplo:

$$
\sqrt{2}\cdot\sqrt{8} = \sqrt{16} = 4
$$

### 7.2 Quociente

$$
\frac{\sqrt[n]{a}}{\sqrt[n]{b}} = \sqrt[n]{\frac{a}{b}}
$$

com $$b>0$$ no caso da raiz quadrada real.

Exemplo:

$$
\frac{\sqrt{50}}{\sqrt{2}} = \sqrt{25} = 5
$$

### 7.3 Extracao de fatores perfeitos

$$
\sqrt{50} = \sqrt{25\cdot2} = 5\sqrt{2}
$$

Isso e muito util quando o resultado fisico vem de Pitagoras.

Exemplo:

Se:

$$
R = \sqrt{18^2 + 24^2} = \sqrt{900}
$$

entao:

$$
R = 30
$$

Mas quando nao da numero inteiro, simplificar o radical ajuda a manter a conta limpa.

---

## 8. Racionalizacao

Racionalizar e tirar o radical do denominador.

### Caso simples

$$
\frac{1}{\sqrt{2}} = \frac{\sqrt{2}}{2}
$$

### Onde isso aparece em mecanica

Em 45 graus:

$$
\sin 45^\circ = \cos 45^\circ = \frac{\sqrt{2}}{2}
$$

Se uma forca $$F$$ faz 45 graus:

$$
F_x = \frac{F}{\sqrt{2}} = \frac{F\sqrt{2}}{2}
$$

Essa segunda forma costuma ser preferida.

---

## 9. Notacao cientifica

Notacao cientifica escreve numeros como:

$$
a \cdot 10^n
$$

com:

$$
1 \leq a < 10
$$

### Exemplos

$$
300000 = 3\cdot10^5
$$

$$
0{,}00042 = 4{,}2\cdot10^{-4}
$$

### Por que isso importa em fisica

Medidas fisicas muitas vezes ficam muito grandes ou muito pequenas:

- distancias astronomicas
- massas microscopicas
- constante gravitacional
- carga eletrica

Sem notacao cientifica, a leitura e a comparacao de ordens de grandeza ficam ruins.

---

## 10. Checklist de potencias e raizes para fisica

1. a operacao e produto, divisao ou soma?
2. as bases sao iguais?
3. a raiz pode ser reescrita como expoente fracionario?
4. ha algum radical que pode ser simplificado?
5. a unidade final continua coerente com a grandeza fisica?

---

## 11. Frases para guardar

- velocidade ao quadrado muda muita coisa em mecanica
- expoente negativo indica inverso
- radical e potencia fracionaria contam a mesma historia
- soma de potencias nao segue a regra da multiplicacao
- notacao cientifica e ferramenta de leitura fisica, nao so de calculadora
