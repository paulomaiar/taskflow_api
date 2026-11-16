const validar = require('../src/middlewares/validar');
const schemas = require('../src/middlewares/schemas');

function pegarErro(fn) {
  try {
    fn();
  } catch (erro) {
    return erro;
  }

  throw new Error('A função deveria ter lançado um erro');
}

function tarefaValida() {
  return {
    texto: 'Preparar testes',
    coluna: 'afazer',
    usuario_id: 7,
    projeto_id: 3,
    idprioridade: 2,
  };
}

describe('validar', () => {
  test('chama o next quando os dados estão certos', () => {
    // Preparar
    const req = { body: tarefaValida() };
    const next = jest.fn();

    // Executar
    validar(schemas.tarefa)(req, {}, next);

    // Verificar
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  test('sem body: 400 com um detalhe por campo obrigatório', () => {
    // Preparar
    const req = {};
    const next = jest.fn();

    // Executar
    const erro = pegarErro(() => validar(schemas.tarefa)(req, {}, next));

    // Verificar
    expect(erro.status).toBe(400);
    expect(erro.message).toBe('Dados inválidos');
    expect(erro.detalhes).toEqual([
      "O campo 'texto' é obrigatório",
      "O campo 'coluna' é obrigatório",
      "O campo 'usuario_id' é obrigatório",
      "O campo 'projeto_id' é obrigatório",
      "O campo 'idprioridade' é obrigatório",
    ]);
    expect(next).not.toHaveBeenCalled();
  });

  test('coluna fora da lista: diz os valores aceitos', () => {
    // Preparar
    const req = { body: { ...tarefaValida(), coluna: 'feito' } };
    const next = jest.fn();

    // Executar
    const erro = pegarErro(() => validar(schemas.tarefa)(req, {}, next));

    // Verificar
    expect(erro.detalhes).toEqual([
      "O campo 'coluna' deve ser um de: afazer, andamento, concluido",
    ]);
    expect(next).not.toHaveBeenCalled();
  });

  test('id da URL: aceita "7" e barra "abc"', () => {
    // Preparar
    const nextBom = jest.fn();
    const nextRuim = jest.fn();

    // Executar
    validar(schemas.id, 'params')({ params: { id: '7' } }, {}, nextBom);
    const erro = pegarErro(() =>
      validar(schemas.id, 'params')({ params: { id: 'abc' } }, {}, nextRuim)
    );

    // Verificar
    expect(nextBom).toHaveBeenCalledTimes(1);
    expect(erro.detalhes).toEqual(["O campo 'id' deve ser inteiro positivo"]);
    expect(nextRuim).not.toHaveBeenCalled();
  });

  test('campo opcional não enviado não gera erro', () => {
    // Preparar
    const req = { body: { nome: 'TaskFlow' } };
    const next = jest.fn();

    // Executar
    validar(schemas.projeto)(req, {}, next);

    // Verificar
    expect(next).toHaveBeenCalledTimes(1);
  });
});
