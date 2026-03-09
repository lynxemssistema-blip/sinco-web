const mysql = require('mysql2/promise');

const centralConfig = {
    host: 'lynxlocal.mysql.uhserver.com',
    user: 'lynxlocal',
    password: 'jHAzhFG848@yN@U',
    database: 'lynxlocal',
    port: 3306
};

async function initCentralDB() {
    let connection;
    try {
        console.log('Connecting to central database...');
        connection = await mysql.createConnection(centralConfig);
        console.log('Connected.');

        // 1. Create conexoes_bancos table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS conexoes_bancos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nome_cliente VARCHAR(100) NOT NULL,
                db_host VARCHAR(255) NOT NULL,
                db_user VARCHAR(100) NOT NULL,
                db_pass VARCHAR(255) NOT NULL,
                db_name VARCHAR(100) NOT NULL,
                db_port INT DEFAULT 3306,
                ativo BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Table conexoes_bancos verified/created.');

        // 2. Create usuarios_central table
        // Note: 'login' should be unique. 
        // We link to conexoes_bancos via id_conexao_banco.
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS usuarios_central (
                id INT AUTO_INCREMENT PRIMARY KEY,
                login VARCHAR(100) NOT NULL,
                senha VARCHAR(255) NOT NULL, 
                id_conexao_banco INT NULL, -- Can be NULL for global superadmins
                id_usuario_origem INT,
                superadmin CHAR(1) DEFAULT 'N', -- 'S' for Superadmin
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_login (login),
                FOREIGN KEY (id_conexao_banco) REFERENCES conexoes_bancos(id) ON DELETE SET NULL
            )
        `);
        console.log('Table usuarios_central verified/created.');

        // 3. Ensure 'superadmin' column exists (if table already existed without it)
        try {
            await connection.execute(`
                ALTER TABLE usuarios_central ADD COLUMN superadmin CHAR(1) DEFAULT 'N';
            `);
            console.log("Column 'superadmin' added to usuarios_central.");
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') console.error("Column add warning:", err.message);
        }

        // 3.5. Ensure id_conexao_banco is NULLABLE
        try {
            await connection.execute(`
                ALTER TABLE usuarios_central MODIFY COLUMN id_conexao_banco INT NULL;
            `);
            console.log("Column 'id_conexao_banco' modified to be NULLABLE.");
        } catch (err) {
            console.error("Column modify warning:", err.message);
        }

        // 4. Create Default Superadmin
        const [rows] = await connection.execute("SELECT id FROM usuarios_central WHERE login = 'superadmin'");
        if (rows.length === 0) {
            await connection.execute(`
                INSERT INTO usuarios_central (login, senha, superadmin, id_conexao_banco)
                VALUES ('superadmin', 'SincoMaster2026!', 'S', NULL)
            `);
            console.log('Default superadmin user created in database.');
        }

        console.log('Central database initialization complete.');

    } catch (error) {
        console.error('Error initializing central database:', error);
    } finally {
        if (connection) await connection.end();
    }
}

initCentralDB();
