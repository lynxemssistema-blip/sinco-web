const mysql = require('mysql2/promise');

async function copyData() {
    console.log("Iniciando cópia de dados (amceletrica -> lynxlocal) mapeando colunas comuns...");
    
    let connLocal, connAMC;
    try {
        // Conecta no lynxlocal
        connLocal = await mysql.createConnection({
            host: 'lynxlocal.mysql.uhserver.com',
            user: 'lynxlocal',
            password: 'jHAzhFG848@yN@U',
            database: 'lynxlocal'
        });

        // Busca as credenciais do amceletrica da tabela conexoes_bancos
        const [bancos] = await connLocal.execute("SELECT * FROM conexoes_bancos WHERE db_name = 'amceletrica'");
        if (bancos.length === 0) {
            throw new Error("Credenciais do banco amceletrica não encontradas!");
        }
        const config = bancos[0];

        // Conecta no amceletrica
        connAMC = await mysql.createConnection({
            host: config.db_host,
            user: config.db_user,
            password: config.db_pass,
            database: config.db_name
        });

        async function getCommonColumns(tableName) {
            const [localCols] = await connLocal.query(`SHOW COLUMNS FROM ${tableName}`);
            const [amcCols] = await connAMC.query(`SHOW COLUMNS FROM ${tableName}`);
            
            const localNames = localCols.map(c => c.Field);
            const amcNames = amcCols.map(c => c.Field);
            
            return localNames.filter(name => amcNames.includes(name));
        }

        async function syncTable(tableName) {
            console.log(`\nSincronizando tabela: ${tableName}...`);
            const commonCols = await getCommonColumns(tableName);
            if (commonCols.length === 0) {
                console.log(`Nenhuma coluna em comum encontrada para a tabela ${tableName}. Pulando...`);
                return;
            }
            
            const selectCols = commonCols.map(c => `\`${c}\``).join(', ');
            
            console.log(`Lendo ${tableName} do amceletrica...`);
            const [rows] = await connAMC.execute(`SELECT ${selectCols} FROM ${tableName}`);
            console.log(`Lidas ${rows.length} linhas. Inserindo no lynxlocal...`);

            if (rows.length > 0) {
                const placeholders = commonCols.map(() => '?').join(', ');
                
                let inseridos = 0;
                for (const row of rows) {
                    const values = commonCols.map(c => row[c]);
                    const [res] = await connLocal.query(`INSERT IGNORE INTO ${tableName} (${selectCols}) VALUES (${placeholders})`, values);
                    if (res.affectedRows > 0) inseridos++;
                }
                console.log(`[${tableName}] Cópia concluída! Registros novos inseridos: ${inseridos} de ${rows.length}`);
            }
        }

        // 1. Copiar Projetos
        await syncTable('projetos');

        // 2. Copiar Tags
        await syncTable('tags');

        console.log("\nOperação de cópia finalizada com sucesso!");
    } catch (e) {
        console.error("Erro durante a cópia:", e);
    } finally {
        if (connLocal) await connLocal.end();
        if (connAMC) await connAMC.end();
    }
}

copyData();
