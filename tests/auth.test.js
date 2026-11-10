const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { Prisma } = require('@prisma/client');
const prisma = require('../src/database/prisma');
const app = require('../src/app');
const usuarioModel = require('../src/models/usuarios.models');
const projetoModel = require('../src/models/projeto.model');
const tarefaModel = require('../src/models/tarefas.models');
const prioridadesModel = require('../src/models/prioridades.models');

function stub(t, alvo, metodo, implementacao) {
  const original = alvo[metodo];
  alvo[metodo] = implementacao;
  t.after(() => {
    alvo[metodo] = original;
  });
}

function tokenPara(usuarioId) {
  return jwt.sign({ id: usuarioId }, process.env.JWT_SECRET);
}

test('rotas com dados de usuário exigem autenticação', async () => {
  for (const path of ['/tarefas', '/projetos', '/usuarios', '/prioridades', '/estatisticas']) {
    const resposta = await request(app).get(path);
    assert.equal(resposta.status, 401, path);
  }
});

test('documentação OpenAPI fica disponível sem autenticação', async () => {
  const resposta = await request(app).get('/docs/');
  assert.equal(resposta.status, 200);
  assert.match(resposta.text, /swagger-ui-init\.js/);
  assert.match(resposta.text, /cdn\.jsdelivr\.net\/npm\/swagger-ui-dist@5\.17\.14\/swagger-ui\.css/);
  assert.match(resposta.text, /cdn\.jsdelivr\.net\/npm\/swagger-ui-dist@5\.17\.14\/swagger-ui-bundle\.js/);
  assert.match(resposta.text, /cdn\.jsdelivr\.net\/npm\/swagger-ui-dist@5\.17\.14\/swagger-ui-standalone-preset\.js/);
});

test('params e filtros inválidos retornam 400 com detalhes textuais', async () => {
  const respostaId = await request(app).get('/tarefas/abc');
  assert.equal(respostaId.status, 400);
  assert.deepEqual(respostaId.body, {
    erro: {
      mensagem: 'Dados inválidos',
      detalhes: ['id deve ser um número inteiro positivo'],
    },
  });

  const respostaFiltro = await request(app).get('/tarefas?projetoId=abc');
  assert.equal(respostaFiltro.status, 400);
  assert.deepEqual(respostaFiltro.body, {
    erro: {
      mensagem: 'Dados inválidos',
      detalhes: ['projetoId deve ser um número inteiro positivo'],
    },
  });
});

test('rotas inexistentes retornam 404 com método e caminho', async () => {
  const resposta = await request(app).get('/rota-invalida');
  assert.equal(resposta.status, 404);
  assert.deepEqual(resposta.body, {
    erro: {
      mensagem: 'Rota GET /rota-invalida não encontrada',
    },
  });
});

test('cadastro e login usam Prisma, criam projeto padrão e nunca retornam hash', async t => {
  const usuarioCriado = {
    id: 27,
    nome: 'Usuário de teste',
    email: 'teste@example.invalid',
    criado_em: null,
    atualizado_em: null,
  };
  let hashSalvo;
  let projetoPadraoCriado = false;

  stub(t, prisma, '$transaction', callback => callback(prisma));
  stub(t, prisma.usuarios, 'create', async args => {
    hashSalvo = args.data.senha_hash;
    assert.match(hashSalvo, /^\$2[ab]\$12\$/);
    return usuarioCriado;
  });
  stub(t, prisma.projetos, 'create', async args => {
    assert.equal(args.data.nome, 'Projeto Padrão');
    assert.deepEqual(args.data.usuarios, { connect: { id: 27 } });
    projetoPadraoCriado = true;
    return {};
  });
  stub(t, prisma.usuarios, 'findUnique', async () => ({
    ...usuarioCriado,
    senha_hash: hashSalvo,
  }));

  const cadastro = await request(app)
    .post('/usuarios')
    .send({
      nome: usuarioCriado.nome,
      email: usuarioCriado.email,
      senha: 'senha-de-teste',
    });

  assert.equal(cadastro.status, 201);
  assert.equal(projetoPadraoCriado, true);
  assert.equal(Object.hasOwn(cadastro.body, 'senha_hash'), false);

  const login = await request(app)
    .post('/auth/login')
    .send({ email: usuarioCriado.email, senha: 'senha-de-teste' });
  assert.equal(login.status, 200);
  assert.ok(login.body.token);
  assert.deepEqual(login.body.usuario, {
    id: 27,
    nome: usuarioCriado.nome,
    email: usuarioCriado.email,
  });
});

test('hashes scrypt existentes autenticam e migram para bcrypt', async t => {
  const usuario = {
    id: 28,
    nome: 'Usuário legado',
    email: 'legado@example.invalid',
  };
  const salt = 'salt-legado';
  const hashLegado = await new Promise((resolve, reject) => {
    crypto.scrypt('senha-legada', salt, 64, (erro, resultado) => {
      if (erro) reject(erro);
      else resolve(resultado.toString('hex'));
    });
  });
  let senhaHash = `scrypt$${salt}$${hashLegado}`;

  stub(t, prisma.usuarios, 'findUnique', async () => ({
    ...usuario,
    senha_hash: senhaHash,
  }));
  stub(t, prisma.usuarios, 'update', async args => {
    senhaHash = args.data.senha_hash;
    return {};
  });

  assert.deepEqual(
    await usuarioModel.autenticarUsuario(usuario.email, 'senha-legada'),
    usuario
  );
  assert.match(senhaHash, /^\$2[ab]\$12\$/);
});

test('login com credenciais inválidas retorna a mensagem documentada', async t => {
  stub(t, usuarioModel, 'autenticarUsuario', async () => null);

  const resposta = await request(app)
    .post('/auth/login')
    .send({ email: 'qa@example.invalid', senha: 'senha-incorreta' });

  assert.equal(resposta.status, 401);
  assert.deepEqual(resposta.body, {
    erro: { mensagem: 'Credenciais inválidas' },
  });
});

test('projetos mantêm o escopo do usuário e os nomes de data da API', async t => {
  const criado = {
    id: 8,
    nome: 'Projeto novo',
    descricao: 'Descrição',
    usuario_id: 27,
    criado_em: null,
    atualizado_em: null,
  };

  stub(t, prisma.projetos, 'create', async args => {
    assert.deepEqual(args.data, {
      nome: 'Projeto novo',
      descricao: 'Descrição',
      usuarios: { connect: { id: 27 } },
    });
    return criado;
  });

  const resposta = await request(app)
    .post('/projetos')
    .set('Authorization', `Bearer ${tokenPara(27)}`)
    .send({ nome: 'Projeto novo', descricao: 'Descrição' });

  assert.equal(resposta.status, 201);
  assert.deepEqual(resposta.body, {
    id: 8,
    nome: 'Projeto novo',
    descricao: 'Descrição',
    usuario_id: 27,
    criadoEm: null,
    atualizadoEm: null,
  });

  let filtro;
  stub(t, prisma.projetos, 'findFirst', async args => {
    filtro = args.where;
    return criado;
  });
  await projetoModel.buscarProjetoPorId('8', 27);
  assert.deepEqual(filtro, { id: 8, usuario_id: 27 });
});

test('erros conhecidos do Prisma retornam conflitos e ids inválidos sem status 500', async t => {
  stub(t, prisma, '$transaction', callback => callback(prisma));
  stub(t, prisma.usuarios, 'create', async () => {
    throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target: ['email'] },
    });
  });

  const emailDuplicado = await request(app)
    .post('/usuarios')
    .send({ nome: 'Usuário', email: 'duplicado@example.invalid', senha: 'senha' });
  assert.equal(emailDuplicado.status, 409);
  assert.equal(emailDuplicado.body.erro.mensagem, 'Já existe um registro com esse valor');
  assert.deepEqual(emailDuplicado.body.erro.detalhes, ['Valor repetido em: email']);

  stub(t, prisma.projetos, 'create', async () => {
    throw new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
      code: 'P2003',
      clientVersion: '6.19.3',
      meta: { field_name: 'usuario_id' },
    });
  });

  const idInexistente = await request(app)
    .post('/projetos')
    .set('Authorization', `Bearer ${tokenPara(999)}`)
    .send({ nome: 'Projeto sem usuário' });
  assert.equal(idInexistente.status, 400);
  assert.equal(idInexistente.body.erro.mensagem, 'Um dos ids informados não existe');
});

test('tarefas formatam relações e incluem nomes de usuário, projeto e prioridade', async t => {
  const registro = {
    id: 3,
    texto: 'Tarefa',
    coluna: 'doing',
    ordem: 1,
    projeto_id: 8,
    usuario_id: 27,
    idprioridade: 2,
    criado_por_id: 27,
    criado_em: null,
    atualizado_em: null,
    iniciada_em: null,
    concluido_em: null,
    projetos: { nome: 'Projeto' },
    usuarios: { nome: 'Usuário' },
    prioridades: { descricao: 'Alta', cor: '#e74c3c' },
  };
  let consulta;
  let filtroContagem;

  stub(t, prisma.tarefas, 'findMany', async args => {
    consulta = args;
    return [registro];
  });
  stub(t, prisma.tarefas, 'findFirst', async args => {
    consulta = args;
    return registro;
  });
  stub(t, prisma.tarefas, 'count', async args => {
    filtroContagem = args.where;
    return 2;
  });
  stub(t, prisma.tarefas, 'delete', async args => {
    assert.deepEqual(args.where, { id: 3 });
    return registro;
  });

  const tarefas = await tarefaModel.listarTarefas(27);
  assert.deepEqual(consulta.include, {
    projetos: { select: { nome: true } },
    usuarios: { select: { nome: true } },
    prioridades: { select: { descricao: true, cor: true } },
  });
  assert.equal(tarefas[0].coluna, 'andamento');
  assert.equal(tarefas[0].projeto, 'Projeto');
  assert.equal(tarefas[0].usuario, 'Usuário');
  assert.equal(tarefas[0].prioridade, 'Alta');
  assert.equal(tarefas[0].prioridade_cor, '#e74c3c');
  assert.equal(tarefas[0].projetoId, 8);
  assert.equal(tarefas[0].criadoPorId, 27);
  assert.equal(Object.hasOwn(tarefas[0], 'senha_hash'), false);

  const tarefa = await tarefaModel.buscarTarefaPorId('3', 27);
  assert.deepEqual(consulta.where, {
    id: 3,
    OR: [{ criado_por_id: 27 }, { usuario_id: 27 }],
  });
  assert.equal(tarefa.projeto, 'Projeto');
  assert.equal(await tarefaModel.contarTarefasEmAndamento(27, 3), 2);
  assert.deepEqual(filtroContagem, {
    usuario_id: 27,
    coluna: 'doing',
    id: { not: 3 },
  });
  assert.equal(await tarefaModel.deletarTarefa(3, 27), true);
});

test('cria tarefas dentro de transação e aplica o limite de andamento', async t => {
  const tarefaCriada = {
    id: 4,
    texto: 'Nova tarefa',
    coluna: 'doing',
    ordem: 0,
    projeto_id: 8,
    usuario_id: 29,
    idprioridade: 2,
    criado_por_id: 27,
    criado_em: null,
    atualizado_em: null,
    iniciada_em: new Date('2026-10-23T12:00:00.000Z'),
    concluido_em: null,
    projetos: { nome: 'Projeto' },
    usuarios: { nome: 'Responsável' },
  };
  let dadosCriacao;
  let consultasContagem = 0;
  let totalEmAndamento = 1;

  stub(t, prisma, '$transaction', callback => callback(prisma));
  stub(t, prisma, '$queryRaw', async () => []);
  stub(t, prisma.projetos, 'findFirst', async ({ where }) => ({
    id: where.id,
  }));
  stub(t, prisma.usuarios, 'findUnique', async ({ where }) => ({
    id: where.id,
  }));
  stub(t, prisma.prioridades, 'findUnique', async ({ where }) => ({
    id: where.id,
  }));
  stub(t, prisma.tarefas, 'count', async () => {
    consultasContagem += 1;
    return totalEmAndamento;
  });
  stub(t, prisma.tarefas, 'create', async args => {
    dadosCriacao = args.data;
    return tarefaCriada;
  });

  const tarefa = await tarefaModel.adicionarTarefa({
    texto: 'Nova tarefa',
    coluna: 'andamento',
    projetoId: 8,
    usuarioId: 29,
    idprioridade: 2,
  }, 27);

  assert.equal(consultasContagem, 1);
  assert.equal(dadosCriacao.coluna, 'doing');
  assert.deepEqual(dadosCriacao.projetos, { connect: { id: 8 } });
  assert.deepEqual(dadosCriacao.usuarios, { connect: { id: 29 } });
  assert.deepEqual(dadosCriacao.criadores, { connect: { id: 27 } });
  assert.deepEqual(dadosCriacao.prioridades, { connect: { id: 2 } });
  assert.equal(tarefa.coluna, 'andamento');
  assert.equal(tarefa.usuario, 'Responsável');

  totalEmAndamento = 2;
  await assert.rejects(
    tarefaModel.adicionarTarefa({
      texto: 'Outra tarefa',
      coluna: 'andamento',
      projetoId: 8,
      usuarioId: 29,
      idprioridade: 2,
    }, 27),
    error => error.code === 'TASK_IN_PROGRESS_LIMIT'
  );
});

test('prioridades ativas e usuários são consultados sem expor hashes', async t => {
  let chamadaPrioridades;
  let chamadaUsuarios;
  stub(t, prisma.prioridades, 'findMany', async args => {
    chamadaPrioridades = args;
    return [{ id: 1, descricao: 'Baixa', cor: '#3ddc97' }];
  });
  stub(t, prisma.usuarios, 'findMany', async args => {
    chamadaUsuarios = args;
    return [{
      id: 27,
      nome: 'Usuário',
      email: 'teste@example.invalid',
      criado_em: null,
      atualizado_em: null,
    }];
  });

  assert.deepEqual(await prioridadesModel.listarPrioridades(), [
    { id: 1, descricao: 'Baixa', cor: '#3ddc97' },
  ]);
  assert.deepEqual(chamadaPrioridades.where, { ativo: true });
  assert.deepEqual(chamadaPrioridades.select, { id: true, descricao: true, cor: true });

  const usuarios = await usuarioModel.listarUsuarios();
  assert.deepEqual(chamadaUsuarios.select, {
    id: true,
    nome: true,
    email: true,
    criado_em: true,
    atualizado_em: true,
  });
  assert.deepEqual(usuarios[0], {
    id: 27,
    nome: 'Usuário',
    email: 'teste@example.invalid',
    criadoEm: null,
    atualizadoEm: null,
  });
  assert.equal(Object.hasOwn(usuarios[0], 'senha_hash'), false);
});
