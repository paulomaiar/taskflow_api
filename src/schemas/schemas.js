const schemas = {
  id: {
    id: { obrigatorio: true, tipo: 'inteiro' },
  },
  usuario: {
    nome: { obrigatorio: true, tipo: 'texto' },
    email: { obrigatorio: true, tipo: 'email' },
    senha: { obrigatorio: true, tipo: 'texto' },
  },
  atualizacaoUsuario: {
    nome: { obrigatorio: false, tipo: 'texto' },
    email: { obrigatorio: false, tipo: 'email' },
    senha: { obrigatorio: false, tipo: 'texto' },
  },
  projeto: {
    nome: { obrigatorio: true, tipo: 'texto' },
    descricao: { obrigatorio: false, tipo: 'texto' },
  },
  atualizacaoProjeto: {
    nome: { obrigatorio: false, tipo: 'texto' },
    descricao: { obrigatorio: false, tipo: 'texto' },
  },
  tarefa: {
    texto: { obrigatorio: true, tipo: 'texto' },
    projetoId: { obrigatorio: true, tipo: 'inteiro' },
    coluna: { obrigatorio: false, tipo: 'texto' },
  },
  atualizacaoTarefa: {
    texto: { obrigatorio: false, tipo: 'texto' },
    projetoId: { obrigatorio: false, tipo: 'inteiro' },
    coluna: { obrigatorio: false, tipo: 'texto' },
  },
  filtroTarefas: {
    usuarioId: { obrigatorio: false, tipo: 'inteiro' },
    projetoId: { obrigatorio: false, tipo: 'inteiro' },
    coluna: { obrigatorio: false, tipo: 'texto' },
  },
};

module.exports = schemas;
