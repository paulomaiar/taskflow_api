require('dotenv').config();

const prisma = require('../src/database/prisma');
const usuarioModel = require('../src/models/usuarios.models');

const prioridades = [
  { id: 1, descricao: 'Baixo', cor: '#3ddc97' },
  { id: 2, descricao: 'Médio', cor: '#f1c40f' },
  { id: 3, descricao: 'Alto', cor: '#e74c3c' },
];

async function seed() {
  if (process.env.TASKFLOW_SEED_ENABLED !== 'true') {
    throw new Error('Defina TASKFLOW_SEED_ENABLED=true para autorizar o seed.');
  }
  if (!process.env.DATABASE_URL || !process.env.DIRECT_URL) {
    throw new Error('DATABASE_URL e DIRECT_URL são obrigatórias.');
  }

  const email = process.env.SEED_USER_EMAIL || 'teste.dupla@email.com';
  const senha = process.env.SEED_USER_PASSWORD;
  const nome = process.env.SEED_USER_NAME || 'Usuário de teste';
  if (!senha || !senha.trim()) {
    throw new Error('Defina SEED_USER_PASSWORD antes de executar o seed.');
  }

  let usuario = await prisma.usuarios.findUnique({
    where: { email },
    select: { id: true },
  });

  if (usuario) {
    const autenticado = await usuarioModel.autenticarUsuario(email, senha);
    if (!autenticado) {
      throw new Error(
        'O e-mail de seed já existe com outra senha; use outra conta ou atualize a senha manualmente.'
      );
    }
    usuario = autenticado;
  } else {
    usuario = await usuarioModel.adicionarUsuario({ nome, email, senha });
  }

  await prisma.$transaction(async tx => {
    for (const prioridade of prioridades) {
      await tx.prioridades.upsert({
        where: { id: prioridade.id },
        update: {
          descricao: prioridade.descricao,
          cor: prioridade.cor,
          ativo: true,
        },
        create: { ...prioridade, ativo: true },
      });
    }

    const projeto = await tx.projetos.findFirst({
      where: { usuario_id: usuario.id, nome: 'Projeto TaskFlow' },
      select: { id: true },
    });

    if (!projeto) {
      await tx.projetos.create({
        data: {
          nome: 'Projeto TaskFlow',
          descricao: 'Projeto inicial para execução cruzada de testes.',
          usuario_id: usuario.id,
        },
      });
    }
  });

  console.info(`Seed concluído para ${email}.`);
}

seed()
  .catch(error => {
    console.error('Falha ao executar seed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
