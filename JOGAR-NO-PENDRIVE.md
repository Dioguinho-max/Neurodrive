# NeuroDrive no pendrive — Windows e Linux x64

## Hospedar

1. Copie a pasta **NeuroDrive-Pendrive inteira** para o pendrive (ou para uma pasta no computador, para carregar mais rápido).
2. Conecte o computador hospedeiro e os amigos à mesma rede Wi-Fi ou cabo.
3. Dê dois cliques em **INICIAR-JOGO.cmd**. O navegador abre e a janela mostra os endereços da rede, como `http://192.168.1.20:3000`.
4. Se o firewall do Windows perguntar, permita o Node.js na rede privada. Computadores gerenciados podem exigir autorização do responsável.
5. Deixe a janela aberta e o computador ligado, sem suspender, durante as partidas.

Não é necessário instalar Node.js, npm ou banco. O pacote com Linux inclui os executáveis portáteis para Windows e Linux x64; os demais jogadores só precisam de navegador (inclusive Chromebook, Linux e celular). Depois de preparado, o pacote funciona sem internet. Vozes naturais do sistema que dependem da internet podem não estar disponíveis.

## Hospedar no Linux sem administrador

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

Todos abrem **o endereço do hospedeiro mostrado na janela**, não o site da Vercel. Não use `localhost` ou `127.0.0.1` nos outros computadores.

Cada pessoa cria uma conta no menu Piloto. Entre em **Online**, conecte, crie uma sala e passe o código aos amigos. Todos marcam **Estou pronto** e o dono inicia. São até **6 jogadores por sala**, com classificação, espera e corrida, simuladas no hospedeiro.

As contas são novas e locais: não são as contas do Render/Supabase. Moedas, compras e perfis ficam no SQLite em `server/data/neurodrive.sqlite`; corridas online concedem recompensas locais. O ranking público de voltas não é sincronizado nem fica disponível neste pacote. Não reutilize senhas importantes: este servidor usa HTTP para uma rede local de confiança.

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
