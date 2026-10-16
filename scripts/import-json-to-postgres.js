const fs = require('fs');
const path = require('path');
const pool = require('../src/database/db');
const { gerarHashSenha } = require('../src/models/usuarios.models');

const DATA_DIR = path.join(__dirname, '..', 'src', 'database');
const TAMANHO_LOTE = 200;

function lerArquivo(nome) {
  const caminho = path.join(DATA_DIR, nome);
  const dados = JSON.parse(fs.readFileSync(caminho, 'utf8'));
  if (!Array.isArray(dados)) {
    throw new Error(`${nome} deve conter uma lista JSON`);
  }
  return dados;
}

function validarIds(registros, nome) {
  const ids = new Set();
  for (const registro of registros) {
    if (!Number.isInteger(Number(registro.id)) || Number(registro.id) <= 0) {
      throw new Error(`${nome} contém um id inválido`);
    }
    if (ids.has(Number(registro.id))) {
      throw new Error(`${nome} contém ids duplicados`);
    }
    ids.add(Number(registro.id));
  }
}

function normalizarColuna(tarefa) {
  if (tarefa.concluida === true) return 'done';

  const coluna = String(tarefa.coluna || 'afazer').trim().toLowerCase();
  const mapeamento = {
    afazer: 'todo',
    todo: 'todo',
    andamento: 'doing',
    doing: 'doing',
    concluido: 'done',
    concluída: 'done',
    concluida: 'done',
    done: 'done',
  };

  const resultado = mapeamento[coluna];
  if (!resultado) {
    throw new Error(`Coluna inválida no arquivo de tarefas: ${coluna}`);
  }
  return resultado;
}

function montarLotes(registros, colunas) {
  const lotes = [];
  for (let inicio = 0; inicio < registros.length; inicio += TAMANHO_LOTE) {
    const lote = registros.slice(inicio, inicio + TAMANHO_LOTE);
    const valores = [];
    const placeholders = lote.map((registro, indice) => {
      const deslocamento = indice * colunas.length;
      valores.push(...colunas.map(coluna => registro[coluna]));
      return `(${colunas.map((_, coluna) => `$${deslocamento + coluna + 1}`).join(', ')})`;
    });
    lotes.push({ placeholders, valores });
  }
  return lotes;
}

async function inserirEmLotes(client, tabela, colunas, registros, onConflict = '') {
  let inseridos = 0;
  for (const lote of montarLotes(registros, colunas)) {
    const resultado = await client.query(
      `INSERT INTO ${tabela} (${colunas.join(', ')})
       VALUES ${lote.placeholders.join(', ')}
       ${onConflict}`,
      lote.valores
    );
    inseridos += resultado.rowCount;
  }
  return inseridos;
}

async function sincronizarSequencia(client, tabela) {
  const resultado = await client.query(
    'SELECT pg_get_serial_sequence($1, $2) AS sequencia',
    [tabela, 'id']
  );
  const sequencia = resultado.rows[0].sequencia;
  if (!sequencia) return;

  const nomeSequencia = sequencia.split('.').pop().replaceAll('"', '');
  const ultimaSequencia = await client.query(
    `SELECT last_value FROM pg_sequences
     WHERE schemaname = 'public' AND sequencename = $1`,
    [nomeSequencia]
  );
  const maiorId = await client.query(`SELECT COALESCE(MAX(id), 1) AS max_id FROM ${tabela}`);
  const valor = Math.max(
    Number(maiorId.rows[0].max_id),
    Number(ultimaSequencia.rows[0]?.last_value || 1)
  );
  await client.query('SELECT setval($1::regclass, $2, true)', [sequencia, valor]);
}

async function importar() {
  const usuarios = lerArquivo('usuarios.json');
  const projetos = lerArquivo('projetos.json');
  const tarefas = lerArquivo('tarefas.json');
  validarIds(usuarios, 'usuarios.json');
  validarIds(projetos, 'projetos.json');
  validarIds(tarefas, 'tarefas.json');

  if (usuarios.some(usuario => !usuario.nome || !usuario.email || !usuario.senha)) {
    throw new Error('usuarios.json contém registro sem nome, email ou senha');
  }
  if (projetos.some(projeto => !projeto.nome)) {
    throw new Error('projetos.json contém registro sem nome');
  }
  if (tarefas.some(tarefa => !tarefa.texto)) {
    throw new Error('tarefas.json contém registro sem texto');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [731904213]);

    const usuariosNoBanco = await client.query(
      `SELECT id, nome, email
       FROM usuarios
       WHERE id = ANY($1::integer[]) OR lower(email) = ANY($2::text[])
       FOR UPDATE`,
      [usuarios.map(usuario => Number(usuario.id)), usuarios.map(usuario => usuario.email.toLowerCase())]
    );
    const usuariosPorId = new Map(usuariosNoBanco.rows.map(usuario => [Number(usuario.id), usuario]));
    const usuariosPorEmail = new Map(usuariosNoBanco.rows.map(usuario => [usuario.email.toLowerCase(), usuario]));
    const usuarioIds = new Map();
    const novosUsuariosComId = [];
    const novosUsuariosSemId = [];

    for (const usuario of usuarios) {
      const existentePorEmail = usuariosPorEmail.get(usuario.email.toLowerCase());
      if (existentePorEmail) {
        if (existentePorEmail.nome !== usuario.nome) {
          throw new Error(`Email de usuario conflita com um registro existente: ${usuario.email}`);
        }
        usuarioIds.set(Number(usuario.id), Number(existentePorEmail.id));
        continue;
      }

      const senhaHash = await gerarHashSenha(usuario.senha);
      const registro = {
        id: Number(usuario.id),
        nome: usuario.nome,
        email: usuario.email,
        senha_hash: senhaHash,
      };

      if (usuariosPorId.has(Number(usuario.id))) {
        novosUsuariosSemId.push(registro);
      } else {
        novosUsuariosComId.push(registro);
      }
    }

    await inserirEmLotes(client, 'usuarios', ['id', 'nome', 'email', 'senha_hash'], novosUsuariosComId, 'ON CONFLICT (id) DO NOTHING');
    const gerados = [];
    for (const lote of montarLotes(novosUsuariosSemId, ['nome', 'email', 'senha_hash'])) {
      const resultado = await client.query(
        `INSERT INTO usuarios (nome, email, senha_hash)
         VALUES ${lote.placeholders.join(', ')}
         RETURNING id, email`,
        lote.valores
      );
      gerados.push(...resultado.rows);
    }
    for (const usuario of gerados) {
      const origem = usuarios.find(item => item.email.toLowerCase() === usuario.email.toLowerCase());
      usuarioIds.set(Number(origem.id), Number(usuario.id));
    }

    for (const usuario of novosUsuariosComId) {
      usuarioIds.set(usuario.id, usuario.id);
    }

    const todosUsuariosImportados = await client.query(
      `SELECT id, nome, email FROM usuarios
       WHERE lower(email) = ANY($1::text[])`,
      [usuarios.map(usuario => usuario.email.toLowerCase())]
    );
    for (const usuario of usuarios) {
      const persistido = todosUsuariosImportados.rows.find(
        item => item.email.toLowerCase() === usuario.email.toLowerCase()
      );
      if (!persistido || persistido.nome !== usuario.nome) {
        throw new Error(`Não foi possível confirmar a importação do usuário id ${usuario.id}`);
      }
      usuarioIds.set(Number(usuario.id), Number(persistido.id));
    }

    const projetoNormalizado = projetos.map((projeto, indice) => {
      const usuarioOrigemId = Number(projeto.usuarioId ?? projeto.usuario_id ??
        (usuarios.length === 1 ? usuarios[0].id : NaN));
      const usuarioId = usuarioIds.get(usuarioOrigemId);
      if (!usuarioId) {
        throw new Error(`Não foi possível determinar o dono do projeto id ${projeto.id}`);
      }
      return {
        origemId: Number(projeto.id),
        id: Number(projeto.id),
        nome: projeto.nome,
        descricao: projeto.descricao ?? null,
        usuario_id: usuarioId,
        indice,
      };
    });

    const projetosNoBanco = await client.query(
      `SELECT id, nome, descricao, usuario_id
       FROM projetos
       WHERE id = ANY($1::integer[]) OR usuario_id = ANY($2::integer[])
       FOR UPDATE`,
      [projetoNormalizado.map(projeto => projeto.id), [...new Set(projetoNormalizado.map(projeto => projeto.usuario_id))]]
    );
    const projetoIds = new Map();
    const projetosParaInserirComId = [];
    const projetosParaInserirSemId = [];

    for (const projeto of projetoNormalizado) {
      const porId = projetosNoBanco.rows.find(row => Number(row.id) === projeto.id);
      const iguais = projetosNoBanco.rows.filter(row =>
        row.nome === projeto.nome &&
        row.descricao === projeto.descricao &&
        Number(row.usuario_id) === projeto.usuario_id
      );
      if (iguais.length > 1) {
        throw new Error(`Mais de um projeto existente corresponde ao projeto id ${projeto.origemId}`);
      }
      if (porId) {
        if (
          porId.nome === projeto.nome &&
          porId.descricao === projeto.descricao &&
          Number(porId.usuario_id) === projeto.usuario_id
        ) {
          projetoIds.set(projeto.origemId, Number(porId.id));
          continue;
        }
        if (iguais.length === 1) {
          projetoIds.set(projeto.origemId, Number(iguais[0].id));
          continue;
        }
        projeto.id = null;
        projetosParaInserirSemId.push(projeto);
      } else if (iguais.length === 1) {
        projetoIds.set(projeto.origemId, Number(iguais[0].id));
      } else {
        projetosParaInserirComId.push(projeto);
      }
    }

    await inserirEmLotes(
      client,
      'projetos',
      ['id', 'nome', 'descricao', 'usuario_id'],
      projetosParaInserirComId,
      'ON CONFLICT (id) DO NOTHING'
    );
    for (const lote of montarLotes(projetosParaInserirSemId, ['nome', 'descricao', 'usuario_id'])) {
      const resultado = await client.query(
        `INSERT INTO projetos (nome, descricao, usuario_id)
         VALUES ${lote.placeholders.join(', ')}
         RETURNING id, nome, descricao, usuario_id`,
        lote.valores
      );
      for (const persistido of resultado.rows) {
        const origem = projetosParaInserirSemId.find(projeto =>
          projeto.nome === persistido.nome &&
          projeto.descricao === persistido.descricao &&
          projeto.usuario_id === Number(persistido.usuario_id)
        );
        projetoIds.set(origem.origemId, Number(persistido.id));
      }
    }
    const projetosPersistidos = await client.query(
      `SELECT id, nome, descricao, usuario_id
       FROM projetos
       WHERE usuario_id = ANY($1::integer[])`,
      [[...new Set(projetoNormalizado.map(projeto => projeto.usuario_id))]]
    );
    for (const projeto of projetoNormalizado) {
      if (!projetoIds.has(projeto.origemId)) {
        const persistidos = projetosPersistidos.rows.filter(row =>
          row.nome === projeto.nome &&
          row.descricao === projeto.descricao &&
          Number(row.usuario_id) === projeto.usuario_id
        );
        if (persistidos.length !== 1) {
          throw new Error(`Não foi possível resolver o projeto importado id ${projeto.origemId}`);
        }
        projetoIds.set(projeto.origemId, Number(persistidos[0].id));
      }
    }

    const tarefasNormalizadas = tarefas.map((tarefa, indice) => {
      const usuarioOrigemId = Number(tarefa.usuarioId ?? tarefa.usuario_id ??
        (usuarios.length === 1 ? usuarios[0].id : NaN));
      const usuarioId = usuarioIds.get(usuarioOrigemId);
      if (!usuarioId) {
        throw new Error(`Não foi possível determinar o dono da tarefa id ${tarefa.id}`);
      }
      const projetoOrigemId = Number(tarefa.projetoId ?? tarefa.projeto_id ??
        (projetos.length === 1 ? projetos[0].id : NaN));
      const projetoId = projetoIds.get(projetoOrigemId);
      if (!projetoId) {
        throw new Error(`Não foi possível determinar o projeto da tarefa id ${tarefa.id}`);
      }
      const projetoOrigem = projetoNormalizado.find(projeto => projeto.origemId === projetoOrigemId);
      if (projetoOrigem && projetoOrigem.usuario_id !== usuarioId) {
        throw new Error(`A tarefa id ${tarefa.id} e o projeto referenciado têm donos diferentes`);
      }
      return {
        id: Number(tarefa.id),
        texto: tarefa.texto,
        coluna: normalizarColuna(tarefa),
        ordem: Number.isInteger(tarefa.ordem) ? tarefa.ordem : indice,
        projeto_id: projetoId,
        usuario_id: usuarioId,
      };
    });

    const tarefasExistentes = await client.query(
      `SELECT id, texto, coluna, ordem, projeto_id, usuario_id
       FROM tarefas
       WHERE id = ANY($1::integer[])
       FOR UPDATE`,
      [tarefasNormalizadas.map(tarefa => tarefa.id)]
    );
    const existentesPorId = new Map(tarefasExistentes.rows.map(tarefa => [Number(tarefa.id), tarefa]));
    const tarefasInserir = [];
    for (const tarefa of tarefasNormalizadas) {
      const existente = existentesPorId.get(tarefa.id);
      if (!existente) {
        tarefasInserir.push(tarefa);
        continue;
      }
      if (
        existente.texto !== tarefa.texto ||
        existente.coluna !== tarefa.coluna ||
        Number(existente.ordem) !== tarefa.ordem ||
        Number(existente.projeto_id) !== tarefa.projeto_id ||
        Number(existente.usuario_id) !== tarefa.usuario_id
      ) {
        throw new Error(`Id da tarefa ${tarefa.id} já existe com dados diferentes`);
      }
    }

    const inseridas = await inserirEmLotes(
      client,
      'tarefas',
      ['id', 'texto', 'coluna', 'ordem', 'projeto_id', 'usuario_id'],
      tarefasInserir,
      'ON CONFLICT (id) DO NOTHING'
    );

    for (const tabela of ['usuarios', 'projetos', 'tarefas']) {
      await sincronizarSequencia(client, tabela);
    }
    await client.query('COMMIT');
    console.log(JSON.stringify({
      usuariosImportados: novosUsuariosComId.length + gerados.length,
      usuariosJaExistentes: usuarios.length - novosUsuariosComId.length - gerados.length,
      projetosImportados: projetosParaInserirComId.length + projetosParaInserirSemId.length,
      tarefasImportadas: inseridas,
      tarefasJaExistentes: tarefasNormalizadas.length - inseridas,
    }));
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release();
    await pool.end();
  }
}

importar().catch(erro => {
  console.error('Falha ao importar os arquivos JSON:', erro.message);
  process.exitCode = 1;
});
