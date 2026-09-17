const fs = require('fs/promises');
const path = require('path');

const CAMINHO_ARQUIVO = path.join(__dirname, '../data/usuarios.json');

async function listarUsuarios() {
  try {
    const conteudo = await fs.readFile(CAMINHO_ARQUIVO, 'utf-8');
    return JSON.parse(conteudo);
  } catch (erro) {
    return [];
  }
}

async function buscarPorEmail(email) {
  const usuarios = await listarUsuarios();
  return usuarios.find((usuario) => usuario.email === email);
}

async function buscarPorNome(nome) {
  const usuarios = await listarUsuarios();
  return usuarios.find((usuario) => usuario.nome === nome);
}

async function buscarPorEmailOuNome(identificador) {
  return buscarPorEmail(identificador) || buscarPorNome(identificador);
}

module.exports = {
  listarUsuarios,
  buscarPorEmail,
  buscarPorNome,
  buscarPorEmailOuNome,
};