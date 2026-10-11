# NeuroDrive

**Um jogo de corrida 3D para navegador, feito para disputar com amigos e explorar inteligência artificial.**

O NeuroDrive começou como um experimento de carros aprendendo a dirigir com redes neurais. Hoje reúne corridas contra IA, salas online, classificação para formar o grid, garagem com skins e pit stops animados. O laboratório de neuroevolução continua disponível para acompanhar o aprendizado dos carros.

O projeto está em **beta**, com física de estilo arcade e melhorias contínuas de visual, pilotagem e multiplayer. Não é um simulador profissional de automobilismo.

## Recursos

- **Chuva e pneus:** escolha Seco, Chuva ou Variável ao montar a disputa solo ou a sala online. No variável, chove dos 35 aos 110 segundos de cada sessão; a pista leva cerca de 20 segundos para encharcar e 60 para secar. Pneus de seco perdem fortemente a capacidade de fazer curvas, acelerar e frear no molhado. Selecione o composto em “Próxima troca” antes de chamar os boxes. A troca só acontece durante o serviço. Pneus de chuva desgastam mais no seco; a IA adapta sua estratégia. Em eventos com chuva, desgaste e boxes ficam ativos mesmo nas provas curtas e na classificação. O modo Chuva já larga com pneus adequados; Variável começa com pneus de seco. O servidor controla as condições de todos no online.
- **Suspensão visual:** a carroceria inclina suavemente nas curvas, com rodas, cubos e freios independentes acompanhando o terreno. Vale para jogadores e IA, no solo e online, sem mudar a física ou as regras da corrida.
- **Equipes nos seis boxes:** dois chefes por equipe trabalham nos computadores, com movimentos de digitação e telas de telemetria do respectivo carro. Cenário compartilhado pelo solo e online; estações distantes deixam de animar para poupar processamento.
- **Apresentação online sincronizada:** câmera de abertura durante a saída automática dos boxes ou o início da contagem. Pode ser pulada e termina antes do controle manual ou no último segundo da contagem, sem pausar o servidor. Tetos dos boxes permanecem visíveis; a câmera acompanha pela frente aberta da garagem.
- **Apresentação da sessão solo:** aproximação da pista e dos carros antes da classificação e da corrida, com duração de 5,5 segundos. Pode ser pulada com o botão, Esc ou controle; não consome tempo de prova. Respeita a preferência de movimento reduzido.
- **Vitrine ampliada:** gire o carro por arraste, toque, teclado ou botões acessíveis pelo controle. Compare a seleção com a pintura equipada no mesmo ângulo e compre/equipe diretamente na prévia, com confirmação visual após o servidor salvar.
- **Menu com garagem 3D:** carro equipado em destaque, iluminação de garagem, resumo do piloto, moedas e medalhas. Abas organizam corrida, perfil, garagem, ajustes e recordes. A câmera se move suavemente no desktop; no celular e com movimento reduzido, a prévia fica estática. O menu libera a prévia ao entrar na corrida.
- **Corrida solo:** cinco adversários de IA, dificuldades selecionáveis e provas de 1, 3, 5, 10, 20 ou 50 voltas.
- **Classificação:** saída dos boxes, volta de aquecimento e duas tentativas cronometradas. A melhor volta válida define o grid.
- **Três circuitos:** Serra Verde, Autódromo Veloz e Vale Técnico, com relevos, arquibancadas, garagens e patrocinadores fictícios.
- **Online:** salas por código para 2–6 jogadores, com IA preenchendo as vagas. Corridas comuns de 1, 3, 5 ou 10 voltas e Copa Neuro de 3 voltas, valendo moedas do jogo.
- **Campeonato solo:** etapas, pontuação e classificação geral.
- **Garagem e loja:** conta de piloto, moedas, 14 pinturas e prévia 3D. As skins são cosméticas e não mudam o desempenho.
- **Pilotagem:** seis marchas, câmbio automático ou manual, freio progressivo, aderência e som de motor sintetizado.
- **Apresentação:** câmera em terceira pessoa, tabela de posições, conta-giros, encerramento da sessão, pódio e notificações de recorde pessoal.
- **Qualidade gráfica salva:** desempenho, mais detalhes ou super alto.

## Etapas online e cerimônia de chegada

Ao iniciar uma sala online, todos disputam a classificação: uma volta de aquecimento e duas tentativas válidas, com limite de cinco minutos. Quem termina pode acompanhar os adversários. A melhor volta determina o grid; pilotos sem tempo ficam atrás. Quando a sessão termina, o grid aparece durante uma espera de dez segundos e o servidor inicia a contagem da corrida automaticamente.

A classificação não concede moedas. Na chegada, os modos solo e online exibem uma cerimônia de 12 segundos dentro do próprio autódromo: os três melhores carros chegam e estacionam junto ao pódio; a câmera se aproxima e mostra os pilotos levantando os troféus. Em seguida aparecem os resultados. A animação não altera tempos, posições ou recompensas. No online, a cerimônia espera o encerramento da prova (todos os humanos terminarem ou o limite de tempo); quem ainda estiver em pista é ordenado pelo progresso. Desconectados não participam do pódio.

## Pit stops e pneus

Em corridas de **5 voltas ou mais**, os pneus desgastam e perdem aderência gradualmente. A classificação e as provas curtas não têm desgaste.

Pneus desgastados dificultam as curvas e recebem alertas no painel. Ao atingir **0%**, um pneu estoura: o carro puxa para um lado, perde aderência e velocidade. A troca nos boxes repara o dano; reposicionar o carro não restaura os pneus. Derrapagens, frenagens e grama aceleram o desgaste.

Pressione **B** ou use **Chamar boxes** para solicitar a parada. Na próxima entrada, logo após a linha de largada, o piloto automático assume e conduz até o atendimento com limite de **60 km/h**. É possível cancelar o pedido antes de entrar.

A troca dura **8 segundos**: o carro é levantado, quatro mecânicos trabalham nas rodas e quatro auxiliares entregam pneus novos e recolhem os usados. O tempo da corrida continua contando. Após sair dos boxes, o jogador retoma o controle. A IA também faz paradas quando precisa.

O acesso tem uma curva gradual, piso asfaltado até o fundo das garagens e marcações de circulação. As rodas possuem aros detalhados, caixas de roda fechadas e freios visíveis durante a troca. No online, o servidor controla desgaste e troca.

## Executar localmente

Use **Node.js 22, a partir da versão 22.13**, conforme a faixa suportada no `package.json`. Na pasta do projeto:

```bash
npm ci
npm start
```

Abra **http://127.0.0.1:3000**. No PowerShell, se `npm.ps1` estiver bloqueado, use `npm.cmd ci` e `npm.cmd start`.

O servidor local oferece corrida solo, contas, loja e recompensas de treino com SQLite. Os dados ficam em `server/data/neurodrive.sqlite`. Esse modo não inicia o multiplayer cloud nem compartilha automaticamente as contas da publicação.

Também é possível abrir [output/corrida.html](output/corrida.html) como visitante ou [output/neuro-pista.html](output/neuro-pista.html) para o laboratório, sem backend. Contas e loja precisam do servidor.

O box do jogador também conta com dois chefes de equipe em estações de computador, com headsets e animações de digitação. As telas acompanham velocidade, marcha, condição dos pneus e RPM do carro acompanhado.

## Controles

### Conquistas e apresentação

O perfil exibe medalhas de **Primeira vitória**, **Primeiro pódio** e **Recordista**, com histórico e datas. Vitórias e pódios anteriores são recuperados dos resultados salvos. Recordista passa a contar com esta atualização: exige uma marca estritamente melhor que a liderança da temporada (ou a primeira marca do circuito). Empatar não concede essa medalha. A medalha permanece mesmo depois de perder a liderança.

Recordes pessoais do solo continuam com aviso de dez segundos. No online, a confirmação vem do banco: aviso discreto para melhoria pessoal, destaque dourado para recorde do circuito, sem pausar ou bloquear os controles. Avisos repetidos nos snapshots não reaparecem. A tela de resultados compara o tempo com a marca anterior à sessão; no online, apenas melhorias competitivas confirmadas entram na comparação. Classificação e corrida têm comparações separadas. Uma primeira marca aparece como tal, sem inventar um tempo anterior.

Publique frontend e backend juntos. A tabela de conquistas e a recuperação do histórico são aplicadas na inicialização do backend; nenhuma nova variável de ambiente é necessária. No servidor local, vitórias e pódios vêm do banco SQLite; a medalha Recordista depende do mural online. Em caso de reinício antes da gravação de um recorde pendente, o aviso e a conquista podem não ser registrados.

### Ranking por circuito

A aba **Recordes** reúne as melhores voltas competitivas por circuito, temporada e histórico. Mostra o piloto líder, foto, pintura da conquista e data, além da sua posição e diferença para o líder. Há uma marca por conta, paginação e acesso ao perfil pelo nick. Recordes solo do navegador aparecem separados.

Somente voltas limpas calculadas no servidor online entram no mural, inclusive na classificação. A primeira passagem arma a tentativa; recuperação, boxes, saída de pista, contramão e saltos de progressão a invalidam. Os tempos anteriores à implementação não são importados. Empates favorecem a conquista mais antiga, com desempate estável pelo identificador interno da conta.

Publique frontend e backend juntos. As tabelas são criadas automaticamente no Supabase pelo backend, com RLS e sem gravação pública. A temporada inicial é `beta-1`. Para inaugurar outra após mudanças de física ou pista, adicione-a em `server/cloud-schema.sql` e atualize `CURRENT` em `server/records.cjs`. Não apague as anteriores: o histórico escolhe a melhor marca de cada conta entre temporadas que podem ter físicas diferentes.

Falhas de gravação são retentadas a cada cinco segundos enquanto o servidor está ativo; um reinício antes da gravação pode perder marcas pendentes. O mural mostra somente dados salvos. Em `npm.cmd start`, somente os tempos solo ficam disponíveis; o ranking precisa do backend cloud. Testes específicos: `npm.cmd run test:records`.

### Perfil do piloto

Em **Conta**, personalize seu nick, número e foto com corte ajustável. O cartão mostra a pintura equipada, corridas, vitórias, pódios, poles e melhores voltas online salvas por circuito. Você também pode visitar outro piloto pelo nome da conta.

Fotos publicadas usam Supabase Storage. Poles e voltas do perfil são registradas nas novas corridas online concluídas; o histórico anterior não contém esses dados. O mural competitivo usa validação própria, descrita acima, e também aceita voltas limpas da classificação.

### Teclado e toque

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

### Controle de Xbox ou PlayStation

Conecte por USB ou Bluetooth e pressione um botão com o jogo aberto. Use HTTPS (site publicado) ou localhost; o navegador precisa reconhecer o controle no mapeamento padrão da Gamepad API. Controles com mapeamento proprietário ainda não são suportados.

| Ação | Xbox / PlayStation |
| --- | --- |
| Direção gradual | Analógico esquerdo |
| Acelerar / frear gradualmente | RT / LT · R2 / L2 |
| Subir / reduzir marcha | RB / LB · R1 / L1 |
| Boxes | X / □ |
| Recuperar carro | Y / △ |
| Menu / pausa | Start / Options |
| Navegar no menu | Direcional ou analógico esquerdo |
| Confirmar / voltar | A / B · ✕ / ○ |
| Ajustar seleção ou volume | Esquerda / direita |

Os menus destacam a opção selecionada. Campos de login e códigos de sala continuam usando teclado ou teclado virtual do dispositivo. Após desconectar ou trocar de janela, solte os botões e centralize o analógico para retomar. No solo, desconectar abre a pausa; no online, abre a sala e aciona o freio, mas a corrida continua.

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
node output/tests/podium.cjs
node output/tests/tyre-degradation.cjs
```

Os testes cobrem menus, previsão online, contas, persistência, troca de pneus, trânsito nos boxes, piso das garagens, câmeras e modelos. Há verificações adicionais de pilotagem, física, áudio e recompensas em `output/tests/`. Parte dos testes usa DOM ou renderizador simulado; a avaliação visual e a sensação de pilotagem também precisam ser conferidas no navegador.

## Sobre o projeto

O NeuroDrive é um projeto experimental para aprender, construir e se divertir com amigos. Combina um jogo de corrida acessível pelo navegador com um espaço para visualizar como redes neurais tomam decisões. O desenvolvimento busca melhorar a experiência aos poucos, mantendo a proposta de jogo casual.

## Licença

A licença MIT do Three.js está preservada em [output/vendor/THREE-LICENSE.txt](output/vendor/THREE-LICENSE.txt). Ela se aplica à biblioteca. Uma licença própria para o código do NeuroDrive ainda não foi definida neste repositório.
