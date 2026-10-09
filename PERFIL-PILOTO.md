# Perfil do piloto

No menu **Conta**, entre e abra **Editar meu piloto**. O nick público e o número (0–99) são independentes do nome de login. A pintura exibida é a equipada na loja.

Fotos: JPG, PNG ou WebP até 5 MB na seleção; corte ajustável, prévia e confirmação. O navegador converte a foto em JPEG de 256 × 256, sem os metadados originais. O servidor aceita apenas JPEG quadrado até 512 pixels e 200 KB. A foto é pública; senhas, moedas e inventário não aparecem na visita a outro perfil. Nesta etapa, visite pelo nome da conta; integração com ranking vem depois.

## Configurar fotos no site publicado

1. No projeto Supabase do NeuroDrive, abra **Storage → New bucket**.
2. Nome exato: `neurodrive-avatars`. Marque como **Public** (leitura das fotos).
3. Restrinja o bucket a `image/jpeg` e tamanho máximo de 200 KB. Não crie políticas públicas de upload, alteração ou exclusão: o backend fará essas operações autenticadas.
4. No **Render → Environment**, adicione:

```text
SUPABASE_URL=https://wryrfqagknlrghwobopo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role do projeto Supabase>
```

A chave `service_role` fica somente no Render. Não coloque no frontend, Vercel, GitHub ou mensagens. Ela é usada pelo servidor para gravar exclusivamente no caminho do jogador autenticado. O bucket deve existir antes do primeiro envio, conforme a [documentação do Supabase Storage](https://supabase.com/docs/reference/javascript/file-buckets-upload).

5. Publique backend e frontend. A inicialização do backend aplica as novas colunas automaticamente, sem apagar contas. Não é necessário executar SQL manual para o perfil.
6. Teste nick, número, upload, remoção da foto e um novo login. Sem essas variáveis, nick e estatísticas continuam funcionando; envio de foto informa que o armazenamento não foi configurado.

Em `npm.cmd start`, as fotos são persistidas no SQLite local, sem exigir Supabase. O banco local não sincroniza automaticamente com produção. O script de migração de contas existente continua disponível para um destino vazio.

## De onde vêm as estatísticas

- Corridas, vitórias e pódios: histórico já salvo pelo backend.
- Poles: novas corridas online concluídas; exige melhor volta válida e primeiro lugar no grid. Não há reconstrução do histórico antigo.
- Melhor volta por circuito: novas corridas online concluídas e calculadas pelo servidor. Não é ainda um ranking competitivo ou um sistema novo de detecção de atalhos.
- No servidor local, poles e voltas online aparecem sem registro. O cliente não pode enviar moedas ou estatísticas pela edição de perfil.

Testes: `npm.cmd run test:accounts`, `npm.cmd run test:cloud`, `node output/tests/pilot.cjs` e `node output/tests/garage-ui.cjs`.
