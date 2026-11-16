const criarErro = require('../src/utils/criarErro');
const traduzirErroPrisma = require('../src/utils/traduzirErroPrisma');

describe('exercício de criação e tradução de erros', () => {
  test('criarErro cria um erro interno sem detalhes', () => {
    // Preparar
    const status = 500;
    const mensagem = 'Erro interno no servidor';

    // Executar
    const erro = criarErro(status, mensagem);

    // Verificar
    expect(erro.status).toBe(500);
    expect(erro.detalhes).toBeUndefined();
  });

  test('P2003 ao atualizar (PUT) vira 400 com a mensagem esperada', () => {
    // Preparar
    const erroPrisma = { code: 'P2003' };

    // Executar
    const erro = traduzirErroPrisma(erroPrisma, 'PUT');

    // Verificar
    expect(erro.status).toBe(400);
    expect(erro.message).toBe('Um dos ids informados não existe');
  });

  test('P2025 retorna a mensagem de registro não encontrado', () => {
    // Preparar
    const erroPrisma = { code: 'P2025' };

    // Executar
    const erro = traduzirErroPrisma(erroPrisma, 'PUT');

    // Verificar
    expect(erro.message).toBe('Registro não encontrado');
  });

  test('P2003 ao excluir retorna a mensagem esperada', () => {
    // Preparar
    const erroPrisma = { code: 'P2003' };

    // Executar
    const erro = traduzirErroPrisma(erroPrisma, 'DELETE');

    // Verificar
    expect(erro.message).toBe('Não é possível excluir: existem registros ligados a este');
  });
});
