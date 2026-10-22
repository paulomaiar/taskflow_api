CREATE TABLE IF NOT EXISTS prioridades (
  id INTEGER PRIMARY KEY,
  descricao VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO prioridades (id, descricao)
VALUES
  (1, 'Baixa'),
  (2, 'Média'),
  (3, 'Alta')
ON CONFLICT (id) DO UPDATE
SET descricao = EXCLUDED.descricao;

ALTER TABLE tarefas
  ADD COLUMN IF NOT EXISTS idprioridade INTEGER NOT NULL DEFAULT 2
    REFERENCES prioridades(id),
  ADD COLUMN IF NOT EXISTS criado_por_id INTEGER
    REFERENCES usuarios(id) ON DELETE CASCADE;

UPDATE tarefas
SET criado_por_id = usuario_id
WHERE criado_por_id IS NULL;

ALTER TABLE tarefas
  ALTER COLUMN criado_por_id SET NOT NULL;

ALTER TABLE tarefas
  DROP CONSTRAINT IF EXISTS tarefas_projeto_usuario_fkey;

CREATE INDEX IF NOT EXISTS tarefas_criador_id_idx
  ON tarefas (criado_por_id);

CREATE INDEX IF NOT EXISTS tarefas_responsavel_id_idx
  ON tarefas (usuario_id);

DROP FUNCTION IF EXISTS buscar_tarefas_usuario(INTEGER);

CREATE FUNCTION buscar_tarefas_usuario(p_usuario_id INTEGER)
RETURNS TABLE (
  id INTEGER,
  texto TEXT,
  coluna VARCHAR(20),
  ordem INTEGER,
  projeto_id INTEGER,
  usuario_id INTEGER,
  idprioridade INTEGER,
  criado_por_id INTEGER,
  criado_em TIMESTAMP WITHOUT TIME ZONE,
  atualizado_em TIMESTAMP WITHOUT TIME ZONE
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    t.id,
    t.texto,
    t.coluna,
    t.ordem,
    t.projeto_id,
    t.usuario_id,
    t.idprioridade,
    t.criado_por_id,
    t.criado_em,
    t.atualizado_em
  FROM tarefas AS t
  WHERE t.criado_por_id = p_usuario_id OR t.usuario_id = p_usuario_id
  ORDER BY t.projeto_id, t.ordem, t.id;
$$;

REVOKE ALL ON FUNCTION buscar_tarefas_usuario(INTEGER) FROM PUBLIC;
