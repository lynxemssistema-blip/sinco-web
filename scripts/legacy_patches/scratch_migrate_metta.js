const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateMetta() {
    // 1. Connect to Lynxlocal (Central)
    const centralDb = await mysql.createConnection({
        host: process.env.DB_HOST || 'lynxlocal.mysql.uhserver.com',
        user: process.env.DB_USER || 'lynxlocal',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    // 2. Get connection details for Metta
    const [conexoes] = await centralDb.execute(`SELECT * FROM conexoes_bancos WHERE nome_cliente LIKE '%Metta%'`);
    if (conexoes.length === 0) {
        console.error("Metta database not found in conexoes_bancos.");
        return;
    }
    const mettaConfig = conexoes[0];
    const id_conexao_banco = mettaConfig.id;

    console.log(`Found Metta DB configuration: ID ${id_conexao_banco}`);

    // 3. Connect to Metta
    const mettaDb = await mysql.createConnection({
        host: mettaConfig.db_host,
        user: mettaConfig.db_user,
        password: mettaConfig.db_pass,
        database: mettaConfig.db_name,
        port: mettaConfig.db_port || 3306
    });

    try {
        // Adicionar colunas caso nao existam no mettapaineis
        try {
            await mettaDb.execute(`ALTER TABLE usuario ADD COLUMN SuperAdmin INT DEFAULT 0`);
            console.log("Added SuperAdmin column");
        } catch(e) {}
        try {
            await mettaDb.execute(`ALTER TABLE usuario ADD COLUMN IdMatriz INT DEFAULT NULL`);
            console.log("Added IdMatriz column");
        } catch(e) {}

        // 4. Fetch all users from Metta
        const [usuarios] = await mettaDb.execute(`SELECT idUsuario, Login, Senha, SuperAdmin, Status, IdMatriz FROM usuario`);
        console.log(`Found ${usuarios.length} users in Metta. Migrating to Central...`);

        // 5. Insert/Update into usuarios_central
        for (const user of usuarios) {
            const login = user.Login || `user_${user.idUsuario}`;
            const senha = user.Senha || '';
            const id_usuario_origem = user.idUsuario;
            const superadmin = user.SuperAdmin ? 1 : 0;
            const ativo = (user.Status === 'Ativo' || user.Status === '1' || user.Status === 1) ? 1 : 0;
            const idMatriz = user.IdMatriz || null;

            // Check if user already exists
            const [existing] = await centralDb.execute(
                `SELECT id FROM usuarios_central WHERE id_conexao_banco = ? AND id_usuario_origem = ?`,
                [id_conexao_banco, id_usuario_origem]
            );

            if (existing.length > 0) {
                // Update
                await centralDb.execute(
                    `UPDATE usuarios_central 
                     SET login = ?, senha = ?, superadmin = ?, ativo = ?, IdMatriz = ?, updated_at = NOW()
                     WHERE id = ?`,
                    [login, senha, superadmin, ativo, idMatriz, existing[0].id]
                );
                console.log(`Updated user ${login} (origem: ${id_usuario_origem})`);
            } else {
                // Insert
                await centralDb.execute(
                    `INSERT INTO usuarios_central 
                     (login, senha, id_conexao_banco, id_usuario_origem, superadmin, ativo, IdMatriz, created_at, updated_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                    [login, senha, id_conexao_banco, id_usuario_origem, superadmin, ativo, idMatriz]
                );
                console.log(`Inserted user ${login} (origem: ${id_usuario_origem})`);
            }
        }
        
        console.log("Migration completed successfully.");

    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await mettaDb.end();
        await centralDb.end();
    }
}

migrateMetta();
