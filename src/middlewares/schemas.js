const schemas = {
  id: {
    id: { obrigatorio: true, tipo: 'inteiro' },
  },
  usuario: {
    nome: { obrigatorio: true, tipo: 'texto', minimo: 3 },
    email: { obrigatorio: true, tipo: 'email' },
    senha: { obrigatorio: true, tipo: 'texto', minimo: 6 },
  },
  atualizacaoUsuario: {
    nome: { obrigatorio: false, tipo: 'texto' },
    email: { obrigatorio: false, tipo: 'email' },
    senha: { obrigatorio: false, tipo: 'texto' },
  },
  projeto: {
    nome: { obrigatorio: true, tipo: 'texto' },
    descricao: { obrigatorio: false, tipo: 'texto', maximo: 200 },
  },
  atualizacaoProjeto: {
    nome: { obrigatorio: false, tipo: 'texto' },
    descricao: { obrigatorio: false, tipo: 'texto', maximo: 200 },
  },
  tarefa: {
    texto: { obrigatorio: true, tipo: 'texto' },
    coluna: {
      obrigatorio: true,
      tipo: 'texto',
      valores: ['afazer', 'andamento', 'concluido'],
    },
    usuario_id: { obrigatorio: true, tipo: 'inteiro' },
    projeto_id: { obrigatorio: true, tipo: 'inteiro', aliases: ['projetoId'] },
    idprioridade: { obrigatorio: true, tipo: 'inteiro' },
    projetoId: { obrigatorio: false, tipo: 'inteiro' },
  },
  atualizacaoTarefa: {
    texto: { obrigatorio: false, tipo: 'texto' },
    projetoId: { obrigatorio: false, tipo: 'inteiro' },
    projeto_id: { obrigatorio: false, tipo: 'inteiro' },
    usuario_id: { obrigatorio: false, tipo: 'inteiro' },
    idprioridade: { obrigatorio: false, tipo: 'inteiro' },
    coluna: {
      obrigatorio: false,
      tipo: 'texto',
      valores: ['afazer', 'andamento', 'concluido'],
    },
  },
  filtroTarefas: {
    usuarioId: { obrigatorio: false, tipo: 'inteiro' },
    projetoId: { obrigatorio: false, tipo: 'inteiro' },
    coluna: { obrigatorio: false, tipo: 'texto' },
  },
};

module.exports = schemas;
