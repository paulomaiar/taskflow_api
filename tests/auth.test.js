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
  assert.match(chamadas[0].sql, /usuario_id = \$1/);
  assert.deepEqual(chamadas[1].valores, [3, 27]);
  assert.deepEqual(chamadas[2].valores, [27, 3]);
  assert.match(chamadas[2].sql, /coluna = 'doing'/);
  assert.deepEqual(chamadas[3].valores, [3, 27]);
  assert.match(chamadas[3].sql, /usuario_id = \$2/);
});
