const fs = require('fs/promises');
const path = require('path');

const CAMINHO_ARQUIVO = path.join(__dirname, '../usuarios.json');

async function ListarUsuarios() {
  try {
    const usuarios = await fs.readFile(CAMINHO_ARQUIVO, 'utf-8');
    return JSON.parse(usuarios);
  } catch (error) {
    return [];
  }
}

async function SalvarArquivo(lista) {
  await fs.writeFile(CAMINHO_ARQUIVO, JSON.stringify(lista, null, 2));
}

async function BuscarUsuario(id) {
  const usuarios = await ListarUsuarios();
  return usuarios.find(u => String(u.id) === String(id));
}

async function AdicionarUsuario(novoUsuario) {
  const usuarios = await ListarUsuarios();
  const emailExiste = usuarios.some(u => u.email === novoUsuario.email);

  if (emailExiste) {
    throw new Error('Email já cadastrado');
  }

  usuarios.push(novoUsuario);
  await SalvarArquivo(usuarios);
  return novoUsuario;
}

async function AtualizarUsuario(id, dadosNovos) {
  const usuarios = await ListarUsuarios();
  const indice = usuarios.findIndex(u => String(u.id) === String(id));

  if (indice === -1) return null;

  usuarios[indice] = {
    ...usuarios[indice],
    ...dadosNovos,
    id: usuarios[indice].id
  };

  await SalvarArquivo(usuarios);
  return usuarios[indice];
}

async function DeletarUsuario(id) {
    
  const usuarios = await ListarUsuarios();
  const usuariosFiltrados = usuarios.filter(u => String(u.id) !== String(id));

  if (usuarios.length === usuariosFiltrados.length) return false;

  await SalvarArquivo(usuariosFiltrados);
  return true;
}

module.exports = { 
  ListarUsuarios, 
  SalvarArquivo, 
  BuscarUsuario, 
  AdicionarUsuario, 
  AtualizarUsuario, 
  DeletarUsuario 
};