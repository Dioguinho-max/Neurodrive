# NeuroDrive 

**Beta online:** infraestrutura para Vercel + Render + Supabase e salas privadas para 2–6 jogadores. Veja [DEPLOY.md](DEPLOY.md) para configuração, importação das contas e conferência antes de publicar. O código está preparado; as URLs e o acesso aos serviços novos precisam ser configurados antes do lançamento.

Simulador 3D de carros autônomos com **neuroevolução** e visualização interativa de redes neurais. Acompanhe os carros em um circuito com curvas e retas, observe suas decisões e pause para entender os cálculos de cada neurônio.

O jogo roda no navegador, com HTML, CSS e JavaScript, sem compilação. O Laboratório e a corrida como visitante funcionam sem backend. Contas, moedas e skins usam o servidor Node.js com SQLite, sem pacotes externos.

## Contas, garagem e loja

No modo online, o navegador antecipa direção, aceleração e freio do próprio carro usando a física compartilhada com o servidor. As atualizações do Render corrigem a previsão; adversários continuam com interpolação. A previsão para após 200 ms sem novos estados, evitando movimento indefinido durante falhas de conexão. Colisões entre carros, voltas, posições e moedas continuam sob controle do servidor. O menu da sala mostra o atraso de ida e volta em milissegundos. Isso melhora a resposta dos controles, mas não elimina latência da rede nem baixo desempenho gráfico.

Instale Node.js **22.13 ou superior** e execute na raiz do projeto:

```bash
npm start
```

No PowerShell, se `npm.ps1` estiver bloqueado, use **`npm.cmd start`**. Abra **http://127.0.0.1:3000** e entre em **Menu → Conta** para criar seu piloto ou fazer login. A aba **Loja** exibe pinturas, saldo e filtro da sua garagem. Use esse endereço exato; o backend valida a origem e o Host. O SQLite integrado pode emitir um aviso experimental em versões do Node 22.

- Crie uma conta com nome de piloto (3–20 letras, números ou `_`) e senha de 10–128 caracteres. Não há recuperação de senha nesta versão.
- Cada conta recebe **500 moedas**; o botão de bônus concede **100 moedas a cada 24 horas**, controladas pelo servidor.
- Compre e equipe Verde Neuro, Rubi GT, Azul Polar ou Ouro Noturno. A pintura e a faixa mudam no carro; desempenho e física permanecem iguais.
- Saldo, inventário e skin equipada ficam em **`server/data/neurodrive.sqlite`**, inclusive após reiniciar o servidor. A sessão dura até sete dias; sair da conta revoga a sessão atual. A corrida em andamento não é salva.
- Abrir o HTML diretamente ou usar apenas um servidor estático mantém o modo visitante. GitHub Pages não executa esse backend.

O banco e arquivos `.env` são ignorados pelo Git. Faça backup do diretório `server/data` com o servidor parado; ele contém as contas locais. O backend guarda hashes de senha com scrypt e salt individual e hashes dos tokens de sessão. O cookie de sessão é HttpOnly e SameSite=Strict. Compras e inventário são validados no servidor e compras repetidas não debitam novamente. As skins são apenas cosméticas e não há pagamentos reais.

Arquivos: `server/server.cjs` (HTTP, contas e persistência), `server/catalog.cjs` (catálogo e preços), `output/neurodrive-garage.js` (interface). A API oferece `GET /api/catalog`, `GET /api/me` e `POST /api/register`, `/api/login`, `/api/logout`, `/api/buy`, `/api/equip`, `/api/bonus`. Mutações recebem JSON; compra e equipamento aceitam `{ "skin": "rubi" }`. O servidor determina preços e recompensas.

Por padrão, o servidor escuta apenas em `127.0.0.1:3000`. As variáveis `HOST`, `PORT`, `PUBLIC_ORIGIN` e `DATABASE_PATH` permitem configuração. Para publicar, use HTTPS em um proxy que preserve o Host e defina `NODE_ENV=production` e `PUBLIC_ORIGIN=https://seu-dominio`; o cookie passa a usar Secure. Esta entrega é uma base local, ainda sem recuperação de conta, verificação de e-mail ou operação distribuída. O limite de tentativas de login fica em memória por IP e reinicia junto com o processo.

**Recompensas de corrida:** entre na conta antes da largada. Completar a prova concede 50 moedas + 20 por volta, até 200 por corrida e 500 por dia UTC, além do bônus diário. A classificação não concede moedas. `POST /api/races/start` registra circuito e voltas; `POST /api/races/finish` resgata a recompensa com o identificador recebido. O servidor verifica titularidade, tempo mínimo plausível, número de voltas e limite diário, e credita cada corrida apenas uma vez, dentro de uma transação. Reiniciar uma prova invalida o recibo pendente anterior. Recibos expiram em seis horas. Se a conexão falhar na chegada, use **Tentar resgatar recompensa** antes de iniciar outra prova ou recarregar a página. Corridas e vitórias registradas aparecem na conta.

**Modo online beta:** `online.html` conecta a salas privadas no backend cloud. A física e a chegada são calculadas no servidor, e somente resultados dele concedem recompensas na publicação. A versão SQLite local mantém as recompensas de treino acima; elas não devem servir para ranking competitivo. Veja [limites e configuração](DEPLOY.md).

## Modo Corrida

A pista ocupa toda a janela, com posições e instrumentos sobrepostos. Câmbio, som e câmera ficam em **Menu → Corrida → Configurações de pilotagem, som e câmera**. O menu também permite encerrar a classificação e recuperar o carro durante a prova. Os controles de toque aparecem em dispositivos com ponteiro de toque. Para inspecionar os controles técnicos e a tabela completa ao vivo, abra `output/corrida.html?dev=1` e expanda **Desenvolvedor**. Essa opção apenas exibe ferramentas locais; não é uma restrição de acesso.

O jogo abre com um menu inicial para escolher circuito, dificuldade e número de voltas antes de iniciar a classificação. **Como jogar** explica os controles e as etapas. Durante a sessão, use **Esc** ou o botão **Menu** para pausar e **Continuar sessão** para retomar do mesmo ponto. Iniciar uma nova disputa pelo menu substitui o progresso atual; recarregar a página também reinicia a sessão. O menu inclui acesso ao Laboratório de IA e se adapta à tela do celular.

Abra **[output/corrida.html](output/corrida.html)** para jogar contra cinco adversários de IA. Escolha **1, 3, 5, 10, 20 ou 50 voltas** em **Voltas da corrida**, antes de clicar em **Ir para a corrida**. A duração fica fixa durante a prova; a classificação continua com uma volta de aquecimento e duas tentativas. O Laboratório continua disponível em sua página original, e há links para alternar entre os modos.

A tabela de tempos mostra todos os pilotos, posição, volta, última volta, melhor volta válida, tempo total e estado. Na classificação, a diferença é para a pole. Na corrida, usa o último checkpoint comum com o líder e, após a chegada, os tempos finais. O símbolo **—** indica que ainda não há uma comparação válida. A primeira volta da corrida também conta para o melhor tempo; apenas a classificação tem aquecimento.

Durante a sessão, um painel sobreposto à esquerda da pista mostra posições e tempos, com o jogador destacado em verde. Ao finalizar a classificação, a tabela do grid aparece automaticamente. Ao finalizar a corrida, aparece o pódio dos três primeiros; clique em **Ver classificação completa** para ver todos os pilotos. **Ver resultados** permite abrir esse resumo novamente. Os resultados preservam a regra de encerramento na chegada do jogador: pilotos ainda em pista são ordenados pelo progresso e identificados sem tempo de chegada.

- **W / seta para cima:** acelerar.
- **S / seta para baixo:** frear.
- **A e D / setas laterais:** virar.
- **P:** pausar ou continuar.
- **E / Q:** subir ou reduzir uma marcha, quando o câmbio manual estiver selecionado.
- **R:** reposicionar na pista, com dois segundos de espera.
- Botões na tela permitem acelerar, frear e virar por toque.

Escolha o circuito e a dificuldade e clique em **Iniciar classificação**. Complete uma volta de aquecimento e duas tentativas cronometradas. A sessão termina quando todos concluem suas voltas, após cinco minutos de simulação ou ao clicar em **Encerrar classificação**. Em seguida, clique em **Ir para a corrida**.

O grid é ordenado pela **melhor volta válida**, do menor para o maior tempo. Na classificação os carros são fantasmas, sem colisões entre si. Encostar na borda reduz a velocidade e permite deslizar ao longo dela, sem invalidar a volta; usar R ainda invalida a volta atual. Pilotos sem tempo válido ficam atrás dos pilotos com tempo. Empates usam a ordem dos identificadores dos carros. Essa é uma classificação simplificada inspirada no automobilismo, sem reproduzir Q1/Q2/Q3.

| Circuito | Características |
| --- | --- |
| Serra Verde | Circuito original, com curvas em S e retas variadas |
| Autódromo Veloz | Retas longas e curvas abertas, favorecendo velocidade |
| Vale Técnico | Sequência de curvas e mudanças de direção |

Trocar de circuito reinicia a etapa e descarta o grid anterior. A dificuldade escolhida ao iniciar a classificação também vale para a corrida seguinte. Sair da aba ou perder o foco pausa a sessão. Seu carro usa a pintura equipada na garagem; visitantes usam verde.

Os três circuitos têm relevo contínuo: asfalto, gramado, zebras e barreiras acompanham o terreno. Os carros inclinam a carroceria conforme a superfície, e a câmera acompanha a altura das subidas e descidas. O Autódromo Veloz tem ondulações mais suaves; o Vale Técnico tem relevo mais acentuado. A física continua simplificada, sem simulação de suspensão ou saltos.

Os adversários combinam uma política neural fixa baseada nos pesos iniciais do Laboratório com assistência de trajetória, antecipação de curvas, frenagem no tráfego e tentativa de ultrapassagem quando há espaço em um trecho pouco curvo. Cada piloto tem um ritmo ligeiramente diferente. Não há treinamento durante a prova; a assistência usa o traçado, enquanto a rede lê sensores e velocidade. As colisões entre veículos são aproximações circulares e os limites da pista reduzem a velocidade. A corrida termina quando o jogador completa o número de voltas escolhido; adversários ainda em pista permanecem classificados por progresso.

A direção do jogador entra gradualmente e tem menor amplitude em alta velocidade. O grid é escalonado e os adversários contam com assistência de frenagem para respeitar carros à frente. Os impactos consideram a velocidade de aproximação, evitando desaceleração repetida por simples contato.

A pressão de freio cresce gradualmente ao segurar S ou ↓, e diminui ao soltar. A IA tolera velocidades maiores nas curvas conforme a dificuldade. A câmera de terceira pessoa fica mais próxima do asfalto e amplia progressivamente o campo de visão para reforçar a sensação de velocidade, respeitando a preferência por movimento reduzido.

O câmbio pode ser **automático ou manual**. A preferência fica salva neste navegador. No manual, E sobe, Q reduz e os botões de toque também permitem trocar. Cada pressão troca uma marcha; segurar a tecla não encadeia trocas. O motor permanece no corte até o jogador subir a marcha, e reduções que excedam o corte são bloqueadas.

A corrida usa uma transmissão automática simplificada de seis marchas, com interrupção breve da força durante as trocas. Os modos single e online compartilham um painel com velocidade e marcha em destaque, arco de RPM que muda de cor perto do limite e informações de posição, volta e tempo. No teste de aceleração livre, o carro chega a aproximadamente 28 km/h após um segundo, 100 km/h em 4,8 segundos e à máxima de 205 km/h em 18,1 segundos. Curvas, frenagens e contatos alteram esses tempos; não se trata de um modelo mecânico completo de motor a combustão.

**Motor e largada:** segure W, ↑ ou o botão Acelerar durante a contagem regressiva para subir o giro parado e atingir o corte em aproximadamente 6.800 RPM. Soltar o acelerador reduz o giro. A embreagem acopla gradualmente na largada; acelerar parado não faz o câmbio pular marchas. Em movimento, o motor chega ao corte antes de subir cada marcha, com uma breve interrupção e queda de RPM.

O som do motor é sintetizado localmente por Web Audio, combinando graves do virabrequim e pulsos de combustão filtrados para um timbre mais encorpado. Inclui pulsação no corte, variação nas trocas e bipes de contagem regressiva. Ele começa após interação com o jogo. Use **Som do motor** e **Volume** para controlar o áudio; pausa, perda de foco e encerramento silenciam o som. Navegadores sem suporte continuam sem áudio. A implementação está em `output/neurodrive-audio.js`.

Na terceira pessoa, a câmera fica mais baixa e amplia o campo de visão conforme a velocidade aumenta. Linhas discretas nas bordas reforçam a sensação de movimento. Esses efeitos respeitam a preferência do sistema por movimento reduzido.

O motor está em `output/neurodrive-race-engine.js`, a interface em `output/neurodrive-race.js` e os estilos em `output/neurodrive-race.css`. O modo Corrida requer WebGL.

A aderência dos pneus limita as curvas: entrar rápido demais faz o carro sair de frente, abrindo a trajetória mesmo com o volante virado. Frear e virar ao mesmo tempo reduz a aderência lateral disponível. O gramado permite escapar da pista, mas oferece menos controle e reduz a velocidade. A carroceria inclina nas curvas. A IA também calcula uma velocidade de curva mais segura. Esse modelo é simplificado, sem simular capotamentos.

A direção tem resposta progressiva em velocidade alta e uma margem de aderência mais generosa no asfalto: pequenos ajustes e curvas médias são tolerados, enquanto curvas bem fechadas ainda exigem redução de velocidade.

## Recursos

- População configurável de **1 a 100 carros**.
- Circuito de aproximadamente **1,32 km**, com **22 m de largura** na escala da simulação, curvas em S, zebras e barreiras.
- Carros 3D com rodas direcionais e luzes de freio.
- Câmeras de visão geral, orbital e terceira pessoa, com seleção do carro acompanhado.
- Cinco sensores de distância e uma entrada de velocidade por carro.
- Rede neural visível com ativações, contribuições das conexões e indicadores de direção e pedal.
- Inspeção de entradas, pesos, viés e função de ativação de cada neurônio.
- Treinamento em **1×, 4× ou 12×**, pausa e avanço de um passo.
- Indicadores de geração, carros ativos, melhor percurso e voltas completas.
- Visualização 2D alternativa quando o 3D não pode ser inicializado.

## Como executar

Clone o repositório:

```bash
git clone https://github.com/Dioguinho-max/neurodrive.git
cd neurodrive
```

Abra **[output/neuro-pista.html](output/neuro-pista.html)** em um navegador atualizado. A biblioteca Three.js está incluída no projeto, permitindo executar a simulação localmente, sem internet.

Para a visualização 3D, o navegador precisa oferecer suporte a WebGL. Node.js é necessário para contas, loja e testes; o modo visitante pode ser aberto diretamente pelo HTML.

Se preferir usar um servidor local e tiver Python instalado, execute na raiz do repositório:

```bash
python -m http.server 8000 --bind 127.0.0.1
```

Depois, acesse `http://127.0.0.1:8000/output/neuro-pista.html`.

## Como usar

1. Clique em **Iniciar treinamento** para colocar os carros em movimento.
2. Para mudar a população, informe a **Quantidade de carros** e clique em **Aplicar e reiniciar**. Isso reinicia a geração e os resultados do treinamento.
3. Escolha a velocidade de simulação: **1×**, **4×** ou **12×**.
4. Em **Câmera**, selecione **Terceira pessoa** para acompanhar o carro por trás. Em **Carro acompanhado**, escolha um carro específico ou o líder automático.
5. Arraste a vista 3D para girar e use a roda do mouse ou os botões **+** e **−** para ajustar o zoom.
6. Clique em um neurônio oculto ou de saída, ou use **Inspecionar neurônio**, para pausar e conferir seu cálculo.
7. Use **Avançar um passo** para observar a próxima decisão.

A rede neural e os sensores exibidos pertencem ao **líder**, mesmo quando a câmera acompanha outro carro. A direção desejada pela rede pode diferir do volante aplicado, pois a simulação suaviza os movimentos da direção.

## Como a IA funciona

Cada carro tem uma rede neural com arquitetura **6 → 6 → 2**:

| Camada | Função |
| --- | --- |
| 6 entradas | Cinco distâncias até as bordas da pista e a velocidade normalizada |
| 6 neurônios ocultos | Combinam as entradas usando pesos, viés e ativação `tanh` |
| 2 saídas | Direção e pedal: acelerar ou frear |

São **48 conexões e 8 vieses**, totalizando 56 parâmetros ajustáveis. O cálculo de cada neurônio é:

```text
z = soma(entrada × peso) + viés
saída = tanh(z)
```

As entradas variam de 0 a 1. Os sensores alcançam até 40 metros na escala da simulação. As ativações ocultas e as saídas variam de −1 a +1.

O treinamento usa **seleção e mutação**: os carros são classificados pelo progresso ao longo da pista; redes entre as melhores são copiadas e seus pesos recebem pequenas alterações para formar a próxima geração. A seleção se adapta ao tamanho da população.

As redes começam com **pesos iniciais orientados a procurar espaço livre e reduzir a velocidade diante de obstáculos**, acrescidos de pequenas variações aleatórias. Isso reduz as colisões na largada; o comportamento inicial não é aprendido inteiramente do zero. A neuroevolução continua ajustando esses pesos durante a execução.

O controlador usa os sensores e a velocidade. A geometria do circuito serve para detectar bordas, medir progresso e desenhar a pista, sem comandar diretamente a direção do carro.

## Estrutura do projeto

```text
neurodrive/
├── README.md
└── output/
    ├── neuro-pista.html        # Estrutura e controles da interface
    ├── neuro-pista.css         # Estilos, temas e layout responsivo
    ├── neuro-pista.js          # Rede neural, evolução, física e interface
    ├── neuro-pista-track.js    # Traçado compartilhado pela física e renderização
    ├── neuro-pista-3d.js       # Modelos dos carros, cenário e câmeras
    ├── tests/
    │   ├── driving.cjs        # Teste do comportamento dos carros
    │   └── smoke.cjs          # Testes de integração e controles
    └── vendor/
        ├── three.min.js       # Three.js r160
        └── THREE-LICENSE.txt  # Licença da biblioteca
```

## Testes

Com Node.js instalado, execute na raiz do projeto:

```bash
node output/tests/driving.cjs
node output/tests/smoke.cjs
node output/tests/race.cjs
node output/tests/race-ui.cjs
node output/tests/qualifying.cjs
node output/tests/timing.cjs
node output/tests/audio.cjs
node output/tests/grip.cjs
node output/tests/accounts.cjs
node output/tests/garage-ui.cjs
node output/tests/skins.cjs
node output/tests/powertrain.cjs
node output/tests/rewards.cjs
```

- **`driving.cjs`** verifica sobrevivência inicial, conclusão de volta e valores válidos de velocidade e direção.
- **`smoke.cjs`** verifica integração dos modelos, controles, inspeção dos neurônios, tamanhos de população, câmeras e alternativa 2D.
- **`race.cjs`** verifica largada, colisões, recuperação, checkpoints e conclusão de uma corrida.
- **`race-ui.cjs`** verifica controles de teclado, pausa e retomada com DOM simulado.
- **`qualifying.cjs`** executa sessões nos três circuitos e verifica tempos válidos, ordem do grid e invalidação por recuperação.
- **`timing.cjs`** verifica provas de uma e cinco voltas, limites de configuração e consistência dos tempos de volta, checkpoints e chegada.
- **`audio.cjs`** verifica giro parado, trocas no corte e agendamento do áudio com Web Audio simulado; não substitui uma avaliação auditiva no navegador.

Os testes de integração substituem o DOM e o renderizador WebGL por objetos de teste, mantendo a geometria do Three.js. Eles não substituem uma conferência visual em um navegador com GPU.

O teste **`grip.cjs`** verifica o limite de aderência, a abertura da trajetória em alta velocidade e a perda de velocidade no gramado.

**`accounts.cjs`** inicia um servidor local com banco temporário e verifica autenticação, persistência após reinício, compra concorrente, inventários isolados, bônus e validações. **`garage-ui.cjs`** verifica cadastro, compra, modo visitante e expiração de sessão com DOM e API simulados. **`skins.cjs`** verifica materiais e faixas no modelo 3D com renderizador simulado.

**`powertrain.cjs`** verifica freio progressivo e câmbio manual. **`rewards.cjs`** verifica recompensas únicas, tempo mínimo, isolamento entre contas e teto diário em um servidor com banco temporário e relógio controlado.

## Escopo da simulação

O NeuroDrive é um projeto educativo. No Laboratório, os carros são avaliados individualmente e podem se sobrepor; no modo Corrida, há colisões simplificadas entre veículos. A física é simplificada e os modelos 3D são construídos com formas geométricas.

O treinamento fica em memória: recarregar a página reinicia a população. Populações maiores e velocidades de simulação elevadas exigem mais processamento.

## Dependência e licença

O projeto inclui o Three.js r160. Sua licença MIT está preservada em **[output/vendor/THREE-LICENSE.txt](output/vendor/THREE-LICENSE.txt)**.

Essa licença se refere à biblioteca Three.js. Uma licença própria para o código do NeuroDrive ainda não foi definida neste repositório.
