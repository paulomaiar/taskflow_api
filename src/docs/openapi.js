const tarefas = require('./tarefas.docs');
const auth = require('./auth.docs');
const prioridades = require('./prioridades.docs');
const projetos = require('./projetos.docs');
const usuarios = require('./usuarios.docs');
const estatisticas = require('./estatisticas.docs');
const { Erro } = require('./comum');

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'TaskFlow API',
    version: '1.0.0',
    description: 'API REST para gerenciamento de tarefas, projetos e usuários do TaskFlow.',
  },
  servers: [{ url: '/', description: 'Este servidor' }],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Erro,
      ...tarefas.schemas,
      ...auth.schemas,
      ...prioridades.schemas,
      ...projetos.schemas,
      ...usuarios.schemas,
      ...estatisticas.schemas,
    },
  },
  paths: {
    ...tarefas.paths,
    ...auth.paths,
    ...prioridades.paths,
    ...projetos.paths,
    ...usuarios.paths,
    ...estatisticas.paths,
    '/': {
      get: {
        summary: 'Verifica se a API está disponível',
        security: [],
        responses: {
          200: { description: 'API disponível.' },
        },
      },
    },
  },
};
