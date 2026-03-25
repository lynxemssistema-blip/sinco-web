const db = require('./src/config/db');

async function checkConfig() {
    try {
        db.initPool({
            host: 'lynxlocal.mysql.uhserver.com',
            user: 'lynxlocal',
            password: 'Sinco2026()()',
            database: 'lynxlocal',
            port: 3306
        });
        
        const [rows] = await db.executeOnDefault("SELECT chave, valor FROM configuracaosistema WHERE chave LIKE '%template%' OR chave LIKE '%Excel%' OR chave LIKE '%Endereco%'");
        console.log("Configurações Encontradas:");
        rows.forEach(r => console.log(r.chave, "=>", r.valor));
    } catch(e) {
        console.log(e);
    } finally {
        process.exit(0);
    }
}
checkConfig();
