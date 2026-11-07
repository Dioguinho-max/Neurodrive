# NeuroDrive

**Um jogo de corrida 3D para navegador, feito para disputar com amigos e explorar inteligência artificial.**

O NeuroDrive começou como um experimento de carros aprendendo a dirigir com redes neurais. Hoje reúne corridas contra IA, salas online, classificação para formar o grid, garagem com skins e pit stops animados. O laboratório de neuroevolução continua disponível para acompanhar o aprendizado dos carros.

O projeto está em **beta**, com física de estilo arcade e melhorias contínuas de visual, pilotagem e multiplayer. Não é um simulador profissional de automobilismo.

**Campeonato online:** três etapas na mesma sala, classificação acumulada por conta e anúncio do campeão. Entre corridas, os jogadores votam na próxima pista; o dono confirma uma das mais votadas. Funciona no servidor hospedado e no pendrive, com interface PT/EN e adaptação para celular. As regras e os limites de persistência estão em [Jogar no pendrive](JOGAR-NO-PENDRIVE.md#campeonato-e-votação). Atualize frontend e backend juntos; não exige migração de banco.

**Salas personalizadas e destaques:** o dono configura clima, voltas, dificuldade da IA e intensidade do desgaste antes da classificação. Mudanças exigem nova confirmação de todos. Os resultados mostram melhor volta, posições ganhas e diferença para o vencedor; o campeonato detalha a pontuação por etapa. Disponível também no pendrive.

O menu online segue a identidade do menu principal, com marca em duas linhas e navegação entre **Sala e disputa** e **Ajustes**. Idioma, áudio, gráficos e câmera ficam nos ajustes; as regras de campeonato e Copa Neuro aparecem conforme o modo escolhido. A apresentação usa ilustração vetorial leve e se adapta ao celular.

Para executar a bateria de testes, use `npm test` (`npm.cmd test` no PowerShell). Consulte a [revisão de qualidade](REVISAO-QUALIDADE.md) para conhecer as correções verificadas e os limites dessa validação.

As salas online mostram a preparação da pista, a confirmação e o ping de cada jogador. Ao terminar uma corrida e salvar suas recompensas, o dono pode repetir o circuito ou escolher outro sem trocar o código da sala. Todos confirmam novamente antes da próxima classificação. Esses recursos também funcionam no pacote local de pendrive; publique frontend e backend juntos para atualizar a versão hospedada.

## Recursos

- **Easter egg:** uma surpresa foi adicionada ao jogo.
- **Previsão na apresentação:** painel com as condições da classificação e da corrida, destaque da sessão atual e indicação do pneu para largar. Compartilhado pelo solo e online, usa o clima da disputa e acompanha a seleção de idioma. No tempo variável, informa início seco, chuva gradual e secagem; não altera o relógio ou a largada do servidor.
- **Idiomas:** Português com bandeira do Brasil e English com bandeira dos EUA, em **Ajustes → Idioma** no solo e no menu da sala online. A escolha é salva neste navegador e compartilhada entre os dois modos; não exige reiniciar a partida. Nicks e nomes das pinturas e circuitos são preservados.
- **Painel do piloto:** foto e identidade no topo; abas de Visão geral, Conquistas, Editar perfil e Segurança. Saldo, bônus diário e melhores voltas ficam no resumo, sem misturar formulários. Navegação por teclado e layout adaptado ao celular; alternar as abas preserva alterações ainda não salvas.
- **Acabamento dos pneus e suspensão:** pneus de seco têm faixa verde e os de chuva, azul. As caixas de roda têm amortecedor, haste, mola e braços de suspensão que acompanham a altura das rodas. Os detalhes aparecem de perto na corrida e durante a troca nos boxes, no solo e no online; são ocultados à distância para poupar renderização.
- **Chuva e pneus:** escolha Seco, Chuva ou Variável ao montar a disputa solo ou a sala online. No variável, a chuva chega gradualmente entre 35 e 60 segundos e diminui entre 140 e 170 segundos de cada sessão. A pista leva cerca de um minuto de chuva forte para encharcar e dois minutos sem chuva para secar. Pneus de seco perdem aderência aos poucos, conforme a água acumula. Selecione o composto em “Próxima troca” antes de chamar os boxes. A troca só acontece durante o serviço. Pneus de chuva desgastam mais no seco; a IA adapta sua estratégia. Em eventos com chuva, desgaste e boxes ficam ativos também nas provas curtas e na classificação, com desgaste reduzido nessas sessões para evitar estouros prematuros. O modo Chuva já larga com pneus adequados; Variável começa com pneus de seco. O servidor controla as condições de todos no online.
- **Suspensão visual:** a carroceria inclina suavemente nas curvas, com rodas, cubos e freios independentes acompanhando o terreno. Vale para jogadores e IA, no solo e online, sem mudar a física ou as regras da corrida.
- **Equipes nos seis boxes:** dois chefes por equipe trabalham nos computadores, com movimentos de digitação e telas de telemetria do respectivo carro. Cenário compartilhado pelo solo e online; estações distantes deixam de animar para poupar processamento.
- **Apresentação online sincronizada:** câmera de abertura durante a saída automática dos boxes ou o início da contagem. Pode ser pulada e termina antes do controle manual ou no último segundo da contagem, sem pausar o servidor. Tetos dos boxes permanecem visíveis; a câmera acompanha pela frente aberta da garagem.
- **Apresentação da sessão:** panorâmica do circuito seguida de um sobrevoo por um trecho escolhido aleatoriamente, com previsão do tempo em uma faixa de transmissão. Dura 8 segundos e pode ser pulada com o botão, Esc ou controle. No solo, não consome tempo de prova; no online, aproveita a saída automática dos boxes e a espera antes da corrida, liberando os controles antes da largada. Respeita a preferência de movimento reduzido.
- **Vitrine ampliada:** gire o carro por arraste, toque, teclado ou botões acessíveis pelo controle. Compare a seleção com a pintura equipada no mesmo ângulo e compre/equipe diretamente na prévia, com confirmação visual após o servidor salvar.
- **Menu com garagem 3D:** carro equipado em destaque, iluminação de garagem, resumo do piloto, moedas e medalhas. Abas organizam corrida, perfil, garagem, ajustes e recordes. A câmera se move suavemente no desktop; no celular e com movimento reduzido, a prévia fica estática. O menu libera a prévia ao entrar na corrida.
- **Corrida solo:** cinco adversários de IA, dificuldades selecionáveis e provas de 1, 3, 5, 10, 20 ou 50 voltas.
- **IA competitiva:** menos freadas corretivas, mais disputa nas curvas abertas e ultrapassagens. Os três níveis têm ritmo reforçado. O difícil usa um bônus arcade de força de aceleração de até 40%, reduzido conforme a pista molha, mantendo o teto de 205 km/h. Esse bônus só vale para bots; a física dos jogadores e as regras de validação de voltas permanecem iguais.
- **Classificação:** saída dos boxes, volta de aquecimento e duas tentativas cronometradas. A melhor volta válida define o grid.
- **Três circuitos:** Serra Verde, Autódromo Veloz e Vale Técnico, com relevos, arquibancadas, garagens e patrocinadores fictícios.
- **Online:** salas por código para 2–6 jogadores, com IA preenchendo as vagas. Corridas comuns de 1, 3, 5 ou 10 voltas e Copa Neuro de 3 voltas, valendo moedas do jogo.
- **Campeonato solo:** etapas, pontuação e classificação geral.
- **Garagem e loja:** conta de piloto, moedas, 14 pinturas e prévia 3D. As skins são cosméticas e não mudam o desempenho.
- **Pilotagem:** seis marchas, câmbio automático ou manual, freio progressivo, aderência e som de motor sintetizado.
- **Apresentação:** câmera em terceira pessoa, tabela de posições, conta-giros, encerramento da sessão, pódio e notificações de recorde pessoal.
- **Qualidade gráfica salva:** desempenho, mais detalhes ou super alto.
- **Desempenho para máquinas mais simples:** cenário 3D limitado a 1280×720 internamente, árvores simplificadas, menos detalhes internos das rodas e suspensão detalhada apenas no atendimento do jogador nos boxes. Preserva interface na resolução da tela, skins e física; vale para solo e online.

## Etapas online e cerimônia de chegada

Ao iniciar uma sala online, todos disputam a classificação: uma volta de aquecimento e duas tentativas válidas, com limite de cinco minutos. Quem termina pode acompanhar os adversários. A melhor volta determina o grid; pilotos sem tempo ficam atrás. Quando a sessão termina, o grid aparece durante uma espera de dez segundos e o servidor inicia a contagem da corrida automaticamente.

A classificação não concede moedas. Na chegada, os modos solo e online exibem uma cerimônia de 12 segundos dentro do próprio autódromo: os três melhores carros chegam e estacionam junto ao pódio; a câmera se aproxima e mostra os pilotos levantando os troféus. Em seguida aparecem os resultados. A animação não altera tempos, posições ou recompensas. No online, a cerimônia espera o encerramento da prova (todos os humanos terminarem ou o limite de tempo); quem ainda estiver em pista é ordenado pelo progresso. Desconectados não participam do pódio.

## Jogar na rede local com pendrive

Os resultados do solo mostram uma visão compacta dos tempos, com **Mais detalhes** para expandir os dados e **Continuar vendo** para cancelar o retorno automático ao menu. No celular, a tabela vira uma lista de pilotos, com rótulos nos tempos e ações acessíveis durante a rolagem. O painel do pódio usa os mesmos logotipos dos patrocinadores da pista.

O online reaproveita os passos já calculados da previsão local do carro, serializa o estado comum uma vez por sala e evita acumular posições antigas em conexões congestionadas. O painel atualiza a 20 Hz, independentemente da renderização. Essas otimizações valem para o backend publicado e para o servidor do pendrive; não reduzem a latência física da rede.

As consultas dos sensores usam um teste direto de distância, sem criar os objetos de ponto mais próximo a cada leitura. O servidor mantém os passos fixos pelo tempo transcorrido, com recuperação limitada após atrasos. No online, o modo Desempenho limita o desenho a 60 FPS e o cenário atrás do menu a 15 FPS, deixando mais recursos disponíveis quando o hospedeiro também joga. Validação reproduzível: `npm.cmd run test:online-performance`.

O pacote **NeuroDrive-Pendrive** inclui Node.js portátil para Windows x64, contas locais e servidor multiplayer. Execute `INICIAR-JOGO.cmd` no hospedeiro; os amigos abrem o endereço mostrado no navegador, na mesma rede. Não depende do Render ou Supabase. Até seis jogadores por sala, com classificação e corrida. As contas ficam na pasta do pacote e são separadas das contas públicas.

Gere a pasta com `npm.cmd run build:portable`, ou `npm.cmd run build:portable:linux` para incluir também o Node portátil para Linux x64. No Linux, use `INICIAR-JOGO-LINUX.sh` na sua pasta pessoal, sem instalar pacotes nem usar `sudo`. Veja [o passo a passo e as orientações de backup](JOGAR-NO-PENDRIVE.md).

## Pit stops e pneus

Em corridas de **5 voltas ou mais**, a durabilidade acompanha a distância da prova: a referência é **1 parada em 5 voltas, 2 em 10 e 3 em 20**, com mais uma parada a cada 10 voltas adicionais. São referências para pilotagem normal com pneus adequados ao clima, não paradas obrigatórias. A IA considera o desgaste observado e a distância restante antes de pedir uma troca. A mesma regra vale no solo e no servidor online. No tempo seco, classificação e provas curtas não têm desgaste; com chuva, usam desgaste reduzido.

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

### Desafio Drift

Durante a classificação e a corrida, no solo e no online, o **rádio da equipe** traz avisos curtos sobre chuva prevista, início da chuva, pista molhada com pneus secos, pneus gastos ou furados e última volta. Cada aviso dura até 5,5 segundos, com intervalo entre mensagens e prioridade para furos. Fica oculto durante menus e apresentações e não aparece no Drift. Um toque suave precede a fala no idioma selecionado. Toque, voz e volume têm ajustes próprios salvos no navegador. Abrir menus, ocultar a aba ou encerrar a sessão interrompe a fala.

**Equipe Neuro · Cadu (IA offline)** é a voz padrão em português, com **Faber** como alternativa. Há sete falas por voz e sete em inglês, geradas previamente com Piper e distribuídas como WAV mono (aproximadamente 2,57 MiB no total). As falas em português usam frases curtas e pausas; os avisos de chuva e última volta dizem “Há água na pista” e “Continue assim”. Não depende de API, internet ou geração de IA durante a partida. O motor reduz suavemente o volume durante a fala e retorna ao normal ao terminar. As vozes do sistema continuam como alternativa explícita; se um áudio neural falhar, o aviso escrito permanece sem trocar automaticamente para a voz do sistema. Compare as opções em **Ajustes → Voz do rádio → Ouvir teste de voz**. A reprodução pode exigir uma interação inicial com a página.

Créditos e fontes dos modelos: [assets/radio/CREDITS.md](output/assets/radio/CREDITS.md). Os textos estão em [scripts/radio-lines.json](scripts/radio-lines.json). Para gerar novamente, instale `piper-tts==1.8.0` em um ambiente Python separado, execute `python -m piper.download_voices --download-dir .portable-cache/voice-models pt_BR-cadu-medium pt_BR-faber-medium en_US-libritts_r-medium` e depois `python scripts/generate-radio-voices.py`. O ambiente e os modelos não fazem parte do pacote do jogo.

A apresentação de pista e clima usa o estilo eletrônico da música da garagem, com 108 BPM, baixo suave e arpejos em seno. Pular a apresentação cancela as notas agendadas no solo e online.

O menu usa uma apresentação de garagem com carro equipado em destaque, navegação numerada e atalhos para multiplayer e Copa Neuro. **♫ Música da garagem** controla uma trilha eletrônica original, gerada uma vez no navegador. Ela para ao fechar o menu ou ocultar a aba; o volume independente fica em **Ajustes** e é salvo neste dispositivo. A música vem ligada por padrão e começa na primeira interação com o jogo. Desligá-la pelo botão salva essa preferência no navegador.

**Arena Drift** é um circuito largo com curvas conectadas e relevo suave, disponível no seletor de pista do Drift. Escolha **Estável** para recuperar aderência mais rápido ou **Solto** para sustentar a derrapagem com mais contravolante. O acerto fica salvo neste navegador e não altera as corridas normais.

**Ranking de contas:** entre na conta antes de começar, complete os dois minutos e abra **Ranking de Drift · contas → Atualizar ranking** no menu. Mostra os 20 melhores e sua posição, com uma marca por conta e circuito. Ambos os acertos disputam o mesmo ranking; empates mantêm quem registrou primeiro. Não há moedas como prêmio. No servidor local, as contas e o ranking são locais; no site publicado, são salvos no PostgreSQL.

O servidor recalcula a física e os pontos a partir dos comandos gravados, incluindo câmbio manual e reposicionamentos. Não aceita um total informado pelo navegador. A tentativa precisa ser iniciada com a mesma conta, dura no mínimo dois minutos e expira após 30 minutos; reiniciar o backend invalida tentativas abertas. A validação roda em workers limitados para não bloquear as salas online. Isso valida as regras da simulação, mas não prova que os comandos foram produzidos por uma pessoa em vez de automação. Se a conexão falhar, o recorde local continua disponível; ele não é importado automaticamente para o ranking.

No menu **Jogar → Modo → Drift**, faça o máximo de pontos em dois minutos, sozinho na pista escolhida. Use os controles habituais: acelere, sustente a curva e use contravolante para controlar a derrapagem. O acerto de drift é exclusivo deste modo.

**Freio de mão:** segure **Espaço**, **A no Xbox / ✕ no PlayStation**, ou o botão **Freio de mão** acima das setas no celular. Dê um toque curto enquanto vira para iniciar a derrapagem; solte e dose o acelerador e o contravolante para sustentá-la. Segurar o freio de mão reduz a velocidade até parar. A aderência retorna gradualmente após soltar, e a função não altera as corridas normais.

- Pontua acima de 30 km/h, com ângulo de derrapagem entre 10° e 65°, dentro do asfalto.
- Encadear derrapagens aumenta o multiplicador até ×8. Endireitar por 1,2 segundo guarda o combo.
- Bater, sair da pista, rodar ou reposicionar perde os pontos ainda não guardados.
- O fim do tempo guarda o combo válido e mostra o total e o melhor combo.
- Pista seca, sem desgaste nem pit stops. Pontuação separada de moedas e recordes de volta. Esta primeira versão é solo.

O Drift tem metas por circuito e um recorde pessoal salvo neste navegador ao completar os dois minutos. O HUD acompanha apenas pontos guardados; o resultado mostra a medalha e avisa quando você supera sua marca. Reiniciar ou abandonar não grava um resultado. Limpar os dados do navegador apaga esses recordes, que não são sincronizados com a conta nem concedem moedas ou medalhas do perfil.

| Circuito | Bronze | Prata | Ouro |
| --- | ---: | ---: | ---: |
| Serra Verde | 600 | 1.800 | 4.000 |
| Autódromo Veloz | 500 | 1.500 | 3.500 |
| Vale Técnico | 800 | 2.200 | 5.000 |
| Arena Drift | 800 | 2.400 | 5.500 |

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

**Marcha ré:** no automático, pare e continue segurando o freio por meio segundo para recuar; acelere para frear a ré e voltar a andar para a frente. No manual, com o carro parado, reduza da primeira para **R** e use o acelerador para recuar. Freie até parar antes de subir para a primeira. A ré é limitada a 25 km/h e funciona também nos pedais de toque, controle e modo online.

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
npm run test:language
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

### Convites e acompanhamento online

- Convide por link ou QR Code gerado offline. O link preenche a sala; no pendrive, utiliza o IP da rede em vez de localhost.
- Avisos durante a prova distinguem ping alto, falta de atualizações e FPS baixo persistente.
- Depois de terminar, acompanhe os pilotos ainda na pista pelas setas do painel ou pelas teclas `[` e `]`, com instrumentos do carro acompanhado.

O gerador de QR Code usa [qrcode-generator, de Kazuhiko Arase](https://github.com/kazuhikoarase/qrcode-generator), incluído em `output/vendor/qrcode.js`, sob licença MIT (`output/vendor/QRCODE-LICENSE.txt`).

### Carros e vácuo

Antes da disputa, escolha um carro gratuito nos cartões do menu solo ou da sala online. A escolha fica salva neste navegador e vale para a próxima disputa; no online, mudar o carro exige confirmar **Pronto** novamente. O carro é mantido da classificação para a corrida. As pinturas continuam apenas visuais.

| Carro | Velocidade final sem vácuo | Característica |
| --- | --- | --- |
| Equilibrado | 205 km/h | Referência de controle e velocidade |
| Ágil | 195 km/h | Melhor aceleração, aderência e frenagem |
| Velocista | 215 km/h | Mais velocidade final, menor aderência e frenagem |
| Drift | 200 km/h | Traseira mais solta no modo Drift, menor aderência |

Esses limites são para jogadores, com pneus saudáveis e condições favoráveis. A dificuldade continua ajustando o ritmo dos adversários. O acerto Estável/Solto do Drift se combina com o carro escolhido; a validação de pontos no servidor reproduz essa mesma escolha.

Nas corridas, seguir outro carro alinhado acima de 80 km/h reduz gradualmente o arrasto aerodinâmico. O indicador **Vácuo** aparece no painel; o ganho desaparece progressivamente ao sair da trajetória. A velocidade máxima pode aumentar em até 6 km/h no vácuo completo. Não funciona no Drift, em boxes, fora da pista, atrás de carros parados ou no sentido contrário. A IA pode se aproximar pelo vácuo antes de sair para ultrapassar e mantém a defesa antecipada, sem fechar sobre um carro ao lado.

A física é compartilhada entre solo, servidor online e previsão local. Os recordes existentes são preservados; nesta versão, os rankings ainda são gerais por circuito, sem separação por carro.

### Setores e circuito urbano experimental

Classificação e corrida usam três setores (S1, S2 e S3), no solo e no online. Ao completar um setor válido, uma faixa compacta aparece acima do carro por 3,5 segundos, com o tempo e a diferença para sua melhor marca válida naquele setor. Verde indica ganho, vermelho indica perda e roxo destaca a melhor marca disponível da sessão. Voltas de aquecimento, atalhos, saídas da pista e reposicionamentos não criam referências. Os dados do online são calculados pelo servidor. A notificação não aparece durante apresentações, menus e Drift, nem reaparece ao receber o mesmo resultado pela rede.

Selecione **Distrito Neon (experimental)** na lista de circuitos, no solo ou na sala online. O traçado tem uma reta longa, curvas fechadas, túnel iluminado e prédios com fachadas texturizadas. O cenário inclui calçadas, guias, postes, bancos, canteiros, marcações de rua, placas do circuito, bases comerciais e equipamentos nos telhados. O túnel tem portais reforçados, faixas de sinalização e detalhes luminosos nas paredes. As fachadas variam de cor e usam filtragem de textura para reduzir a cintilação à distância.

Prédios, túnel e detalhes repetidos usam lotes instanciados, sem luzes dinâmicas adicionais. Desempenho reduz os prédios de maneira distribuída pelo circuito, acompanha essa redução nos telhados e lojas e omite os canteiros decorativos. Os detalhes não alteram a física, o traçado nem os tempos de referência.

Durante o teste, o circuito urbano não concede moedas nem envia marcas aos rankings competitivos. Os campeonatos existentes continuam com suas três pistas. Ainda é necessário avaliar o desempenho em computadores fracos reais; a verificação visual automatizada não substitui esse teste.

### Disputas rápidas e sensação de pilotagem

A direção responde mais rapidamente em baixa velocidade e ao corrigir para o lado oposto, mantendo entrada gradual em alta. Com a vibração ativada, um pulso leve sinaliza curvas próximas do limite de aderência (não é force feedback de volante). O Drift mantém sua resposta própria. No Distrito Neon, os adversários usam um bônus arcade de aceleração de 18% e corredores de ultrapassagem mais estreitos, com retorno antecipado à trajetória nas curvas fechadas. A mesma física é usada no solo e no servidor online.

Na seleção de disputa da sala online há três desafios, para 2–6 jogadores:

- **Corrida curta:** uma volta, sem classificação ou adversários de IA.
- **Melhor volta:** dois minutos para registrar a melhor volta completa válida. A primeira passagem prepara a volta lançada; atalhos, saídas da pista e reposicionamento invalidam a tentativa.
- **Duelo de Drift:** dois minutos, pontuação e combos calculados no servidor. O combo restante é guardado ao acabar o tempo. Freio de mão: Espaço, A / ✕ ou botão na tela.

Os desafios usam pista seca, sem desgaste e sem moedas. Melhor volta e Drift usam simulações individuais: os amigos aparecem juntos, mas não colidem. Resultados dos desafios não alimentam os rankings globais. Sem volta válida, sem pontos de Drift ou abandono não há vitória. Marcas iguais empatam e recebem os mesmos pontos.

O **placar da sessão** soma 10 / 7 / 5 / 3 / 2 / 1 pontos por posição, também nas corridas normais. O dono prepara a revanche mantendo sala e placar; todos confirmam novamente. O placar não fica salvo no banco: termina quando a sala encerra ou o servidor reinicia.

Em **Ajustes → Sensação de pilotagem**, tanto no solo quanto no online:

- Câmera com resposta gradual à velocidade, independente da taxa de quadros; respeita a preferência do sistema por movimento reduzido.
- Som curto e discreto ao cruzar perto de outro carro, com intervalo entre efeitos e respeitando o volume/mudo.
- Vibração opcional, desligada por padrão, com pulsos curtos nas trocas, frenagens fortes e impactos. Depende do controle, navegador e conexão; falhas de suporte não impedem jogar. Desativada ao pausar, abrir menus ou perder foco.

Essas preferências ficam salvas no navegador. A implementação usa detecção de suporte à [API de vibração do controle](https://developer.mozilla.org/en-US/docs/Web/API/GamepadHapticActuator).
