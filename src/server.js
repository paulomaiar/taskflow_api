require('dotenv').config();

const app = require('./app');
const PORTA = process.env.PORTA || 3001;

app.listen(PORTA, () => {
  console.log(`Servidor MVC rodando na porta ${PORTA}`);
});