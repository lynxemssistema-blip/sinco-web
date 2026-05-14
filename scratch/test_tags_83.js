const mysql = require('mysql2/promise');

async function test() {
    try {
        const central = await mysql.createConnection({
            host: 'lynxlocal.mysql.uhserver.com',
            user: 'lynxlocal',
            password: 'jHAzhFG848@yN@U',
            database: 'lynxlocal'
        });

        const [bancos] = await central.execute("SELECT * FROM conexoes_bancos WHERE db_name = 'amceletrica'");
        const config = bancos[0];
        console.log("DB CONFIG:", config);
        
        const conn = await mysql.createConnection({
            host: config.db_host,
            user: config.db_user,
            password: config.db_pass,
            database: config.db_name
        });

        const [rows] = await conn.execute(`
            SELECT IdTag, Tag, DescTag, IdProjeto, Projeto FROM tags WHERE IdProjeto = 83 OR Projeto = '011244'
        `);
        console.log("TAGS:", rows);

        const [projetos] = await conn.execute(`
            SELECT IdProjeto, Projeto FROM projetos WHERE IdProjeto = 83 OR Projeto = '011244'
        `);
        console.log("PROJETOS:", projetos);

        await conn.end();
        await central.end();
    } catch (e) {
        console.error("ERROR:", e);
    }
}
test();
