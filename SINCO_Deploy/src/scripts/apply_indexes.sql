-- Script de Otimização de Índices - SincoWeb
-- Objetivo: Aumentar a performance de busca e autenticação

-- 1. Indexação de Usuários (Melhora velocidade de Login)
CREATE INDEX idx_usuario_login ON usuario(Login);

-- 2. Indexação de Itens de Romaneio (Melhora listagem e filtros)
CREATE INDEX idx_ri_romaneio ON romaneioitem(IdRomaneio);
CREATE INDEX idx_ri_os_item ON romaneioitem(IDOrdemServicoITEM);
CREATE INDEX idx_ri_delete ON romaneioitem(D_E_L_E_T_E);

-- 3. Indexação de Auditoria e Status em Itens de OS
CREATE INDEX idx_osi_os ON ordemservicoitem(IdOrdemServico);
CREATE INDEX idx_osi_projetotag ON ordemservicoitem(Projeto(50), Tag(50));

-- 4. Central DB (Conexões de Clientes)
-- Nota: Execute isto no DB central se possível
-- CREATE UNIQUE INDEX idx_cb_dbname ON conexoes_bancos(db_name);

-- 5. Otimização de Tabelas (Libera espaço e recalcula estatísticas)
-- OPTIMIZE TABLE usuario;
-- OPTIMIZE TABLE ordemservicoitem;
-- OPTIMIZE TABLE romaneioitem;
