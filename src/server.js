require('dotenv').config();

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'taskflow-secret-development';
}

const app = require('./app');
const projetosRoutes = require('./routes/projetos.routes');
const PORT = process.env.PORT || 3001;

app.use('/projetos', projetosRoutes);

app.listen(PORT, () => {
  console.log(`Servidor MVC rodando na porta ${PORT}`);
});