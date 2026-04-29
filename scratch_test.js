const mysql = require('mysql2/promise');
require('dotenv').config({path: '.env'});

(async () => {
    const c = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const [rows] = await c.query("SELECT DataCriacao FROM ordemservicoitemcontrole WHERE TipoApontamento = 'Parcial' ORDER BY DataCriacao DESC LIMIT 1");
    console.log("DataCriacao in node DB driver:", rows[0].DataCriacao);
    console.log("JSON.stringify output:", JSON.stringify(rows[0].DataCriacao));
    c.end();
})();
