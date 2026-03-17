# Pendulo de impacto

## Ideia central

Esta cena usa o `ventania3d` para montar um pendulo pesado preso por uma junta de distancia. A esfera nao segue uma curva desenhada por formula pronta: ela e um rigid body, a corda e uma restricao numerica e as caixas caem por contato real.

## Leis fisicas centrais

- A gravidade converte altura em velocidade.
- A junta tenta manter `|x_bola - x_ancora| = L`.
- O impacto com as caixas troca impulso e momento.
- O atrito decide quanto do movimento vira deslizamento e quanto vira arraste/tombamento.

## O que o solver faz

1. Integra as velocidades pela gravidade.
2. Aplica a `DistanceJoint` para fechar o comprimento da corda.
3. Detecta pares candidatos na broad-phase.
4. Resolve contatos reais na narrow-phase.
5. Aplica impulso normal e impulso de atrito.

## Circle cast e eventos

O trace vermelho sai no sentido da velocidade instantanea da esfera. Ele agora usa um `circle cast`, ou seja, leva em conta o volume real da esfera em movimento para responder qual o primeiro corpo que ela encontraria.

Ao mesmo tempo, o mundo fisico expoe eventos de contato:

- `begin`: contato que acabou de nascer;
- `persist`: contato que continuou ativo;
- `end`: contato que deixou de existir.

Isso permite usar a engine nao so para simular, mas tambem para dirigir logica de cena.

## O que observar

- A maior velocidade aparece perto do ponto mais baixo.
- Aumentar o angulo inicial aumenta a energia disponivel no impacto.
- Caixas mais pesadas absorvem melhor o empurrao.
- Atrito alto favorece tombamento e travamento; atrito baixo favorece escorregamento.

## Leitura de engenharia

Essa cena existe para provar que a engine nao esta acoplada a empilhadeira. Com o mesmo nucleo ja da para montar:

- pendulos;
- guindastes simples;
- stacks de caixas;
- brinquedos mecanicos;
- cenas de demolicao;
- testes de impacto.

## Erro comum

Nao pense que a junta "teleporta" a esfera para a orbita. Ela corrige o sistema numericamente por impulsos, por isso o painel ainda mostra um pequeno erro residual no comprimento da corda.
