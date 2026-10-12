/* Tradução da apresentação: não altera dados de conta, comandos ou mensagens de rede. */
(() => {
  'use strict';
  const dictionary = {
    'Boxes':'Pit stop', 'Nos boxes':'In the pits', 'Cancelar boxes':'Cancel pit stop',
    'Boxes · Seco':'Pit · Dry', 'Boxes · Chuva':'Pit · Wet',
    'Escolha o pneu e chame os boxes':'Choose tires and request a pit stop',
    'Jogue em tela cheia':'Play in fullscreen',
    'Mais espaço para a pista e os controles.':'More room for the track and controls.',
    'Entrar em tela cheia':'Enter fullscreen', 'Continuar no navegador':'Continue in browser',
    'O navegador não permitiu tela cheia. Tente novamente ou continue no navegador.':'The browser did not allow fullscreen. Try again or continue in the browser.',
    'Previsão do tempo':'Weather forecast', 'FIM DE SEMANA':'RACE WEEKEND', 'ESTA SESSÃO':'THIS SESSION',
    'Classificação':'Qualifying', 'Corrida':'Race', 'Tempo seco':'Dry weather', 'Tempo variável':'Changeable weather', 'Tempo chuvoso':'Rainy weather',
    'Tempo firme do início ao fim.':'Dry conditions throughout the session.',
    'Chuva desde o início da sessão.':'Rain from the start of the session.',
    'Início seco · chuva gradual · pista secando.':'Dry start · rain building · track drying.',
    'Largada: pneus de seco':'Starting tires: dry', 'Largada: pneus de chuva':'Starting tires: wet',
    'Visão geral':'Overview', 'Conquistas':'Achievements', 'Editar perfil':'Edit profile', 'Segurança':'Security',
    'Painel da conta':'Account dashboard', 'Perfil do piloto':'Driver profile', 'Pintura equipada':'Equipped livery',
    'MINHA CARTEIRA':'MY WALLET', 'Sobre meus resultados':'About my results', 'Sobre minhas conquistas':'About my achievements',
    'Identidade do piloto':'Driver identity', 'Escolher imagem':'Choose image', 'Conta conectada':'Signed-in account',
    'Alteração de senha disponível nas contas online.':'Password changes are available for online accounts.',
    'Seu progresso permanece salvo na conta.':'Your progress stays saved to your account.',
    'Jogar':'Play', 'Piloto':'Driver', 'Garagem':'Garage', 'Ajustes':'Settings', 'Recordes':'Records',
    'Idioma':'Language', 'Configurações':'Settings', 'DO SEU JEITO':'YOUR WAY', 'Menu (Esc)':'Menu (Esc)',
    'Continuar sessão':'Resume session', 'Nova disputa':'New event', 'Voltar aos resultados':'Back to results',
    '← Voltar à pausa':'← Back to pause', '← Menu principal':'← Main menu', 'SUA SESSÃO':'YOUR SESSION',
    'Pausar (P)':'Pause (P)', 'Retomar (P)':'Resume (P)', 'Pausado':'Paused', 'PAUSADO':'PAUSED',
    'Sua próxima largada começa aqui.':'Your next race starts here.', 'Seu próximo grid começa aqui.':'Your next grid starts here.',
    'SEU PRÓXIMO DESAFIO COMEÇA AQUI':'YOUR NEXT CHALLENGE STARTS HERE', 'ESCOLHA SEU PRÓXIMO DESAFIO':'CHOOSE YOUR NEXT CHALLENGE',
    'Seu próximo desafio começa aqui.':'Your next challenge starts here.', 'SEU CARRO':'YOUR CAR',
    'Personalizar →':'Customize →', 'Piloto visitante':'Guest driver', 'Entre para salvar seu progresso':'Sign in to save your progress',
    'Entrar →':'Sign in →', 'Temporada de estreia.':'Debut season.', 'NOVA DISPUTA · SOLO':'NEW EVENT · SOLO',
    'Monte seu próximo grid':'Set up your next grid', 'Encontre seus rivais':'Find your rivals',
    'Crie uma sala com amigos →':'Create a room with friends →', 'Corra por moedas':'Race for coins',
    'Torneio online · 3 voltas · entrada grátis →':'Online tournament · 3 laps · free entry →',
    'Modo':'Mode', 'Corrida avulsa':'Single race', 'Campeonato · 3 etapas':'Championship · 3 rounds',
    'Regras do campeonato':'Championship rules', 'Meus tempos neste dispositivo':'My times on this device',
    'Circuito':'Circuit', 'Circuito (reinicia a etapa)':'Circuit (restarts the round)',
    'Dificuldade':'Difficulty', 'Dificuldade na próxima largada':'Difficulty for the next start',
    'Fácil':'Easy', 'Normal':'Normal', 'Difícil':'Hard', 'Voltas da corrida':'Race laps', 'Voltas':'Laps',
    'Clima':'Weather', 'Seco':'Dry', 'Chuva':'Wet', 'Variável · chuva durante a prova':'Changing · rain during the session',
    'Como funciona a classificação?':'How does qualifying work?', 'Iniciar classificação':'Start qualifying',
    'Uma nova disputa substitui o progresso da sessão atual.':'A new event replaces your current session progress.',
    'Como jogar':'How to play', 'Câmbio':'Transmission', 'Automático':'Automatic',
    'Manual · E sobe / Q reduz':'Manual · E up / Q down', 'Qualidade gráfica':'Graphics quality', 'Gráficos':'Graphics',
    'Desempenho · recomendado':'Performance · recommended', 'Leve · recomendado':'Performance · recommended',
    'Mais detalhes':'High detail', 'Super alto · exige mais da GPU':'Ultra · more demanding on the GPU',
    'Som do motor':'Engine sound', 'Volume':'Volume', 'Câmera':'Camera', 'Terceira pessoa':'Chase camera',
    'Visão da pista':'Track view', 'Orbital':'Orbit', 'Girar':'Rotate', 'Restaurar câmera':'Reset camera',
    'Girar ↷':'Rotate ↷', '↶ Girar':'↶ Rotate', 'Voltar à pista (R)':'Reset to track (R)',
    'Ajuste a pilotagem, o som e a câmera. Sua sessão continua pausada enquanto o menu estiver aberto.':'Adjust driving, audio and camera settings. Your session stays paused while this menu is open.',
    'No manual, cada toque troca uma marcha. Reduções acima do corte são bloqueadas.':'In manual mode, each press shifts one gear. Downshifts above the rev limit are blocked.',
    'Na classificação, aguarde a saída automática dos boxes a até 60 km/h. Assuma o controle ao entrar na pista: uma volta de aquecimento e duas tentativas cronometradas. A corrida larga no grid.':'In qualifying, wait for the automatic pit exit at up to 60 km/h. Take control on track: one warm-up lap and two timed attempts. The race starts on the grid.',
    'A classificação tem uma volta de aquecimento e duas tentativas. O melhor tempo válido define o grid. Som, volume e câmera podem ser ajustados neste menu.':'Qualifying has one warm-up lap and two timed attempts. Your best valid lap sets the grid. Adjust audio, volume and camera in this menu.',
    'Corridas de 5 voltas ou mais têm desgaste dos pneus. Pressione':'Races of 5 laps or more have tire wear. Press',
    'Corridas de 5 voltas ou mais t?m desgaste dos pneus. Pressione':'Races of 5 laps or more have tire wear. Press',
    'ou use “Chamar boxes”: a equipe assume na próxima entrada e troca os pneus em 8 segundos.':'or use “Request pit stop”: the crew takes over at the next entry and changes tires in 8 seconds.',
    'ou use ?Chamar boxes?: a equipe assume na pr?xima entrada e troca os pneus em 8 segundos.':'or use “Request pit stop”: the crew takes over at the next entry and changes tires in 8 seconds.',
    'WASD ou setas:':'WASD or arrow keys:', 'acelerar, frear e virar. No celular, use os botões na tela.':'accelerate, brake and steer. On mobile, use the on-screen controls.',
    'pausar ·':'pause ·', 'menu ·':'menu ·', 'voltar à pista (invalida a volta atual).':'reset to track (invalidates the current lap).',
    'Segure o acelerador durante a contagem para subir o giro. Freie antes das curvas fechadas e evite o gramado.':'Hold the accelerator during the countdown to rev the engine. Brake before tight corners and avoid the grass.',
    'Segure W ou ↑ na contagem para cortar giro parado. WASD ou setas: dirigir · P: pausar · R: reposicionar (2 s de espera) · Personalize seu carro na garagem.':'Hold W or ↑ during the countdown to hit the rev limiter. WASD or arrows: drive · P: pause · R: reset (2 s wait) · Customize your car in the garage.',
    'Serra Verde → Autódromo Veloz → Vale Técnico. Pontos: 25, 18, 15, 12, 10 e 8. Desempate por vitórias e ordem inicial dos pilotos. Progresso válido nesta sessão; as moedas da Copa Neuro são disputadas no online.':'Serra Verde → Autódromo Veloz → Vale Técnico. Points: 25, 18, 15, 12, 10 and 8. Ties are broken by wins and initial driver order. Progress lasts for this session; Neuro Cup coins are earned online.',
    'Próxima troca':'Next tire change', 'Chamar boxes (B)':'Request pit stop (B)', 'Cancelar parada (B)':'Cancel pit stop (B)',
    'Equipe trabalhando':'Crew working', 'PNEU ESTOURADO':'PUNCTURE', 'Pneus ? 100%':'Tires · 100%',
    'Piloto automático · limite 60 km/h':'Autopilot · 60 km/h limit', 'Parada solicitada · entrada após a largada':'Pit stop requested · entry after the start line',
    'Pneus no limite! Troque antes de chegar a 0%.':'Tires at the limit! Change them before reaching 0%.',
    'Aderência reduzida · planeje sua parada':'Reduced grip · plan your pit stop',
    'VOLTA':'LAP', 'TEMPO':'TIME', 'Volta':'Lap', 'Melhor volta':'Best lap', 'Última volta':'Last lap',
    'Tempo total':'Total time', 'Diferença':'Gap', 'Estado':'Status', 'Você':'You', 'Concluído':'Finished',
    'Em pista':'On track', 'Sem volta válida':'No valid lap', 'Sem tempo válido':'No valid time', 'CLASSIFICAÇÃO':'QUALIFYING',
    'Tempos da classificação':'Qualifying times', 'Resultados':'Results', 'Ver resultados':'View results',
    'Ver resultados agora':'View results now', 'Ver classificação completa':'Full standings', 'Mostrar tudo':'Show all',
    'Mostrar menos':'Show less', 'Encerrar classificação':'End qualifying', 'Encerrar classificação e ver grid':'End qualifying and view grid',
    'Ir para a corrida':'Go to race', 'Voltar à pista':'Back to track', 'Voltar à pista e continuar':'Return to track and continue',
    'Próxima etapa':'Next round', 'Pronto para largar?':'Ready to race?', 'De volta ao grid quando quiser.':'Back to the grid whenever you are ready.',
    'Encontre o traçado. Conquiste a pole.':'Find your line. Take pole position.', 'Dispute cada posição.':'Fight for every position.',
    'Pular':'Skip', 'Pular apresentação →':'Skip intro →', 'Você em verde · intervalos nos checkpoints':'You in green · gaps at checkpoints',
    'Sua conta de piloto':'Your driver account', 'Seu piloto, suas pinturas, suas conquistas.':'Your driver, your liveries, your achievements.',
    'Conectando à garagem…':'Connecting to the garage…', 'Entrar':'Sign in', 'Criar conta':'Create account',
    'Nome da conta':'Account name', 'Nome de piloto':'Driver name', 'Senha':'Password', 'Mostrar':'Show', 'Ocultar':'Hide',
    'Mostrar senha':'Show password', 'Confirme a senha':'Confirm password', 'Entrar na conta':'Sign in',
    'Criar meu piloto':'Create my driver', 'MEU PILOTO':'MY DRIVER', 'Editar meu piloto':'Edit my driver',
    'Nick do piloto':'Driver nickname', 'Número do carro':'Car number', 'Salvar piloto':'Save driver',
    'O nome usado para entrar na conta continua o mesmo. O número identifica seu perfil; não é exclusivo.':'Your sign-in name stays the same. The number identifies your profile; it is not exclusive.',
    'Foto do perfil':'Profile photo', 'Escolha uma foto de até 5 MB. Ajuste o corte quadrado e confirme. Sua foto aparecerá no perfil público.':'Choose a photo up to 5 MB. Adjust the square crop and confirm. Your photo will appear on your public profile.',
    'Horizontal':'Horizontal', 'Vertical':'Vertical', 'Usar esta foto':'Use this photo', 'Cancelar':'Cancel', 'Remover foto':'Remove photo',
    'Visitar outro piloto':'Visit another driver', 'Ver perfil':'View profile', 'Corridas':'Races', 'Vitórias':'Wins', 'Pódios':'Podiums',
    'Minhas medalhas':'My medals', 'Histórico de conquistas':'Achievement history', 'Minhas melhores voltas online':'My best online laps',
    'Resultados salvos na conta. Poles e voltas online passam a contar nas corridas concluídas após esta atualização.':'Results are saved to your account. Online poles and laps count from races completed after this update.',
    'Vitórias e pódios anteriores usam as datas salvas. Recordista começa nesta atualização e permanece mesmo se sua marca for superada.':'Previous wins and podiums use saved dates. The record holder medal starts with this update and stays even if your time is beaten.',
    'moedas':'coins', 'Resgatar bônus de 100 moedas':'Claim 100-coin bonus', 'Sair da conta':'Sign out',
    'Alterar senha':'Change password', 'Senha atual':'Current password', 'Nova senha':'New password',
    'Confirme a nova senha':'Confirm new password', 'Salvar nova senha':'Save new password',
    'As outras sessões da conta serão encerradas.':'Other account sessions will be signed out.',
    'Minha garagem':'My garage', 'Loja de pinturas':'Livery shop', 'Todas as skins':'All skins', 'Escolha uma pintura':'Choose a livery',
    'PRÉVIA 3D':'3D PREVIEW', 'Escolha Ver em 3D em uma skin. Experimente antes de comprar.':'Select View in 3D on a skin. Try it before buying.',
    'Comparar com equipada':'Compare with equipped', 'Equipar seleção':'Equip selection', 'Entrar para comprar':'Sign in to buy',
    'Equipada':'Equipped', 'Equipar':'Equip', 'Comprar':'Buy', 'Ver em 3D':'View in 3D', 'Entre para usar':'Sign in to use',
    'Skins são apenas visuais. Nova conta: 500 moedas. Bônus de 100 a cada 24 horas. Sem dinheiro real.':'Skins are cosmetic only. New account: 500 coins. A 100-coin bonus every 24 hours. No real money.',
    'Conclua corridas conectado: 50 moedas + 20 por volta, até 200 por corrida e 500 por dia (UTC). A classificação não dá moedas.':'Finish races while signed in: 50 coins + 20 per lap, up to 200 per race and 500 per day (UTC). Qualifying awards no coins.',
    'Tentar conectar novamente':'Try connecting again', 'Tentar resgatar recompensa':'Retry claiming reward',
    'Mural de recordes':'Record board', 'CADA MILÉSIMO CONTA':'EVERY MILLISECOND COUNTS',
    'Melhores voltas competitivas · uma marca por conta':'Best competitive laps · one time per account',
    'Temporada':'Season', 'Temporada atual':'Current season', 'Histórico completo':'All time',
    'Atualizar':'Refresh', 'Anterior':'Previous', 'Próxima':'Next', 'Meu recorde solo · neste dispositivo':'My solo record · on this device',
    'Salvo neste navegador, sem validação do servidor. Não participa da classificação competitiva nem acompanha sua conta em outros dispositivos.':'Saved in this browser, without server validation. Not included in competitive rankings or synced across devices.',
    'Como uma volta entra no mural?':'How does a lap reach the board?',
    'Somente voltas completas calculadas pelo servidor, na classificação ou corrida online. A primeira passagem estabelece o início da volta. Reposicionamento, boxes, saída do asfalto, retorno na contramão ou salto entre trechos invalidam a tentativa competitiva.':'Only complete laps calculated by the server in online qualifying or races. The first crossing starts the lap. Resetting, pitting, leaving the asphalt, driving backwards or skipping track sections invalidates a competitive lap.',
    'Empates em milissegundos favorecem quem registrou primeiro. Histórico combina temporadas; versões diferentes podem ter regras e físicas diferentes. Tempos antigos do perfil não foram importados.':'Millisecond ties favor the earlier record. All-time rankings combine seasons; versions may have different rules and physics. Old profile times were not imported.',
    'Sem volta registrada':'No recorded lap', 'Buscando voltas do circuito…':'Loading circuit lap times…',
    'Nenhuma volta limpa registrada neste circuito e período. Seja o primeiro!':'No clean laps for this circuit and period. Be the first!',
    'O mural competitivo está disponível no site online. Seus tempos solo aparecem abaixo.':'Competitive records are available on the online site. Your solo times appear below.',
    'Você ainda não tem uma volta competitiva neste período.':'You have no competitive lap for this period yet.',
    'Entre na conta para destacar sua posição.':'Sign in to highlight your position.', 'Referência do circuito':'Circuit benchmark', 'Sem marcas':'No records',
    'Primeira vitória':'First win', 'Primeiro pódio':'First podium', 'Recordista':'Record holder', 'Novo recorde pessoal':'New personal best',
    'Primeira marca competitiva':'First competitive time', '🏆 RECORDE DO CIRCUITO':'🏆 CIRCUIT RECORD',
    'Sala (Esc)':'Room (Esc)', 'Online · beta · 2 a 6 jogadores':'Online · beta · 2 to 6 players',
    'Dispute com seus amigos':'Race with your friends', 'Jogo em desenvolvimento. Você pode encontrar bugs e mudanças durante os testes.':'Game in development. You may encounter bugs and changes during testing.',
    'Entre na conta no menu principal antes de conectar.':'Sign in from the main menu before connecting.',
    'Conexão ainda não medida.':'Connection not measured yet.', 'Entrar no multiplayer':'Join multiplayer',
    'Disputa':'Event', 'Corrida com amigos':'Race with friends', 'Copa Neuro · torneio de 3 voltas':'Neuro Cup · 3-lap tournament',
    'Copa Neuro: entrada gratuita, 2–6 jogadores e três voltas. Quem terminar recebe 110 moedas; bônus de pódio: +90 / +60 / +30. Limites: 200 por prova e 500 por dia UTC. Abandono não premia. Saldo validado pelo servidor e salvo na conta.':'Neuro Cup: free entry, 2–6 players and three laps. Finishers earn 110 coins; podium bonuses: +90 / +60 / +30. Limits: 200 per event and 500 per UTC day. No reward for quitting. Balance validated by the server and saved to your account.',
    'Criar sala':'Create room', 'Código da sala':'Room code', 'Entrar na sala':'Join room',
    'Câmbio manual (E sobe, Q reduz)':'Manual transmission (E up, Q down)', 'Pronto':'Ready', 'Sair da sala':'Leave room',
    'Vagas restantes são preenchidas por IA. O dono inicia quando todos estiverem prontos. A corrida não pausa ao abrir o menu; desconectar abandona a prova. Classificação de até 5 minutos, espera de 10 segundos e corrida de até 15 minutos.':'Empty slots are filled by AI. The host starts when everyone is ready. Opening the menu does not pause the race; disconnecting forfeits it. Qualifying lasts up to 5 minutes, followed by a 10-second wait and a race of up to 15 minutes.',
    'Som, câmera e controles':'Sound, camera and controls', 'WASD ou setas para dirigir. Q/E para trocar no manual. R reposiciona. Esc abre a sala.':'WASD or arrow keys to drive. Q/E to shift manually. R resets. Esc opens the room.',
    'Grid definido':'Grid set', 'Classificação em andamento':'Qualifying in progress', 'Celebração no pódio':'Podium celebration',
    'Sua corrida continua':'Your race continues', 'Prepare seu grid':'Prepare your grid', 'Voltar às salas':'Back to rooms', 'Abandonar corrida':'Leave race',
    'Salvando recompensa…':'Saving reward…', 'Prova encerrada pelo limite de tempo. Sem recompensa.':'Time limit reached. No reward.',
    'Desconectado':'Disconnected', 'Em pista ao encerrar':'On track at session end', 'Aguardando':'Waiting',
    'Desenvolvedor':'Developer', 'Explorar o Laboratório de IA ↗':'Explore the AI Lab ↗',
    'NeuroDrive — Corrida':'NeuroDrive — Racing', 'Classificação: uma volta de aquecimento e duas tentativas cronometradas. Limite de 5 minutos.':'Qualifying: one warm-up lap and two timed attempts. 5-minute limit.',
    'Painel de pilotagem':'Driving instruments', 'Marcha':'Gear', 'Pneus e boxes':'Tires and pit stops', 'Condição dos pneus':'Tire condition', 'Condi??o dos pneus':'Tire condition',
    'Controles de direção':'Driving controls', 'Reduzir marcha':'Shift down', 'Subir marcha':'Shift up', 'Virar à esquerda':'Steer left', 'Virar à direita':'Steer right',
    'Frear':'Brake', 'Acelerar':'Accelerate', 'Posições da corrida':'Race positions', 'Navegação do jogo':'Game navigation',
    'Nome usado no login':'Your sign-in name', 'Prévia do corte da foto':'Photo crop preview', 'Corrida online 3D':'3D online race',
    'PAUSA · RESPIRE. VOLTE MAIS FORTE.':'PAUSE · BREATHE. COME BACK STRONGER.', 'AJUSTE SUA EXPERIÊNCIA':'TUNE YOUR EXPERIENCE',
    'SEU PERFIL DE PILOTO':'YOUR DRIVER PROFILE', 'SUA PRÓXIMA PINTURA':'YOUR NEXT LIVERY',
    'Voltar à seleção':'Back to selection', 'CARROCERIA / FAIXAS':'BODY / STRIPES',
    'Arraste para girar • Setas do teclado também funcionam • Prévia sem compra':'Drag to rotate • Arrow keys also work • Preview without buying',
    'Prévia 3D indisponível neste navegador. As pinturas continuam disponíveis abaixo.':'3D preview is unavailable in this browser. Liveries are still available below.',
    'Seu bônus está disponível.':'Your bonus is available.', 'Entre na conta para guardar suas compras.':'Sign in to save your purchases.',
    'Na sua garagem':'In your garage', 'Fosca':'Matte', 'Metálica':'Metallic', 'Brilhante':'Glossy', 'Comprar e equipar':'Buy and equip',
    'Salvando…':'Saving…', 'Garagem sincronizada com sua conta.':'Garage synced with your account.',
    'Entre ou crie sua conta. Você também pode jogar como visitante.':'Sign in or create an account. You can also play as a guest.',
    'Garagem indisponível. Inicie o backend e tente conectar novamente. Você pode continuar jogando como visitante.':'Garage unavailable. Start the backend and try again. You can keep playing as a guest.',
    'As senhas não coincidem.':'Passwords do not match.', 'As novas senhas não coincidem.':'New passwords do not match.',
    'Ocultar senha':'Hide password', 'Conferindo recompensa…':'Checking reward…',
    'Corrida sem recompensa. Entre na conta antes da largada e mantenha a conexão com o servidor.':'No race reward. Sign in before the start and stay connected to the server.',
    'Corrida registrada. Limite de 500 moedas por dia atingido.':'Race recorded. Daily limit of 500 coins reached.',
    'Não foi possível salvar a recompensa. Tente novamente.':'Could not save the reward. Try again.',
    'Conexão interrompida. Tente novamente; uma compra repetida não cobra duas vezes.':'Connection interrupted. Try again; retrying a purchase does not charge twice.',
    'Salvando seu piloto…':'Saving your driver…', 'Perfil atualizado!':'Profile updated!', 'Perfil carregado.':'Profile loaded.',
    'Não foi possível salvar. Tente novamente.':'Could not save. Try again.',
    'Escolha uma foto JPG, PNG ou WebP de até 5 MB.':'Choose a JPG, PNG or WebP photo up to 5 MB.',
    'Ajuste o enquadramento e confirme em “Usar esta foto”.':'Adjust the crop and confirm with “Use this photo”.',
    'Não foi possível abrir essa imagem. Escolha outra foto.':'Could not open this image. Choose another photo.',
    'Alteração de foto cancelada.':'Photo change canceled.', 'Não foi possível carregar. Tente atualizar.':'Could not load. Try refreshing.',
    'Áudio indisponível; o jogo continua sem som.':'Audio unavailable; the game continues without sound.',
    'Aguardando liberação dos boxes':'Waiting for pit release', 'Você está no controle · volta de aquecimento':'You have control · warm-up lap',
    'Grid definido · pronto para a corrida':'Grid set · ready to race', 'Retornando à pista…':'Returning to track…', 'VAI!':'GO!',
    'Aguardando os tempos dos adversários…':'Waiting for opponents’ lap times…', 'Prova encerrada':'Session finished',
    'Saída automática dos boxes · classificação':'Automatic pit exit · qualifying', 'Classificação · aquecimento':'Qualifying · warm-up',
    'Classificação final':'Final standings', 'A classificação define o grid e não concede moedas.':'Qualifying sets the grid and awards no coins.',
    'A classificação define o grid. As moedas são concedidas na corrida.':'Qualifying sets the grid. Coins are awarded in the race.',
    'Conexão encerrada. Reconecte para entrar em uma nova sala.':'Connection closed. Reconnect to join a new room.',
    'Falha na conexão online. Verifique se o backend está ativo.':'Online connection failed. Check that the backend is running.',
    'Suas voltas estão registradas':'Your laps are recorded', 'Encerrar classificação e definir grid':'End qualifying and set grid',
    'Bandeira quadriculada':'Checkered flag', 'VITÓRIA!':'VICTORY!', 'Linha de chegada cruzada':'Finish line crossed',
    'Ver grid de largada':'View starting grid', 'Ver pódio e resultados':'View podium and results', 'Chegada ao pódio':'Arriving at the podium',
    'Os três melhores':'The top three', 'Os três primeiros':'The top three', 'Grid de largada definido':'Starting grid set',
    'Classificação de todos os pilotos':'Full driver standings', 'Voltar ao menu':'Back to menu', 'Continuar (P)':'Resume (P)',
    'Líder':'Leader', 'Largada':'Starting', 'Reposicionando':'Resetting', 'Volta inválida':'Invalid lap', 'aquecimento':'warm-up', 'inválida':'invalid',
    'Melhores voltas · ordem do grid':'Best laps · grid order', 'Classificação da corrida':'Race standings', 'Reiniciar classificação':'Restart qualifying',
    'Diferença para a melhor volta da sessão. Aquecimento e voltas inválidas não entram no melhor tempo.':'Gap to the best lap of the session. Warm-up and invalid laps do not count.',
    'Diferença medida na passagem pelo último checkpoint comum com o líder; na chegada, usa o tempo final. — indica dados insuficientes. Tempo total para em cada chegada.':'Gap at the last shared checkpoint with the leader; finish times are used at the end. — means insufficient data. Total time stops at each finish.',
    'CELEBRAÇÃO DOS CAMPEÕES':'CHAMPIONS CELEBRATION',
    'A melhor volta válida de cada piloto define a ordem da largada. Pilotos sem tempo ficam no fim do grid.':'Each driver’s best valid lap sets the starting order. Drivers without a time start at the back.',
    'Resultado ao encerrar a prova do jogador. Quem ainda estava em pista é ordenado pelo progresso e não recebe um tempo de chegada.':'Results at the end of the player’s race. Drivers still on track are ordered by progress and have no finish time.',
    'Cada disputa conta. A próxima largada espera por você':'Every race counts. Your next start awaits',
    'Cancelar confirmação':'Cancel ready', 'Estou pronto':'I’m ready', 'Compartilhe o código com seus amigos.':'Share the code with your friends.',
    'Conta criada! Você recebeu 500 moedas.':'Account created! You received 500 coins.', 'De cima':'Top view',
    'Modo online disponível no backend cloud.':'Online mode is available on the cloud backend.',
    'Modo visitante. Para usar contas e loja, inicie o servidor e abra http://127.0.0.1:3000. A corrida continua disponível sem conta.':'Guest mode. To use accounts and the shop, start the server and open http://127.0.0.1:3000. Racing is still available without an account.',
    'Nenhuma volta válida para comparar.':'No valid lap to compare.',
    'No servidor publicado, as moedas são concedidas nas salas online. Esta corrida local foi um treino.':'On the published server, coins are awarded in online rooms. This local race was practice.',
    'Não foi possível iniciar o 3D. Use um navegador com WebGL ou abra o Laboratório para a versão 2D.':'Could not start 3D. Use a browser with WebGL or open the Lab for the 2D version.',
    'Não foi possível iniciar o 3D. Use um navegador com WebGL ou explore o Laboratório de IA.':'Could not start 3D. Use a browser with WebGL or explore the AI Lab.',
    'Pintura brilhante':'Glossy livery', 'Pintura fosca':'Matte livery', 'Pintura metálica':'Metallic livery',
    'Sem novo recorde competitivo confirmado nesta sessão.':'No new competitive record confirmed in this session.',
    'Sem volta válida · largada no fim do grid':'No valid lap · starting at the back',
    'Senha alterada. Outras sessões foram encerradas.':'Password changed. Other sessions have been signed out.',
    'Servidor indisponível.':'Server unavailable.', 'Seu lugar no pódio está garantido':'Your podium spot is secured',
    'Suas conquistas aparecerão aqui com a data em que foram alcançadas.':'Your achievements will appear here with the date they were earned.',
    'Você saiu da conta. Modo visitante ativado.':'Signed out. Guest mode enabled.', 'Você saiu da sala.':'You left the room.',
    'Não foi possível conectar.':'Could not connect.', 'Conectando…':'Connecting…',
    'Conquistada':'Earned', 'A conquistar':'Not earned yet', 'Vença uma corrida registrada na conta.':'Win a race recorded to your account.',
    'Conclua uma corrida registrada entre os três primeiros.':'Finish a recorded race in the top three.',
    'Estabeleça um recorde de circuito no mural competitivo.':'Set a circuit record on the competitive board.',
    'CLASSIFICAÇÃO · CONQUISTE SUA POLE':'QUALIFYING · TAKE POLE POSITION', 'GRID FORMADO · CADA POSIÇÃO IMPORTA':'GRID SET · EVERY POSITION COUNTS',
  };
  const patterns = [
    [/^(\d+) volta(s)?$/, (_, n) => `${n} ${n === '1' ? 'lap' : 'laps'}`],
    [/^(Seco|Chuva) · (\d+)%$/, (_, type, n) => `${type === 'Seco' ? 'Dry' : 'Wet'} · ${n}%`],
    [/^Troca de pneus · (\d+) s$/, (_, n) => `Changing tires · ${n} s`],
    [/^(\d+) parada\(s\) · desgaste ativo$/, (_, n) => `${n} pit stop(s) · tire wear active`],
    [/^Direção comprometida · (.*)$/, (_, s) => `Steering impaired · ${s === 'boxes chamados' ? 'pit stop requested' : 'request a pit stop (B)'}`],
    [/^(\d+) medalhas · (\d+) vitórias$/, (_, m, w) => `${m} medals · ${w} wins`],
    [/^([\d.,]+(?:\s*(?:mil|mi|bi|tri))?) moedas$/, (_, n) => `${n} coins`],
    [/^Comprar · (\d+) moedas$/, (_, n) => `Buy · ${n} coins`],
    [/^Largada em (\d+) s$/, (_, n) => `Starting in ${n} s`],
    [/^Recorde pessoal (.+)$/, (_, time) => `Personal best ${time}`],
    [/^Recompensa: (\d+) moedas\. Seu saldo foi salvo na conta\.$/, (_, n) => `Reward: ${n} coins. Your balance was saved to your account.`],
    [/^(CLASSIFICAÇÃO|CORRIDA) · (.*)$/, (_, type, rest) => `${type === 'CLASSIFICAÇÃO' ? 'QUALIFYING' : 'RACE'} · ${translate(rest)}`],
    [/^MELHOR VOLTA$/, () => 'BEST LAP'],
    [/^Saída automática dos boxes · limite 60 km\/h$/, () => 'Automatic pit exit · 60 km/h limit'],
    [/^([\s\S]+) · Sessão encerrada$/, (_, circuit) => `${circuit} · Session finished`],
    [/^🏆 Recorde · (.+)$/, (_, circuit) => `🏆 Record · ${circuit}`],
    [/^Pintura equipada · (.+)$/, (_, skin) => `Equipped livery · ${skin}`],
    [/^Equipada · (.+)$/, (_, skin) => `Equipped · ${skin}`],
    [/^(Na sua garagem|\d+ moedas) · (Fosca|Metálica|Brilhante)$/, (_, price, finish) => `${translate(price)} · ${translate(finish)}`],
    [/^Seu saldo: (\d+) moedas$/, (_, n) => `Your balance: ${n} coins`],
    [/^Faltam (\d+) moedas$/, (_, n) => `Need ${n} more coins`],
    [/^(\d+) corridas registradas · (\d+) vitórias$/, (_, races, wins) => `${races} recorded races · ${wins} wins`],
    [/^(.+) equipada\. Pronto para a pista!$/, (_, skin) => `${skin} equipped. Ready for the track!`],
    [/^\+(\d+) moedas! Saldo: (\d+)\. Visite a loja no menu\.$/, (_, coins, balance) => `+${coins} coins! Balance: ${balance}. Visit the shop in the menu.`],
    [/^Classificação · tentativa (\d+)\/2$/, (_, n) => `Qualifying · attempt ${n}/2`],
    [/^Grid de largada · corrida em (\d+) s$/, (_, n) => `Starting grid · race in ${n} s`],
    [/^BANDEIRADA · (\d+)º LUGAR$/, (_, n) => `CHECKERED FLAG · P${n}`],
    [/^(\d+) VOLTAS$/, (_, n) => `${n} LAPS`],
    [/^(\d+) de 5 luzes acesas$/, (_, n) => `${n} of 5 lights on`],
    [/^Você larga em (\d+)º$/, (_, n) => `You start in P${n}`],
    [/^(\d+)º LUGAR$/, (_, n) => `P${n}`],
    [/^(\d+)º lugar · (.+)$/, (_, n, time) => `P${n} · ${time}`],
    [/^Voltando ao menu em (\d+) segundos\. Você poderá rever estes resultados pelo menu\.$/, (_, n) => `Returning to menu in ${n} seconds. You can view these results again from the menu.`],
    [/^(.+) · (Classificação encerrada|CLASSIFICAÇÃO|BANDEIRADA FINAL)$/, (_, track, phase) => `${track} · ${phase === 'Classificação encerrada' ? 'Qualifying finished' : phase === 'CLASSIFICAÇÃO' ? 'QUALIFYING' : 'CHECKERED FLAG'}`],
    [/^(.+) · ([\d.]+) km · Corrida · (\d+) voltas$/, (_, track, distance, laps) => `${track} · ${distance} km · Race · ${laps} laps`],
    [/^(.+) · ([\d.]+) km · Classificação · (aquecimento|tentativa [12]\/2) · melhor: ([\s\S]+)$/, (_, track, distance, lap, best) => `${track} · ${distance} km · Qualifying · ${lap.replace('aquecimento','warm-up').replace('tentativa','attempt')} · best: ${best.replace('sem tempo válido','no valid time').replace('VOLTA INVALIDADA','INVALID LAP')}`],
    [/^(.+?) · (dono · )?(pronto|aguardando)$/, (_, name, owner, ready) => `${name} · ${owner ? 'host · ' : ''}${ready === 'pronto' ? 'ready' : 'waiting'}`],
    [/^(.+) · (desconectado|chegou|volta \d+\/\d+)$/, (_, name, state) => `${name} · ${state.replace('desconectado','disconnected').replace('chegou','finished').replace('volta','lap')}`],
    [/^Sala ([a-fA-F0-9]{6}) · (\d+) volta\(s\)$/, (_, code, n) => `Room ${code} · ${n} lap(s)`],
    [/^(.+) · Sessão pausada — seu progresso está salvo nesta página$/, (_, track) => `${track} · Session paused — your progress is saved on this page`],
    [/^Recordes deste navegador: (.+)$/, (_, times) => `Records in this browser: ${times.replaceAll('sem volta registrada','no recorded lap')}`],
    [/^Conectado como (.+)\. Crie uma sala ou informe o código\.$/, (_, name) => `Connected as ${name}. Create a room or enter its code.`],
    [/^Conexão: (\d+) ms · Imagem: (\d+) FPS( · atraso alto na rede)?$/, (_, ping, fps, high) => `Connection: ${ping} ms · Rendering: ${fps} FPS${high ? ' · high network latency' : ''}`],
    [/^Primeira marca pessoal: (.+)\.$/, (_, lap) => `First personal time: ${lap}.`],
    [/^Melhorou (.+) s · (.+) → (.+)$/, (_, delta, before, after) => `Improved by ${delta} s · ${before} → ${after}`],
    [/^Melhor volta: (.+) · Recorde anterior: (.+) · Sem melhoria nesta sessão\.$/, (_, lap, before) => `Best lap: ${lap} · Previous record: ${before} · No improvement this session.`],
    [/^Próximo bônus: (.+)\.$/, (_, date) => `Next bonus: ${date}.`],
    [/^(.+) · (\d+) pilotos em pista\. Acompanhe os últimos tempos ou encerre a sessão\.$/, (_, best, count) => `${best.replace('Sem volta válida','No valid lap').replace('Melhor volta','Best lap')} · ${count} drivers on track. Watch the final times or end the session.`],
    [/^(.+) · Prepare-se para a corrida$/, (_, best) => `${best.replace('Sem volta válida · largada no fim do grid','No valid lap · starting at the back').replace('Melhor volta','Best lap')} · Get ready for the race`],
    [/^(\d+) voltas · Tempo final (.+) · (.+)$/, (_, laps, time, note) => `${laps} laps · Final time ${time} · ${translate(note)}`],
    [/^🏁 Bandeirada · (\d+)º lugar\. (.*)$/, (_, n, reward) => `🏁 Checkered flag · P${n}. ${translate(reward)}`],
    [/^(Conclua corridas nas salas online|Conclua corridas conectado): 50 moedas \+ 20 por volta, até 200 por corrida e 500 por dia \(UTC\)\. Copa Neuro online: bônus de 90, 60 ou 30 moedas para o pódio, dentro dos mesmos limites\. A classificação não dá moedas\.$/, () => 'Finish races while signed in: 50 coins + 20 per lap, up to 200 per race and 500 per day (UTC). Online Neuro Cup: 90, 60 or 30 bonus coins for the podium, within the same limits. Qualifying awards no coins.'],
  ];
  const key = 'neurodrive-language';
  let language = 'pt-BR';
  try { if (localStorage.getItem(key) === 'en-US') language = 'en-US'; } catch { /* Modo privado. */ }
  function translate(source) {
    if (language !== 'en-US' || typeof source !== 'string') return source;
    const text = source.trim().replace(/\s+/g, ' ');
    if (!/[A-Za-zÀ-ÿ]/.test(text) || /^\d+ rpm$/.test(text)) return source;
    let result = dictionary[text];
    if (result === undefined) for (const [pattern, replacement] of patterns) {
      if (pattern.test(text)) { result = text.replace(pattern, replacement); break; }
    }
    return result === undefined ? source : source.replace(source.trim(), result);
  }
  const originals = new WeakMap(), attributes = new WeakMap();
  // Tabelas de resultados podem copiar células já traduzidas do painel ao vivo.
  const reverse = new Map(Object.entries(dictionary).map(([pt, en]) => [en, pt]));
  // Conteúdo de jogadores e identificadores nunca passam pelo dicionário.
  const exclude = 'script,style,textarea,svg,[translate="no"],#home-pilot-name,#home-avatar,#pilot-title,#pilot-handle,#pilot-initials,#garage-name,#records-rows td:nth-child(2),#records-leader > p:first-of-type,#pilot-visitor h4,.race-driver-name';
  function textNode(node) {
    if (!node.parentElement || node.parentElement.closest(exclude)) return;
    const current = node.nodeValue;
    let record = originals.get(node);
    if (!record || record.rendered !== current) {
      const original = language === 'en-US' && reverse.has(current.trim())
        ? current.replace(current.trim(), reverse.get(current.trim())) : current;
      record = { source: original, rendered: current };
    }
    const value = translate(record.source);
    if (value !== current) node.nodeValue = value;
    record.rendered = value; originals.set(node, record);
  }
  function elementAttributes(element) {
    if (element.closest(exclude)) return;
    let values = attributes.get(element);
    for (const name of ['aria-label', 'title', 'placeholder']) {
      const current = element.getAttribute(name); if (current === null) continue;
      values ||= {}; let record = values[name];
      if (!record || record.rendered !== current) record = { source: current, rendered: current };
      const value = translate(record.source);
      if (value !== current) element.setAttribute(name, value);
      record.rendered = value; values[name] = record;
    }
    if (values) attributes.set(element, values);
  }
  function scan(root) {
    if (root.nodeType === 3) { textNode(root); return; }
    if (root.nodeType !== 1 || root.closest(exclude)) return;
    elementAttributes(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.nodeType === 3) textNode(node); else elementAttributes(node);
    }
  }
  const observer = new MutationObserver(records => {
    if (language !== 'en-US') return;
    // Só percorre trechos alterados: não varre o menu inteiro a cada quadro do HUD.
    observer.disconnect();
    const changed = new Set();
    for (const record of records) {
      if (record.type === 'childList') for (const node of record.addedNodes) changed.add(node);
      else changed.add(record.target);
    }
    for (const node of changed) if (node.isConnected) scan(node);
    observe();
  });
  function observe() { observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'title', 'placeholder'] }); }
  function setLanguage(value, persist = true) {
    language = value === 'en-US' ? value : 'pt-BR';
    if (persist) try { localStorage.setItem(key, language); } catch { /* A seleção ainda funciona nesta sessão. */ }
    observer.disconnect(); document.documentElement.lang = language; scan(document.documentElement);
    document.querySelectorAll('[data-language]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.language === language)));
    observe();
    window.dispatchEvent(new CustomEvent('neurodrive:language', { detail: language }));
  }
  window.NeuroI18n = { t: translate, setLanguage, get language() { return language; } };
  document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.language)));
  window.addEventListener('storage', event => { if (event.key === key) setLanguage(event.newValue, false); });
  setLanguage(language, false);
})();
