const crypto = require('crypto');
const { promisify } = require('util');
const prisma = require('../database/prisma');

const scrypt = promisify(crypto.scrypt);
const TAMANHO_HASH = 64;
const CAMPOS_PUBLICOS = {
  id: true,
  nome: true,
  email: true,
  criado_em: true,
  atualizado_em: true,
};

function formatarUsuario(usuario) {
  if (!usuario) return null;

  const { criado_em, atualizado_em, senha_hash, ...resto } = usuario;
  return {
    ...resto,
    criadoEm: criado_em,
    atualizadoEm: atualizado_em,
  };
}

function criarErroEmailDuplicado(erro) {
  if (erro.code !== 'P2002') return erro;

  const duplicado = new Error('Email já cadastrado');
  duplicado.code = 'USER_EMAIL_EXISTS';
  return duplicado;
}

async function gerarHashSenha(senha) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await scrypt(senha, salt, TAMANHO_HASH);
  return `scrypt$${salt}$${hash.toString('hex')}`;
}

async function verificarSenha(senha, senhaHash) {
  const [algoritmo, salt, hashSalvo] = String(senhaHash).split('$');

  if (algoritmo === 'scrypt') {
    if (!salt || !hashSalvo) {
      return { valida: false, precisaAtualizarHash: false };
    }

    const hashBuffer = Buffer.from(hashSalvo, 'hex');
    if (hashBuffer.length !== TAMANHO_HASH) {
      return { valida: false, precisaAtualizarHash: false };
    }

    const hashCalculado = await scrypt(senha, salt, TAMANHO_HASH);
    return {
      valida: crypto.timingSafeEqual(hashCalculado, hashBuffer),
      precisaAtualizarHash: false,
    };
  }

  const senhaBuffer = Buffer.from(String(senha));
  const hashBuffer = Buffer.from(String(senhaHash));

  if (senhaBuffer.length !== hashBuffer.length) {
    return { valida: false, precisaAtualizarHash: false };
  }

  return {
    valida: crypto.timingSafeEqual(senhaBuffer, hashBuffer),
    precisaAtualizarHash: true,
  };
}

async function listarUsuarios() {
  const usuarios = await prisma.usuarios.findMany({
    select: CAMPOS_PUBLICOS,
    orderBy: { id: 'asc' },
  });
  return usuarios.map(formatarUsuario);
}

async function buscarUsuarioPorId(id) {
  const usuario = await prisma.usuarios.findUnique({
    where: { id: Number(id) },
    select: CAMPOS_PUBLICOS,
  });
  return formatarUsuario(usuario);
}

async function buscarUsuarioPorEmail(email) {
  return prisma.usuarios.findUnique({
    where: { email },
    select: { id: true, nome: true, email: true, senha_hash: true },
  });
}

async function autenticarUsuario(email, senha) {
  const usuario = await buscarUsuarioPorEmail(email);
  if (!usuario) return null;

  const verificacao = await verificarSenha(senha, usuario.senha_hash);
  if (!verificacao.valida) return null;

  if (verificacao.precisaAtualizarHash) {
    const senhaHash = await gerarHashSenha(senha);
    await prisma.usuarios.update({
      where: { id: usuario.id },
      data: { senha_hash: senhaHash },
    });
  }

  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
  };
}

async function adicionarUsuario(dados) {
  const senhaHash = await gerarHashSenha(dados.senha);

  try {
    return await prisma.$transaction(async tx => {
      const usuario = await tx.usuarios.create({
        data: {
          nome: dados.nome,
          email: dados.email,
          senha_hash: senhaHash,
        },
        select: CAMPOS_PUBLICOS,
      });

      await tx.projetos.create({
        data: {
          nome: 'Projeto Padrão',
          descricao: null,
          usuarios: { connect: { id: usuario.id } },
        },
      });

      return formatarUsuario(usuario);
    });
  } catch (erro) {
    throw criarErroEmailDuplicado(erro);
  }
}

async function atualizarUsuario(id, dadosNovos) {
  const dados = {};
  if (dadosNovos.nome !== undefined) dados.nome = dadosNovos.nome;
  if (dadosNovos.email !== undefined) dados.email = dadosNovos.email;
  if (dadosNovos.senha !== undefined) {
    dados.senha_hash = await gerarHashSenha(dadosNovos.senha);
  }

  if (Object.keys(dados).length === 0) {
    return buscarUsuarioPorId(id);
  }

  try {
    return await prisma.$transaction(async tx => {
      const resultado = await tx.usuarios.updateMany({
        where: { id: Number(id) },
        data: dados,
      });
      if (resultado.count === 0) return null;

      const usuario = await tx.usuarios.findUnique({
        where: { id: Number(id) },
        select: CAMPOS_PUBLICOS,
      });
      return formatarUsuario(usuario);
    });
  } catch (erro) {
    throw criarErroEmailDuplicado(erro);
  }
}

async function deletarUsuario(id) {
  const resultado = await prisma.usuarios.deleteMany({
    where: { id: Number(id) },
  });
  return resultado.count > 0;
}

module.exports = {
  gerarHashSenha,
  listarUsuarios,
  buscarUsuarioPorId,
  buscarUsuarioPorEmail,
  autenticarUsuario,
  adicionarUsuario,
  atualizarUsuario,
  deletarUsuario,
};
