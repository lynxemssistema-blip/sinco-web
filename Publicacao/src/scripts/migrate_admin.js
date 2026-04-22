const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, // lynxlocal
    port: process.env.DB_PORT || 3306
};

async function migrateAdmin() {
    let conn;
    try {
        conn = await mysql.createConnection(dbConfig);
        console.log(`Connected to ${dbConfig.database}`);

        // 1. Get Local Admin
        const [localAdmins] = await conn.execute("SELECT * FROM usuario WHERE Login = 'Admin' OR TipoUsuario = 'A'");

        if (localAdmins.length === 0) {
            console.log("No local admin found to migrate.");
            return;
        }

        console.log(`Found ${localAdmins.length} local admins to migrate.`);

        // 2. Insert/Update in Central
        for (const admin of localAdmins) {
            console.log(`Migrating local admin: ${admin.Login}`);

            // Check if exists in central
            const [existing] = await conn.execute("SELECT id FROM usuarios_central WHERE login = ?", [admin.Login]);

            if (existing.length > 0) {
                // Update to be Superadmin
                await conn.execute(`
                    UPDATE usuarios_central 
                    SET senha = ?, superadmin = 'S', updated_at = NOW() 
                    WHERE id = ?`,
                    [admin.Senha, existing[0].id]
                );
                console.log(`Updated ${admin.Login} to Superadmin in Central DB.`);
            } else {
                // Insert as Superadmin
                await conn.execute(`
                    INSERT INTO usuarios_central (login, senha, superadmin, id_conexao_banco) 
                    VALUES (?, ?, 'S', NULL)`,
                    [admin.Login, admin.Senha]
                );
                console.log(`Inserted ${admin.Login} as Superadmin into Central DB.`);
            }
        }

        console.log("Migration complete.");

    } catch (err) {
        console.error('Migration Error:', err);
    } finally {
        if (conn) await conn.end();
    }
}

migrateAdmin();
