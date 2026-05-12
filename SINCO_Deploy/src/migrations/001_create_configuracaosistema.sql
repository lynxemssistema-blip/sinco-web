-- =====================================================
-- Migration: Criação da tabela de configuração do sistema
-- Descrição: Migra configurações do WinForms para banco de dados
-- =====================================================

-- Remove tabela existente se houver
DROP TABLE IF EXISTS `configuracaosistema`;

-- Cria tabela de configuração do sistema
CREATE TABLE `configuracaosistema` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `chave` VARCHAR(100) NOT NULL UNIQUE COMMENT 'Chave da configuração (ex: CopiaBancoDados)',
  `valor` TEXT NOT NULL COMMENT 'Valor da configuração',
  `descricao` VARCHAR(255) DEFAULT NULL COMMENT 'Descrição opcional da configuração',
  `tipo` ENUM('caminho', 'template', 'parametro', 'outro') DEFAULT 'outro' COMMENT 'Tipo da configuração',
  `data_criacao` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `data_atualizacao` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_chave` (`chave`),
  INDEX `idx_tipo` (`tipo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Configurações do sistema migradas do WinForms';

-- Insere dados iniciais migrados do WinForms
INSERT INTO `configuracaosistema` (`chave`, `valor`, `tipo`, `descricao`) VALUES
-- Diretórios de backup e arquivos
('CopiaBancoDados', 'G:\\Meu Drive\\02-BacKup Mysql', 'caminho', 'Diretório de backup do banco de dados'),

-- Diretórios raiz
('EnderecoPastaRaizOS', 'G:\\Meu Drive\\00-Ordem Serviço', 'caminho', 'Pasta raiz de Ordens de Serviço'),
('EnderecoProjeto', 'G:\\Meu Drive\\10-Projetos', 'caminho', 'Pasta de projetos'),
('Enderecoplanodecorte', 'G:\\Meu Drive\\03-Plano de Corte', 'caminho', 'Pasta de planos de corte'),
('EnderecoPastaRaizRNC', 'G:\\Meu Drive\\07-Relação de Não Conformidade', 'caminho', 'Pasta raiz de RNC'),
('EnderecoPastaRaizRomaneio', 'G:\\Meu Drive\\01-Romaneio', 'caminho', 'Pasta raiz de romaneios'),
('EnderecoNumeroSerie', 'G:\\Meu Drive\\00-Ordem Serviço', 'caminho', 'Pasta de números de série'),
('EnderecoImagens', 'G:\\Meu Drive\\09-Imagens', 'caminho', 'Pasta de imagens'),

-- Templates Excel
('EnderecoTemplateExcelOrdemServico', 'G:\\Meu Drive\\Estrutura padrão Lynx\\023-SGQ\\023-001-FORMULARIOS\\Templat-OS-Rev03.xlsx', 'template', 'Template Excel de Ordem de Serviço'),
('TemplateExcelProjeto', 'G:\\Meu Drive\\Estrutura padrão Lynx\\023-SGQ\\023-001-FORMULARIOS\\Templat-OS-Rev03.xlsx\\Ficha de Projetos.xlsx', 'template', 'Template Excel de Projetos'),
('templateplanodecorte', 'G:\\Meu Drive\\Estrutura padrão Lynx\\023-SGQ\\023-001-FORMULARIOS\\Templat-PC-Rev02.xlsx', 'template', 'Template de Plano de Corte'),
('EnderecoTemplateExcelRNC', 'G:\\Meu Drive\\Estrutura padrão Lynx\\023-SGQ\\023-001-FORMULARIOS\\Templat-RNC-Rev00.xlsx', 'template', 'Template Excel de RNC'),
('EnderecoTemplateExcelRomaneio', 'G:\\Meu Drive\\Estrutura padrão Lynx\\023-SGQ\\023-001-FORMULARIOS\\Templat-RO-Rev02.xlsx', 'template', 'Template Excel de Romaneio'),
('EnderecoTemplateExcelRelatorios', 'G:\\Meu Drive\\Configurações\\Templat-RNC-rev00.xlsx', 'template', 'Template Excel de Relatórios'),
('templateNumeroSerie', 'G:\\Meu Drive\\Estrutura padrão Lynx\\023-SGQ\\023-001-FORMULARIOS\\Templat-NS-Rev00.xlsx', 'template', 'Template de Número de Série'),
('EnderecoTemplateExcelReposicao', 'G:\\Meu Drive\\Estrutura padrão Lynx\\023-SGQ\\023-001-FORMULARIOS\\Templat-RRP.xlsx', 'template', 'Template Excel de Reposição'),
('TemplatAlmoxarifadorev01', 'C:\\Users\\Edson Manoel\\Desktop\\Lynx\\SINCO GIT\\SINCO Gestão\\Configurações do sistema\\Templat-Almoxarifado-rev01.xlsx', 'template', 'Template de Almoxarifado'),
('TemplatVisaoGeralOrdemServico', 'C:\\Users\\Edson Manoel\\Desktop\\Lynx\\SINCO GIT\\SINCO Gestão\\Configurações do sistema\\Templat-Evolucao-OS-rev01.xlsx', 'template', 'Template Visão Geral de OS'),
('EnderecoTemplateExcelPecasNaoCortadas', 'G:\\Meu Drive\\Estrutura padrão Lynx\\023-SGQ\\023-001-FORMULARIOS\\Templat-PecasNaoCortadas.xlsx', 'template', 'Template Excel de Peças Não Cortadas'),

-- Parâmetros do sistema
('ParametroExportarDXF', '1', 'parametro', 'Parâmetro de exportação DXF'),
('ProgramaRM', '#omie', 'parametro', 'Programa RM integrado'),
('PlanilhaModeloOmie', 'G:\\Meu Drive\\Configurações\\Lynx\\Omie_Produtos_v1_9_5.xlsx', 'parametro', 'Planilha modelo Omie'),
('TravarEmissaoOS', 'Não', 'parametro', 'Flag para travar emissão de OS'),
('OrdemProducaoOmie', 'SIM', 'parametro', 'Flag integração ordem de produção Omie');

-- Verifica inserção
SELECT COUNT(*) as total_configuracoes FROM `configuracaosistema`;
