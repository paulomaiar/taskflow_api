const { Prisma } = require('@prisma/client');
const tratarErros = require('../src/middlewares/erro.middleware');
const criarErro = require('../src/utils/criarErro');

function criarRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe('tratarErros', () => {
  let erroConsole;

  beforeEach(() => {
    erroConsole = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('erro do criarErro: responde com o status e a mensagem dele', () => {
    // Preparar
    const erro = criarErro(404, 'Tarefa não encontrada');
    const req = { method: 'GET', url: '/tarefas/99' };
    const res = criarRes();
    const next = jest.fn();

    // Executar
    tratarErros(erro, req, res, next);

    // Verificar
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      erro: {
        mensagem: 'Tarefa não encontrada',
        detalhes: undefined,
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('erro sem status vira 500 e não mostra a mensagem técnica', () => {
    // Preparar
    const erro = new Error('Cannot read properties of undefined');
    const req = { method: 'GET', url: '/tarefas' };
    const res = criarRes();
    const next = jest.fn();

    // Executar
    tratarErros(erro, req, res, next);

    // Verificar
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      erro: { mensagem: 'Erro interno no servidor' },
    });
    expect(erroConsole).toHaveBeenCalled();
  });

  test('erro do Prisma P2002 é traduzido para 409', () => {
    // Preparar
    const erro = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '6.0.0',
      meta: { target: ['email'] },
    });
    const req = { method: 'POST', url: '/usuarios' };
    const res = criarRes();
    const next = jest.fn();

    // Executar
    tratarErros(erro, req, res, next);

    // Verificar
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      erro: {
        mensagem: 'Já existe um registro com esse valor',
        detalhes: ['Valor repetido em: email'],
      },
    });
  });
});
