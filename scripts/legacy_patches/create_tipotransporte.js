require('dotenv').config();
const mysql = require('mysql2/promise');

const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '3306'),
    multipleStatements: true
};

// Bancos a criar a tabela (lynxlocal + demais tenants)
const databases = [
    'lynxlocal',
    'alfatec',
    'amceletrica'
];

const CREATE_SQL = `
    CREATE TABLE IF NOT EXISTS tipotransporte (
        IdTipoTransporte INT AUTO_INCREMENT PRIMARY KEY,
        TipoVeiculo VARCHAR(80) NOT NULL,
        Placa VARCHAR(10) DEFAULT '',
        DataCadastro VARCHAR(30) DEFAULT '',
        D_E_L_E_T_E VARCHAR(2) DEFAULT '',
        DataD_E_L_E_T_E VARCHAR(30) DEFAULT '',
        UsuarioD_E_L_E_T_E VARCHAR(80) DEFAULT ''
    )
`;

(async () => {
    for (const db of databases) {
        let conn;
        try {
            conn = await mysql.createConnection({ ...config, database: db });
            await conn.execute(CREATE_SQL);
            console.log(`[OK] Tabela 'tipotransporte' criada/verificada em: ${db}`);

            // Verificar se já tem dados
            const [rows] = await conn.execute("SELECT COUNT(*) as cnt FROM tipotransporte WHERE D_E_L_E_T_E = '' OR D_E_L_E_T_E IS NULL");
            console.log(`     -> Registros existentes: ${rows[0].cnt}`);
        } catch (err) {
            console.error(`[ERRO] Banco ${db}: ${err.message}`);
        } finally {
            if (conn) await conn.end();
        }
    }
    console.log('\nMigração concluída.');
})();
