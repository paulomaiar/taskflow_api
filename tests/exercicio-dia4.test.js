const { Prisma } = require('@prisma/client');
const validar = require('../src/middlewares/validar');
const schemas = require('../src/middlewares/schemas');
const tratarErros = require('../src/middlewares/erro.middleware');
const criarErro = require('../src/utils/criarErro');

function pegarErro(fn) {
  try {
    fn();
  } catch (erro) {
    return erro;
  }

  throw new Error('A função deveria ter lançado um erro');
}

function criarRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe('exercício Dia 4 — middlewares com simuladores', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('e-mail inválido retorna 400 sem chamar next', () => {
    // Preparar
    const req = {
      body: { nome: 'Ana', email: 'ana@', senha: 'senha-segura' },
    };
    const next = jest.fn();

    // Executar
    const erro = pegarErro(() => validar(schemas.usuario)(req, {}, next));

    // Verificar
    expect(erro.status).toBe(400);
    expect(erro.detalhes).toHaveLength(1);
    expect(erro.detalhes[0]).toContain("O campo 'email'");
    expect(next).not.toHaveBeenCalled();
  });

  test('nome e senha abaixo do mínimo geram dois detalhes na ordem do schema', () => {
    // Preparar
    const req = {
      body: { nome: 'Al', email: 'ana@example.com', senha: '123' },
    };
    const next = jest.fn();

    // Executar
    const erro = pegarErro(() => validar(schemas.usuario)(req, {}, next));

    // Verificar
    expect(erro.detalhes).toEqual([
      "O campo 'nome' deve ter pelo menos 3 caracteres",
      "O campo 'senha' deve ter pelo menos 6 caracteres",
    ]);
    expect(next).not.toHaveBeenCalled();
  });

  test('descrição acima do máximo gera detalhe de tamanho', () => {
    // Preparar
    const req = { body: { nome: 'TaskFlow', descricao: 'a'.repeat(201) } };
    const next = jest.fn();

    // Executar
    const erro = pegarErro(() => validar(schemas.projeto)(req, {}, next));

    // Verificar
    expect(erro.detalhes).toEqual([
      "O campo 'descricao' deve ter no máximo 200 caracteres",
    ]);
    expect(next).not.toHaveBeenCalled();
  });

  test('tratarErros responde com os detalhes do criarErro', () => {
    // Preparar
    const erro = criarErro(400, 'Dados inválidos', ['Detalhe exemplo']);
    const req = { method: 'POST', url: '/tarefas' };
    const res = criarRes();
    const next = jest.fn();

    // Executar
    tratarErros(erro, req, res, next);

    // Verificar
    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      erro: {
        mensagem: 'Dados inválidos',
        detalhes: ['Detalhe exemplo'],
      },
    });
  });

  test('erro do Prisma P2025 responde 404 com registro não encontrado', () => {
    // Preparar
    const erro = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: '6.0.0',
    });
    const req = { method: 'PUT', url: '/tarefas/99' };
    const res = criarRes();
    const next = jest.fn();

    // Executar
    tratarErros(erro, req, res, next);

    // Verificar
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      erro: {
        mensagem: 'Registro não encontrado',
        detalhes: undefined,
      },
    });
    expect(next).not.toHaveBeenCalled();
  });
});
