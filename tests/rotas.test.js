const crypto = require('node:crypto');
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const prisma = require('../src/database/prisma');
const tarefaModel = require('../src/models/tarefas.models');

function criarToken(usuarioId) {
  return jwt.sign({ id: usuarioId }, process.env.JWT_SECRET);
}

async function comDadosDeTeste(executar) {
  const identificador = crypto.randomUUID();
  let usuario;

  try {
    usuario = await prisma.usuarios.create({
      data: {
        nome: 'Usuário de integração',
        email: `taskflow-it-${identificador}@example.invalid`,
        senha_hash: 'hash-de-senha-apenas-para-integracao',
      },
    });
    const projeto = await prisma.projetos.create({
      data: {
        nome: `Projeto de integração ${identificador}`,
        usuarios: { connect: { id: usuario.id } },
      },
    });

    return await executar({
      usuarioId: usuario.id,
      projetoId: projeto.id,
      token: criarToken(usuario.id),
    });
  } finally {
    if (usuario) {
      await prisma.usuarios.deleteMany({ where: { id: usuario.id } });
    }
  }
}

function criarBodyTarefa({ usuarioId, projetoId, texto }) {
  return {
    texto,
    coluna: 'afazer',
    usuario_id: usuarioId,
    projeto_id: projetoId,
    idprioridade: 2,
  };
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

  test('GET /nao-existe retorna 404', async () => {
    const resposta = await request(app).get('/nao-existe');

    expect(resposta.status).toBe(404);
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

  test('GET /tarefas com token assinado por segredo errado retorna 401', async () => {
    const token = jwt.sign({ id: 42 }, 'segredo-incorreto');
    const resposta = await request(app)
      .get('/tarefas')
      .set('Authorization', `Bearer ${token}`);

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
      .post('/tarefas')
      .set('Content-Type', 'text/plain')
      .send('texto=teste');

    expect(resposta.status).toBe(415);
    expect(resposta.body.erro.mensagem).toBe('Content-Type deve ser application/json');
  });

  test('POST /tarefas com dados inválidos retorna 400', async () => {
    const resposta = await request(app)
      .post('/tarefas')
      .set('Authorization', `Bearer ${criarToken(42)}`)
      .send({
        texto: '',
        coluna: 'afazer',
        usuario_id: 42,
        projeto_id: 1,
        idprioridade: 2,
      });

    expect(resposta.status).toBe(400);
  });

  test('POST /tarefas sem body retorna os cinco detalhes obrigatórios', async () => {
    const resposta = await request(app)
      .post('/tarefas')
      .set('Authorization', `Bearer ${criarToken(42)}`)
      .send({});

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.detalhes).toEqual([
      "O campo 'texto' é obrigatório",
      "O campo 'coluna' é obrigatório",
      "O campo 'usuario_id' é obrigatório",
      "O campo 'projeto_id' é obrigatório",
      "O campo 'idprioridade' é obrigatório",
    ]);
  });

  test("POST /tarefas com coluna 'feito' retorna 400", async () => {
    const resposta = await request(app)
      .post('/tarefas')
      .set('Authorization', `Bearer ${criarToken(42)}`)
      .send({
        texto: 'Tarefa inválida',
        coluna: 'feito',
        usuario_id: 42,
        projeto_id: 1,
        idprioridade: 2,
      });

    expect(resposta.status).toBe(400);
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

  test('GET /prioridades sem token retorna 401', async () => {
    const resposta = await request(app).get('/prioridades');

    expect(resposta.status).toBe(401);
  });

  test('GET /prioridades com token válido retorna uma lista do banco', async () => {
    await comDadosDeTeste(async ({ token }) => {
      const resposta = await request(app)
        .get('/prioridades')
        .set('Authorization', `Bearer ${token}`);

      expect(resposta.status).toBe(200);
      expect(Array.isArray(resposta.body)).toBe(true);
    });
  });

  test('POST /tarefas cria e DELETE /tarefas/:id remove a tarefa no finally', async () => {
    await comDadosDeTeste(async fixture => {
      let tarefaId;

      try {
        const resposta = await request(app)
          .post('/tarefas')
          .set('Authorization', `Bearer ${fixture.token}`)
          .send(criarBodyTarefa({
            ...fixture,
            texto: `Tarefa de integração ${crypto.randomUUID()}`,
          }));

        if (Number.isInteger(resposta.body.id)) {
          tarefaId = resposta.body.id;
        }

        expect(resposta.status).toBe(201);
        expect(resposta.body).toHaveProperty('id');
      } finally {
        if (tarefaId !== undefined) {
          const remocao = await request(app)
            .delete(`/tarefas/${tarefaId}`)
            .set('Authorization', `Bearer ${fixture.token}`);

          expect(remocao.status).toBe(204);
        }
      }
    });
  });

  test('GET /tarefas/999999 retorna 404 para um ID conhecido como inexistente', async () => {
    await comDadosDeTeste(async ({ token }) => {
      const tarefaExistente = await prisma.tarefas.findUnique({
        where: { id: 999999 },
        select: { id: true },
      });
      expect(tarefaExistente).toBeNull();

      const resposta = await request(app)
        .get('/tarefas/999999')
        .set('Authorization', `Bearer ${token}`);

      expect(resposta.status).toBe(404);
      expect(resposta.body.erro.mensagem).toBe('Tarefa não encontrada');
    });
  });

  test('GET /tarefas autenticado retorna uma lista do banco', async () => {
    await comDadosDeTeste(async ({ token }) => {
      const resposta = await request(app)
        .get('/tarefas')
        .set('Authorization', `Bearer ${token}`);

      expect(resposta.status).toBe(200);
      expect(Array.isArray(resposta.body)).toBe(true);
    });
  });

  test('GET /tarefas/:id retorna uma tarefa criada no banco', async () => {
    await comDadosDeTeste(async fixture => {
      const criacao = await request(app)
        .post('/tarefas')
        .set('Authorization', `Bearer ${fixture.token}`)
        .send(criarBodyTarefa({
          ...fixture,
          texto: `Consulta de integração ${crypto.randomUUID()}`,
        }));

      expect(criacao.status).toBe(201);
      expect(criacao.body).toHaveProperty('id');

      const consulta = await request(app)
        .get(`/tarefas/${criacao.body.id}`)
        .set('Authorization', `Bearer ${fixture.token}`);

      expect(consulta.status).toBe(200);
      expect(consulta.body.texto).toBe(criacao.body.texto);
    });
  });

  test('GET /projetos autenticado retorna uma lista do banco', async () => {
    await comDadosDeTeste(async ({ token }) => {
      const resposta = await request(app)
        .get('/projetos')
        .set('Authorization', `Bearer ${token}`);

      expect(resposta.status).toBe(200);
      expect(Array.isArray(resposta.body)).toBe(true);
    });
  });

  test('ciclo de tarefa: cria, consulta, exclui e confirma que não existe', async () => {
    await comDadosDeTeste(async fixture => {
      let tarefaId;
      let exclusaoTentada = false;

      try {
        const criacao = await request(app)
          .post('/tarefas')
          .set('Authorization', `Bearer ${fixture.token}`)
          .send(criarBodyTarefa({
            ...fixture,
            texto: `Ciclo de integração ${crypto.randomUUID()}`,
          }));

        if (Number.isInteger(criacao.body.id)) {
          tarefaId = criacao.body.id;
        }

        expect(criacao.status).toBe(201);
        expect(tarefaId).toBeDefined();

        const consulta = await request(app)
          .get(`/tarefas/${tarefaId}`)
          .set('Authorization', `Bearer ${fixture.token}`);
        expect(consulta.status).toBe(200);
        expect(consulta.body.texto).toBe(criacao.body.texto);

        const remocao = await request(app)
          .delete(`/tarefas/${tarefaId}`)
          .set('Authorization', `Bearer ${fixture.token}`);
        exclusaoTentada = true;
        expect(remocao.status).toBe(204);

        // O ID recém-excluído comprova a persistência da remoção; 999999 só testa ausência prévia.
        const consultaAposExclusao = await request(app)
          .get(`/tarefas/${tarefaId}`)
          .set('Authorization', `Bearer ${fixture.token}`);
        expect(consultaAposExclusao.status).toBe(404);
      } finally {
        if (tarefaId !== undefined && !exclusaoTentada) {
          await request(app)
            .delete(`/tarefas/${tarefaId}`)
            .set('Authorization', `Bearer ${fixture.token}`);
        }
      }
    });
  });

  test('GET /rota/que/nao/existe autenticado retorna 404', async () => {
    const resposta = await request(app)
      .get('/rota/que/nao/existe')
      .set('Authorization', `Bearer ${criarToken(42)}`);

    expect(resposta.status).toBe(404);
  });

  test('POST /auth/login sem credenciais retorna 400', async () => {
    const resposta = await request(app)
      .post('/auth/login')
      .send({});

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.mensagem).toBe('E-mail e senha são obrigatórios');
  });
});
