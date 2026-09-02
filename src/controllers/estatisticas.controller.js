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
  let tarefas = await tarefaModel.listarTarefas();
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

  const porPrioridade = {
    alta: tarefas.filter(t => t.prioridade.toLowerCase() === 'alta').length,
    media: tarefas.filter(t => t.prioridade.toLowerCase() === 'media').length,
    baixa: tarefas.filter(t => t.prioridade.toLowerCase() === 'baixa').length
  };

  const colunaComMaisTarefas = obterMaisFrequente(porColuna);
  const prioridadeMaisComum = obterMaisFrequente(porPrioridade);

  return res.json({
    totalGeral,
    porColuna,
    porPrioridade,
    colunaComMaisTarefas,
    prioridadeMaisComum
  });
}

async function obterResumo(req, res) {
  const tarefas = await tarefaModel.listarTarefas();
  const total = tarefas.length;

  if (total === 0) {
    return res.json({ resumo: 'Você não possui nenhuma tarefa cadastrada.' });
  }

  const afazer = tarefas.filter(t => ['afazer', 'a fazer'].includes(t.coluna.toLowerCase())).length;
  const andamento = tarefas.filter(t => ['andamento', 'em andamento'].includes(t.coluna.toLowerCase())).length;
  const concluido = tarefas.filter(t => ['concluido', 'concluída'].includes(t.coluna.toLowerCase())).length;

  const porPrioridade = {
    alta: tarefas.filter(t => t.prioridade.toLowerCase() === 'alta').length,
    media: tarefas.filter(t => t.prioridade.toLowerCase() === 'media').length,
    baixa: tarefas.filter(t => t.prioridade.toLowerCase() === 'baixa').length
  };

  const prioridadeMaisComum = obterMaisFrequente(porPrioridade);

  const resumo = `Você tem ${total} tarefas. ${concluido} concluída(s), ${andamento} em andamento e ${afazer} a fazer. Prioridade mais comum: ${prioridadeMaisComum}.`;

  return res.json({ resumo });
}

module.exports = { obterGeral, obterResumo };