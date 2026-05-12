const db = require('c:/SincoWeb/SINCO-WEB/SINCO-WEB/src/config/db');

async function testInit() {
    try {
        console.log('Starting init-db logic...');
        
        // 1. Create tables
        await db.query(`
            CREATE TABLE IF NOT EXISTS pixeasy (
                IdDado INT AUTO_INCREMENT PRIMARY KEY, 
                IdPlanilha INT, 
                Revisao INT, 
                IdProjeto INT, 
                IdTag INT, 
                NomeProjeto VARCHAR(255), 
                NomeTag VARCHAR(255), 
                NomePlanilha VARCHAR(255), 
                Function_name VARCHAR(255), 
                GCR VARCHAR(255), 
                UG_SBU VARCHAR(255), 
                UG_SBU_Description TEXT, 
                UG_SBU_Quantity DECIMAL(18,4), 
                Referencia VARCHAR(255), 
                Referencia_P VARCHAR(255), 
                Reference_description TEXT, 
                Reference_quantity DECIMAL(18,4), 
                Unit VARCHAR(50), 
                Tipo_de_referencia VARCHAR(255),
                D_E_L_E_T_E VARCHAR(1) DEFAULT NULL
            )
        `);
        console.log('pixeasy table checked.');

        await db.query(`
            CREATE TABLE IF NOT EXISTS AglutinacaoPixeasy (
                IdAglutinacao INT AUTO_INCREMENT PRIMARY KEY,
                CodMatFabricante VARCHAR(100), 
                UG_SBU_Quantity DECIMAL(18,4), 
                Reference_quantity DECIMAL(18,4), 
                DataAglutinacao VARCHAR(20), 
                IdProjeto INT, 
                IdTag INT, 
                NomeProjeto VARCHAR(255), 
                NomeTag VARCHAR(255), 
                NomePlanilha VARCHAR(255), 
                Revisao INT
            )
        `);
        console.log('AglutinacaoPixeasy table checked.');

        const tablesToAlter = ["pixeasy", "AglutinacaoPixeasy", "DadosBlockSet", "PlanilhasBlockSet", "AglutinacaoBlockSet"];
        const columnsToAdd = [
            { name: "NomeProjeto", type: "VARCHAR(255)" },
            { name: "NomeTag", type: "VARCHAR(255)" },
            { name: "Revisao", type: "INT DEFAULT 0" },
            { name: "Referencia", type: "VARCHAR(255)" },
            { name: "Referencia_P", type: "VARCHAR(255)" }
        ];

        for (const table of tablesToAlter) {
            for (const col of columnsToAdd) {
                try {
                    await db.query(`ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.type}`);
                    console.log(`Added ${col.name} to ${table}`);
                } catch (e) {
                    if (e.errno === 1060) {
                        console.log(`${col.name} already in ${table}`);
                    } else {
                        console.error(`Error in ${table} / ${col.name}:`, e.message);
                    }
                }
            }
        }

        console.log('Init DB logic finished.');
        process.exit(0);
    } catch (e) {
        console.error('CRITICAL ERROR:', e);
        process.exit(1);
    }
}

testInit();
