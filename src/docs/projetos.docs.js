const { json, parametroId, respostaErro } = require('./comum');

const schemas = {
  Projeto: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 1 },
      nome: { type: 'string', example: 'Projeto TaskFlow' },
      descricao: { type: 'string', nullable: true },
      usuario_id: { type: 'integer', example: 1 },
      criadoEm: { type: 'string', format: 'date-time', nullable: true },
      atualizadoEm: { type: 'string', format: 'date-time', nullable: true },
    },
  },
  ProjetoEntrada: {
    type: 'object',
    required: ['nome'],
    properties: {
      nome: { type: 'string', example: 'Projeto TaskFlow' },
      descricao: { type: 'string', nullable: true },
    },
  },
  ProjetoAtualizacao: {
    type: 'object',
    properties: {
      nome: { type: 'string' },
      descricao: { type: 'string', nullable: true },
    },
  },
};

const paths = {
  '/projetos': {
    get: {
      summary: 'Lista projetos do usuário autenticado',
      responses: {
        200: {
          description: 'Lista de projetos.',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { $ref: '#/components/schemas/Projeto' },
              },
            },
          },
        },
        401: respostaErro('Token ausente ou inválido.'),
      },
    },
    post: {
      summary: 'Cria um projeto',
      requestBody: { required: true, content: json('ProjetoEntrada') },
      responses: {
        201: { description: 'Projeto criado.', content: json('Projeto') },
        400: respostaErro('Dados inválidos.'),
        401: respostaErro('Token ausente ou inválido.'),
        415: respostaErro('Content-Type deve ser application/json.'),
      },
    },
  },
  '/projetos/{id}': {
    get: {
      summary: 'Busca um projeto por ID',
      parameters: [parametroId],
      responses: {
        200: { description: 'Projeto encontrado.', content: json('Projeto') },
        400: respostaErro('ID inválido.'),
        401: respostaErro('Token ausente ou inválido.'),
        404: respostaErro('Projeto não encontrado.'),
      },
    },
    put: {
      summary: 'Atualiza um projeto',
      parameters: [parametroId],
      requestBody: { required: true, content: json('ProjetoAtualizacao') },
      responses: {
        200: { description: 'Projeto atualizado.', content: json('Projeto') },
        400: respostaErro('Dados inválidos.'),
        401: respostaErro('Token ausente ou inválido.'),
        404: respostaErro('Projeto não encontrado.'),
        415: respostaErro('Content-Type deve ser application/json.'),
      },
    },
    delete: {
      summary: 'Remove um projeto',
      parameters: [parametroId],
      responses: {
        204: { description: 'Projeto removido.' },
        400: respostaErro('ID inválido.'),
        401: respostaErro('Token ausente ou inválido.'),
        404: respostaErro('Projeto não encontrado.'),
      },
    },
  },
};

module.exports = { paths, schemas };
