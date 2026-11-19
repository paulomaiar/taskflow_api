# Plano de Testes Manual, Matriz de Rastreabilidade e Suíte Caixa Preta — TaskFlow

**Escopo:** API Express, frontend React (SPA Kanban) e persistência PostgreSQL  
**Abordagem:** testes funcionais manuais de caixa preta, com Partição de Equivalência (PE) e Análise de Valor Limite (AVL), conforme fundamentos de Teste de Software da UC11/UC15  
**Versão:** 1.1  
**Execução:** 10/11/2026 — ambiente local com API Express e frontend React; navegador Chromium 1.142.0. Campanha limitada a CT-01–CT-08.

## Plano de Teste — Campanha CT-01 a CT-08

1. **Objetivo do Teste:** verificar os fluxos de autenticação e Kanban solicitados, incluindo validação de entrada, atualização de tarefas e persistência após F5.
2. **Escopo:**
   - **Dentro:** login inválido, acesso ao Kanban sem token, criar tarefa, rejeitar texto vazio e só com espaços, editar tarefa/projeto, mover tarefa, excluir tarefa e persistência após F5.
   - **Fora:** testes diretos no Postman/cliente HTTP, performance e telas mobile.
3. **Abordagem:** execução manual, caixa-preta E2E pela interface; Partição de Equivalência e Análise de Valor Limite conforme aplicáveis aos dados da suíte.
4. **Mapeamento de Ambientes:**
   - **Local:** React/Vite em `http://localhost:5173`, API Express em `http://localhost:3001`, banco PostgreSQL/Neon configurado como dedicado de teste.
   - **Produção:** frontend Vercel + API/Neon de produção — não executado nesta campanha.
5. **Critérios de Entrada:** URL/frontend e API acessíveis; migrations aplicadas; conta QA funcional, deslogada para CT-07/CT-08 e com projeto ativo para operações autenticadas. CT-06 requer dois projetos acessíveis.
6. **Critérios de Saída:** 100% dos casos CT-01–CT-08 executados; pelo menos 90% aprovados; zero defeitos Críticos ou Altos abertos.
7. **Riscos e Planos de Ação:**
   - **Cold start do Neon:** aguardar a primeira resposta dentro do timeout operacional e distinguir latência inicial de falha funcional; repetir somente após o serviço responder.
   - **API fora do ar:** bloquear os casos dependentes, registrar indisponibilidade/horário e retomar após restabelecimento; não classificar como defeito funcional sem evidência.

## 1. Base, premissas e limites

Os identificadores RF01–RF07, RN01–RN03 e RNF01–RNF03 não têm descrições normativas no material do repositório. Para não atribuir ao projeto definições não fornecidas, a matriz abaixo usa as descrições operacionais inferidas dos casos explicitamente solicitados e dos comportamentos observados no código. A cobertura de 100% é, portanto, **rastreabilidade nominal provisória**: confirme as descrições com a especificação oficial UC11/UC15 antes de assinar a cobertura final.

Os limites de `senha`, `nome` e `descricao` são tratados como critérios de aceite informados nesta solicitação, não como regras já confirmadas na implementação. A validação encontrada no backend verifica texto não vazio e formato de e-mail, mas não declara `minLength` para senha/nome nem `maxLength` para descrição. Assim, os casos AVL são necessários para verificar conformidade e podem revelar divergência.

### 1.1 Requisitos usados para rastreio (interpretação provisória)

| ID | Descrição operacional usada nesta suíte |
|---|---|
| RF01 | Autenticar usuário com credenciais válidas e tratar falha de login. |
| RF02 | Restringir acesso ao Kanban e às rotas protegidas por autenticação JWT. |
| RF03 | Criar tarefa e apresentá-la na coluna e projeto selecionados. |
| RF04 | Editar projeto, responsável e prioridade de uma tarefa. |
| RF05 | Mover tarefa entre colunas do Kanban. |
| RF06 | Excluir tarefa. |
| RF07 | Persistir tarefas e alterações no banco, mantendo o estado após recarregar a página. |
| RN01 | O texto da tarefa é obrigatório e não pode ser vazio ou composto apenas por espaços. |
| RN02 | Ao mover uma tarefa de “a fazer” para “em andamento”, registrar a data/hora de início. |
| RN03 | Limitar a duas tarefas em andamento por responsável. |
| RNF01 | Não expor a senha em texto puro; armazenar credencial de forma protegida. |
| RNF02 | Impedir acesso não autenticado às rotas protegidas e encaminhar a navegação do frontend para `/login`. |
| RNF03 | Apresentar falhas de validação/autenticação sem recarregar a tela e sem perder o contexto do formulário/modal. |

### 1.2 Plano de execução manual

1. Executar somente em ambiente de teste, com PostgreSQL migrado e API/frontend apontando para esse ambiente. Não usar contas ou dados reais.
2. Subir API (`taskflow_api`: `npm start`) e frontend (`react_trello`: `npm run dev`). Registrar URLs, versões, navegador, data/hora e commit/build em evidência.
3. Preparar previamente a conta de teste **U1** (criador), o responsável **U2** e os projetos necessários pela interface da aplicação; não usar Postman/cliente HTTP. CT-06 requer dois projetos acessíveis a U1.
4. Antes de cada caso, confirmar as pré-condições indicadas e capturar o estado inicial. Usar identificadores únicos no texto/e-mail (`CTxx-<datahora>`), exceto nas variações em que a repetição é necessária.
5. Para respostas HTTP, registrar método, URL, status e corpo relevante no DevTools/Network do navegador; não usar Postman ou cliente HTTP externo. Para persistência, verificar a interface após F5 e, quando autorizado/disponível, consulta somente leitura ao PostgreSQL de teste.
6. Ao terminar, remover os dados de teste criados, preservando registros previamente existentes. Guardar capturas, respostas e consultas sem tokens, senhas ou segredos.

**Critério de aprovação:** cada resultado esperado é observado exatamente; os status HTTP e dados persistidos coincidem com o caso; nenhuma evidência contém segredo/token. Resultado diferente, inclusive aceitar um limite inválido, é **Reprovado**. Falta de ambiente, fixture, acesso de leitura ao banco ou pré-condição é **Bloqueado**.

**Preparação comum para casos autenticados:** API e frontend acessíveis; migrations aplicadas; U1 ativo e autenticável; token de U1 obtido pelo fluxo normal de login; projeto de U1 existente; IDs reais de U1/projeto/prioridades disponíveis. Prioridades padrão documentadas na migration: `1=Baixa`, `2=Média`, `3=Alta`.

## 2. Matriz de rastreabilidade

| Requisito | Critério verificável | Casos que cobrem | Cobertura |
|---|---|---|---|
| RF01 | Login inválido apresenta erro sem reload; credencial válida permite autenticação | CT-07, CT-19 | Coberto |
| RF02 | API protegida retorna 401 sem JWT; SPA envia visitante a `/login` | CT-08 | Coberto |
| RF03 | Nova tarefa válida é criada em “a fazer” | CT-01, CT-09, CT-11–CT-13 | Coberto |
| RF04 | Projeto, responsável e prioridade da tarefa são alterados e persistidos | CT-06, CT-12–CT-14 | Coberto |
| RF05 | Tarefa muda de “a fazer” para “em andamento” | CT-03, CT-09 | Coberto |
| RF06 | Tarefa excluída deixa de aparecer e de existir | CT-04 | Coberto |
| RF07 | Criação/edição permanece após F5; exclusão é persistente | CT-01, CT-04, CT-06 | Coberto |
| RN01 | Campo obrigatório vazio ou só com espaços é rejeitado | CT-02, CT-05 | Coberto |
| RN02 | `iniciadaEm` é gravada no primeiro movimento para andamento | CT-03 | Coberto |
| RN03 | Terceira tarefa simultânea em andamento para o responsável é rejeitada | CT-18 | Coberto |
| RNF01 | Resposta não contém senha/hash e banco contém somente hash não igual à senha | CT-19 | Coberto |
| RNF02 | Sem token, rota API retorna 401 e SPA redireciona à página de login | CT-08 | Coberto |
| RNF03 | Falhas de validação/login são visíveis, sem reload e sem fechar/perder o modal | CT-02, CT-05, CT-07 | Coberto |

**Resultado da matriz:** os 13 identificadores informados estão associados a pelo menos um caso (13/13 = 100% nominal). A validade semântica dessa métrica depende de confirmar que as descrições operacionais desta seção correspondem ao catálogo oficial de requisitos.

## 3. Partições de equivalência

Os valores das tabelas são os representantes únicos escolhidos para a campanha PE. Executar cada linha como variação isolada, mantendo os demais campos válidos. Quando o caso principal (CT-01 a CT-08) também usa um valor igual, isso é cobertura do fluxo obrigatório, não um representante adicional da campanha PE.

### 3.1 `coluna` (criação de tarefa autenticada)

| Classe | Representante exato | Resultado esperado |
|---|---|---|
| Válida — a fazer | `"afazer"` | HTTP 201; resposta e tarefa no Kanban com coluna `afazer`. |
| Válida — em andamento | `"andamento"` | HTTP 201, desde que o responsável tenha menos de 2 tarefas em andamento. |
| Válida — concluída | `"concluido"` | HTTP 201; coluna pública `concluido` e `concluidoEm` preenchida. |
| Válida — campo omitido/default | propriedade ausente | HTTP 201; coluna padrão `afazer`. |
| Inválida — valor fora do domínio | `"bloqueada"` | HTTP 400; mensagem de coluna inválida; nenhuma tarefa criada. |

### 3.2 `id` na URL (GET `/tarefas/:id`)

| Classe | Representante exato | Resultado esperado |
|---|---|---|
| Válida — inteiro positivo existente | `ID_TAREFA_EXISTENTE` (inteiro retornado ao criar a tarefa de fixture) | HTTP 200; objeto tem o mesmo ID enviado. |
| Sintaxe válida, registro inexistente | `999999` | HTTP 404; resposta de recurso não encontrado. |
| Inválida — texto não numérico | `abc` | HTTP 400; detalhe identifica ID inteiro positivo. |
| Inválida — zero | `0` | HTTP 400. |
| Inválida — negativo | `-1` | HTTP 400. |
| Inválida — decimal | `1.5` | HTTP 400. |

`/tarefas` sem segmento de ID é a rota de listagem, não um ID ausente. Por isso, não é uma classe de entrada de `:id`.

### 3.3 `usuario_id` (body de tarefa)

| Classe | Representante exato | Resultado esperado |
|---|---|---|
| Válida — inteiro positivo existente | `U2.id` (número JSON) | HTTP 201 e associação ao usuário U2. |
| Válida — omitido, usa usuário autenticado | propriedade ausente | HTTP 201; `usuario_id` corresponde a U1. |
| Inválida — inteiro positivo inexistente | `999999` | HTTP 400; responsável inexistente; nenhuma tarefa criada. |
| Inválida — zero | `0` | HTTP 400. |
| Inválida — negativo | `-1` | HTTP 400. |
| Inválida — decimal | `1.5` | HTTP 400. |
| Inválida — string (tipo incorreto) | `"2"` | HTTP 400 da validação de tipo do body. |

### 3.4 `projeto_id` (body de tarefa)

| Classe | Representante exato | Resultado esperado |
|---|---|---|
| Válida — projeto existente de U1 | `ProjetoU1.id` (número JSON) | HTTP 201 e vínculo ao projeto de U1. |
| Inválida — ID positivo inexistente | `999999` | HTTP 404; projeto não encontrado para o criador; nenhuma tarefa criada. |
| Inválida — projeto existente de outro dono | `ProjetoU2.id` | HTTP 404; vínculo não autorizado/não localizado para U1. |
| Inválida — zero | `0` | HTTP 400. |
| Inválida — negativo | `-1` | HTTP 400. |
| Inválida — decimal | `1.5` | HTTP 400. |
| Inválida — string (tipo incorreto) | `"1"` | HTTP 400 da validação de tipo do body. |
| Inválida — omitido | propriedade ausente | HTTP 400; `projeto_id` obrigatório. |

### 3.5 `idprioridade` (body de tarefa)

| Classe | Representante exato | Resultado esperado |
|---|---|---|
| Válida — prioridade existente | `2` (número JSON, Média) | HTTP 201 e `idprioridade: 2`. |
| Inválida — inteiro positivo inexistente | `999` | HTTP 400; prioridade inexistente; nenhuma tarefa criada. |
| Inválida — zero | `0` | HTTP 400. |
| Inválida — negativo | `-1` | HTTP 400. |
| Inválida — decimal | `1.5` | HTTP 400. |
| Inválida — string (tipo incorreto) | `"2"` | HTTP 400 da validação de tipo do body. |
| Válida — omitido, usa padrão | propriedade ausente | HTTP 201; prioridade padrão `2`. |

### 3.6 `email` (POST `/usuarios`)

Para entradas aceitas, usar nome `Ana Teste`, senha `Abc123` e um endereço novo; para a classe duplicada, cadastrar previamente o mesmo endereço.

| Classe | Representante exato | Resultado esperado |
|---|---|---|
| Válida — formato e endereço não cadastrado | `qa.ct14@example.test` | HTTP 201; resposta não contém senha nem `senha_hash`. |
| Inválida — formato sem domínio | `qa@` | HTTP 400; erro aponta e-mail inválido. |
| Inválida — string vazia | `""` | HTTP 400; campo obrigatório/formato inválido. |
| Inválida — campo ausente | propriedade ausente | HTTP 400; campo obrigatório. |
| Inválida — endereço já cadastrado | `existente@example.test` (previamente cadastrado) | HTTP 400; conflito informado; não cria segundo usuário. |

## 4. Suíte de casos de teste — anatomia estrita

Para todos os casos abaixo, **Status inicial: Bloqueado** (aguardando execução manual e preenchimento de evidências). Ao executar, substituir pelo único estado final aplicável: **Aprovado**, **Reprovado** ou **Bloqueado**.

### CT-01 — Criar tarefa válida em “a fazer” e persistir após F5
- **Requisito/Regra Vinculada:** RF03, RF07.
- **Pré-condições:** preparação comum concluída; sessão de U1 aberta no dashboard; projeto de U1 selecionável; responsável U1 e prioridade Média disponíveis.
- **Passo a Passo Numerado:**
  1. Anotar o número atual de tarefas com o prefixo de teste.
  2. Clicar em “Adicionar Tarefa”; preencher os campos da nova tarefa.
  3. Salvar e registrar a requisição `POST /tarefas` e sua resposta.
  4. Confirmar que o cartão aparece em “A FAZER”.
  5. Pressionar F5 e aguardar o Kanban carregar novamente.
  6. Consultar `GET /tarefas` com o token e localizar o cartão.
- **Dados de Teste Exatos:** texto `CT-01-<datahora> Validar persistência`; coluna `afazer` (ou selecionada por “A FAZER”); `projeto_id=ProjetoU1.id`; `usuario_id=U1.id`; `idprioridade=2`.
- **Resultado Esperado:** `POST /tarefas` retorna HTTP 201 com ID numérico e os vínculos informados; cartão aparece uma única vez na coluna A FAZER antes e depois do F5; GET retorna o mesmo ID, texto, `coluna:"afazer"`, projeto, responsável e prioridade; banco contém uma linha correspondente.
- **Status:** Bloqueado.

### CT-02 — Rejeitar texto vazio sem fechar o modal
- **Requisito/Regra Vinculada:** RN01, RNF03.
- **Pré-condições:** preparação comum concluída; modal “Nova tarefa” aberto; projeto e responsável válidos selecionados.
- **Passo a Passo Numerado:**
  1. Deixar o campo “Tarefa” vazio.
  2. Clicar em “Salvar” e inspecionar Network.
  3. Verificar a resposta HTTP e a mensagem exibida no modal.
  4. Confirmar que o modal permanece aberto e que a URL/documento não recarregou.
- **Dados de Teste Exatos:** `texto=""`; `projeto_id=ProjetoU1.id`; `usuario_id=U1.id`; `idprioridade=2`; coluna `afazer`.
- **Resultado Esperado:** a requisição rejeitada retorna HTTP 400 com erro explícito de texto obrigatório/não vazio; mensagem de erro fica visível no modal; modal continua aberto; nenhum cartão é criado; nenhuma navegação/reload ocorre.
- **Status:** Bloqueado.

### CT-03 — Mover tarefa para “em andamento” e registrar início
- **Requisito/Regra Vinculada:** RF05, RN02, RF07.
- **Pré-condições:** preparação comum concluída; tarefa de teste existe em `afazer`, pertence ao projeto de U1 e U1 está abaixo do limite de duas tarefas em andamento.
- **Passo a Passo Numerado:**
  1. Obter via GET a tarefa e registrar `iniciadaEm` inicial (nulo).
  2. No cartão, selecionar o status “Em andamento”.
  3. Registrar a requisição de atualização e confirmar o cartão na coluna EM ANDAMENTO.
  4. Buscar a tarefa por ID na API; consultar novamente após F5.
- **Dados de Teste Exatos:** tarefa `CT-03-<datahora> Movimento`; estado inicial `afazer`; status selecionado `EM ANDAMENTO`; responsável `U1.id`.
- **Resultado Esperado:** resposta HTTP 200; coluna persistida/publicada como `andamento`; `iniciadaEm` deixa de ser nula e contém timestamp ISO-8601 válido, dentro do intervalo entre início e fim do passo 2; F5 mantém status e timestamp. Se já havia timestamp, não é substituído por nova data em movimentação repetida.
- **Status:** Bloqueado.

### CT-04 — Excluir tarefa permanentemente
- **Requisito/Regra Vinculada:** RF06, RF07.
- **Pré-condições:** preparação comum concluída; uma tarefa exclusiva de CT-04 foi criada por U1 e seu ID foi anotado.
- **Passo a Passo Numerado:**
  1. Confirmar que o cartão aparece no Kanban e que `GET /tarefas/:id` retorna HTTP 200.
  2. Clicar em “Excluir” no cartão.
  3. Verificar a resposta de exclusão e a remoção imediata do cartão.
  4. Recarregar a página e repetir GET pelo ID.
  5. Consultar a tabela `tarefas` no banco de teste por aquele ID.
- **Dados de Teste Exatos:** tarefa `CT-04-<datahora> Remover`; `id=<ID retornado na criação>`.
- **Resultado Esperado:** DELETE retorna HTTP 204; cartão não aparece antes nem depois do F5; GET pelo ID retorna HTTP 404; consulta ao banco retorna zero linhas para o ID.
- **Status:** Bloqueado.

### CT-05 — Rejeitar texto composto somente por espaços
- **Requisito/Regra Vinculada:** RN01, RNF03.
- **Pré-condições:** preparação comum concluída; modal de criação aberto com projeto e responsável válidos.
- **Passo a Passo Numerado:**
  1. Digitar exatamente três espaços no campo “Tarefa”.
  2. Clicar em “Salvar” e inspecionar a resposta da API.
  3. Confirmar que a mensagem fica no modal, que permanece aberto, e que o cartão não é criado.
- **Dados de Teste Exatos:** `texto="   "` (3 U+0020); `projeto_id=ProjetoU1.id`; `usuario_id=U1.id`; `idprioridade=2`; coluna `afazer`.
- **Resultado Esperado:** HTTP 400 com mensagem de texto obrigatório/não vazio após trim; nenhuma linha é persistida; modal permanece aberto com o feedback; documento não recarrega.
- **Status:** Bloqueado.

### CT-06 — Editar projeto, responsável e prioridade de uma tarefa
- **Requisito/Regra Vinculada:** RF04, RF07.
- **Pré-condições:** U1 autenticado; projetos ProjetoU1-A e ProjetoU1-B pertencem a U1; U2 existe; tarefa foi criada por U1 em ProjetoU1-A e está atribuída a U1.
- **Passo a Passo Numerado:**
  1. Abrir “Editar” no cartão e anotar os valores iniciais.
  2. Selecionar ProjetoU1-B, responsável U2 e prioridade Alta.
  3. Salvar e registrar resposta da API.
  4. Consultar a tarefa por ID, recarregar o Kanban e abrir novamente a edição.
- **Dados de Teste Exatos:** projeto anterior `ProjetoU1-A.id`, novo `ProjetoU1-B.id`; responsável anterior `U1.id`, novo `U2.id`; prioridade anterior `2`, nova `3`; texto `CT-06-<datahora> Editar vínculos`.
- **Resultado Esperado:** HTTP 200; GET retorna `projeto_id=ProjetoU1-B.id`, `usuario_id=U2.id`, `idprioridade=3` e nomes correspondentes; a interface exibe ProjetoU1-B, U2 e Alta após salvar, F5 e reabertura. Não há alteração no texto se ele não foi editado.
- **Status:** Bloqueado.

### CT-07 — Login com senha incorreta sem recarregar a tela
- **Requisito/Regra Vinculada:** RF01, RNF03.
- **Pré-condições:** U1 está cadastrado; usuário está deslogado e na rota `/login`; remover tokens TaskFlow existentes do armazenamento local antes do início.
- **Passo a Passo Numerado:**
  1. Digitar o identificador de U1 e uma senha incorreta.
  2. Anotar a URL e o estado de navegação/documento antes de submeter.
  3. Clicar em “Entrar” e observar a resposta da API e a mensagem na tela.
  4. Confirmar URL e estado de navegação após a resposta; verificar que não houve redirect para o dashboard.
- **Dados de Teste Exatos:** usuário `U1.email`; senha `SenhaErrada-CT07`.
- **Resultado Esperado:** `POST /auth/login` retorna HTTP 401; mensagem exata “Credenciais inválidas” fica visível; rota permanece `/login`, documento não sofre reload; campos e botão voltam ao estado utilizável; nenhum token de sessão é gravado.
- **Status:** Reprovado na execução inicial; Aprovado no reteste após correção DEF-01.

### CT-08 — Acessar Kanban sem JWT
- **Requisito/Regra Vinculada:** RF02, RNF02.
- **Pré-condições:** frontend e API acessíveis; sessão limpa (remover `token`, `taskflow_token` e `taskflow_usuario` do localStorage).
- **Passo a Passo Numerado:**
  1. Confirmar que não há token de sessão no navegador.
  2. No navegador, abrir diretamente `/dashboard` sem token.
  3. Confirmar rota final `/login` e que nenhum dado do Kanban foi apresentado.
- **Dados de Teste Exatos:** requisição sem header `Authorization`; URL da SPA `http://localhost:5173/dashboard` (ajustar host/porta apenas ao ambiente configurado).
- **Resultado Esperado:** SPA redireciona automaticamente para `/login`, não renderiza tarefas protegidas e continua sem token de autenticação. Não há chamada direta à API neste caso.
- **Status:** Aprovado.

### CT-09 — PE: valores de `coluna`
- **Requisito/Regra Vinculada:** RF03, RF05, RN03.
- **Pré-condições:** U1 autenticado; projeto próprio existente; responsável existente com menos de duas tarefas em andamento; executar uma variação por vez e conferir ausência de persistência nas variações inválidas.
- **Passo a Passo Numerado:**
  1. Criar uma tarefa por cada valor exato abaixo, alterando somente `coluna`.
  2. Registrar status HTTP, coluna retornada e timestamps.
  3. Para valor inválido, confirmar erro e consultar que não houve criação.
- **Dados de Teste Exatos:** variações de body de `POST /tarefas`: `coluna:"afazer"`; `coluna:"andamento"`; `coluna:"concluido"`; coluna omitida; `coluna:"bloqueada"`. Em todas: texto `CT-09-PE-<variação>`, `projeto_id=ProjetoU1.id`, `usuario_id=U1.id`, `idprioridade=2`.
- **Resultado Esperado:** `afazer`, `andamento`, `concluido` e coluna omitida retornam HTTP 201 e status esperado (omitida equivale a `afazer`); caso concluído retorna `concluidoEm` preenchida; `"bloqueada"` retorna HTTP 400 e não persiste. Para `andamento`, a precondição de limite é obrigatória.
- **Status:** Bloqueado.

### CT-10 — PE: `id` na URL
- **Requisito/Regra Vinculada:** RF02, RF06.
- **Pré-condições:** U1 autenticado; criar uma tarefa de fixture pela API, guardar o ID inteiro retornado e usá-lo como representante positivo existente; `999999` não pode existir no ambiente.
- **Passo a Passo Numerado:**
  1. Fazer GET autenticado em `/tarefas/:id` com cada representante da tabela de classes de `id`.
  2. Registrar status e mensagem de cada resposta.
  3. Confirmar que entradas inválidas não modificam registros.
- **Dados de Teste Exatos:** o inteiro `ID_TAREFA_EXISTENTE` capturado da criação da fixture; `999999`; `abc`; `0`; `-1`; `1.5`.
- **Resultado Esperado:** ID existente retorna HTTP 200 e objeto com o mesmo ID; `999999` retorna 404; `abc`, `0`, `-1` e `1.5` retornam HTTP 400 com erro de ID inteiro positivo; nenhuma requisição altera os dados.
- **Status:** Bloqueado.

### CT-11 — PE: `usuario_id`
- **Requisito/Regra Vinculada:** RF03, RF04.
- **Pré-condições:** U1 autenticado; ProjetoU1 existente; U2 válido; cada variação usa texto único.
- **Passo a Passo Numerado:**
  1. Enviar POST de criação de tarefa com cada representante de `usuario_id`, mantendo todos os outros campos válidos.
  2. Registrar resposta HTTP e vínculo retornado.
  3. Confirmar que casos inválidos não criaram tarefa.
- **Dados de Teste Exatos:** `U2.id` numérico; propriedade omitida; `999999`; `0`; `-1`; `1.5`; `"2"` (string JSON). Payload base: `texto:"CT-11-PE-<variação>"`, `projeto_id=ProjetoU1.id`, `idprioridade=2`, `coluna:"afazer"`.
- **Resultado Esperado:** U2 e propriedade omitida retornam 201 (omissão atribui U1); ID inexistente retorna 400 por responsável inexistente; zero/negativo/decimal/string retornam 400; nenhuma variação inválida persiste.
- **Status:** Bloqueado.

### CT-12 — PE: `projeto_id`
- **Requisito/Regra Vinculada:** RF03, RF04.
- **Pré-condições:** U1 autenticado; ProjetoU1 e ProjetoU2 existentes, este último pertencente a U2; texto único por variação.
- **Passo a Passo Numerado:**
  1. Enviar POST de criação de tarefa usando um representante de `projeto_id` por requisição.
  2. Registrar status, mensagem e projeto retornado.
  3. Consultar banco/API para verificar que apenas os casos aceitos foram persistidos.
- **Dados de Teste Exatos:** `ProjetoU1.id`; `999999`; `ProjetoU2.id`; `0`; `-1`; `1.5`; `"1"` (string JSON); propriedade omitida. Demais campos: `texto:"CT-12-PE-<variação>"`, `usuario_id=U1.id`, `idprioridade=2`, `coluna:"afazer"`.
- **Resultado Esperado:** projeto próprio existente retorna 201; inexistente ou de U2 retorna 404; zero, negativo, decimal e string retornam 400; propriedade omitida retorna 400; nenhuma variação inválida cria tarefa.
- **Status:** Bloqueado.

### CT-13 — PE: `idprioridade`
- **Requisito/Regra Vinculada:** RF03, RF04.
- **Pré-condições:** U1 autenticado; projeto próprio e responsável válidos; IDs 1, 2 e 3 estão cadastrados conforme migration; texto único por variação.
- **Passo a Passo Numerado:**
  1. Enviar POST de tarefa com cada representante de `idprioridade`.
  2. Registrar resposta e valor de prioridade.
  3. Confirmar ausência de tarefa em cada entrada inválida.
- **Dados de Teste Exatos:** `2`; omitido; `999`; `0`; `-1`; `1.5`; `"2"` (string JSON). Payload base: `texto:"CT-13-PE-<variação>"`, `projeto_id=ProjetoU1.id`, `usuario_id=U1.id`, `coluna:"afazer"`.
- **Resultado Esperado:** valor 2 retorna 201; omissão retorna 201 com prioridade padrão 2; 999 retorna 400 por prioridade inexistente; zero, negativo, decimal e string retornam 400; nenhuma entrada inválida persiste.
- **Status:** Bloqueado.

### CT-14 — PE: `email`
- **Requisito/Regra Vinculada:** RF01, RNF01.
- **Pré-condições:** rota POST `/usuarios` acessível; senha/nome compatíveis com o cenário positivo; endereço de duplicidade previamente cadastrado; usar e-mail único no caso válido.
- **Passo a Passo Numerado:**
  1. Enviar cadastro para cada representante de `email`, mantendo nome e senha válidos.
  2. Anotar status, corpo e mensagem retornados.
  3. Consultar lista/banco para confirmar usuário criado ou não criado conforme classe.
- **Dados de Teste Exatos:** `qa.ct14@example.test`; `qa@`; `""`; propriedade omitida; `existente@example.test` previamente cadastrado. Nome `Ana Teste`; senha `Abc123`.
- **Resultado Esperado:** endereço válido novo retorna 201 sem senha/hash no corpo; formato inválido, vazio e ausente retornam 400; e-mail duplicado retorna 400 com erro de duplicidade e mantém exatamente um registro para esse endereço.
- **Status:** Bloqueado.

### CT-15 — AVL: `senha` com 5, 6 e 7 caracteres
- **Requisito/Regra Vinculada:** RF01; RNF01; regra de validação `senha.minLength=6` informada para esta campanha.
- **Pré-condições:** endpoint POST `/usuarios` acessível; e-mails únicos por tentativa; nome `Ana` válido; não reutilizar endereço entre iterações.
- **Passo a Passo Numerado:**
  1. Cadastrar três usuários variando somente o comprimento da senha.
  2. Registrar status/body de cada requisição e consultar os usuários persistidos.
  3. Confirmar que o caso aceito não retorna credencial em texto puro.
- **Dados de Teste Exatos:** senha 5 chars `Abc12`; senha 6 chars `Abc123`; senha 7 chars `Abc1234`. E-mails `ct15-5@example.test`, `ct15-6@example.test`, `ct15-7@example.test`; nome `Ana`.
- **Resultado Esperado:** 5 caracteres retorna HTTP 400 e não cria usuário; 6 e 7 retornam HTTP 201; respostas não contêm senha nem `senha_hash`; hash no banco não é igual à senha. Se 5 caracteres for aceito, registrar Reprovado por violação do limite informado.
- **Status:** Bloqueado.

### CT-16 — AVL: `nome` com 2, 3 e 4 caracteres
- **Requisito/Regra Vinculada:** regra de validação `nome.minLength=3` informada para esta campanha; RF01.
- **Pré-condições:** endpoint POST `/usuarios` acessível; e-mail novo por tentativa; senha `Abc123`.
- **Passo a Passo Numerado:**
  1. Cadastrar três usuários variando somente o comprimento de `nome`.
  2. Registrar status/body e consultar persistência por e-mail.
- **Dados de Teste Exatos:** nome 2 chars `Al`; 3 chars `Ana`; 4 chars `Anas`. E-mails `ct16-2@example.test`, `ct16-3@example.test`, `ct16-4@example.test`; senha `Abc123`.
- **Resultado Esperado:** nome de 2 caracteres retorna HTTP 400 e não cria usuário; nomes de 3 e 4 caracteres retornam HTTP 201; resposta/consulta por usuário confirma nome exatamente igual ao enviado. Aceitar `Al` é Reprovado frente ao limite solicitado.
- **Status:** Bloqueado.

### CT-17 — AVL: `descricao` de projeto com 199, 200 e 201 caracteres
- **Requisito/Regra Vinculada:** limite `descricao.maxLength=200` informado para esta campanha.
- **Pré-condições:** U1 autenticado; endpoint POST `/projetos` acessível; nomes de projeto únicos em cada tentativa.
- **Passo a Passo Numerado:**
  1. Criar três projetos variando somente o tamanho de `descricao`.
  2. Registrar status e corpo retornado.
  3. Consultar cada projeto por ID e comparar o comprimento exato da descrição.
- **Dados de Teste Exatos:** `D199 = "D"` repetido exatamente 199 vezes; `D200 = "D"` repetido exatamente 200 vezes; `D201 = "D"` repetido exatamente 201 vezes. Enviar cada string como `descricao`; nomes `CT-17-199`, `CT-17-200`, `CT-17-201`.
- **Resultado Esperado:** comprimentos 199 e 200 retornam HTTP 201 e a consulta retorna respectivamente 199 e 200 caracteres; 201 retorna HTTP 400 e não cria projeto. Aceitar descrição de 201 caracteres é Reprovado frente ao limite solicitado.
- **Status:** Bloqueado.

### CT-18 — RN03: bloquear terceira tarefa em andamento do mesmo responsável
- **Requisito/Regra Vinculada:** RN03, RF05.
- **Pré-condições:** U1 autenticado; responsável U2 válido; U2 possui exatamente duas tarefas em `andamento`; projeto da tarefa é de U1.
- **Passo a Passo Numerado:**
  1. Tentar mover para andamento uma tarefa de `afazer` atribuída a U2.
  2. Registrar resposta da API e estado do cartão.
  3. Consultar tarefas em andamento atribuídas a U2.
- **Dados de Teste Exatos:** tarefa de teste `CT-18-<datahora> Terceira em andamento`, `coluna:"afazer"`, `usuario_id=U2.id`, `projeto_id=ProjetoU1.id`, `idprioridade=2`; duas tarefas anteriores do U2 em `andamento`.
- **Resultado Esperado:** API retorna HTTP 400 com mensagem de limite 2; tarefa de teste permanece em `afazer`, sem `iniciadaEm`; continuam existindo exatamente duas tarefas em andamento de U2.
- **Status:** Bloqueado.

### CT-19 — Proteção de credencial e login válido
- **Requisito/Regra Vinculada:** RF01, RNF01.
- **Pré-condições:** usuário de teste novo; acesso controlado ao banco PostgreSQL de teste; senha de referência conhecida somente ao executor.
- **Passo a Passo Numerado:**
  1. Cadastrar usuário com os dados abaixo.
  2. Verificar que resposta HTTP e listagem de usuário não expõem senha nem hash.
  3. Consultar somente `senha_hash` no banco e compará-lo à senha de referência.
  4. Fazer login com a senha correta e verificar resposta/token.
- **Dados de Teste Exatos:** nome `Ana CT19`; e-mail `ct19-<datahora>@example.test`; senha `SenhaSegura-CT19`.
- **Resultado Esperado:** cadastro retorna 201 sem campos `senha` e `senha_hash`; banco contém hash não igual à senha, com formato não reversível esperado pelo mecanismo configurado; login correto retorna HTTP 200, token não vazio e usuário sem qualquer campo de credencial. Não registrar token/senha na evidência.
- **Status:** Bloqueado.

## 5. Registro de execução

| Caso | Resultado | Evidência (captura / DevTools) | Observações / defeito |
|---|---|---|---|
| CT-01 | Bloqueado | Não executado | Sessão autenticada não ficou disponível; sem POST, status ou corpo a registrar. |
| CT-02 | Bloqueado | Não executado | Sessão autenticada não ficou disponível; modal não foi aberto. |
| CT-03 | Bloqueado | Não executado | Sessão autenticada e fixture de tarefa não disponíveis. |
| CT-04 | Bloqueado | Não executado | Sessão autenticada e fixture exclusiva não disponíveis; nenhum dado foi excluído. |
| CT-05 | Bloqueado | Não executado | Sessão autenticada não ficou disponível; modal não foi aberto. |
| CT-06 | Bloqueado | Não executado | Sessão autenticada com dois projetos não ficou disponível. |
| CT-07 | Reprovado na execução inicial; Aprovado no reteste | Captura do login anexada à conversa. Payload redigido: `{"usuario":"[conta QA]","senha":"[REDACTED]"}`. Inicial: `POST http://localhost:3001/auth/login`, HTTP 401, corpo `{"erro":{"mensagem":"E-mail ou senha inválidos"}}`; rota permaneceu `/login`, sem navegação do frame. Reteste: mesma URL e status, corpo `{"erro":{"mensagem":"Credenciais inválidas"}}`; sem navegação do frame. | DEF-01, Baixa/Média, Fechado. Nenhuma senha/token foi persistida na evidência. |
| CT-08 | Aprovado | Captura anexada à conversa; navegação direta para `http://localhost:5173/dashboard` terminou em `http://localhost:5173/login`; Kanban não renderizado. | Redirecionamento SPA confirmado sem sessão. |

### 5.1 Registro de defeitos e ciclo de vida

| ID | Título observável | Severidade | Prioridade | Reprodução e evidência | Ciclo de vida / estado final |
|---|---|---|---|---|---|
| DEF-01 | A tela de login exibe mensagem diferente da mensagem de erro especificada | Baixa | Média | Abrir `/login`, informar o usuário QA e uma senha incorreta, clicar “Entrar”. Inicialmente: `POST http://localhost:3001/auth/login`, HTTP 401, resposta `{"erro":{"mensagem":"E-mail ou senha inválidos"}}`; a captura da mensagem está anexada à conversa. A rota permaneceu `/login`, sem reload. | Aberto → Em correção → Corrigido → Reteste → Fechado. Reteste UI/API passou com `{"erro":{"mensagem":"Credenciais inválidas"}}`; correção em `taskflow_api/src/controllers/authController.js`, teste de regressão em `taskflow_api/tests/auth.test.js`. |

CT-01–CT-06 permanecem **Bloqueados**, não reprovados: não houve sessão autenticada confirmada para executar operações sobre tarefas/projetos.
CT-09–CT-19 são casos suplementares definidos na suíte ampliada, mas não fazem parte da campanha CT-01–CT-08 nem do denominador desta execução.

**Regressão automatizada complementar:** `taskflow_api`: `npm test` — 11/11 testes aprovados após a correção de DEF-01; este resultado não substitui nem altera os estados dos CT-01–CT-08.

## 6. Relatório de Encerramento do Teste
1. O que foi testado: CT-07/CT-08 da suíte de autenticação e acesso ao Kanban; ambiente local (Vite `localhost:5173`, Express `localhost:3001`, Neon dedicado de teste), navegador Chromium 1.142.0.
2. Resultado: 2/8 casos únicos executados (3 execuções contando o reteste de CT-07), 2 aprovados após reteste (100% dos executados), 6 bloqueados; uma reprovação inicial corrigida.
3. Defeitos: DEF-01 — Baixa, prioridade Média, corrigido e fechado no reteste.
4. Critério de saída: Não Atingido — somente 2/8 casos executados (25%); 6 bloqueados. Nenhum defeito Crítico/Alto aberto; aprovação final de 100% entre os executados.
5. Recomendação: Não publicar com base nesta campanha; executar CT-01–CT-06 após disponibilizar sessão QA válida e reavaliar persistência CRUD antes da decisão de publicação.

## 7. Observações de aderência a confirmar

- O catálogo formal de RF/RN/RNF não foi localizado nos arquivos examinados; validar as descrições operacionais da seção 1.1 com a especificação UC11/UC15.
- O código consultado valida texto não vazio e formato de e-mail. Não foi encontrada regra `minLength` para senha/nome nem `maxLength` para descrição de projeto; portanto CT-15, CT-16 e CT-17 são verificações de conformidade que podem evidenciar lacunas.
- O código de tarefa prevê limite de duas tarefas em andamento por usuário e registra `iniciadaEm` no movimento inicial para andamento; CT-03 e CT-18 confirmam comportamento observado em ambiente integrado.
- CT-04 requer acesso somente leitura ao banco de teste para comprovar remoção física, além da confirmação pela API/UI.
