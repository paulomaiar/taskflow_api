const tarefaModel = require('../models/tarefas.models');

function obterMaisFrequente(objetoContagem) {
  let maiorChave = 'nenhuma';
  let maiorValor = 0;

  for (const [chave, valor] of Object.entries(objetoContagem)) {
    if (valor > maiorValor) {
      maiorValor = valor;
      maiorChave = chave;
    }
  }

  return maiorChave;
}

async function obterGeral(req, res) {
  let tarefas = await tarefaModel.listarTarefas(req.usuario.id);
  const { coluna } = req.query;

  if (coluna) {
    tarefas = tarefas.filter(t => t.coluna.toLowerCase() === coluna.toLowerCase());
  }

  const totalGeral = tarefas.length;

  const porColuna = {
    afazer: tarefas.filter(t => ['afazer', 'a fazer'].includes(t.coluna.toLowerCase())).length,
    andamento: tarefas.filter(t => ['andamento', 'em andamento'].includes(t.coluna.toLowerCase())).length,
    concluido: tarefas.filter(t => ['concluido', 'concluída'].includes(t.coluna.toLowerCase())).length
  };

  const colunaComMaisTarefas = obterMaisFrequente(porColuna);

  return res.json({
    totalGeral,
    porColuna,
    colunaComMaisTarefas
  });
}

async function obterResumo(req, res) {
  const tarefas = await tarefaModel.listarTarefas(req.usuario.id);
  const total = tarefas.length;

  if (total === 0) {
    return res.json({ resumo: 'Você não possui nenhuma tarefa cadastrada.' });
  }

  const afazer = tarefas.filter(t => ['afazer', 'a fazer'].includes(t.coluna.toLowerCase())).length;
  const andamento = tarefas.filter(t => ['andamento', 'em andamento'].includes(t.coluna.toLowerCase())).length;
  const concluido = tarefas.filter(t => ['concluido', 'concluída'].includes(t.coluna.toLowerCase())).length;

  const resumo = `Você tem ${total} tarefas. ${concluido} concluída(s), ${andamento} em andamento e ${afazer} a fazer.`;

  return res.json({ resumo });
}

module.exports = { obterGeral, obterResumo };