const { json, parametroId, respostaErro } = require('./comum');

const schemas = {
  Usuario: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 1 },
      nome: { type: 'string', example: 'Ana Silva' },
      email: { type: 'string', format: 'email', example: 'ana@exemplo.com' },
      criadoEm: { type: 'string', format: 'date-time', nullable: true },
      atualizadoEm: { type: 'string', format: 'date-time', nullable: true },
    },
  },
  UsuarioEntrada: {
    type: 'object',
    required: ['nome', 'email', 'senha'],
    properties: {
      nome: { type: 'string', example: 'Ana Silva' },
      email: { type: 'string', format: 'email', example: 'ana@exemplo.com' },
      senha: { type: 'string', format: 'password' },
    },
  },
  UsuarioAtualizacao: {
    type: 'object',
    properties: {
      nome: { type: 'string' },
      email: { type: 'string', format: 'email' },
      senha: { type: 'string', format: 'password' },
    },
  },
};

const paths = {
  '/usuarios': {
    get: {
      summary: 'Lista usuários',
      responses: {
        200: {
          description: 'Lista de usuários.',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { $ref: '#/components/schemas/Usuario' },
              },
            },
          },
        },
        401: respostaErro('Token ausente ou inválido.'),
      },
    },
    post: {
      summary: 'Cria um usuário',
      security: [],
      requestBody: { required: true, content: json('UsuarioEntrada') },
      responses: {
        201: { description: 'Usuário criado.', content: json('Usuario') },
        400: respostaErro('Dados inválidos ou e-mail já cadastrado.'),
        415: respostaErro('Content-Type deve ser application/json.'),
      },
    },
  },
  '/usuarios/{id}': {
    get: {
      summary: 'Busca um usuário por ID',
      security: [],
      parameters: [parametroId],
      responses: {
        200: { description: 'Usuário encontrado.', content: json('Usuario') },
        400: respostaErro('ID inválido.'),
        404: respostaErro('Usuário não encontrado.'),
      },
    },
    put: {
      summary: 'Atualiza um usuário',
      security: [],
      parameters: [parametroId],
      requestBody: { required: true, content: json('UsuarioAtualizacao') },
      responses: {
        200: { description: 'Usuário atualizado.', content: json('Usuario') },
        400: respostaErro('Dados inválidos.'),
        404: respostaErro('Usuário não encontrado.'),
        415: respostaErro('Content-Type deve ser application/json.'),
      },
    },
    delete: {
      summary: 'Remove um usuário sem tarefas associadas',
      security: [],
      parameters: [parametroId],
      responses: {
        204: { description: 'Usuário removido.' },
        400: respostaErro('ID inválido ou usuário possui tarefas.'),
        404: respostaErro('Usuário não encontrado.'),
      },
    },
  },
};

module.exports = { paths, schemas };
