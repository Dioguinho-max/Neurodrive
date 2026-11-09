# NeuroDrive — trailer de apresentação

## Conceito

**Seu carro. Sua disputa. Seus amigos.**

Trailer de 55 segundos para apresentar o projeto no trabalho escolar. Usar imagens reais da versão atual, sem revelar o easter egg. Identificar o jogo como beta na assinatura final. O visual deve acompanhar a identidade do menu: fundo escuro, branco e verde-menta, com NEURO e DRIVE em linhas separadas.

Formato principal: 1920 × 1080, horizontal. Gravar a 60 FPS se o computador mantiver estabilidade; caso contrário, produzir tudo a 30 FPS. Priorizar uma corrida fluida em vez de elevar os gráficos.

## Roteiro de edição

| Tempo | Imagem real a gravar | Texto na tela | Som e montagem |
| --- | --- | --- | --- |
| 00–04 s | Close do carro girando na garagem; cortar para a contagem da largada. | Tudo começa no grid. | Motor entrando antes da imagem. Primeiros pulsos da música. |
| 04–10 s | Largada com o pelotão, aceleração e uma ultrapassagem limpa. | ACELERE. | Entrada da batida; troca de marcha marca o corte. |
| 10–17 s | Panorâmica curta de Serra Verde, seguida da reta e do túnel do Distrito Neon. | Cada curva, uma disputa. | Cortes no ritmo, preservando o som do motor. |
| 17–24 s | Duas curvas de drift encadeadas; mostrar brevemente o multiplicador crescendo. | DOMINE O DRIFT. | Música ganha intensidade; usar os efeitos que o jogo realmente possui. |
| 24–31 s | Corrida na chuva, spray dos pneus e atendimento nos boxes com troca de composto. | O tempo muda. Sua estratégia também. | Chuva discreta; baixar a música para uma fala curta do rádio, se a gravação estiver clara. |
| 31–40 s | Sala com amigos pronta e, em seguida, disputa lado a lado em uma partida real. | CHAME SEUS AMIGOS. | Mostrar a sala por no máximo 2 segundos. Não substituir multiplayer por bots sem identificar. |
| 40–47 s | Linha de chegada e cerimônia dos três pilotos levantando troféus. | Cada chegada tem uma história. | Ponto alto da música na bandeirada. |
| 47–55 s | Marca NEURO / DRIVE sobre imagem escurecida da garagem ou da pista. | Corrida no navegador.\nJogue agora · Beta\nneurodrive-chi.vercel.app | Fechamento musical com cauda suave. Manter endereço legível por pelo menos 5 segundos. |

Distrito Neon é experimental: manter essa identificação quando aparecer na interface. Se a tomada não estiver boa, substituir por outro circuito, sem prometer uma qualidade que a versão jogável não entrega.

## Gravações necessárias

Gravar cada tomada com 3 segundos extras antes e depois da ação. Guardar os arquivos originais, sem texto de edição sobreposto.

- `01-garagem`: 15 segundos girando o carro com uma pintura escolhida.
- `02-largada`: contagem inteira e 15 segundos de corrida com pelotão.
- `03-ultrapassagem`: uma passagem limpa, sem batida ou reposicionamento.
- `04-circuitos`: apresentação de Serra Verde e passagem pelo túnel urbano.
- `05-drift`: 20 segundos de derrapagens conectadas com pontuação.
- `06-chuva`: 15 segundos com água visível e carro controlado.
- `07-boxes`: entrada, troca de pneus e saída; selecionar os melhores 3–4 segundos.
- `08-amigos`: sala pronta e 20 segundos de disputa online com amigos.
- `09-podio`: chegada e cerimônia completa.

Antes de gravar: idioma português, tela cheia, marcador de FPS desligado e notificações do sistema desativadas. Manter o HUD durante a pilotagem para mostrar que é gameplay; não ocultar elementos por edição de forma que deturpe a experiência. Evitar exibir e-mail, dados de conta ou códigos de sala ainda em uso.

## Música e áudio

Direção musical: eletrônica no estilo da garagem, com baixo e batida progressiva. Usar trilha original do projeto ou música com licença que permita publicar o trailer. Não usar músicas de outras franquias sem autorização.

Gravar o áudio do jogo junto com as cenas. Na edição, manter motor e rádio inteligíveis, com música mais baixa quando houver fala. Cortes secos na batida funcionam melhor aqui que muitas transições. Evitar flashes e tremores artificiais de câmera.

Não é necessária narração: frases curtas e sons do jogo deixam o vídeo mais direto. A introdução oral do trabalho pode ser: “O NeuroDrive é um jogo de corrida para navegador que desenvolvi, com disputas contra inteligência artificial e multiplayer entre amigos.”

## Finalização

- Conferir legibilidade dos textos em tela pequena e no projetor da escola.
- Exibir apenas funcionalidades presentes nas gravações.
- Exportar MP4 com vídeo H.264 e áudio AAC, mantendo a taxa de quadros da captura.
- Assistir ao arquivo exportado inteiro para verificar áudio, cortes e quadros travados.
- Guardar uma cópia local para apresentar mesmo sem internet.

## Estado da produção

Primeira montagem exportada em `.portable-cache/trailer/NeuroDrive-Trailer-v1.mp4`:

- 50 segundos, 1280 × 720, 24 quadros por segundo; vídeo H.264 e áudio AAC.
- Garagem, panorama de Serra Verde, corrida contra IA, Distrito Neon, chuva, boxes e pódio.
- Cenas de demonstração capturadas com o renderizador e a simulação reais do projeto; caixas de texto e cortes preparados para o trailer. O atendimento nos boxes e a cerimônia foram encenados com as animações do jogo.
- Música original da garagem e motor original sintetizado pelo módulo de áudio do jogo, sincronizado com o RPM das tomadas. Não usa as gravações experimentais de motores.
- Esta montagem não inclui drift nem uma partida multiplayer real. Esses trechos do roteiro acima ficam para uma próxima edição.
- Arquivo decodificado integralmente sem erros; quadros dos oito blocos conferidos visualmente. Áudio normalizado para apresentação.

Prévia dos enquadramentos: `.portable-cache/trailer/contact-sheet.png`.
Os arquivos de vídeo ficam fora da publicação do site e não foram enviados ao GitHub.

### Segunda montagem — pistas, carros e chegada

Exportada em `.portable-cache/trailer-v2/NeuroDrive-Trailer-v2.mp4`: 52 segundos, 1280 × 720, 24 FPS, H.264/AAC, aproximadamente 16 MB.

- Cortes entre garagem, Serra Verde, Vale Técnico, Distrito Neon e Autódromo Veloz, incluindo chuva e atendimento nos boxes.
- Velocímetro e conta-giros oficiais do jogo durante as tomadas de pilotagem.
- Final cinematográfico encenado com dois carros disputando a chegada; a câmera acompanha a passagem e sobe para o céu, revelando NEURO / DRIVE, “Jogue agora” e o endereço do jogo.
- Motor original e música da garagem sincronizados com a montagem; nenhuma imagem ou música da referência foi reutilizada.
- Decodificação integral do MP4 validada e enquadramentos conferidos em imagens da exportação, incluindo a sequência final.

Prévia: `.portable-cache/trailer-v2/contact-sheet.jpg`. Esta versão também permanece local, sem publicação no GitHub.

### Terceira montagem — todos os circuitos, Full HD

Exportado em `.portable-cache/trailer-v3/NeuroDrive-Trailer-1080p60.mp4` (aproximadamente 42 MB).

- 62 segundos, 1920 × 1080, 60 quadros por segundo, H.264 e áudio AAC estéreo.
- Serra Verde, Vale Técnico, Distrito Neon (experimental), Arena Drift e Autódromo Veloz: cada circuito recebe uma panorâmica identificada e uma tomada com carros.
- Captura quadro a quadro com tempo determinístico; trajetórias cinematográficas contínuas eliminam as correções de direção da IA nas tomadas. Essas trajetórias são encenadas para o trailer, sem alterar a física do jogo.
- Câmera aérea com movimento contínuo e planos de profundidade ajustados para reduzir a cintilação das superfícies distantes. Velocímetro e RPM oficiais nas cenas de pilotagem.
- Mesma composição e andamento da música do primeiro trailer. Dois motores na chegada, com volume conforme a distância, passagem estéreo e redução gradual de altura do som após a passagem.
- Tela final redesenhada: marca em duas linhas, endereço grande, “Jogue agora” e QR code para `https://neurodrive-chi.vercel.app/`.
- QR code conferido por decodificação independente em Full HD e em imagens reduzidas. O relatório da exportação fica em `.portable-cache/trailer-v3/validation.json`.
- MP4 decodificado integralmente: 3.720 quadros, duração de 62 segundos. As cenas de pilotagem e panorâmicas não apresentaram quadros integralmente repetidos; a tomada fixa da chegada e a tela final têm momentos intencionalmente estáticos.

Os ajustes desta montagem ficam nos scripts de captura; não alteram o jogo publicado.
