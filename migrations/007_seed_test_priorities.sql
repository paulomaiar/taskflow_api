ALTER TABLE prioridades
  ADD COLUMN IF NOT EXISTS cor VARCHAR(32),
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN;

UPDATE prioridades
SET ativo = TRUE
WHERE ativo IS NULL;

ALTER TABLE prioridades
  ALTER COLUMN ativo SET DEFAULT TRUE,
  ALTER COLUMN ativo SET NOT NULL;

INSERT INTO prioridades (id, descricao, cor, ativo)
VALUES
  (1, 'Baixo', '#3ddc97', TRUE),
  (2, 'Médio', '#f1c40f', TRUE),
  (3, 'Alto', '#e74c3c', TRUE)
ON CONFLICT (id) DO UPDATE
SET descricao = EXCLUDED.descricao,
    cor = EXCLUDED.cor,
    ativo = TRUE;
