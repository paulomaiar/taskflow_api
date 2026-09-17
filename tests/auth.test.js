const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/app');

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
