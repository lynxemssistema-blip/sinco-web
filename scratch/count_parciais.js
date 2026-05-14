const mysql = require('mysql2/promise');
async function run() {
    const connLocal = await mysql.createConnection({ host: 'lynxlocal.mysql.uhserver.com', user: 'lynxlocal', password: 'jHAzhFG848@yN@U', database: 'lynxlocal' });
    const [bancos] = await connLocal.execute("SELECT * FROM conexoes_bancos WHERE db_name = 'amceletrica'");
    const config = bancos[0];
    const connAMC = await mysql.createConnection({ host: config.db_host, user: config.db_user, password: config.db_pass, database: config.db_name });
    const [cols] = await connAMC.query("SHOW COLUMNS FROM ordemservicoitemcontrole");
    console.log("AMC COLUMNS:", cols.map(c => c.Field).join(', '));
    process.exit(0);
}
run();
