const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

const API_URL = 'http://localhost:3000/api/romaneio';

const CENTRAL_CONFIG = {
    host: process.env.CENTRAL_DB_HOST || 'lynxlocal.mysql.uhserver.com',
    user: process.env.CENTRAL_DB_USER || 'lynxlocal',
    password: process.env.CENTRAL_DB_PASS || 'jHAzhFG848@yN@U', // Using .env value directly just in case
    database: process.env.CENTRAL_DB_NAME || 'lynxlocal',
    port: 3306
};

async function getTenantConnection(tenantName) {
    let centralConn;
    try {
        console.log('🔌 Connecting to Central DB to fetch tenant credentials...');
        centralConn = await mysql.createConnection(CENTRAL_CONFIG);
        const [rows] = await centralConn.execute('SELECT * FROM conexoes_bancos WHERE nome_cliente = ?', [tenantName]);
        await centralConn.end();

        if (rows.length === 0) {
            throw new Error(`Tenant '${tenantName}' not found in central DB.`);
        }

        const tenant = rows[0];
        console.log(`   Found tenant: ${tenant.nome_cliente} (${tenant.db_name})`);

        return await mysql.createConnection({
            host: tenant.db_host,
            user: tenant.db_user,
            password: tenant.db_pass,
            database: tenant.db_name,
            port: tenant.db_port || 3306
        });
    } catch (err) {
        if (centralConn) await centralConn.end();
        throw err;
    }
}

async function runTests() {
    let conn;
    try {
        // Connect to the DB used by the local server (lynxlocal -> Tenant name 'Lynx')
        conn = await getTenantConnection('Lynx');

        // Test 1: Set Invalid Path and Expect Error
        console.log('\n🧪 TEST 1: Invalid Root Path');
        const invalidPath = 'Z:\\NonExistentPath_' + Date.now();
        await conn.execute("UPDATE configuracaosistema SET valor = ? WHERE chave = 'EnderecoPastaRaizRomaneio'", [invalidPath]);
        console.log(`   Config set to: ${invalidPath}`);

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    descricao: 'Teste Caminho Invalido',
                    usuario: 'Tester'
                })
            });
            const json = await res.json();

            if (res.status === 400) {
                console.log('   ✅ SUCCESS: API returned 400 as expected.');
                console.log('   Message:', json.message);
            } else {
                console.error('   ❌ FAILED: API returned unexpected status:', res.status, json);
            }
        } catch (error) {
            console.error('   ❌ FAILED: Network error:', error.message);
        }

        // Test 2: Set Valid Path (C:\\Romaneios - assuming it exists or I can create it)
        console.log('\n🧪 TEST 2: Valid Root Path');
        const validPath = 'C:\\Romaneios';
        if (!fs.existsSync(validPath)) {
            fs.mkdirSync(validPath);
            console.log(`   Created local folder: ${validPath}`);
        }

        await conn.execute("UPDATE configuracaosistema SET valor = ? WHERE chave = 'EnderecoPastaRaizRomaneio'", [validPath]);
        console.log(`   Config set to: ${validPath}`);

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    descricao: 'Teste Caminho Valido',
                    usuario: 'Tester'
                })
            });
            const json = await res.json();

            if (json.success) {
                console.log('   ✅ SUCCESS: API succeeded.');
                console.log('   New ID:', json.id);
                console.log('   Generated Path:', json.path);

                // Verify Format: Root\RO_0000 (padded 4)
                const expectedSuffix = `\\RO_${String(json.id).padStart(4, '0')}`;
                if (json.path && json.path.endsWith(expectedSuffix)) {
                    console.log(`   ✅ Path format matches requirement (${expectedSuffix}).`);
                } else {
                    console.error(`   ❌ Path format mismatch. Got: ${json.path}, Expected suffix: ${expectedSuffix}`);
                }
            } else {
                console.error('   ❌ FAILED: API returned error:', json.message);
            }
        } catch (error) {
            console.error('   ❌ FAILED: Network error:', error.message);
        }

    } catch (err) {
        console.error('CRITICAL ERROR:', err);
    } finally {
        if (conn) {
            // Restore default maybe? Or leave it as valid
            await conn.end();
        }
    }
}

runTests();
