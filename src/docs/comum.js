const Erro = {
  type: 'object',
  properties: {
    erro: {
      type: 'object',
      properties: {
        mensagem: { type: 'string' },
        detalhes: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  },
};

function json(nome) {
  return {
    'application/json': {
      schema: { $ref: `#/components/schemas/${nome}` },
    },
  };
}

const parametroId = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'integer', example: 1 },
};

const respostaErro = descricao => ({
  description: descricao,
  content: json('Erro'),
});

module.exports = { Erro, json, parametroId, respostaErro };
