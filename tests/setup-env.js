// Carrega as variáveis do .env.test ANTES de cada arquivo de teste
require('dotenv').config({ path: '.env.test', quiet: true });

// Trava: sem o .env.test, os testes iriam para o banco de dev
if (process.env.AMBIENTE !== 'teste') {
  throw new Error('Crie o arquivo .env.test antes de rodar os testes');
}
