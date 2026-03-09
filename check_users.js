const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    try {
        const conn = await mysql.createConnection(process.env.DB_URL || {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        const [rows] = await conn.execute("SELECT Login, TipoUsuario FROM usuario LIMIT 5");
        console.log('Usuarios encontrados:', rows);
        process.exit(0);
    } catch (error) {
        console.error('Erro:', error);
        process.exit(1);
    }
})();
