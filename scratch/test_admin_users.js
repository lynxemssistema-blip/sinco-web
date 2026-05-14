const mysql = require('mysql2/promise');

async function test() {
    try {
        const conn = await mysql.createConnection({
            host: 'lynxlocal.mysql.uhserver.com',
            user: 'lynxlocal',
            password: 'jHAzhFG848@yN@U',
            database: 'lynxlocal'
        });

        const [rows] = await conn.execute(`
            SELECT u.id, u.login, u.superadmin, u.created_at, u.id_conexao_banco, 
                   c.nome_cliente, c.db_name 
            FROM usuarios_central u
            LEFT JOIN conexoes_bancos c ON u.id_conexao_banco = c.id
            ORDER BY u.superadmin DESC, u.login ASC
        `);
        console.log("USERS:", rows);
        await conn.end();
    } catch (e) {
        console.error("ERROR:", e);
    }
}
test();
