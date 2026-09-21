const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const request = require('supertest');

const app = require('../src/app');
const tarefasPath = require('node:path').join(__dirname, '../src/data/tarefas.json');
const tarefasOriginais = fs.readFileSync(tarefasPath, 'utf8');

test.after(() => {
  fs.writeFileSync(tarefasPath, tarefasOriginais);
});

test('POST /tarefas sem token retorna 401', async () => {
  const resposta = await request(app)
    .post('/tarefas')
    .send({ texto: 'Tarefa sem autenticação' });

  assert.equal(resposta.status, 401);
  assert.deepEqual(resposta.body, { erro: 'Token não informado' });
});

test('POST /auth/login retorna token e cria tarefa vinculada ao usuário autenticado', async () => {
  const login = await request(app)
    .post('/auth/login')
    .send({ usuario: 'paulo.admin@email.com', senha: '123456' });

  assert.equal(login.status, 200);
  assert.ok(login.body.token);
  assert.equal(login.body.usuario.id, 1);

  const tarefa = await request(app)
    .post('/tarefas')
    .set('Authorization', `Bearer ${login.body.token}`)
    .send({ texto: 'Tarefa autenticada' });

  assert.equal(tarefa.status, 201);
  assert.equal(tarefa.body.usuarioId, 1);
});

test('usuário não pode ter mais de duas tarefas em andamento', async () => {
  const login = await request(app)
    .post('/auth/login')
    .send({ usuario: 'user@email.com', senha: '123' });
  const token = login.body.token;

  const primeira = await request(app)
    .post('/tarefas')
    .set('Authorization', `Bearer ${token}`)
    .send({ texto: 'Em andamento 1', coluna: 'andamento' });
  const segunda = await request(app)
    .post('/tarefas')
    .set('Authorization', `Bearer ${token}`)
    .send({ texto: 'Em andamento 2', coluna: 'Em andamento' });
  const terceira = await request(app)
    .post('/tarefas')
    .set('Authorization', `Bearer ${token}`)
    .send({ texto: 'Em andamento 3', coluna: 'andamento' });

  assert.equal(primeira.status, 201);
  assert.equal(segunda.status, 201);
  assert.equal(terceira.status, 400);
  assert.equal(terceira.body.erro, 'Limite de 2 tarefas em andamento por usuário atingido');

  const aFazer = await request(app)
    .post('/tarefas')
    .set('Authorization', `Bearer ${token}`)
    .send({ texto: 'A fazer', coluna: 'afazer' });
  const mover = await request(app)
    .put(`/tarefas/${aFazer.body.id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ coluna: 'em andamento' });

  assert.equal(aFazer.status, 201);
  assert.equal(mover.status, 400);
  assert.equal(mover.body.erro, 'Limite de 2 tarefas em andamento por usuário atingido');
});
