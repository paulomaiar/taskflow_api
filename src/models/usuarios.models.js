const crypto = require('crypto');
const { promisify } = require('util');
const pool = require('../database/db');

const scrypt = promisify(crypto.scrypt);
const TAMANHO_HASH = 64;

const CAMPOS_USUARIO = `
  id,
  nome,
  email,
  criado_em AS "criadoEm",
  atualizado_em AS "atualizadoEm"
`;

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

  {
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
}

async function listarUsuarios() {
  const resultado = await pool.query(
    `SELECT ${CAMPOS_USUARIO} FROM usuarios ORDER BY id`
  );
  return resultado.rows;
}

async function buscarUsuarioPorId(id) {
  const resultado = await pool.query(
    `SELECT ${CAMPOS_USUARIO} FROM usuarios WHERE id = $1`,
    [id]
  );
  return resultado.rows[0];
}

async function buscarUsuarioPorEmail(email) {
  const resultado = await pool.query(
    `SELECT ${CAMPOS_USUARIO} FROM usuarios WHERE email = $1`,
    [email]
  );
  return resultado.rows[0];
}

async function autenticarUsuario(email, senha) {
  const resultado = await pool.query(
    `SELECT id, nome, email, senha_hash
     FROM usuarios
     WHERE email = $1`,
    [email]
  );
  const usuario = resultado.rows[0];

  if (!usuario) return null;

  const verificacao = await verificarSenha(senha, usuario.senha_hash);
  if (!verificacao.valida) return null;

  if (verificacao.precisaAtualizarHash) {
    const senhaHash = await gerarHashSenha(senha);
    await pool.query(
      'UPDATE usuarios SET senha_hash = $1, atualizado_em = NOW() WHERE id = $2',
      [senhaHash, usuario.id]
    );
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
    const resultado = await pool.query(
      `INSERT INTO usuarios (nome, email, senha_hash)
       VALUES ($1, $2, $3)
       RETURNING ${CAMPOS_USUARIO}`,
      [dados.nome, dados.email, senhaHash]
    );
    return resultado.rows[0];
  } catch (erro) {
    if (erro.code === '23505') {
      const duplicado = new Error('Email já cadastrado');
      duplicado.code = 'USER_EMAIL_EXISTS';
      throw duplicado;
    }
    throw erro;
  }
}

async function atualizarUsuario(id, dadosNovos) {
  const campos = [];
  const valores = [];

  if (dadosNovos.nome !== undefined) {
    valores.push(dadosNovos.nome);
    campos.push(`nome = $${valores.length}`);
  }

  if (dadosNovos.email !== undefined) {
    valores.push(dadosNovos.email);
    campos.push(`email = $${valores.length}`);
  }

  if (dadosNovos.senha !== undefined) {
    valores.push(await gerarHashSenha(dadosNovos.senha));
    campos.push(`senha_hash = $${valores.length}`);
  }

  if (campos.length === 0) {
    return buscarUsuarioPorId(id);
  }

  valores.push(id);
  try {
    const resultado = await pool.query(
      `UPDATE usuarios
       SET ${campos.join(', ')}, atualizado_em = NOW()
       WHERE id = $${valores.length}
       RETURNING ${CAMPOS_USUARIO}`,
      valores
    );
    return resultado.rows[0] || null;
  } catch (erro) {
    if (erro.code === '23505') {
      const duplicado = new Error('Email já cadastrado');
      duplicado.code = 'USER_EMAIL_EXISTS';
      throw duplicado;
    }
    throw erro;
  }
}

async function deletarUsuario(id) {
  const resultado = await pool.query(
    'DELETE FROM usuarios WHERE id = $1 RETURNING id',
    [id]
  );
  return resultado.rowCount > 0;
}

module.exports = {
  listarUsuarios,
  buscarUsuarioPorId,
  buscarUsuarioPorEmail,
  autenticarUsuario,
  adicionarUsuario,
  atualizarUsuario,
  deletarUsuario
};
