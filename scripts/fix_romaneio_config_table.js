require('dotenv').config();
const mysql = require('mysql2/promise');

const CENTRAL_CONFIG = {
    host: process.env.CENTRAL_DB_HOST || 'lynxlocal.mysql.uhserver.com',
    user: process.env.CENTRAL_DB_USER || 'lynxlocal_root',
    password: process.env.CENTRAL_DB_PASS || 'lynx@2022',
    database: process.env.CENTRAL_DB_NAME || 'lynxlocal',
    port: 3306
};

async function fixTenantConfigs() {
    let centralConn;
    try {
        console.log('🔌 Connecting to Central DB...');
        centralConn = await mysql.createConnection(CENTRAL_CONFIG);

        // 1. Get all tenants
        const [tenants] = await centralConn.execute('SELECT * FROM conexoes_bancos');
        console.log(`📋 Found ${tenants.length} tenants.`);

        for (const tenant of tenants) {
            console.log(`\n--------------------------------------------`);
            console.log(`🏢 Processing Tenant: ${tenant.nome_cliente} (${tenant.db_name})`);

            let tenantConn;
            try {
                tenantConn = await mysql.createConnection({
                    host: tenant.db_host,
                    user: tenant.db_user,
                    password: tenant.db_pass,
                    database: tenant.db_name,
                    port: tenant.db_port || 3306
                });

                // 2. Check/Create Table
                const createTableSQL = `
                    CREATE TABLE IF NOT EXISTS configuracaosistema (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        chave VARCHAR(191) NOT NULL UNIQUE,
                        valor TEXT,
                        descricao TEXT,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                `;
                await tenantConn.execute(createTableSQL);
                console.log(`   ✅ Table 'configuracaosistema' ensured.`);

                // 3. Check/Insert Default Config
                const [existing] = await tenantConn.execute(
                    "SELECT id FROM configuracaosistema WHERE chave = 'EnderecoPastaRaizRomaneio'"
                );

                if (existing.length === 0) {
                    await tenantConn.execute(
                        "INSERT INTO configuracaosistema (chave, valor, descricao) VALUES (?, ?, ?)",
                        ['EnderecoPastaRaizRomaneio', 'C:\\Romaneios', 'Caminho raiz para salvar PDFs dos romaneios']
                    );
                    console.log(`   ✅ Default config 'EnderecoPastaRaizRomaneio' inserted.`);
                } else {
                    console.log(`   ℹ️ Config 'EnderecoPastaRaizRomaneio' already exists.`);
                }

            } catch (err) {
                console.error(`   ❌ Error processing tenant ${tenant.nome_cliente}:`, err.message);
            } finally {
                if (tenantConn) await tenantConn.end();
            }
        }

    } catch (error) {
        console.error('CRITICAL ERROR:', error);
    } finally {
        if (centralConn) await centralConn.end();
        console.log('\n🏁 Done.');
    }
}

fixTenantConfigs();
