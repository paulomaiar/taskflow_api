const traduzirErroPrisma = require('../src/utils/traduzirErroPrisma');

describe('traduzirErroPrisma', () => {
  test('P2025 (registro não encontrado) vira 404', () => {
    // Preparar
    const erroPrisma = { code: 'P2025' };

    // Executar
    const erro = traduzirErroPrisma(erroPrisma, 'PUT');

    // Verificar
    expect(erro.status).toBe(404);
  });

  test('P2002 (valor repetido) vira 409 e diz o campo', () => {
    // Preparar
    const erroPrisma = { code: 'P2002', meta: { target: ['email'] } };

    // Executar
    const erro = traduzirErroPrisma(erroPrisma, 'POST');

    // Verificar
    expect(erro.status).toBe(409);
    expect(erro.message).toBe('Já existe um registro com esse valor');
    expect(erro.detalhes[0]).toBe('Valor repetido em: email');
  });

  test('P2003 ao gravar (POST) vira 400', () => {
    // Preparar
    const erroPrisma = { code: 'P2003' };

    // Executar
    const erro = traduzirErroPrisma(erroPrisma, 'POST');

    // Verificar
    expect(erro.status).toBe(400);
  });

  test('P2003 ao excluir (DELETE) vira 409', () => {
    // Preparar
    const erroPrisma = { code: 'P2003' };

    // Executar
    const erro = traduzirErroPrisma(erroPrisma, 'DELETE');

    // Verificar
    expect(erro.status).toBe(409);
  });

  test('código não tratado fica sem status (o tratarErros responde 500)', () => {
    // Preparar
    const erroPrisma = { code: 'P1001', message: 'banco fora do ar' };

    // Executar
    const erro = traduzirErroPrisma(erroPrisma, 'GET');

    // Verificar
    expect(erro.status).toBeUndefined();
  });
});
