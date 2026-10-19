const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const pool = require('../src/database/db');
const app = require('../src/app');
const usuarioModel = require('../src/models/usuarios.models');
const projetoModel = require('../src/models/projeto.model');
const tarefaModel = require('../src/models/tarefas.models');

test('rotas com dados de usuário exigem autenticação', async () => {
  for (const path of ['/tarefas', '/projetos', '/estatisticas']) {
    const resposta = await request(app).get(path);
    assert.equal(resposta.status, 401, path);
  }
});

test('params e filtros inválidos retornam 400 com detalhes estruturados', async () => {
  const respostaId = await request(app).get('/tarefas/abc');
  assert.equal(respostaId.status, 400);
  assert.deepEqual(respostaId.body, {
    erro: {
      mensagem: 'Dados inválidos',
      detalhes: [{ campo: 'id', mensagem: 'deve ser um número inteiro positivo' }],
    },
  });

  const respostaFiltro = await request(app).get('/tarefas?projetoId=abc');
  assert.equal(respostaFiltro.status, 400);
  assert.deepEqual(respostaFiltro.body, {
    erro: {
      mensagem: 'Dados inválidos',
      detalhes: [{
        campo: 'projetoId',
        mensagem: 'deve ser um número inteiro positivo',
      }],
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

test('cadastro e login persistem usuários no PostgreSQL com senha protegida', async t => {
  const queryOriginal = pool.query;
  let usuarioCriado;
  let hashAtualizado;

  t.after(() => {
    pool.query = queryOriginal;
  });

  pool.query = async (sql, valores = []) => {
    if (sql.includes('INSERT INTO usuarios')) {
      usuarioCriado = {
        id: 27,
        nome: valores[0],
        email: valores[1],
        criadoEm: null,
        atualizadoEm: null,
      };
      assert.notEqual(valores[2], 'senha-de-teste');
      assert.match(valores[2], /^scrypt\$/);
      return { rows: [usuarioCriado], rowCount: 1 };
    }

    if (sql.includes('SELECT id, nome, email, senha_hash')) {
      return {
        rows: [{
          ...usuarioCriado,
          senha_hash: hashAtualizado || 'senha-de-teste',
        }],
        rowCount: 1,
      };
    }

    if (sql.includes('UPDATE usuarios SET senha_hash')) {
      hashAtualizado = valores[0];
      assert.match(hashAtualizado, /^scrypt\$/);
      return { rows: [], rowCount: 1 };
    }

    throw new Error(`Consulta inesperada no teste: ${sql}`);
  };

  const criado = await usuarioModel.adicionarUsuario({
    nome: 'Usuário de teste',
    email: 'teste@example.invalid',
    senha: 'senha-de-teste',
  });
  assert.equal(criado.id, 27);
  assert.equal(Object.hasOwn(criado, 'senha_hash'), false);

  const login = await request(app)
    .post('/auth/login')
    .send({ email: 'teste@example.invalid', senha: 'senha-de-teste' });
  assert.equal(login.status, 200);
  assert.ok(login.body.token);
  assert.deepEqual(login.body.usuario, {
    id: 27,
    nome: 'Usuário de teste',
    email: 'teste@example.invalid',
  });
  assert.match(hashAtualizado, /^scrypt\$/);
});

test('projetos consultam e alteram somente registros do usuário autenticado', async t => {
  const queryOriginal = pool.query;
  const chamadas = [];
  t.after(() => {
    pool.query = queryOriginal;
  });

  pool.query = async (sql, valores = []) => {
    chamadas.push({ sql, valores });
    return { rows: [{ id: 8, nome: 'Projeto', descricao: null }], rowCount: 1 };
  };

  await projetoModel.listarProjetos(27);
  await projetoModel.buscarProjetoPorId(8, 27);
  await projetoModel.adicionarProjeto({ nome: 'Projeto' }, 27);
  await projetoModel.atualizarProjeto(8, { nome: 'Novo nome' }, 27);
  await projetoModel.deletarProjeto(8, 27);

  assert.equal(chamadas.length, 5);
  assert.deepEqual(chamadas[0].valores, [27]);
  assert.match(chamadas[0].sql, /WHERE usuario_id = \$1/);
  assert.deepEqual(chamadas[1].valores, [8, 27]);
  assert.match(chamadas[1].sql, /id = \$1 AND usuario_id = \$2/);
  assert.deepEqual(chamadas[2].valores, ['Projeto', null, 27]);
  assert.deepEqual(chamadas[3].valores, ['Novo nome', 8, 27]);
  assert.deepEqual(chamadas[4].valores, [8, 27]);
});

test('tarefas filtram pelo dono e usam os nomes de coluna do Neon', async t => {
  const queryOriginal = pool.query;
  const chamadas = [];
  t.after(() => {
    pool.query = queryOriginal;
  });

  pool.query = async (sql, valores = []) => {
    chamadas.push({ sql, valores });
    if (sql.includes('COUNT(*)')) return { rows: [{ total: '2' }], rowCount: 1 };
    if (sql.startsWith('DELETE')) return { rows: [{ id: 3 }], rowCount: 1 };
    return {
      rows: [{
        id: 3,
        texto: 'Tarefa',
        coluna: 'andamento',
        ordem: 1,
        projetoId: 8,
        usuarioId: 27,
      }],
      rowCount: 1,
    };
  };

  await tarefaModel.listarTarefas(27);
  await tarefaModel.buscarTarefaPorId(3, 27);
  await tarefaModel.contarTarefasEmAndamento(27, 3);
  assert.equal(await tarefaModel.deletarTarefa(3, 27), true);

  assert.deepEqual(chamadas[0].valores, [27]);
  assert.match(chamadas[0].sql, /projeto_id AS "projetoId"/);
  assert.match(chamadas[0].sql, /FROM buscar_tarefas_usuario\(\$1\)/);
  assert.deepEqual(chamadas[1].valores, [3, 27]);
  assert.deepEqual(chamadas[2].valores, [27, 3]);
  assert.match(chamadas[2].sql, /coluna = 'doing'/);
  assert.deepEqual(chamadas[3].valores, [3, 27]);
  assert.match(chamadas[3].sql, /usuario_id = \$2/);
});

test('tarefas chamam funções e procedure com parâmetros e ownership verificado', async t => {
  const connectOriginal = pool.connect;
  const chamadas = [];
  t.after(() => {
    pool.connect = connectOriginal;
  });

  pool.connect = async () => ({
    query: async (sql, valores = []) => {
      chamadas.push({ sql, valores });
      if (sql.includes('SELECT id FROM tarefas')) {
        return { rows: [{ id: 3 }], rowCount: 1 };
      }
      if (sql.includes('SELECT id FROM projetos')) {
        return { rows: [{ id: 8 }], rowCount: 1 };
      }
      if (sql.includes('FROM avancar_tarefa')) {
        return {
          rows: [{ id: 3, coluna: 'andamento', projetoId: 8, usuarioId: 27 }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    },
    release() {},
  });

  const avancada = await tarefaModel.avancarTarefa(3, 27);
  assert.equal(avancada.coluna, 'andamento');
  assert.deepEqual(chamadas[1].valores, [3, 27]);
  assert.deepEqual(chamadas[2].valores, [3]);
  assert.match(chamadas[2].sql, /FROM avancar_tarefa\(\$1\)/);

  assert.equal(await tarefaModel.limparTarefasConcluidas(8, 27), true);
  assert.deepEqual(chamadas[5].valores, [8, 27]);
  assert.deepEqual(chamadas[6].valores, [8]);
  assert.match(chamadas[6].sql, /CALL limpar_tarefas_concluidas\(\$1\)/);
});

test('atualizar tarefa grava timestamps de início e conclusão com ownership', async t => {
  const connectOriginal = pool.connect;
  const updates = [];
  let tarefaAtual;

  t.after(() => {
    pool.connect = connectOriginal;
  });

  pool.connect = async () => ({
    query: async (sql, valores = []) => {
      if (sql.includes('COUNT(*) AS total')) {
        return { rows: [{ total: '0' }], rowCount: 1 };
      }
      if (sql.includes('FROM usuarios')) {
        return { rows: [{ id: 27 }], rowCount: 1 };
      }
      if (sql.includes('iniciada_em AS "iniciadaEm"')) {
        return { rows: [tarefaAtual], rowCount: 1 };
      }
      if (sql.startsWith('UPDATE tarefas')) {
        updates.push({ sql, valores });
        return { rows: [{ id: 3 }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    release() {},
  });

  tarefaAtual = {
    id: 3,
    texto: 'Tarefa',
    coluna: 'afazer',
    ordem: 1,
    projetoId: 8,
    usuarioId: 27,
    iniciadaEm: null,
  };
  await tarefaModel.atualizarTarefa(3, { coluna: 'andamento' }, 27);

  assert.deepEqual(updates[0].valores.slice(0, 1), ['doing']);
  assert.equal(updates[0].valores[1], null);
  assert.ok(updates[0].valores[2] instanceof Date);
  assert.deepEqual(updates[0].valores.slice(3), [3, 27]);
  assert.match(updates[0].sql, /concluido_em = \$2, iniciada_em = \$3/);
  assert.match(updates[0].sql, /WHERE id = \$4 AND usuario_id = \$5/);

  const iniciadaEm = new Date('2026-01-01T12:00:00.000Z');
  tarefaAtual = { ...tarefaAtual, coluna: 'andamento', iniciadaEm };
  await tarefaModel.atualizarTarefa(3, { coluna: 'concluido' }, 27);

  assert.deepEqual(updates[1].valores.slice(0, 1), ['done']);
  assert.ok(updates[1].valores[1] instanceof Date);
  assert.equal(updates[1].valores[2], iniciadaEm);
  assert.deepEqual(updates[1].valores.slice(3), [3, 27]);
});
