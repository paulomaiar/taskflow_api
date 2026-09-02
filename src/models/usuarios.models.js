const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const CAMINHO_ARQUIVO = path.join(__dirname, '../data/usuarios.json');

async function listarUsuarios() {
  try {
    const conteudo = await fs.readFile(CAMINHO_ARQUIVO, 'utf-8');
    return JSON.parse(conteudo);
  } catch (erro) {
    return [];
  }
}

async function salvarArquivo(lista) {
  await fs.writeFile(CAMINHO_ARQUIVO, JSON.stringify(lista, null, 2));
}

async function buscarUsuarioPorId(id) {
  const usuarios = await listarUsuarios();
  return usuarios.find(u => String(u.id) === String(id));
}

async function adicionarUsuario(dados) {
  const usuarios = await listarUsuarios();
  const emailExiste = usuarios.some(u => u.email === dados.email);

  if (emailExiste) {
    throw new Error('Email já cadastrado');
  }

  const novoUsuario = {
    id: crypto.randomInt(1000, 10000),
    nome: dados.nome,
    email: dados.email
  };

  usuarios.push(novoUsuario);
  await salvarArquivo(usuarios);
  return novoUsuario;
}

async function atualizarUsuario(id, dadosNovos) {
  const usuarios = await listarUsuarios();
  const indice = usuarios.findIndex(u => String(u.id) === String(id));

  if (indice === -1) return null;

  usuarios[indice] = {
    ...usuarios[indice],
    ...dadosNovos,
    id: usuarios[indice].id
  };

  await salvarArquivo(usuarios);
  return usuarios[indice];
}

async function deletarUsuario(id) {
  const usuarios = await listarUsuarios();
  const usuariosFiltrados = usuarios.filter(u => String(u.id) !== String(id));

  if (usuarios.length === usuariosFiltrados.length) return false;

  await salvarArquivo(usuariosFiltrados);
  return true;
}

module.exports = {
  listarUsuarios,
  buscarUsuarioPorId,
  adicionarUsuario,
  atualizarUsuario,
  deletarUsuario
};