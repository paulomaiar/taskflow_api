jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const tarefaModel = require('../src/models/tarefas.models');

function criarToken(usuarioId) {
  return jwt.sign({ id: usuarioId }, process.env.JWT_SECRET);
}

describe('rotas da API', () => {
  test('GET / retorna a mensagem de funcionamento', async () => {
    const resposta = await request(app).get('/');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({
      mensagem: 'TaskFlow API funcionando com MVC!',
    });
  });

  test('GET /docs/ disponibiliza a documentação sem autenticação', async () => {
    const resposta = await request(app).get('/docs/');

    expect(resposta.status).toBe(200);
    expect(resposta.text).toContain('swagger-ui-init.js');
  });

  test('rota inexistente retorna 404 com método e caminho', async () => {
    const resposta = await request(app).get('/rota-inexistente');

    expect(resposta.status).toBe(404);
    expect(resposta.body).toEqual({
      erro: { mensagem: 'Rota GET /rota-inexistente não encontrada' },
    });
  });

  test('GET /tarefas sem token retorna 401', async () => {
    const resposta = await request(app).get('/tarefas');

    expect(resposta.status).toBe(401);
    expect(resposta.body.erro.mensagem).toBe('Token não informado');
  });

  test('GET /tarefas com token inválido retorna 401', async () => {
    const resposta = await request(app)
      .get('/tarefas')
      .set('Authorization', 'Bearer token-invalido');

    expect(resposta.status).toBe(401);
    expect(resposta.body.erro.mensagem).toBe('Token inválido.');
  });

  test('GET /tarefas/:id rejeita ids inválidos antes de consultar o banco', async () => {
    const resposta = await request(app).get('/tarefas/abc');

    expect(resposta.status).toBe(400);
    expect(resposta.body).toEqual({
      erro: {
        mensagem: 'Dados inválidos',
        detalhes: ["O campo 'id' deve ser inteiro positivo"],
      },
    });
  });

  test('GET /tarefas rejeita filtros inválidos antes de consultar o banco', async () => {
    const resposta = await request(app).get('/tarefas?projetoId=abc');

    expect(resposta.status).toBe(400);
    expect(resposta.body).toEqual({
      erro: {
        mensagem: 'Dados inválidos',
        detalhes: ["O campo 'projetoId' deve ser inteiro positivo"],
      },
    });
  });

  test('POST rejeita Content-Type diferente de application/json', async () => {
    const resposta = await request(app)
      .post('/auth/login')
      .set('Content-Type', 'text/plain')
      .send('email=qa@example.invalid');

    expect(resposta.status).toBe(415);
    expect(resposta.body.erro.mensagem).toBe('Content-Type deve ser application/json');
  });

  test('PUT rejeita Content-Type diferente de application/json', async () => {
    const resposta = await request(app)
      .put('/tarefas/1')
      .set('Content-Type', 'text/plain')
      .send('texto atualizado');

    expect(resposta.status).toBe(415);
    expect(resposta.body.erro.mensagem).toBe('Content-Type deve ser application/json');
  });

  test('GET /tarefas autenticado retorna as tarefas do usuário', async () => {
    const listarTarefasOriginal = tarefaModel.listarTarefas;
    const tarefas = [{ id: 1, texto: 'Conferir rota', coluna: 'afazer' }];
    tarefaModel.listarTarefas = jest.fn().mockResolvedValue(tarefas);

    try {
      const resposta = await request(app)
        .get('/tarefas')
        .set('Authorization', `Bearer ${criarToken(42)}`);

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual(tarefas);
      expect(tarefaModel.listarTarefas).toHaveBeenCalledWith(42);
    } finally {
      tarefaModel.listarTarefas = listarTarefasOriginal;
    }
  });

  test('POST /auth/login sem credenciais retorna 400', async () => {
    const resposta = await request(app)
      .post('/auth/login')
      .send({});

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.mensagem).toBe('E-mail e senha são obrigatórios');
  });
});
