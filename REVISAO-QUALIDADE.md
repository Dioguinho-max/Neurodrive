# Revisão de qualidade — 26/10/2026

## Correções

- Online: os comandos contínuos de freio durante o menu, a apresentação ou com a página oculta agora impedem engatar a ré automaticamente. Antes, apenas o primeiro comando de parada tinha essa proteção.
- Preparação da pista: se a primeira atualização do renderizador falhar, seus recursos são liberados e a pista não fica marcada como pronta. Uma nova tentativa realmente recria o renderizador.
- Testes de classificação e cronometragem: os pilotos automatizados agora recebem um perfil completo de IA. O teste de cronometragem conserva as regras de encerramento do solo.
- Teste de pneus: identifica os quatro eixos das rodas, sem confundir os grupos da suspensão com pneus.

## Validação

Foram executados 59 arquivos de testes permanentes. Na primeira execução, 56 passaram; os três testes desatualizados foram corrigidos e passaram na reexecução. Os testes online e de rede local foram repetidos após as correções.

A cobertura inclui contas locais e PostgreSQL, recompensas, recordes, IA, física, chuva, pneus, boxes, drift, áudio, controles, menus, idiomas, simulação online e pacote local. Os testes de desempenho de CPU passaram; eles não medem FPS real de GPU.

Também passaram a verificação de sintaxe de 48 arquivos de aplicação/servidor/scripts e a inspeção automatizada dos resultados em navegador nas resoluções 1280×800, 390×844 e 844×390, incluindo a abertura dos detalhes sem transbordamento horizontal.

## Repetir a revisão

```powershell
npm.cmd test
```

O comando executa os testes permanentes em sequência, ignora arquivos temporários e informa todas as falhas ao final. Cada arquivo tem limite de três minutos para evitar uma execução presa indefinidamente. No Linux, use `npm test`.

## Limites

Esta revisão não comprova ausência de bugs. Não foram reproduzidas partidas prolongadas em celulares e Chromebooks físicos, nem carga de várias salas simultâneas em produção. Os testes de renderização usam geometria real com partes simuladas; a verificação de navegador dos painéis não equivale a medir o desempenho gráfico da corrida.

Nenhuma publicação, migração de banco de produção ou alteração de contas reais foi feita nesta revisão.
