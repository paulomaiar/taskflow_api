const { jsonLista, respostaErro } = require('./comum');

const schemas = {
  Prioridade: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 2 },
      descricao: { type: 'string', nullable: true, example: 'Médio' },
      cor: { type: 'string', nullable: true, example: '#f1c40f' },
    },
  },
};

const paths = {
  '/prioridades': {
    get: {
      summary: 'Lista prioridades ativas',
      responses: {
        200: {
          description: 'Lista de prioridades.',
          content: jsonLista('Prioridade'),
        },
        401: respostaErro('Token ausente ou inválido.'),
      },
    },
  },
};

module.exports = { paths, schemas };
