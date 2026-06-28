const mysql = require('mysql2/promise');
require('dotenv').config();

async function test() {
    const pool = mysql.createPool({
        host: process.env.CENTRAL_DB_HOST || 'lynxlocal.mysql.uhserver.com',
        user: process.env.CENTRAL_DB_USER || 'lynxlocal_root',
        password: process.env.CENTRAL_DB_PASS || 'lynx@2022',
        database: 'alfatec2'
    });
    
    const [rows1] = await pool.query("SELECT QtdePecasOS, QtdeTotalPecas, qtdetotal FROM tags WHERE IdTag = 6743");
    console.log("alfatec2 tags 6743", rows1);
    
    const [rows2] = await pool.query("SELECT IdOrdemServico, QtdeTotalPecas FROM ordemservico WHERE IdOrdemServico = 5047");
    console.log("alfatec2 OS 5047", rows2);
    
    process.exit();
}

test();
