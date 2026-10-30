const { respostaErro } = require('./comum');

const schemas = {
  Prioridade: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 2 },
      descricao: { type: 'string', nullable: true, example: 'Média' },
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
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { $ref: '#/components/schemas/Prioridade' },
              },
            },
          },
        },
        401: respostaErro('Token ausente ou inválido.'),
      },
    },
  },
};

module.exports = { paths, schemas };
