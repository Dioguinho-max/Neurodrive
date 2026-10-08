# NeuroDrive

**Um jogo de corrida 3D para navegador, feito para disputar com amigos e explorar inteligência artificial.**

O NeuroDrive começou como um experimento de carros aprendendo a dirigir com redes neurais. Hoje reúne corridas contra IA, salas online, classificação para formar o grid, garagem com skins e pit stops animados. O laboratório de neuroevolução continua disponível para acompanhar o aprendizado dos carros.

O projeto está em **beta**, com física de estilo arcade e melhorias contínuas de visual, pilotagem e multiplayer. Não é um simulador profissional de automobilismo.

## Recursos

- **Corrida solo:** cinco adversários de IA, dificuldades selecionáveis e provas de 1, 3, 5, 10, 20 ou 50 voltas.
- **Classificação:** saída dos boxes, volta de aquecimento e duas tentativas cronometradas. A melhor volta válida define o grid.
- **Três circuitos:** Serra Verde, Autódromo Veloz e Vale Técnico, com relevos, arquibancadas, garagens e patrocinadores fictícios.
- **Online:** salas por código para 2–6 jogadores, com IA preenchendo as vagas. Corridas comuns de 1, 3, 5 ou 10 voltas e Copa Neuro de 3 voltas, valendo moedas do jogo.
- **Campeonato solo:** etapas, pontuação e classificação geral.
- **Garagem e loja:** conta de piloto, moedas, 14 pinturas e prévia 3D. As skins são cosméticas e não mudam o desempenho.
- **Pilotagem:** seis marchas, câmbio automático ou manual, freio progressivo, aderência e som de motor sintetizado.
- **Apresentação:** câmera em terceira pessoa, tabela de posições, conta-giros, encerramento da sessão, pódio e notificações de recorde pessoal.
- **Qualidade gráfica salva:** desempenho, mais detalhes ou super alto.

## Pit stops e pneus

Em corridas de **5 voltas ou mais**, os pneus desgastam e perdem aderência gradualmente. A classificação e as provas curtas não têm desgaste.

Pressione **B** ou use **Chamar boxes** para solicitar a parada. Na próxima entrada, logo após a linha de largada, o piloto automático assume e conduz até o atendimento com limite de **60 km/h**. É possível cancelar o pedido antes de entrar.

A troca dura **8 segundos**: o carro é levantado, quatro mecânicos trabalham nas rodas e quatro auxiliares entregam pneus novos e recolhem os usados. O tempo da corrida continua contando. Após sair dos boxes, o jogador retoma o controle. A IA também faz paradas quando precisa.

O acesso tem uma curva gradual, piso asfaltado até o fundo das garagens e marcações de circulação. As rodas possuem aros detalhados, caixas de roda fechadas e freios visíveis durante a troca. No online, o servidor controla desgaste e troca. Veja [PIT-STOPS.md](PIT-STOPS.md).

## Executar localmente

Use **Node.js 22, a partir da versão 22.13**, conforme a faixa suportada no `package.json`. Na pasta do projeto:

```bash
npm ci
npm start
```

Abra **http://127.0.0.1:3000**. No PowerShell, se `npm.ps1` estiver bloqueado, use `npm.cmd ci` e `npm.cmd start`.

O servidor local oferece corrida solo, contas, loja e recompensas de treino com SQLite. Os dados ficam em `server/data/neurodrive.sqlite`. Esse modo não inicia o multiplayer cloud nem compartilha automaticamente as contas da publicação.

Também é possível abrir [output/corrida.html](output/corrida.html) como visitante ou [output/neuro-pista.html](output/neuro-pista.html) para o laboratório, sem backend. Contas e loja precisam do servidor.

## Controles

| Ação | Tecla |
| --- | --- |
| Acelerar | W ou ↑ |
| Frear | S ou ↓ |
| Virar | A/D ou ←/→ |
| Subir / reduzir marcha no manual | E / Q |
| Chamar ou cancelar boxes | B |
| Recuperar carro na pista | R |
| Abrir menu | Esc |
| Pausar / continuar no solo | P |

Há controles de toque na tela. No online, abrir o menu **não pausa a corrida**. A recuperação do carro tem penalidade de espera; o pit stop é conduzido automaticamente.

## Laboratório de IA

Cada carro possui uma rede neural que recebe sensores de distância e velocidade e produz decisões de direção e aceleração. A visualização mostra sensores, ativações, conexões e cálculos de neurônios; é possível pausar e inspecionar a rede.

O treinamento usa **neuroevolução**: as redes dos carros que dirigem melhor são selecionadas e geram novas versões com alterações nos pesos. A população pode ser ajustada de 1 a 100 carros. Os pesos iniciais favorecem procurar espaço livre, portanto o comportamento não começa inteiramente do zero. O treinamento fica em memória e reinicia ao recarregar a página.

Os adversários do modo Corrida usam um controlador próprio, com planejamento de curvas, ultrapassagens e paradas. Eles não são uma população treinada ao vivo pelo laboratório.

## Tecnologias e publicação

| Parte | Tecnologia |
| --- | --- |
| Interface | HTML, CSS e JavaScript |
| Cenário 3D | Three.js, modelos construídos em código |
| Áudio | Web Audio API |
| Backend local | Node.js e SQLite integrado |
| Backend online | Node.js, WebSocket e PostgreSQL |
| Publicação | Vercel, Render e Supabase |

No multiplayer, o navegador antecipa os comandos do próprio carro e suaviza as atualizações recebidas. O servidor controla a simulação da corrida, resultados, compras e recompensas. A conexão e o desempenho do dispositivo ainda influenciam a experiência.

Para gerar o frontend em `dist/`:

```bash
npm run build
```

A publicação e as variáveis de ambiente estão em [DEPLOY.md](DEPLOY.md). O backend cloud usa `npm run start:cloud` e precisa das configurações de banco e origens. Os arquivos de teste privado e experimentos de rede não são necessários para iniciar o jogo local.

Contas locais e cloud usam persistências separadas. Bancos locais, senhas e arquivos `.env` não devem ser enviados ao repositório. As moedas são virtuais; não há compras com dinheiro real. Nesta versão não há recuperação de senha por e-mail, e a corrida em andamento não é salva ao fechar a página.

## Estrutura principal

```text
output/
  corrida.html                 Menu e corrida solo
  online.html                  Salas multiplayer
  neuro-pista.html              Laboratório de redes neurais
  neurodrive-race-engine.js     Física e regras da corrida
  neuro-pista-track.js          Geometria dos circuitos e boxes
  neuro-pista-3d.js             Cenário, carros, câmeras e equipe dos boxes
  neurodrive-garage.js          Contas, garagem e loja
  tests/                       Testes automatizados
  vendor/                      Three.js e licença
server/
  server.cjs                   Servidor local com SQLite
  cloud.cjs                    Backend cloud
  online.cjs                   Salas e simulação online
  cloud-schema.sql             Estrutura do banco PostgreSQL
scripts/                       Build e ferramentas de migração
```

## Testes

Depois de instalar as dependências:

```bash
npm run test:ui
npm run test:online
npm run test:accounts
npm run test:cloud
node output/tests/pit-stop.cjs
node output/tests/pit-exit.cjs
node output/tests/pit-view.cjs
node output/tests/skins.cjs
```

Os testes cobrem menus, previsão online, contas, persistência, troca de pneus, trânsito nos boxes, piso das garagens, câmeras e modelos. Há verificações adicionais de pilotagem, física, áudio e recompensas em `output/tests/`. Parte dos testes usa DOM ou renderizador simulado; a avaliação visual e a sensação de pilotagem também precisam ser conferidas no navegador.

## Sobre o projeto

O NeuroDrive é um projeto experimental para aprender, construir e se divertir com amigos. Combina um jogo de corrida acessível pelo navegador com um espaço para visualizar como redes neurais tomam decisões. O desenvolvimento busca melhorar a experiência aos poucos, mantendo a proposta de jogo casual.

## Licença

A licença MIT do Three.js está preservada em [output/vendor/THREE-LICENSE.txt](output/vendor/THREE-LICENSE.txt). Ela se aplica à biblioteca. Uma licença própria para o código do NeuroDrive ainda não foi definida neste repositório.
