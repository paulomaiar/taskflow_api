ALTER TABLE usuarios
  ALTER COLUMN nome TYPE VARCHAR(100),
  ALTER COLUMN email TYPE VARCHAR(150);

CREATE TABLE IF NOT EXISTS comentarios (
  id SERIAL PRIMARY KEY,
  texto TEXT NOT NULL,
  tarefa_id INTEGER NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  criado_em TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS comentarios_tarefa_id_idx
  ON comentarios (tarefa_id);

CREATE TABLE IF NOT EXISTS auditoria_tarefas (
  id SERIAL PRIMARY KEY,
  tarefa_id INTEGER NOT NULL,
  operacao VARCHAR(10) NOT NULL
    CHECK (operacao IN ('INSERT', 'UPDATE', 'DELETE')),
  coluna_antes VARCHAR(20),
  coluna_depois VARCHAR(20),
  alterado_por INTEGER,
  alterado_em TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION fn_atualizar_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS usuarios_atualizar_timestamp ON usuarios;
CREATE TRIGGER usuarios_atualizar_timestamp
BEFORE UPDATE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION fn_atualizar_timestamp();

DROP TRIGGER IF EXISTS tarefas_atualizar_timestamp ON tarefas;
CREATE TRIGGER tarefas_atualizar_timestamp
BEFORE UPDATE ON tarefas
FOR EACH ROW
EXECUTE FUNCTION fn_atualizar_timestamp();

CREATE OR REPLACE FUNCTION fn_auditar_tarefa()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO auditoria_tarefas
      (tarefa_id, operacao, coluna_antes, coluna_depois, alterado_por)
    VALUES
      (NEW.id, TG_OP, NULL, NEW.coluna, NEW.usuario_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO auditoria_tarefas
      (tarefa_id, operacao, coluna_antes, coluna_depois, alterado_por)
    VALUES
      (NEW.id, TG_OP, OLD.coluna, NEW.coluna, NEW.usuario_id);
    RETURN NEW;
  ELSE
    INSERT INTO auditoria_tarefas
      (tarefa_id, operacao, coluna_antes, coluna_depois, alterado_por)
    VALUES
      (OLD.id, TG_OP, OLD.coluna, NULL, OLD.usuario_id);
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS tarefas_auditoria ON tarefas;
CREATE TRIGGER tarefas_auditoria
AFTER INSERT OR UPDATE OR DELETE ON tarefas
FOR EACH ROW
EXECUTE FUNCTION fn_auditar_tarefa();

CREATE OR REPLACE FUNCTION buscar_tarefas_usuario(p_usuario_id INTEGER)
RETURNS TABLE (
  id INTEGER,
  texto TEXT,
  coluna VARCHAR(20),
  ordem INTEGER,
  projeto_id INTEGER,
  projeto_nome VARCHAR(255),
  usuario_id INTEGER,
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
    p.nome,
    t.usuario_id,
    t.criado_em,
    t.atualizado_em
  FROM tarefas AS t
  JOIN projetos AS p ON p.id = t.projeto_id
  WHERE t.usuario_id = p_usuario_id
  ORDER BY
    CASE t.coluna
      WHEN 'todo' THEN 1
      WHEN 'doing' THEN 2
      WHEN 'done' THEN 3
    END,
    t.ordem,
    t.id;
$$;

CREATE OR REPLACE FUNCTION avancar_tarefa(p_tarefa_id INTEGER)
RETURNS tarefas
LANGUAGE plpgsql
AS $$
DECLARE
  tarefa_atual tarefas%ROWTYPE;
  tarefas_em_andamento INTEGER;
BEGIN
  SELECT *
  INTO tarefa_atual
  FROM tarefas
  WHERE id = p_tarefa_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF tarefa_atual.coluna = 'todo' THEN
    PERFORM id
    FROM usuarios
    WHERE id = tarefa_atual.usuario_id
    FOR UPDATE;

    SELECT COUNT(*)
    INTO tarefas_em_andamento
    FROM tarefas
    WHERE usuario_id = tarefa_atual.usuario_id
      AND coluna = 'doing'
      AND id <> tarefa_atual.id;

    IF tarefas_em_andamento >= 2 THEN
      RAISE EXCEPTION 'Limite de 2 tarefas em andamento por usuário atingido'
        USING ERRCODE = 'P0001';
    END IF;

    UPDATE tarefas
    SET coluna = 'doing'
    WHERE id = tarefa_atual.id
    RETURNING * INTO tarefa_atual;
  ELSIF tarefa_atual.coluna = 'doing' THEN
    UPDATE tarefas
    SET coluna = 'done'
    WHERE id = tarefa_atual.id
    RETURNING * INTO tarefa_atual;
  END IF;

  RETURN tarefa_atual;
END;
$$;

CREATE OR REPLACE PROCEDURE limpar_tarefas_concluidas(p_projeto_id INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM comentarios AS c
  USING tarefas AS t
  WHERE c.tarefa_id = t.id
    AND t.projeto_id = p_projeto_id
    AND t.coluna = 'done';

  DELETE FROM tarefas
  WHERE projeto_id = p_projeto_id
    AND coluna = 'done';
END;
$$;

REVOKE ALL ON FUNCTION buscar_tarefas_usuario(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION avancar_tarefa(INTEGER) FROM PUBLIC;
REVOKE ALL ON PROCEDURE limpar_tarefas_concluidas(INTEGER) FROM PUBLIC;
