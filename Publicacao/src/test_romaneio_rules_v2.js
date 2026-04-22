
const axios = require('axios');
const pool = require('./config/db');
require('dotenv').config();

const API_URL = 'http://localhost:3000/api';

async function testRomaneioLogic() {
    let romaneioId;

    try {
        console.log('--- TEST START ---');

        // 1. Create a Romaneio
        console.log('\n[1] Creating Romaneio...');
        const createRes = await axios.post(`${API_URL}/romaneio`, {
            descricao: 'TEST AUTO ' + Date.now(),
            usuario: 'Tester'
        });
        romaneioId = createRes.data.id;
        console.log(`[PASS] Created Romaneio ID: ${romaneioId}`);

        // 2. Try to Release WITHOUT Items (Should Fail)
        console.log('\n[2] Attempting to Release WITHOUT items...');
        try {
            await axios.put(`${API_URL}/romaneio/${romaneioId}/action`, {
                action: 'liberar',
                usuario: 'Tester'
            });
            console.error('[FAIL] Should have failed but succeeded.');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log(`[PASS] Failed as expected: ${error.response.data.message}`);
            } else {
                console.error('[FAIL] Unexpected error:', error.message);
            }
        }

        // 3. Add an Item to Romaneio (Manually via DB for speed, or via API if available)
        console.log('\n[3] Adding Item to Romaneio...');
        await pool.execute(
            "INSERT INTO romaneioitem (IdRomaneio, Usuario, DataCriacao) VALUES (?, 'Tester', NOW())",
            [romaneioId]
        );
        console.log('[PASS] Item added.');

        // 4. Try to Release WITH Items (Should Succeed)
        console.log('\n[4] Attempting to Release WITH items...');
        const releaseRes = await axios.put(`${API_URL}/romaneio/${romaneioId}/action`, {
            action: 'liberar',
            usuario: 'Tester'
        });
        console.log(`[PASS] Release Result: ${releaseRes.data.message}`);

        // 5. Verify Database Update
        const [rows] = await pool.execute("SELECT Estatus, Liberado, UsuarioLiberacao FROM romaneio WHERE idRomaneio = ?", [romaneioId]);
        console.log('[INFO] DB State:', rows[0]);

        if (rows[0].Estatus === 'Liberado' && rows[0].Liberado === 'S' && rows[0].UsuarioLiberacao === 'Tester') {
            console.log('[PASS] Database updated correctly.');
        } else {
            console.error('[FAIL] Database state incorrect.');
        }

        // 6. Try to Release AGAIN (Should Fail - Already Released)
        console.log('\n[6] Attempting to Release AGAIN...');
        try {
            await axios.put(`${API_URL}/romaneio/${romaneioId}/action`, {
                action: 'liberar',
                usuario: 'Tester'
            });
            console.error('[FAIL] Should have failed but succeeded.');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log(`[PASS] Failed as expected: ${error.response.data.message}`);
            } else {
                console.error('[FAIL] Unexpected error:', error.message);
            }
        }

        // Cleanup
        console.log('\n[INFO] Cleaning up test data...');
        await pool.execute("DELETE FROM romaneioitem WHERE IdRomaneio = ?", [romaneioId]);
        await pool.execute("DELETE FROM romaneio WHERE idRomaneio = ?", [romaneioId]);
        console.log('[PASS] Cleanup complete.');

        process.exit(0);

    } catch (error) {
        console.error('Test Failed:', error.message);
        if (error.response) console.error('Response:', error.response.data);
        process.exit(1);
    }
}

testRomaneioLogic();
