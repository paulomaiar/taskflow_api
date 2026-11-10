const { json, respostaErro } = require('./comum');

const schemas = {
  Login: {
    type: 'object',
    required: ['senha'],
    properties: {
      email: { type: 'string', format: 'email', example: 'usuario@exemplo.com' },
      usuario: { type: 'string', example: 'usuario@exemplo.com' },
      senha: { type: 'string', format: 'password', example: 'senha-segura' },
    },
    description: 'Informe email ou usuario e a senha.',
  },
  LoginResposta: {
    type: 'object',
    properties: {
      token: { type: 'string', description: 'Token JWT.' },
      usuario: { $ref: '#/components/schemas/Usuario' },
    },
  },
};

const paths = {
  '/auth/login': {
    post: {
      summary: 'Autentica um usuário e retorna um token JWT',
      security: [],
      requestBody: {
        required: true,
        content: json('Login'),
      },
      responses: {
        200: { description: 'Autenticação realizada.', content: json('LoginResposta') },
        400: respostaErro('E-mail/usuário ou senha não informados.'),
        401: respostaErro('Credenciais inválidas.'),
        415: respostaErro('Content-Type deve ser application/json.'),
      },
    },
  },
};

module.exports = { paths, schemas };
