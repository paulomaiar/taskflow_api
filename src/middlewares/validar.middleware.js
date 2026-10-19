const criarErro = require('../utils/criarErro');

function validar(schema, origem) {
  return function validarRequisicao(req, res, next) {
    const dados = req[origem || 'body'] || {};
    const erros = [];
    let dadosConvertidos = false;

    for (const [campo, regra] of Object.entries(schema)) {
      const valor = dados[campo];
      const ausente = valor === undefined || valor === null || valor === '';

      if (!regra.obrigatorio && ausente) {
        continue;
      }

      if (ausente) {
        erros.push({ campo, mensagem: 'é obrigatório' });
        continue;
      }

      if (regra.tipo === 'inteiro') {
        const converter = origem === 'params' || origem === 'query';
        const numero = converter && typeof valor === 'string' ? Number(valor) : valor;

        if (!Number.isInteger(numero) || numero <= 0) {
          erros.push({ campo, mensagem: 'deve ser um número inteiro positivo' });
          continue;
        }

        if (numero !== valor) {
          dados[campo] = numero;
          dadosConvertidos = true;
        }
      } else if (regra.tipo === 'texto') {
        if (typeof valor !== 'string' || !valor.trim()) {
          erros.push({ campo, mensagem: 'deve ser um texto não vazio' });
        }
      } else if (regra.tipo === 'email') {
        if (typeof valor !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) {
          erros.push({ campo, mensagem: 'deve ser um endereço de e-mail válido' });
        }
      }
    }

    if (erros.length > 0) {
      throw criarErro(400, 'Dados inválidos', erros);
    }

    if (origem === 'query' && dadosConvertidos) {
      Object.defineProperty(req, 'query', {
        configurable: true,
        enumerable: true,
        writable: true,
        value: dados,
      });
    }

    return next();
  };
}

module.exports = validar;
