# Empilhadeira showcase

## Ideia central
Esta cena funciona como vitrine da engine `ventania3d`. Aqui aparecem, ao mesmo tempo, **corpo rígido**, **contato**, **atrito**, **torque**, **rolamento**, **transferência de carga**, **cinemática controlada da pá** e agora também **um mapa maior que a tela com pisos diferentes**. Em vez de um problema isolado, a empilhadeira reúne vários capítulos da mecânica num só experimento.

O objetivo não é apenas mover um veículo, mas observar como forças aplicadas em pontos diferentes geram respostas lineares e angulares no conjunto.

## Leis centrais
$$
\sum \vec{F} = m\vec{a}
$$

$$
\sum \tau = I\alpha
$$

$$
v = \omega R
$$

## Interpretação física
- A força aplicada nas rodas pode produzir deslocamento do chassi.
- O contato com o solo limita a tração disponível.
- A pá aplica forças em uma região deslocada do centro de massa, gerando torque.
- A carga apoiada em um pallet altera o equilíbrio e pode inclinar o conjunto.

## O que observar na cena
1. A pá precisa entrar no vão útil do pallet para erguer a carga.
2. O trecho de cascalho reduz a tração, então a rampa fica dependente de embalo.
3. Quando a pá sobe, a massa engatada altera a distribuição de esforços.
4. Inclinar a pá muda o ponto de aplicação da força e pode fazer o chassi reagir.
5. As caixas quebráveis mostram impacto e transferência de energia de um jeito mais visível.

## Leitura didática da roda
Numa leitura mais realista, o giro da roda e o avanço da empilhadeira estão conectados:

$$
v = \omega R
$$

Isso significa que a velocidade linear do veículo depende da velocidade angular da roda e do seu raio efetivo.

## Leitura didática da estabilidade
Um sistema desse tipo não depende apenas da força máxima do motor. A estabilidade depende também de:
- massa da empilhadeira;
- massa e posição da carga;
- altura da pá;
- distância da carga ao eixo de apoio;
- força de contato com o solo.

## Leitura didática do mapa
O cenário agora foi dividido em trechos com comportamentos diferentes:
- **concreto**, onde a resposta é mais previsível;
- **cascalho**, onde a roda patina com mais facilidade;
- **deck metálico**, onde a empilhadeira chega depois da rampa;
- **doca de madeira**, que fecha a parte alta do percurso.

Isso aproxima a cena de um jogo/sandbox: o mundo não cabe inteiro na tela e a câmera precisa acompanhar o veículo.

## Por que esta cena é especial
Ela é menos “equação fechada” e mais **simulação física integrada**. Em vez de resolver uma única fórmula, o motor atualiza contatos, atrito e torque a cada passo de tempo. Isso aproxima o comportamento do que se espera de uma engine física.

## Erro comum
> Pensar que subir a rampa depende só da potência. Na prática, atrito disponível, embalo, centro de massa, alavanca e contato com o solo são tão importantes quanto a força do motor.
