const prioridadesModel = require('../models/prioridades.models');

async function listar(req, res) {
  const prioridades = await prioridadesModel.listarPrioridades();
  return res.json(prioridades);
}

module.exports = { listar };
