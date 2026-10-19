DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_usuario') THEN
    EXECUTE 'CREATE ROLE app_usuario NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT';
  END IF;
END;
$$;

ALTER ROLE app_usuario
  NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE usuarios, projetos, tarefas, comentarios
  TO app_usuario;

GRANT SELECT, INSERT ON TABLE auditoria_tarefas TO app_usuario;

GRANT USAGE, SELECT
  ON SEQUENCE usuarios_id_seq, projetos_id_seq, tarefas_id_seq,
    comentarios_id_seq, auditoria_tarefas_id_seq
  TO app_usuario;

GRANT EXECUTE ON FUNCTION buscar_tarefas_usuario(INTEGER) TO app_usuario;
GRANT EXECUTE ON FUNCTION avancar_tarefa(INTEGER) TO app_usuario;
GRANT EXECUTE ON PROCEDURE limpar_tarefas_concluidas(INTEGER) TO app_usuario;
