require('dotenv').config();
const mysql = require('mysql2/promise');

async function initSchema() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
        multipleStatements: true
    });

    console.log('✅ Conectado ao banco de dados da Hostinger!');
    console.log('📦 Criando tabelas do SINCO-WEB...\n');

    const tables = [
        // 1. usuario
        {
            name: 'usuario',
            sql: `CREATE TABLE IF NOT EXISTS \`usuario\` (
                \`idUsuario\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                \`Login\` VARCHAR(100) NOT NULL UNIQUE,
                \`Senha\` VARCHAR(255) NOT NULL,
                \`NomeCompleto\` VARCHAR(200) DEFAULT NULL,
                \`Email\` VARCHAR(200) DEFAULT NULL,
                \`TipoUsuario\` VARCHAR(10) DEFAULT 'U' COMMENT 'A=Admin, U=User',
                \`Status\` VARCHAR(1) DEFAULT 'A',
                \`DataCriacao\` DATETIME DEFAULT CURRENT_TIMESTAMP,
                \`D_E_L_E_T_E\` VARCHAR(1) DEFAULT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
        },
        // 2. configuracaosistema
        {
            name: 'configuracaosistema',
            sql: `CREATE TABLE IF NOT EXISTS \`configuracaosistema\` (
                \`IdConfig\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                \`NomeEmpresa\` VARCHAR(200) DEFAULT NULL,
                \`LogoEmpresa\` VARCHAR(500) DEFAULT NULL,
                \`MenuConfig\` LONGTEXT DEFAULT NULL COMMENT 'JSON menu structure',
                \`ProcessosVisiveis\` TEXT DEFAULT NULL COMMENT 'JSON array of visible processes',
                \`RestringirApontamentoSemSaldoAnterior\` VARCHAR(3) DEFAULT 'Nao',
                \`DataCriacao\` DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
        },
        // 3. pessoajuridica
        {
            name: 'pessoajuridica',
            sql: `CREATE TABLE IF NOT EXISTS \`pessoajuridica\` (
                \`IdPessoa\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                \`RazaoSocial\` VARCHAR(200) NOT NULL,
                \`NomeFantasia\` VARCHAR(200) DEFAULT NULL,
                \`Segmento\` VARCHAR(100) DEFAULT NULL,
                \`Endereco\` VARCHAR(300) DEFAULT NULL,
                \`Numero\` VARCHAR(20) DEFAULT NULL,
                \`Bairro\` VARCHAR(100) DEFAULT NULL,
                \`Complemento\` VARCHAR(100) DEFAULT NULL,
                \`Cidade\` VARCHAR(100) DEFAULT NULL,
                \`Estado\` VARCHAR(2) DEFAULT NULL,
                \`Cep\` VARCHAR(10) DEFAULT NULL,
                \`CodPais\` VARCHAR(5) DEFAULT NULL,
                \`CodArea\` VARCHAR(5) DEFAULT NULL,
                \`Telefone\` VARCHAR(20) DEFAULT NULL,
                \`CodArea2\` VARCHAR(5) DEFAULT NULL,
                \`Celular\` VARCHAR(20) DEFAULT NULL,
                \`Cnpj\` VARCHAR(20) DEFAULT NULL,
                \`InscMunicipal\` VARCHAR(30) DEFAULT NULL,
                \`InscEst\` VARCHAR(30) DEFAULT NULL,
                \`Email\` VARCHAR(200) DEFAULT NULL,
                \`Responsavel\` VARCHAR(200) DEFAULT NULL,
                \`EnderecoLogo\` VARCHAR(500) DEFAULT NULL,
                \`DtCad\` DATETIME DEFAULT NULL,
                \`DtAlteracao\` DATETIME DEFAULT NULL,
                \`D_E_L_E_T_E\` VARCHAR(1) DEFAULT NULL,
                \`DataD_E_L_E_T_E\` DATETIME DEFAULT NULL,
                \`UsuarioD_E_L_E_T_E\` VARCHAR(100) DEFAULT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
        },
        // 4. medida
        {
            name: 'medida',
            sql: `CREATE TABLE IF NOT EXISTS \`medida\` (
                \`IdMedida\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                \`TipoMedida\` VARCHAR(3) NOT NULL,
                \`DescMedida\` VARCHAR(100) DEFAULT NULL,
                \`IdEmpresa\` INT DEFAULT NULL,
                \`DataCriacao\` DATETIME DEFAULT NULL,
                \`CriadoPor\` VARCHAR(100) DEFAULT NULL,
                \`D_E_L_E_T_E\` VARCHAR(1) DEFAULT NULL,
                \`DataD_E_L_E_T_E\` DATETIME DEFAULT NULL,
                \`UsuarioD_E_L_E_T_E\` VARCHAR(100) DEFAULT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
        },
        // 5. familia
        {
            name: 'familia',
            sql: `CREATE TABLE IF NOT EXISTS \`familia\` (
                \`IdFamilia\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                \`DescFamilia\` VARCHAR(50) NOT NULL,
                \`IdEmpresa\` INT DEFAULT NULL,
                \`DataCriacao\` DATETIME DEFAULT NULL,
                \`CriadoPor\` VARCHAR(100) DEFAULT NULL,
                \`D_E_L_E_T_E\` VARCHAR(1) DEFAULT NULL,
                \`DataD_E_L_E_T_E\` DATETIME DEFAULT NULL,
                \`UsuarioD_E_L_E_T_E\` VARCHAR(100) DEFAULT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
        },
        // 6. acabamento
        {
            name: 'acabamento',
            sql: `CREATE TABLE IF NOT EXISTS \`acabamento\` (
                \`IDAcabamento\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                \`DescAcabamento\` VARCHAR(200) NOT NULL,
                \`Status\` VARCHAR(1) DEFAULT 'A',
                \`IdEmpresa\` INT DEFAULT NULL,
                \`DataCriacao\` DATETIME DEFAULT NULL,
                \`CriadoPor\` VARCHAR(100) DEFAULT NULL,
                \`D_E_L_E_T_E\` VARCHAR(1) DEFAULT NULL,
                \`DataD_E_L_E_T_E\` DATETIME DEFAULT NULL,
                \`UsuarioD_E_L_E_T_E\` VARCHAR(100) DEFAULT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
        },
        // 7. material
        {
            name: 'material',
            sql: `CREATE TABLE IF NOT EXISTS \`material\` (
                \`IdMaterial\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                \`CodMatFabricante\` VARCHAR(100) NOT NULL UNIQUE,
                \`DescResumo\` VARCHAR(200) DEFAULT NULL,
                \`DescDetal\` TEXT DEFAULT NULL,
                \`NumeroRP\` VARCHAR(50) DEFAULT NULL,
                \`FamiliaMat\` INT DEFAULT NULL,
                \`CodigoJuridicoMat\` INT DEFAULT NULL,
                \`Peso\` DECIMAL(10,4) DEFAULT NULL,
                \`Unidade\` VARCHAR(10) DEFAULT NULL,
                \`Altura\` DECIMAL(10,4) DEFAULT NULL,
                \`Largura\` DECIMAL(10,4) DEFAULT NULL,
                \`Profundidade\` DECIMAL(10,4) DEFAULT NULL,
                \`Valor\` DECIMAL(15,4) DEFAULT NULL,
                \`PercICMS\` DECIMAL(8,4) DEFAULT NULL,
                \`vICMS\` DECIMAL(15,4) DEFAULT NULL,
                \`PercIPI\` DECIMAL(8,4) DEFAULT NULL,
                \`vIPI\` DECIMAL(15,4) DEFAULT NULL,
                \`vLiquido\` DECIMAL(15,4) DEFAULT NULL,
                \`acabamento\` VARCHAR(100) DEFAULT NULL,
                \`ImagemProduto\` VARCHAR(500) DEFAULT NULL,
                \`DtCad\` DATETIME DEFAULT NULL,
                \`UsuarioCriacao\` VARCHAR(100) DEFAULT NULL,
                \`DtAlteracao\` DATETIME DEFAULT NULL,
                \`UsuarioAlteracao\` VARCHAR(100) DEFAULT NULL,
                \`D_E_L_E_T_E\` VARCHAR(1) DEFAULT NULL,
                \`DataD_E_L_E_T_E\` DATETIME DEFAULT NULL,
                \`UsuarioD_E_L_E_T_E\` VARCHAR(100) DEFAULT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
        },
        // 8. tipoproduto
        {
            name: 'tipoproduto',
            sql: `CREATE TABLE IF NOT EXISTS \`tipoproduto\` (
                \`IdTipoProduto\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                \`TipoProduto\` VARCHAR(100) NOT NULL,
                \`Unidade\` VARCHAR(20) DEFAULT NULL,
                \`Descricao\` TEXT DEFAULT NULL,
                \`DataCriacao\` DATETIME DEFAULT NULL,
                \`CriadoPor\` VARCHAR(100) DEFAULT NULL,
                \`D_E_L_E_T_E\` VARCHAR(1) DEFAULT NULL,
                \`DataD_E_L_E_T_E\` DATETIME DEFAULT NULL,
                \`UsuarioD_E_L_E_T_E\` VARCHAR(100) DEFAULT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
        },
        // 9. projetos
        {
            name: 'projetos',
            sql: `CREATE TABLE IF NOT EXISTS \`projetos\` (
                \`IdProjeto\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                \`Projeto\` VARCHAR(100) NOT NULL,
                \`DescProjeto\` TEXT DEFAULT NULL,
                \`ClienteProjeto\` VARCHAR(200) DEFAULT NULL,
                \`Responsavel\` VARCHAR(200) DEFAULT NULL,
                \`DataPrevisao\` DATE DEFAULT NULL,
                \`PrazoEntrega\` DATE DEFAULT NULL,
                \`StatusProj\` VARCHAR(5) DEFAULT 'AT',
                \`DescStatus\` VARCHAR(50) DEFAULT 'Ativo',
                \`Descricao\` TEXT DEFAULT NULL,
                \`DescEmpresa\` VARCHAR(200) DEFAULT NULL,
                \`Finalizado\` VARCHAR(1) DEFAULT '0',
                \`DataCriacao\` DATETIME DEFAULT NULL,
                \`CriadoPor\` VARCHAR(100) DEFAULT NULL,
                \`D_E_L_E_T_E\` VARCHAR(1) DEFAULT NULL,
                \`DataD_E_L_E_T_E\` DATETIME DEFAULT NULL,
                \`UsuarioD_E_L_E_T_E\` VARCHAR(100) DEFAULT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
        },
        // 10. tags
        {
            name: 'tags',
            sql: `CREATE TABLE IF NOT EXISTS \`tags\` (
                \`IdTag\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                \`Tag\` VARCHAR(100) NOT NULL,
                \`DescTag\` TEXT DEFAULT NULL,
                \`IdProjeto\` INT DEFAULT NULL,
                \`Projeto\` VARCHAR(100) DEFAULT NULL,
                \`DataPrevisao\` DATE DEFAULT NULL,
                \`TipoProduto\` VARCHAR(100) DEFAULT NULL,
                \`UnidadeProduto\` VARCHAR(20) DEFAULT NULL,
                \`QtdeTag\` DECIMAL(10,2) DEFAULT NULL,
                \`QtdeLiberada\` DECIMAL(10,2) DEFAULT NULL,
                \`SaldoTag\` DECIMAL(10,2) DEFAULT NULL,
                \`ValorTag\` DECIMAL(15,4) DEFAULT NULL,
                \`StatusTag\` INT DEFAULT 1,
                \`DescStatus\` VARCHAR(50) DEFAULT 'Ativo',
                \`Finalizado\` VARCHAR(1) DEFAULT '0',
                \`CriadoPor\` VARCHAR(100) DEFAULT NULL,
                \`D_E_L_E_T_E\` VARCHAR(1) DEFAULT NULL,
                \`DataD_E_L_E_T_E\` DATETIME DEFAULT NULL,
                \`UsuarioD_E_L_E_T_E\` VARCHAR(100) DEFAULT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
        },
        // 11. ordemservico
        {
            name: 'ordemservico',
            sql: `CREATE TABLE IF NOT EXISTS \`ordemservico\` (
                \`IdOrdemServico\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                \`Projeto\` VARCHAR(100) DEFAULT NULL,
                \`Tag\` VARCHAR(100) DEFAULT NULL,
                \`DescTag\` TEXT DEFAULT NULL,
                \`Descricao\` TEXT DEFAULT NULL,
                \`Estatus\` VARCHAR(50) DEFAULT NULL,
                \`DataPrevisao\` DATE DEFAULT NULL,
                \`DataCriacao\` DATETIME DEFAULT NULL,
                \`CriadoPor\` VARCHAR(100) DEFAULT NULL,
                \`Liberado_Engenharia\` VARCHAR(1) DEFAULT '0',
                \`Data_Liberacao_Engenharia\` DATETIME DEFAULT NULL,
                \`QtdeTotalItens\` INT DEFAULT 0,
                \`QtdeItensExecutados\` INT DEFAULT 0,
                \`PercentualItens\` DECIMAL(5,2) DEFAULT 0,
                \`QtdeTotalPecas\` DECIMAL(10,2) DEFAULT 0,
                \`QtdePecasExecutadas\` DECIMAL(10,2) DEFAULT 0,
                \`PercentualPecas\` DECIMAL(5,2) DEFAULT 0,
                \`PesoTotal\` DECIMAL(10,4) DEFAULT NULL,
                \`AreaPinturaTotal\` DECIMAL(10,4) DEFAULT NULL,
                \`OrdemServicoFinalizado\` VARCHAR(1) DEFAULT '0',
                \`DataFinalizado\` DATETIME DEFAULT NULL,
                \`IdProjeto\` INT DEFAULT NULL,
                \`IdTag\` INT DEFAULT NULL,
                \`DescEmpresa\` VARCHAR(200) DEFAULT NULL,
                \`EnderecoOrdemServico\` VARCHAR(500) DEFAULT NULL,
                \`PlanejadoInicioCorte\` DATE DEFAULT NULL, \`PlanejadoFinalCorte\` DATE DEFAULT NULL,
                \`RealizadoInicioCorte\` DATE DEFAULT NULL, \`RealizadoFinalCorte\` DATE DEFAULT NULL,
                \`PlanejadoInicioDobra\` DATE DEFAULT NULL, \`PlanejadoFinalDobra\` DATE DEFAULT NULL,
                \`RealizadoInicioDobra\` DATE DEFAULT NULL, \`RealizadoFinalDobra\` DATE DEFAULT NULL,
                \`PlanejadoInicioSolda\` DATE DEFAULT NULL, \`PlanejadoFinalSolda\` DATE DEFAULT NULL,
                \`RealizadoInicioSolda\` DATE DEFAULT NULL, \`RealizadoFinalSolda\` DATE DEFAULT NULL,
                \`PlanejadoInicioPintura\` DATE DEFAULT NULL, \`PlanejadoFinalPintura\` DATE DEFAULT NULL,
                \`RealizadoInicioPintura\` DATE DEFAULT NULL, \`RealizadoFinalPintura\` DATE DEFAULT NULL,
                \`PlanejadoInicioMontagem\` DATE DEFAULT NULL, \`PlanejadoFinalMontagem\` DATE DEFAULT NULL,
                \`RealizadoInicioMontagem\` DATE DEFAULT NULL, \`RealizadoFinalMontagem\` DATE DEFAULT NULL,
                \`PlanejadoInicioENGENHARIA\` DATE DEFAULT NULL, \`PlanejadoFinalENGENHARIA\` DATE DEFAULT NULL,
                \`RealizadoInicioENGENHARIA\` DATE DEFAULT NULL, \`RealizadoFinalENGENHARIA\` DATE DEFAULT NULL,
                \`PlanejadoInicioACABAMENTO\` DATE DEFAULT NULL, \`PlanejadoFinalACABAMENTO\` DATE DEFAULT NULL,
                \`RealizadoInicioACABAMENTO\` DATE DEFAULT NULL, \`RealizadoFinalACABAMENTO\` DATE DEFAULT NULL,
                \`D_E_L_E_T_E\` VARCHAR(1) DEFAULT NULL,
                \`DataD_E_L_E_T_E\` DATETIME DEFAULT NULL,
                \`UsuarioD_E_L_E_T_E\` VARCHAR(100) DEFAULT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
        },
        // 12. ordemservicoitem
        {
            name: 'ordemservicoitem',
            sql: `CREATE TABLE IF NOT EXISTS \`ordemservicoitem\` (
                \`IdOrdemServicoItem\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                \`IdOrdemServico\` INT DEFAULT NULL,
                \`CodMatFabricante\` VARCHAR(100) DEFAULT NULL,
                \`DescResumo\` VARCHAR(200) DEFAULT NULL,
                \`DescDetal\` TEXT DEFAULT NULL,
                \`QtdeTotal\` DECIMAL(10,2) DEFAULT NULL,
                \`Peso\` DECIMAL(10,4) DEFAULT NULL,
                \`AreaPintura\` DECIMAL(10,4) DEFAULT NULL,
                \`Acabamento\` VARCHAR(100) DEFAULT NULL,
                \`Unidade\` VARCHAR(10) DEFAULT NULL,
                \`Espessura\` VARCHAR(50) DEFAULT NULL,
                \`Altura\` DECIMAL(10,4) DEFAULT NULL,
                \`Largura\` DECIMAL(10,4) DEFAULT NULL,
                \`MaterialSW\` VARCHAR(100) DEFAULT NULL,
                \`EnderecoArquivo\` VARCHAR(500) DEFAULT NULL,
                \`IdPlanodecorte\` VARCHAR(100) DEFAULT NULL,
                \`OrdemServicoItemFinalizado\` VARCHAR(1) DEFAULT '0',
                \`Liberado_engenharia\` VARCHAR(1) DEFAULT NULL,
                \`ProdutoPrincipal\` VARCHAR(10) DEFAULT NULL,
                \`txtCorte\` VARCHAR(1) DEFAULT '0',
                \`sttxtCorte\` VARCHAR(50) DEFAULT NULL,
                \`CortePercentual\` DECIMAL(5,2) DEFAULT 0,
                \`txtDobra\` VARCHAR(1) DEFAULT '0',
                \`sttxtDobra\` VARCHAR(50) DEFAULT NULL,
                \`DobraPercentual\` DECIMAL(5,2) DEFAULT 0,
                \`txtSolda\` VARCHAR(1) DEFAULT '0',
                \`sttxtSolda\` VARCHAR(50) DEFAULT NULL,
                \`SoldaPercentual\` DECIMAL(5,2) DEFAULT 0,
                \`txtPintura\` VARCHAR(1) DEFAULT '0',
                \`sttxtPintura\` VARCHAR(50) DEFAULT NULL,
                \`PinturaPercentual\` DECIMAL(5,2) DEFAULT 0,
                \`TxtMontagem\` VARCHAR(1) DEFAULT '0',
                \`sttxtMontagem\` VARCHAR(50) DEFAULT NULL,
                \`MontagemPercentual\` DECIMAL(5,2) DEFAULT 0,
                \`D_E_L_E_T_E\` VARCHAR(1) DEFAULT NULL,
                \`DataD_E_L_E_T_E\` DATETIME DEFAULT NULL,
                \`UsuarioD_E_L_E_T_E\` VARCHAR(100) DEFAULT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
        },
        // 13. ordemservicoitemcontrole
        {
            name: 'ordemservicoitemcontrole',
            sql: `CREATE TABLE IF NOT EXISTS \`ordemservicoitemcontrole\` (
                \`IdOrdemServicoItemControle\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                \`IdOrdemServico\` INT DEFAULT NULL,
                \`IdOrdemServicoItem\` INT DEFAULT NULL,
                \`Processo\` VARCHAR(50) DEFAULT NULL,
                \`QtdeTotal\` VARCHAR(20) DEFAULT NULL,
                \`QtdeProduzida\` VARCHAR(20) DEFAULT NULL,
                \`QtdeFaltante\` VARCHAR(20) DEFAULT NULL,
                \`CriadoPor\` VARCHAR(100) DEFAULT NULL,
                \`DataCriacao\` DATETIME DEFAULT NULL,
                \`Situacao\` VARCHAR(50) DEFAULT NULL,
                \`DescricaoEstorno\` TEXT DEFAULT NULL,
                \`D_E_L_E_T_E\` VARCHAR(1) DEFAULT NULL,
                \`DataD_E_L_E_T_E\` DATETIME DEFAULT NULL,
                \`UsuarioD_E_L_E_T_E\` VARCHAR(100) DEFAULT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
        }
    ];

    let created = 0;
    for (const table of tables) {
        try {
            await conn.execute(table.sql);
            console.log(`  ✅ Tabela '${table.name}' criada/verificada.`);
            created++;
        } catch (err) {
            console.log(`  ❌ Erro na tabela '${table.name}': ${err.message}`);
        }
    }

    // Insert default admin user
    console.log('\n👤 Inserindo usuário admin padrão...');
    try {
        await conn.execute(
            `INSERT IGNORE INTO \`usuario\` (\`Login\`, \`Senha\`, \`NomeCompleto\`, \`TipoUsuario\`) VALUES (?, ?, ?, ?)`,
            ['admin', 'admin123', 'Administrador', 'A']
        );
        console.log('  ✅ Usuário admin inserido (Login: admin / Senha: admin123).');
    } catch (err) {
        console.log('  ⚠️  Admin já existe ou erro:', err.message);
    }

    // Insert default system config
    console.log('\n⚙️  Inserindo configuração padrão do sistema...');
    try {
        await conn.execute(
            `INSERT IGNORE INTO \`configuracaosistema\` (\`IdConfig\`, \`NomeEmpresa\`, \`RestringirApontamentoSemSaldoAnterior\`) VALUES (1, 'SINCO-WEB', 'Nao')`
        );
        console.log('  ✅ Configuração do sistema inserida.');
    } catch (err) {
        console.log('  ⚠️  Configuração já existe ou erro:', err.message);
    }

    await conn.end();

    console.log(`\n🎉 Schema inicializado! ${created}/${tables.length} tabelas prontas.`);
    console.log('\n📋 Tabelas criadas:');
    tables.forEach(t => console.log(`   - ${t.name}`));
    console.log('\nAgora você pode iniciar o servidor com: node src/server.js');
}

initSchema().catch(console.error);
