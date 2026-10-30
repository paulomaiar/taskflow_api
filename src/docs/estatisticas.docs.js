const { respostaErro } = require('./comum');

const schemas = {
  Estatisticas: {
    type: 'object',
    properties: {
      totalGeral: { type: 'integer', example: 8 },
      porColuna: {
        type: 'object',
        properties: {
          afazer: { type: 'integer' },
          andamento: { type: 'integer' },
          concluido: { type: 'integer' },
        },
      },
      colunaComMaisTarefas: { type: 'string', example: 'afazer' },
    },
  },
  ResumoEstatisticas: {
    type: 'object',
    properties: {
      resumo: { type: 'string', example: 'Você tem 8 tarefas.' },
    },
  },
};

const paths = {
  '/estatisticas': {
    get: {
      summary: 'Obtém totais de tarefas por coluna',
      parameters: [{
        name: 'coluna',
        in: 'query',
        schema: { type: 'string', enum: ['afazer', 'andamento', 'concluido'] },
      }],
      responses: {
        200: { description: 'Estatísticas gerais.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Estatisticas' } } } },
        401: respostaErro('Token ausente ou inválido.'),
      },
    },
  },
  '/estatisticas/resumo': {
    get: {
      summary: 'Obtém um resumo textual das tarefas',
      responses: {
        200: { description: 'Resumo das tarefas.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ResumoEstatisticas' } } } },
        401: respostaErro('Token ausente ou inválido.'),
      },
    },
  },
};

module.exports = { paths, schemas };
