const { json, jsonLista, parametroId, respostaErro } = require('./comum');

const schemas = {
  Tarefa: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 1 },
      texto: { type: 'string', example: 'Preparar apresentação' },
      coluna: { type: 'string', enum: ['afazer', 'andamento', 'concluido'] },
      ordem: { type: 'integer', example: 0 },
      projeto_id: { type: 'integer', example: 1 },
      usuario_id: { type: 'integer', example: 1 },
      idprioridade: { type: 'integer', example: 2 },
      projetoId: { type: 'integer', example: 1 },
      usuarioId: { type: 'integer', example: 1 },
      criadoPorId: { type: 'integer', example: 1 },
      criadoEm: { type: 'string', format: 'date-time', nullable: true },
      atualizadoEm: { type: 'string', format: 'date-time', nullable: true },
      iniciadaEm: { type: 'string', format: 'date-time', nullable: true },
      concluidoEm: { type: 'string', format: 'date-time', nullable: true },
      projeto: { type: 'string', nullable: true },
      usuario: { type: 'string', nullable: true },
    },
  },
  TarefaEntrada: {
    type: 'object',
    required: ['texto', 'coluna', 'usuario_id', 'projeto_id', 'idprioridade'],
    properties: {
      texto: { type: 'string', example: 'Preparar apresentação' },
      coluna: { type: 'string', enum: ['afazer', 'andamento', 'concluido'] },
      usuario_id: { type: 'integer', example: 1 },
      projeto_id: { type: 'integer', example: 1 },
      idprioridade: { type: 'integer', example: 2 },
      ordem: { type: 'integer', example: 0 },
    },
  },
};

const erro400 = respostaErro('Requisição inválida.');
const erro401 = respostaErro('Token ausente ou inválido.');
const erro404 = respostaErro('Recurso não encontrado.');
const erro415 = respostaErro('Content-Type deve ser application/json.');

const paths = {
  '/tarefas': {
    get: {
      summary: 'Lista tarefas do usuário autenticado',
      parameters: [
        {
          name: 'usuarioId',
          in: 'query',
          schema: { type: 'integer' },
          description: 'Filtra pelo usuário autenticado.',
        },
        {
          name: 'projetoId',
          in: 'query',
          schema: { type: 'integer' },
        },
        {
          name: 'coluna',
          in: 'query',
          schema: { type: 'string', enum: ['afazer', 'andamento', 'concluido'] },
        },
      ],
      responses: {
        200: {
          description: 'Lista de tarefas.',
          content: jsonLista('Tarefa'),
        },
        400: erro400,
        401: erro401,
      },
    },
    post: {
      summary: 'Cria uma tarefa',
      requestBody: {
        required: true,
        content: json('TarefaEntrada'),
      },
      responses: {
        201: {
          description: 'Tarefa criada.',
          content: json('Tarefa'),
        },
        400: erro400,
        401: erro401,
        404: erro404,
        415: erro415,
      },
    },
  },
  '/tarefas/{id}': {
    get: {
      summary: 'Busca uma tarefa por ID',
      parameters: [parametroId],
      responses: {
        200: { description: 'Tarefa encontrada.', content: json('Tarefa') },
        400: erro400,
        401: erro401,
        404: erro404,
      },
    },
    put: {
      summary: 'Atualiza uma tarefa',
      parameters: [parametroId],
      requestBody: {
        required: true,
        content: json('TarefaEntrada'),
      },
      responses: {
        200: { description: 'Tarefa atualizada.', content: json('Tarefa') },
        400: erro400,
        401: erro401,
        403: respostaErro('O usuário não tem permissão para atualizar esses campos.'),
        404: erro404,
        415: erro415,
      },
    },
    delete: {
      summary: 'Remove uma tarefa',
      parameters: [parametroId],
      responses: {
        204: { description: 'Tarefa removida.' },
        400: erro400,
        401: erro401,
        404: erro404,
      },
    },
  },
  '/tarefas/{id}/avancar': {
    post: {
      summary: 'Avança a tarefa para a próxima coluna',
      parameters: [parametroId],
      responses: {
        200: { description: 'Tarefa avançada.', content: json('Tarefa') },
        400: erro400,
        401: erro401,
        404: erro404,
        415: erro415,
      },
    },
  },
};

module.exports = { paths, schemas };
