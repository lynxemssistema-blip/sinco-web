const mysql = require('mysql2/promise');

async function run() {
    console.log('[+] Iniciando cópia da tabela material: Alfatec2 -> TCM');
    
    let sourcePool, targetPool;
    try {
        sourcePool = mysql.createPool({
            host: 'alfatec2.mysql.uhserver.com',
            user: 'alfateccozinhas',
            password: 'jHAzhFG848@yN@U',
            database: 'alfatec2',
            connectionLimit: 5
        });

        targetPool = mysql.createPool({
            host: 'tcm.mysql.uhserver.com',
            user: 'tcmlafayete',
            password: 'jHAzhFG848@yN@U',
            database: 'tcm',
            connectionLimit: 5
        });

        // 1. Ler os materiais do Alfatec
        console.log('[1] Lendo dados da tabela material do Alfatec2...');
        const [rows] = await sourcePool.execute('SELECT * FROM material');
        console.log(`[!] Foram encontrados ${rows.length} registros no Alfatec2.`);

        if (rows.length === 0) {
            console.log('[-] Nenhum registro encontrado. Abortando.');
            return;
        }

        // 2. Limpar a tabela do TCM
        console.log('[2] Limpando a tabela material do TCM...');
        // Disable foreign key checks temporariamente para o TRUNCATE, caso haja dependências
        const targetConn = await targetPool.getConnection();
        await targetConn.execute('SET FOREIGN_KEY_CHECKS = 0');
        await targetConn.execute("SET SESSION sql_mode = ''");
        await targetConn.execute('TRUNCATE TABLE material');
        await targetConn.execute('SET FOREIGN_KEY_CHECKS = 1');
        
        console.log('[!] Tabela TCM limpa com sucesso.');

        // 3. Inserir os registros
        console.log('[3] Inserindo registros no TCM...');
        
        // Pega as colunas dinamicamente a partir do primeiro registro
        const columns = Object.keys(rows[0]);
        const columnsSql = columns.map(c => `\`${c}\``).join(', ');
        const sql = 'INSERT INTO material (' + columns.map(c => '\`' + c + '\`').join(',') + ') VALUES ?';
        let batch = [];
        let insertedCount = 0;
        for(let i=0; i<rows.length; i++){
            batch.push(columns.map(c => rows[i][c]));
            if(batch.length === 5000 || i === rows.length-1){
                await targetConn.query(sql, [batch]);
                insertedCount += batch.length;
                batch = [];
                console.log(`... Inseridos ${insertedCount}/${rows.length}`);
            }
        }

        targetConn.release();
        console.log(`[+] Cópia concluída com sucesso! Total copiado: ${insertedCount}`);

    } catch (error) {
        console.error('[-] Erro fatal durante a migração:', error);
    } finally {
        if (sourcePool) await sourcePool.end();
        if (targetPool) await targetPool.end();
        process.exit();
    }
}

run();
