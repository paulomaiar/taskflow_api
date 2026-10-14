require('dotenv').config();

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'taskflow-secret-development';
}

const pool = require('./database/db');
const app = require('./app');
const PORT = process.env.PORT || 3001;

async function iniciarServidor() {
  await pool.query('SELECT 1');

  app.listen(PORT, () => {
    console.log(`Servidor MVC rodando na porta ${PORT}`);
  });
}

iniciarServidor().catch(erro => {
  console.error('Não foi possível iniciar o servidor ou conectar ao banco de dados:', erro.message);
  process.exitCode = 1;
});