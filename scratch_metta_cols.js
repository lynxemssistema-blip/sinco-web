const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkMetta() {
    const centralDb = await mysql.createConnection({
        host: process.env.DB_HOST || 'lynxlocal.mysql.uhserver.com',
        user: process.env.DB_USER || 'lynxlocal',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const [conexoes] = await centralDb.execute(`SELECT * FROM conexoes_bancos WHERE nome_cliente LIKE '%Metta%'`);
    const mettaConfig = conexoes[0];
    await centralDb.end();

    const mettaDb = await mysql.createConnection({
        host: mettaConfig.db_host,
        user: mettaConfig.db_user,
        password: mettaConfig.db_pass,
        database: mettaConfig.db_name,
        port: mettaConfig.db_port || 3306
    });

    try {
        const [cols] = await mettaDb.execute(`SHOW COLUMNS FROM usuario`);
        console.log(cols.map(c => c.Field).join(', '));
    } catch (e) {
        console.error(e);
    } finally {
        await mettaDb.end();
    }
}

checkMetta();
