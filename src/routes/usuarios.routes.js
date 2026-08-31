const crypto = require('crypto');

const { 
  ListarUsuarios, 
  BuscarUsuario, 
  AdicionarUsuario, 
  AtualizarUsuario, 
  DeletarUsuario 
} = require('./utils/usuarios');

// --- ROTAS DE USUÁRIOS ---

app.get('/usuarios', async (req, res) => {
  const usuarios = await ListarUsuarios();
  res.json(usuarios);
});

app.get('/usuarios/:id', async (req, res) => {
  const id = Number(req.params.id);
  const usuario = await BuscarUsuario(id);

  if (!usuario) {
    return res.status(404).json({ erro: 'Usuário não encontrado' });
  }

  res.json(usuario);
});

app.post('/usuarios', async (req, res) => {
  const { nome, email } = req.body;

  if (!nome || !email) {
    return res.status(400).json({ erro: 'Faltando campo nome ou email' });
  }

  const novoUsuario = {
    id: crypto.randomInt(1000, 10000),
    email: email,
    nome: nome
  };

  try {
    await AdicionarUsuario(novoUsuario);
    res.status(201).json(novoUsuario);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
});

app.put('/usuarios/:id', async (req, res) => {
  const id = Number(req.params.id);
  const usuario = await AtualizarUsuario(id, req.body);

  if (!usuario) {
    return res.status(404).json({ erro: 'Usuário não encontrado' });
  }

  res.json(usuario);
});

app.delete('/usuarios/:id', async (req, res) => {
  const id = Number(req.params.id);
  const deletado = await DeletarUsuario(id);

  if (!deletado) {
    return res.status(404).json({ erro: 'Usuário não encontrado' });
  }

  res.json({ mensagem: 'Usuário removido com sucesso', id });
});