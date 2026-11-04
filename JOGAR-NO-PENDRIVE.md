# NeuroDrive no pendrive — Windows e Linux x64

## Hospedar

1. Copie a pasta **NeuroDrive-Pendrive inteira** para o pendrive (ou para uma pasta no computador, para carregar mais rápido).
2. Conecte o computador hospedeiro e os amigos à mesma rede Wi-Fi ou cabo.
3. Dê dois cliques em **INICIAR-JOGO.cmd**. O navegador abre e a janela mostra os endereços da rede, como `http://192.168.1.20:3000`.
4. Se o firewall do Windows perguntar, permita o Node.js na rede privada. Computadores gerenciados podem exigir autorização do responsável.
5. Deixe a janela aberta e o computador ligado, sem suspender, durante as partidas.

Não é necessário instalar Node.js, npm ou banco. O pacote com Linux inclui os executáveis portáteis para Windows e Linux x64; os demais jogadores só precisam de navegador (inclusive Chromebook, Linux e celular). Depois de preparado, o pacote funciona sem internet. A voz padrão **Equipe Neuro · voz IA offline** já vem no pacote, em português e inglês. Em **Ajustes**, ative **Voz da equipe** e use **Ouvir teste de voz**. Vozes alternativas do sistema podem depender de internet.

## Hospedar no Linux sem administrador

Para comparar as vozes brasileiras, abra **Ajustes → Voz do rádio**: **Equipe Neuro · Cadu (IA offline)** é a opção padrão, e **Equipe Neuro · Faber (IA offline)** é a alternativa. Use **Ouvir teste de voz** após selecionar cada uma. As duas já vêm no pendrive.

Use um Linux x64 Intel/AMD compatível com Node.js 22, como Linux Mint 21/22 ou Ubuntu 22.04/24.04. Não é necessário `sudo`, instalar pacotes ou mudar configurações do sistema.

1. Copie a pasta inteira **NeuroDrive-Pendrive** para sua pasta pessoal. Isso evita bloqueios de execução comuns em pendrives.
2. Abra **INICIAR-JOGO-LINUX.sh** e escolha **Executar no terminal**, se o gerenciador de arquivos oferecer essa opção. Nas propriedades do arquivo, pode ser necessário marcar “Permitir executar como programa”.
3. Se abrir como texto, abra um terminal nessa pasta e execute apenas:

```sh
sh ./INICIAR-JOGO-LINUX.sh
```

O iniciador usa o Node que já vem na pasta e tenta abrir o navegador. Se não abrir, acesse `http://127.0.0.1:3000`. Os amigos usam o IP mostrado na janela. Mantenha o terminal aberto.

As contas ficam em `server/data` na pasta que você executou. Se copiou do pendrive para o computador, depois de encerrar copie a pasta atualizada de volta para levar as contas. Não rode simultaneamente duas cópias esperando que os dados sejam sincronizados.

Sem administrador é possível iniciar o jogo, mas o iniciador não pode liberar um firewall gerenciado nem remover o isolamento de uma rede de convidados. Nesse caso, peça ajuda ao responsável. O executável Linux não funciona em ARM, Linux de 32 bits ou Alpine; Chromebook pode jogar pelo navegador, mas hospedar depende do ambiente Linux e das permissões de rede dele.

## Jogar com os amigos

**Uma porta atende os seis jogadores simultaneamente.** Não abra um servidor ou uma porta por pessoa. Por exemplo, todos os amigos acessam `http://192.168.1.20:3000` (substitua pelo IP mostrado no hospedeiro), entram com contas diferentes e usam o mesmo código de sala. Se o hospedeiro também jogar, são ele e mais cinco amigos.

Se o jogo não abrir nos outros computadores, confira o IP da rede, o firewall e o isolamento do Wi-Fi. Se abrir mas desconectar outro jogador, confira se cada pessoa entrou em uma conta diferente: uma mesma conta não pode manter duas conexões online simultâneas.

Todos abrem **o endereço do hospedeiro mostrado na janela**, não o site da Vercel. Não use `localhost` ou `127.0.0.1` nos outros computadores.

Cada pessoa cria uma conta no menu Piloto. Entre em **Online**, conecte, crie uma sala e passe o código aos amigos. Todos marcam **Estou pronto** e o dono inicia. São até **6 jogadores por sala**, com classificação, espera e corrida, simuladas no hospedeiro.

As contas são novas e locais: não são as contas do Render/Supabase. Moedas, compras e perfis ficam no SQLite em `server/data/neurodrive.sqlite`; corridas online concedem recompensas locais. O ranking público de voltas não é sincronizado nem fica disponível neste pacote. Não reutilize senhas importantes: este servidor usa HTTP para uma rede local de confiança.

## Continuar na mesma sala

### Regras e estatísticas

Na sala, antes da classificação, o dono pode abrir **Personalizar regras da sala** e escolher clima, voltas, dificuldade da IA e desgaste dos pneus. As opções de desgaste são **Reduzido (60%)**, **Normal (100%)** e **Intenso (150%)**, multiplicadores da taxa de desgaste da sessão. Nas salas atualizadas, o desgaste e os boxes ficam ativos também em provas curtas e classificação; essas sessões mantêm sua taxa base mais baixa. O composto e a chuva continuam afetando a aderência normalmente. Na Copa Neuro, as três voltas são fixas.

Clique em **Aplicar regras**. Todos veem um resumo das configurações e precisam confirmar novamente. Não é possível alterar regras com a classificação ou corrida em andamento; entre etapas, prepare a próxima pista para voltar à sala de preparação.

Após a corrida, **Destaques da corrida** mostra a melhor volta, posição de largada, posições ganhas/perdidas, melhor volta individual e diferença para o vencedor. Os tempos e posições incluem a IA. Sem chegada válida, os campos de chegada ficam com um traço. O campeonato mostra também os pontos de cada etapa no placar acumulado. Esses dados vêm da simulação do servidor; não são um novo histórico permanente da conta.

### Campeonato e votação

Ao criar a sala, escolha **Campeonato · 3 etapas**. A primeira pista é escolhida pelo dono. Cada etapa tem classificação e corrida; todos confirmam **Estou pronto** antes de iniciar.

Após cada corrida, os jogadores votam na próxima pista pelos cartões com miniaturas. Cada conta tem um voto e pode alterá-lo. O dono confirma uma das pistas com mais votos; em caso de empate, escolhe entre as empatadas. Se ninguém votar, pode escolher livremente. A votação também funciona nas revanches de corridas avulsas.

Os seis primeiros lugares de chegada valem **25, 18, 15, 12, 10 e 8 pontos**. A posição considera também os carros de IA, mas somente jogadores participam do campeonato. Abandono ou ausência de chegada válida não pontuam. Empates na soma são decididos pelo número de vitórias; persistindo o empate, o título é compartilhado. Sem chegadas válidas, não há campeão.

O placar acompanha as contas entre etapas, mesmo se o dono sair. Depois da primeira largada, novas contas não podem entrar no campeonato; participantes anteriores podem retornar entre etapas. As recompensas normais são salvas por corrida, sem bônus adicional pelo título. O campeonato fica apenas na memória do hospedeiro: desligar o servidor ou esvaziar a sala encerra a disputa. Ao final da terceira etapa, o painel anuncia o campeão; para outro campeonato, criem uma nova sala.

A lista de jogadores mostra quem está preparando a pista, quem está pronto e o ping medido pelo hospedeiro. Ao clicar em **Estou pronto**, o jogo prepara o cenário antes de confirmar.

Depois da corrida, o dono pode escolher **Repetir circuito** ou selecionar o **Próximo circuito** e clicar em **Preparar outra pista**. As recompensas anteriores precisam terminar de salvar. O código e os jogadores permanecem na sala; todos confirmam novamente para uma nova classificação e corrida. Se o dono sair, outro jogador assume a sala.

## Convite, conexão e espectador

Na sala online, abra **Convidar amigos · link e QR Code**. O link já preenche o código da sala; cada amigo entra com sua própria conta e confirma a entrada. O QR Code é gerado no próprio jogo e funciona sem internet. Se aparecer mais de um endereço, escolha o IP da rede compartilhada com seus amigos. O endereço `localhost` não é usado nos convites, pois aponta para o próprio aparelho de quem abre o link.

Durante a disputa, os avisos distinguem **ping alto**, **falta de atualizações do servidor** e **FPS baixo**. Ping indica atraso da rede; FPS baixo indica lentidão para desenhar a imagem. O aviso de FPS aparece após alguns segundos de queda contínua e sugere o modo Desempenho.

Ao concluir suas voltas, você pode acompanhar os pilotos ainda na pista. Use as setas do painel **Acompanhando** ou as teclas **[** e **]** para trocar de carro. Jogadores humanos têm prioridade; quando o piloto acompanhado termina, a câmera escolhe outro. O velocímetro mostra o carro acompanhado. Isso também funciona após terminar sua classificação.

Ao atualizar o pacote, reinicie o servidor e recarregue o jogo nos aparelhos para receber os novos recursos.

## Encerrar e guardar

Na janela do servidor pressione **Ctrl+C** e espere a mensagem de encerramento antes de retirar o pendrive. Para backup, com o servidor desligado, copie a pasta inteira, incluindo `server/data`. Não apague essa pasta ao atualizar: ela contém as contas. As salas não persistem após reiniciar.

## Se os amigos não conseguirem abrir

- Confira o endereço completo e a porta `:3000`. Se houver vários endereços, use o da conexão Wi-Fi/cabo compartilhada, não o de uma VPN.
- Confira a permissão do firewall para o Node.js na rede privada. Não é necessário abrir portas no roteador.
- Redes de convidados/escolares podem isolar dispositivos mesmo no mesmo Wi-Fi. Nesse caso, use uma rede que permita comunicação local, com autorização do responsável.
- Se aparecer “porta já está em uso”, feche o outro servidor e tente novamente.
- O IP pode mudar quando o computador reconecta; use o endereço mostrado a cada início.

## Gerar um pacote atualizado (desenvolvedor)

Na raiz do projeto, com Node.js 22 para Windows x64 e dependências instaladas:

```powershell
npm.cmd run build:portable
```

Para incluir também o Node Linux x64 na mesma pasta:

```powershell
npm.cmd run build:portable:linux
```

Esse comando baixa o arquivo oficial do Node Linux da mesma versão do Node usado no gerador e verifica o SHA-256 com o manifesto oficial antes de extrair o executável e a licença. Requer internet na geração, não durante o jogo.

O gerador inclui o executável Node usado para rodar esse comando, os arquivos do jogo e `ws` com sua licença. A primeira geração consulta a licença oficial da versão do Node na internet. Não copia `.env`, credenciais, banco do desenvolvedor nem arquivos de Git. Uma nova geração preserva as contas já existentes na pasta do pacote.
