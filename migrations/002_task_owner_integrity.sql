CREATE INDEX IF NOT EXISTS projetos_usuario_id_id_idx
  ON projetos (usuario_id, id);

CREATE INDEX IF NOT EXISTS tarefas_usuario_projeto_ordem_id_idx
  ON tarefas (usuario_id, projeto_id, ordem, id);

CREATE UNIQUE INDEX IF NOT EXISTS projetos_id_usuario_id_uidx
  ON projetos (id, usuario_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tarefas_projeto_usuario_fkey'
      AND conrelid = 'tarefas'::regclass
  ) THEN
    ALTER TABLE tarefas
      ADD CONSTRAINT tarefas_projeto_usuario_fkey
      FOREIGN KEY (projeto_id, usuario_id)
      REFERENCES projetos (id, usuario_id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END
$$;
