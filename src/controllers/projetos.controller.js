let projetos = [];
let proximoId = 1;

const projetosController = {
  listar(req, res) {
    return res.json(projetos);
  },

  buscarPorId(req, res) {
    const projeto = projetos.find(p => p.id === Number(req.params.id));

    if (!projeto) {
      return res.status(404).json({ erro: 'Projeto não encontrado' });
    }

    return res.json(projeto);
  },

  criar(req, res) {
    const { nome, descricao } = req.body;

    if (!nome) {
      return res.status(400).json({ erro: 'Nome é obrigatório' });
    }

    const novoProjeto = {
      id: proximoId++,
      nome,
      descricao: descricao || null,
    };

    projetos.push(novoProjeto);
    return res.status(201).json(novoProjeto);
  },

  atualizar(req, res) {
    const indice = projetos.findIndex(p => p.id === Number(req.params.id));

    if (indice === -1) {
      return res.status(404).json({ erro: 'Projeto não encontrado' });
    }

    projetos[indice] = {
      ...projetos[indice],
      ...req.body,
      id: projetos[indice].id,
    };

    return res.json(projetos[indice]);
  },

  remover(req, res) {
    const indice = projetos.findIndex(p => p.id === Number(req.params.id));

    if (indice === -1) {
      return res.status(404).json({ erro: 'Projeto não encontrado' });
    }

    const [projetoRemovido] = projetos.splice(indice, 1);
    return res.json({ mensagem: 'Projeto removido com sucesso', projeto: projetoRemovido });
  },
};

module.exports = projetosController;