-- Script SQL para copiar os dados das tabelas projetos e tags
-- do banco 'amceletrica' para o banco 'lynxlocal'

-- 1. Copiando a tabela PROJETOS
-- Utilizamos IGNORE para não dar erro caso o projeto já exista no banco destino (pela chave primária IdProjeto).
-- Se quiser que os dados sejam sobrescritos, pode-se usar REPLACE INTO ou ON DUPLICATE KEY UPDATE.
INSERT IGNORE INTO lynxlocal.projetos
SELECT * FROM amceletrica.projetos;

-- 2. Copiando a tabela TAGS
-- Utilizamos IGNORE para não dar erro caso a tag já exista no banco destino (pela chave primária IdTag).
INSERT IGNORE INTO lynxlocal.tags
SELECT * FROM amceletrica.tags;
