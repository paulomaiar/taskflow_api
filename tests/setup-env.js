const fs = require('node:fs');
const dotenv = require('dotenv');

// Carrega as variáveis do .env.test ANTES de cada arquivo de teste
const resultadoEnv = dotenv.config({
  path: '.env.test',
  quiet: true,
  override: true,
});

if (resultadoEnv.error && process.env.CI !== 'true') {
  throw new Error('Crie o arquivo .env.test antes de rodar os testes');
}

// Trava: sem o .env.test, os testes iriam para o banco de dev
if (process.env.AMBIENTE !== 'teste') {
  throw new Error('Crie o arquivo .env.test antes de rodar os testes');
}

function obterEndpointNeon(valor, nomeVariavel) {
  let url;
  try {
    url = new URL(valor);
  } catch {
    throw new Error(`${nomeVariavel} deve ser uma URL válida de um endpoint Neon`);
  }

  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error(`${nomeVariavel} deve usar o protocolo PostgreSQL`);
  }

  const endpoint = url.hostname.split('.')[0].replace(/-pooler$/, '');
  if (!/^ep-[a-z0-9-]+$/i.test(endpoint)) {
    throw new Error(`${nomeVariavel} deve apontar para um endpoint Neon ep-*`);
  }

  return endpoint;
}

const endpointTeste = obterEndpointNeon(process.env.DATABASE_URL, 'DATABASE_URL');
const endpointDireto = obterEndpointNeon(process.env.DIRECT_URL, 'DIRECT_URL');

if (endpointTeste !== endpointDireto) {
  throw new Error('DATABASE_URL e DIRECT_URL devem apontar para o mesmo branch Neon');
}

if (fs.existsSync('.env')) {
  const envDesenvolvimento = dotenv.parse(fs.readFileSync('.env'));
  if (envDesenvolvimento.DATABASE_URL) {
    const endpointDesenvolvimento = obterEndpointNeon(
      envDesenvolvimento.DATABASE_URL,
      'DATABASE_URL de desenvolvimento'
    );
    if (endpointTeste === endpointDesenvolvimento) {
      throw new Error('O banco de teste deve usar um endpoint Neon diferente do banco de desenvolvimento');
    }
  }
}
