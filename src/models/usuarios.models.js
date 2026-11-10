// @ts-check

const crypto = require('crypto');
const { promisify } = require('util');
const bcrypt = require('bcryptjs');
const prisma = require('../database/prisma');
const criarErro = require('../utils/criarErro');

const scrypt = promisify(crypto.scrypt);
const TAMANHO_HASH = 64;
const ROUNDS_BCRYPT = 12;
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

async function gerarHashSenha(senha) {
  if (Buffer.byteLength(senha, 'utf8') > 72) {
    throw criarErro(400, 'A senha deve ter no máximo 72 bytes');
  }

  return bcrypt.hash(senha, ROUNDS_BCRYPT);
}

async function verificarSenha(senha, senhaHash) {
  const hashString = String(senhaHash);
  const [algoritmo, salt, hashSalvo] = hashString.split('$');

  if (hashString.startsWith('$2a$') || hashString.startsWith('$2b$')) {
    if (
      Buffer.byteLength(senha, 'utf8') > 72 ||
      !/^\$2[ab]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hashString)
    ) {
      return { valida: false, precisaAtualizarHash: false };
    }

    const rounds = bcrypt.getRounds(hashString);
    return {
      valida: await bcrypt.compare(senha, hashString),
      precisaAtualizarHash: rounds < ROUNDS_BCRYPT,
    };
  }

  if (algoritmo === 'scrypt') {
    if (!salt || !hashSalvo) {
      return { valida: false, precisaAtualizarHash: false };
    }

    const hashBuffer = Buffer.from(hashSalvo, 'hex');
    if (hashBuffer.length !== TAMANHO_HASH) {
      return { valida: false, precisaAtualizarHash: false };
    }

    const hashCalculado = await scrypt(senha, salt, TAMANHO_HASH);
    const valida = crypto.timingSafeEqual(hashCalculado, hashBuffer);
    return {
      valida,
      precisaAtualizarHash: valida && Buffer.byteLength(senha, 'utf8') <= 72,
    };
  }

  if (hashString.startsWith('$2')) {
    return { valida: false, precisaAtualizarHash: false };
  }

  const senhaBuffer = Buffer.from(String(senha));
  const hashBuffer = Buffer.from(String(senhaHash));

  if (senhaBuffer.length !== hashBuffer.length) {
    return { valida: false, precisaAtualizarHash: false };
  }

  const valida = crypto.timingSafeEqual(senhaBuffer, hashBuffer);
  return {
    valida,
    precisaAtualizarHash: valida && Buffer.byteLength(senha, 'utf8') <= 72,
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

  return prisma.$transaction(async tx => {
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
    const usuario = await prisma.usuarios.update({
      where: { id: Number(id) },
      data: dados,
      select: CAMPOS_PUBLICOS,
    });
    return formatarUsuario(usuario);
  } catch (erro) {
    if (erro.code === 'P2025') return null;
    throw erro;
  }
}

async function deletarUsuario(id) {
  try {
    await prisma.usuarios.delete({ where: { id: Number(id) } });
    return true;
  } catch (erro) {
    if (erro.code === 'P2025') return false;
    throw erro;
  }
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
