# Funcoes basicas para fisica

## Escopo
Esta parte cobre:

- conceito de funcao
- dominio e imagem
- representacao por formula e grafico
- funcao afim
- funcao quadratica
- raiz da funcao
- coeficientes e interpretacao
- graficos e propriedades

Para quem esta entrando em fisica, funcao e a ponte entre formula e grafico. Em mecanica isso aparece imediatamente:

- posicao em funcao do tempo
- velocidade em funcao do tempo
- aceleracao em funcao do tempo

MRU conversa com funcao afim. MRUV conversa com funcao quadratica.

---

## 1. O que e funcao

Uma funcao associa cada valor de entrada a um unico valor de saida.

Escrevemos:

$$
y=f(x)
$$

Na fisica, o caso mais importante e quando a entrada e o tempo:

$$
s = s(t)
$$

$$
v = v(t)
$$

$$
a = a(t)
$$

Ou seja: a grandeza fisica depende do instante.

---

## 2. Dominio, contradominio e imagem

### Dominio

Conjunto de valores que podem entrar na funcao.

### Imagem

Conjunto de valores que realmente saem da funcao.

### Exemplo fisico

Se um experimento comeca em:

$$
t=0
$$

e termina em:

$$
t=8 \text{ s}
$$

entao o dominio fisico pode ser:

$$
0 \leq t \leq 8
$$

Mesmo que a formula aceite outros valores, o problema real pode restringir o dominio.

---

## 3. Formas de representar uma funcao

- formula
- tabela
- grafico
- descricao verbal

Na fisica, grafico nao e enfeite. Ele mostra comportamento:

- reta crescente
- reta decrescente
- parabola
- valor maximo
- ponto onde a grandeza zera

---

## 4. Funcao afim

Forma geral:

$$
f(x)=ax+b
$$

### Interpretacao dos coeficientes

- $$a$$: coeficiente angular
- $$b$$: coeficiente linear

### Leitura fisica no MRU

A funcao horaria do espaco no MRU e:

$$
s(t)=s_0+vt
$$

Ela e uma funcao afim.

Comparando com:

$$
f(x)=ax+b
$$

temos:

- $$a \leftrightarrow v$$
- $$b \leftrightarrow s_0$$

Ou seja:

- a inclinacao da reta representa a velocidade
- o valor inicial representa a posicao no instante zero

### Exemplo

$$
s(t)=12+4t
$$

Isso significa:

- posicao inicial: $$12 \text{ m}$$
- velocidade: $$4 \text{ m/s}$$

Se:

$$
t=5 \text{ s}
$$

entao:

$$
s(5)=12+4\cdot5=32 \text{ m}
$$

### Raiz da funcao afim

A raiz e o valor de entrada para o qual a saida vale zero.

No exemplo:

$$
12+4t=0
$$

$$
t=-3
$$

Matematicamente existe. Fisicamente, nem sempre faz sentido se o estudo comeca em $$t=0$$.

---

## 5. Grafico da funcao afim

O grafico e uma reta.

Para desenhar, bastam dois pontos.

### Exemplo de MRU

$$
s(t)=2t-4
$$

Pontos:

- se $$t=0$$, $$s=-4$$
- se $$t=2$$, $$s=0$$

Com esses dois pontos, a reta fica determinada.

### Interpretacao importante

Quanto maior a inclinacao da reta em $$s \times t$$, maior o modulo da velocidade.

---

## 6. Funcao quadratica

Forma geral:

$$
f(x)=ax^2+bx+c,\quad a\neq0
$$

O grafico e uma parabola.

### Leitura fisica no MRUV

A funcao horaria do espaco no movimento uniformemente variado e:

$$
s(t)=s_0 + v_0t + \frac{at^2}{2}
$$

Ela e uma funcao quadratica do tempo.

### Concavidade

- se $$a>0$$, concavidade para cima
- se $$a<0$$, concavidade para baixo

### Exemplo com lancamento vertical

$$
h(t)=20+15t-5t^2
$$

Como o coeficiente de $$t^2$$ e negativo, a parabola abre para baixo.

Isso combina com a ideia de:

- o corpo sobe
- atinge altura maxima
- depois desce

---

## 7. Raizes da funcao quadratica

As raizes sao os valores de $$x$$ que satisfazem:

$$
ax^2+bx+c=0
$$

Usamos:

$$
\Delta=b^2-4ac
$$

e:

$$
x=\frac{-b\pm\sqrt{\Delta}}{2a}
$$

### Interpretacao grafica

- duas raizes reais: a parabola corta o eixo em dois pontos
- uma raiz real dupla: toca o eixo em um ponto
- nenhuma raiz real: nao corta o eixo

### Interpretacao fisica

Em mecanica, a raiz pode significar:

- instante em que a posicao fica zero
- momento em que o corpo toca o solo
- instante em que a altura se anula

---

## 8. Vertice da parabola

O vertice e o ponto mais alto ou mais baixo da parabola.

### Coordenadas do vertice

$$
x_v=-\frac{b}{2a}
$$

$$
y_v=f(x_v)
$$

ou

$$
y_v=-\frac{\Delta}{4a}
$$

### Significado em fisica

No lancamento vertical, o vertice pode representar a altura maxima.

Exemplo:

$$
h(t)=20+15t-5t^2
$$

Aqui:

$$
a=-5,\quad b=15
$$

Logo:

$$
t_v=-\frac{15}{2\cdot(-5)}=1{,}5 \text{ s}
$$

Esse e o instante da altura maxima.

---

## 9. Graficos que o aluno de mecanica precisa reconhecer

### Posicao por tempo no MRU

- reta
- inclinacao constante
- sinal da inclinacao indica o sentido do movimento

### Velocidade por tempo no MUV

- reta
- inclinacao ligada a aceleracao

### Posicao por tempo no MRUV

- parabola
- concavidade depende do sinal da aceleracao

Aprender funcao sem conectar com esses graficos torna o assunto artificial.

---

## 10. Checklist de funcoes para fisica

1. qual grandeza depende de qual?
2. a relacao e linear ou quadratica?
3. o grafico esperado e reta ou parabola?
4. o coeficiente tem leitura fisica?
5. a raiz e o vertice tem significado no contexto?

---

## 11. Frases para guardar

- em fisica, funcao quase sempre significa grandeza em funcao do tempo
- MRU e reta
- MRUV traz reta em $$v \times t$$ e parabola em $$s \times t$$
- raiz matematica so vira resposta fisica se fizer sentido no intervalo do problema
