const db = require('c:\\SincoWeb\\SINCO-WEB\\SINCO-WEB\\src\\config\\db');

async function updateSchema() {
    try {
        console.log('Adicionando coluna Revisao na tabela PlanilhasBlockSet...');
        await db.query(`
            ALTER TABLE PlanilhasBlockSet
            ADD COLUMN Revisao INT DEFAULT 0 AFTER DataImportacao;
        `);
        console.log('Coluna Revisao adicionada com sucesso.');
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('A coluna Revisao já existe na tabela.');
        } else {
            console.error('Erro ao adicionar coluna:', err.message);
        }
    } finally {
        process.exit(0);
    }
}

updateSchema();
