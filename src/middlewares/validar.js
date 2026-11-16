const criarErro = require('../utils/criarErro');

function validar(schema, origem = 'body') {
  return function validarRequisicao(req, res, next) {
    const dados = req[origem] || {};
    const erros = [];
    let dadosConvertidos = false;

    for (const [campo, regra] of Object.entries(schema)) {
      const valor = dados[campo];
      const ausente = valor === undefined || valor === null || valor === '';
      const preenchidoPorAlias = regra.aliases && regra.aliases.some(alias => {
        const valorAlias = dados[alias];
        return valorAlias !== undefined && valorAlias !== null && valorAlias !== '';
      });

      if ((!regra.obrigatorio || preenchidoPorAlias) && ausente) continue;

      if (ausente) {
        erros.push(`O campo '${campo}' é obrigatório`);
        continue;
      }

      if (regra.tipo === 'inteiro') {
        const converter = origem === 'params' || origem === 'query';
        const numero = converter && typeof valor === 'string' ? Number(valor) : valor;

        if (!Number.isInteger(numero) || numero <= 0) {
          erros.push(`O campo '${campo}' deve ser inteiro positivo`);
          continue;
        }

        if (numero !== valor) {
          dados[campo] = numero;
          dadosConvertidos = true;
        }
      } else if (regra.tipo === 'texto') {
        if (typeof valor !== 'string' || !valor.trim()) {
          erros.push(`O campo '${campo}' deve ser um texto não vazio`);
          continue;
        }

        if (regra.minimo !== undefined && valor.length < regra.minimo) {
          erros.push(`O campo '${campo}' deve ter pelo menos ${regra.minimo} caracteres`);
        } else if (regra.maximo !== undefined && valor.length > regra.maximo) {
          erros.push(`O campo '${campo}' deve ter no máximo ${regra.maximo} caracteres`);
        }

        if (regra.valores && !regra.valores.includes(valor)) {
          erros.push(`O campo '${campo}' deve ser um de: ${regra.valores.join(', ')}`);
        }
      } else if (regra.tipo === 'email') {
        if (typeof valor !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) {
          erros.push(`O campo '${campo}' deve ser um endereço de e-mail válido`);
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
