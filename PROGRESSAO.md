# Desafios de progressão

Abra **Piloto → Conquistas** para acompanhar os desafios, suas barras de progresso, recompensas e datas de conclusão.

| Desafio | Objetivo | Recompensa única |
| --- | --- | --- |
| Corrida limpa | Concluir sem colisões, saídas da pista ou reposicionamentos | 150 moedas |
| Presença no pódio | Concluir três corridas entre os três primeiros | 250 moedas e pintura Glória do Pódio |
| Rei da chuva | Vencer com chuva e pista molhada durante pelo menos 25% da prova | 200 moedas e pintura Tempestade |

As recompensas são automáticas. As pinturas desbloqueadas ficam na garagem para equipar; não estão à venda. Cada desafio recompensa uma vez por conta.

## Corridas que contam

Contam corridas online concluídas e calculadas pelo servidor, inclusive na rede local do pendrive. Classificação, Drift, desafios rápidos entre amigos, provas abandonadas e Distrito Neon experimental não contam. O modo solo não envia evidências suficientes para validar esses desafios no backend público.

Na chuva, o servidor verifica intensidade de pelo menos 0,3 e pista molhada em pelo menos 0,55 durante um quarto dos passos da corrida do piloto. Uma breve chuva perto da chegada não basta. Incidentes persistem até o final da prova, mesmo após trocar os pneus ou completar uma volta.

O progresso começa nesta atualização. Resultados antigos não são reprocessados. A conta do pendrive é local e independente da conta pública.

## Publicação e persistência

Publique frontend e backend juntos. O backend cria a tabela `neurodrive.progression` no PostgreSQL ao iniciar; no pendrive, cria `progression` no SQLite existente sem apagar as contas. Não há chave nova para configurar.

O servidor grava progresso, pinturas, moedas e resultado na mesma transação. Repetições do mesmo resultado retornam a recompensa já registrada. A tabela pública usa RLS sem políticas de acesso direto; o navegador consulta o próprio perfil pelo backend.

Validação: `node output/tests/progression.cjs` e `node output/tests/progression-driving.cjs`.
