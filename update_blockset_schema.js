const db = require('c:\\SincoWeb\\SINCO-WEB\\SINCO-WEB\\src\\config\\db');

async function updateSchema() {
    try {
        console.log('Adicionando colunas IdProjeto, IdTag e NomePlanilha na tabela DadosBlockSet...');
        
        console.log('Adicionando NomeArquivoLido em PlanilhasBlockSet...');
        
        await db.query(`
            ALTER TABLE PlanilhasBlockSet
            ADD COLUMN NomeArquivoLido VARCHAR(255);
        `);
        console.log('Coluna NomeArquivoLido adicionada à PlanilhasBlockSet.');
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Alguma das colunas já existe na tabela.');
        } else {
            console.error('Erro ao adicionar colunas:', err.message);
        }
    } finally {
        process.exit(0);
    }
}

updateSchema();
