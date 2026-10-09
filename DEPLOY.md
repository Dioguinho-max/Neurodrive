# Publicação do NeuroDrive — beta online

Esta versão contém frontend para Vercel, backend para Render e persistência PostgreSQL para Supabase. O NeuroDrive utiliza projetos próprios, separados do blog.

| Serviço | Projeto de produção |
| --- | --- |
| Supabase | `https://wryrfqagknlrghwobopo.supabase.co` |
| Vercel | `https://neurodrive-chi.vercel.app` |
| Render | URL do novo serviço ainda pendente |

No projeto Supabase novo, as tabelas do jogo serão criadas no esquema privado **`neurodrive`**. As URLs acima identificam os projetos; não comprovam que as tabelas, variáveis ou o deploy já estejam configurados.

## Migrar o backend para Virginia

O `render.yaml` de produção cria `neurodrive-api-virginia`, na região `virginia`, com `node server/cloud.cjs`. O plano Starter configurado é pago. Os arquivos e as contas temporárias do repositório de teste não são necessários.

1. Mantenha o backend atual disponível até validar o novo. No Render, crie um novo Web Service do repositório `Dioguinho-max/neurodrive`, branch `main`, região **Virginia**. Use `npm ci`, start `node server/cloud.cjs`, health check `/health`, Node 22 e uma única instância.
2. No painel privado do novo serviço, copie do backend atual `DATABASE_URL`, `DATABASE_CA` e `FRONTEND_ORIGIN`. Continue usando o mesmo projeto e esquema Supabase: não importe contas nem recrie o banco.
3. Configure `BACKEND_ORIGIN` no novo Render com a URL HTTPS do próprio serviço, sem barra final. Aguarde o deploy e confirme `/health`. Se o Supabase tiver restrições de rede, permita os endereços de saída do novo serviço.
4. Anote o valor anterior de `BACKEND_ORIGIN` da Vercel. Quando não houver corridas em andamento, substitua-o pela nova URL de Virginia no ambiente Production e publique novamente o frontend.
5. Pelo site da Vercel, teste login com uma conta existente, saldo, inventário, loja e uma corrida com dois jogadores. Confira a recompensa ao terminar e o ping. Não espere que as salas em andamento migrem: elas ficam na memória do backend antigo.
6. Se houver problemas, restaure `BACKEND_ORIGIN` anterior na Vercel e publique novamente. Após validar Virginia, remova o serviço antigo pelo painel. Encerre também os serviços de teste que não pretende usar, conferindo seus nomes antes de excluir.

Apenas publicar no GitHub não muda a região do serviço existente nem a variável da Vercel. O Blueprint mantém deploy automático desativado. A mudança de região exige outro serviço, conforme a [documentação do Render](https://render.com/docs/regions).

## 1. Supabase: conexão privada

No painel do projeto `wryrfqagknlrghwobopo`, clique em **Connect → Session pooler** e copie a conexão PostgreSQL para o backend. A URL pública `https://wryrfqagknlrghwobopo.supabase.co` não é a conexão do banco. Não coloque a senha no repositório, no frontend ou no chat.

O backend utiliza as contas próprias do NeuroDrive, com senhas scrypt e cookies HttpOnly. **Não utiliza Supabase Auth**: isso preserva a compatibilidade com as contas locais. O banco guarda contas, inventário, sessões, limites de login e resultados. Acesso ao esquema é feito somente pelo backend, com RLS ativado e sem políticas públicas. Não adicione `neurodrive` aos schemas expostos na Data API.

Na primeira inicialização, `server/cloud-schema.sql` cria o esquema e suas tabelas, sem alterar as tabelas do blog. A conexão deve ter permissão para criar o esquema. O TLS valida o certificado do banco; se a cadeia não for reconhecida, obtenha o certificado CA no Supabase e configure `DATABASE_CA` com seu conteúdo PEM. Não desabilite a validação TLS.

Se aparecer `SELF_SIGNED_CERT_IN_CHAIN`, abra **Database → Settings → SSL Configuration → Download Certificate** no projeto Supabase. Abra o certificado baixado em um editor de texto e copie seu conteúdo completo, incluindo `-----BEGIN CERTIFICATE-----` e `-----END CERTIFICATE-----`, para a variável `DATABASE_CA` no Render. Cole o conteúdo, não o nome ou caminho do arquivo, sem aspas externas. Quebras de linha reais e sequências literais `\n` são aceitas. Salve e faça novo deploy.

## 2. Render: serviço novo

Crie um **Web Service** do repositório `Dioguinho-max/neurodrive`, com nome novo, por exemplo `neurodrive-api`. Não selecione o serviço `tech-ia-blog`.

| Configuração | Valor |
| --- | --- |
| Runtime | Node |
| Build command | `npm ci` |
| Start command | `node server/cloud.cjs` |
| Health check | `/health` |
| Instâncias | **1** |
| Node | Linha 22 (`.node-version` e `engines` no repositório) |

O `render.yaml` também oferece essa configuração. O Blueprint propõe o plano **Starter, pago**; confira o plano antes de criar o serviço. Nenhum plano foi contratado por este código. As salas vivem em memória: múltiplas instâncias precisam de uma etapa adicional de coordenação. Reiniciar ou publicar o backend encerra as salas ativas.

Configure as variáveis **apenas no Render**:

| Variável | Conteúdo |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Conexão do Session pooler com usuário e senha |
| `DATABASE_CA` | CA PEM, se necessário para validar o certificado |
| `FRONTEND_ORIGIN` | `https://neurodrive-chi.vercel.app` |
| `BACKEND_ORIGIN` | URL HTTPS exata do novo serviço Render, sem `/` final |

O servidor escuta em `0.0.0.0` e usa `PORT`, fornecido pelo Render. Não configure segredos como variáveis públicas. Os logs não imprimem a conexão ou as senhas. `/health` fica disponível após a inicialização do esquema.

## 3. Vercel: frontend novo

No projeto da Vercel publicado em **https://neurodrive-chi.vercel.app**, conecte o repositório `Dioguinho-max/neurodrive`. Escolha framework **Other**, diretório raiz do repositório. O `vercel.json` configura o build e a saída `dist`:

```text
Build command: node scripts/build-frontend.cjs
Output directory: dist
```

Configure **`BACKEND_ORIGIN`** na Vercel com a URL HTTPS do novo serviço Render. A função `api/[...path].js` encaminha HTTP para ele, mantendo os cookies na origem do frontend. O navegador usa WebSocket diretamente no Render, com um ticket de acesso de uso único e duração de 60 segundos. Não coloque `DATABASE_URL` na Vercel.

Defina `FRONTEND_ORIGIN=https://neurodrive-chi.vercel.app` no Render. URLs de preview não são autorizadas automaticamente. Publique novamente quando alterar variáveis. A conta e o cookie pertencem à origem de produção; trocar domínio exige login novamente.

## 4. Preservar as contas locais (opcional)

Faça backup de `server/data` e pare o servidor SQLite. A importação é **manual**, não acontece no deploy. Ela exige destino sem contas e mantém os identificadores, hashes de senha, saldo, skins e histórico já pago. Sessões não são importadas: os jogadores precisam entrar novamente. O arquivo SQLite original fica intacto.

Configure `DATABASE_URL` e, se necessário, `DATABASE_CA` no ambiente privado da máquina de migração. Com o destino ainda vazio:

```powershell
node scripts/migrate-accounts.cjs --confirm
```

Outro caminho de banco pode ser passado como argumento depois de `--confirm`. A transação cancela a importação se o destino já contém contas; não existe mesclagem automática com contas criadas no site.

## 5. Conferência antes de anunciar

1. Acesse `/health` no Render e `/api/config` na Vercel.
2. Cadastre uma conta na Vercel, saia, entre novamente e compre uma pintura.
3. Altere a senha em **Conta** e confirme que a anterior deixa de funcionar.
4. Use **Jogar online** em dois navegadores ou dispositivos, com contas diferentes. Crie uma sala, compartilhe o código, marque Pronto em ambos e largue pelo dono.
5. Complete uma prova e confira a recompensa na conta. Abra uma sala nova para a próxima corrida.
6. Desconecte um jogador e confirme que ele abandona a prova. Reinicie o Render e confirme que contas e skins continuam salvas no Supabase.

As salas comportam 2–6 humanos; a IA completa seis carros. A física roda no servidor a 60 passos por segundo, com snapshots a 20 Hz. O cliente envia apenas comandos; não pode informar posição, chegada ou quantidade de moedas. O menu não pausa uma sala. Sem comandos recentes, o servidor freia o carro. Desconectar abandona a prova, sem retomar aquela vaga. A corrida tem limite de 15 minutos; uma conexão tem duração máxima de uma hora. Salas encerradas são liberadas após cinco minutos.

No backend cloud, **corridas locais não concedem moedas**. Somente chegadas calculadas pelo servidor online são premiadas: 50 + 20 por volta, até 200 por prova e 500 por dia UTC. O bônus diário continua disponível. Cada resultado é creditado uma vez por conta em transação SQL. Sem chegada (abandono ou limite de tempo), não há prêmio. Falhas temporárias de gravação são repetidas enquanto a sala continua ativa; uma queda completa do processo antes da gravação ainda pode perder um resultado.

Esta é uma **beta**, sem matchmaking público, recuperação de senha por e-mail, reconexão à corrida, compensação avançada de latência ou salas distribuídas. Troca de senha exige a senha atual. Não há pagamentos reais. Os testes locais não substituem os passos acima nos serviços reais; a publicação só está confirmada depois desse teste integrado.

## Testes locais

```powershell
npm.cmd ci
node output/tests/cloud.cjs
node output/tests/powertrain.cjs
node output/tests/race-ui.cjs
node output/tests/garage-ui.cjs
node output/tests/skins.cjs
npm.cmd run build
```

`cloud.cjs` usa PostgreSQL em WASM (PGlite) e dois clientes WebSocket reais. Verifica transações, isolamento, sessões, troca de senha, salas, controles independentes e rejeição de posições enviadas pelo cliente. Não acessa o Supabase real. A versão local existente continua com `npm.cmd start` e SQLite; o backend cloud usa `npm.cmd run start:cloud`.

Referências: [Render WebSocket](https://render.com/docs/websocket), [Supabase PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres), [Vercel configuração](https://vercel.com/docs/project-configuration).
# Fotos e perfis de pilotos

A atualização de perfil inclui migração automática das contas existentes. Para habilitar fotos no site, configure o bucket `neurodrive-avatars` e as variáveis privadas do Render conforme [PERFIL-PILOTO.md](PERFIL-PILOTO.md). Publique backend e frontend juntos. Sem Storage configurado, a edição de nick e número continua disponível.
