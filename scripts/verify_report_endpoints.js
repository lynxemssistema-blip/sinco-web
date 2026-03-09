
const API_BASE = 'http://localhost:3000/api';
const TEST_ROMANEIO_ID = 15; // Using the same ID as before

async function verifyNewEndpoints() {
    console.log(`\n--- Verifying New Endpoints for Romaneio #${TEST_ROMANEIO_ID} ---\n`);

    // 1. Test GET /api/romaneio/:id
    try {
        console.log(`[1/2] Testing GET /api/romaneio/${TEST_ROMANEIO_ID}...`);
        const res = await fetch(`${API_BASE}/romaneio/${TEST_ROMANEIO_ID}`);
        const json = await res.json();
        if (res.ok && json.success) {
            console.log(`✅ Success: Header retrieved for ${json.data.EnviadoPara}`);
            console.log(`   Path: ${json.data.ENDERECORomaneio}`);
        } else {
            console.error(`❌ Failed: ${json.message || res.statusText}`);
        }
    } catch (e) {
        console.error(`❌ Connection Error: ${e.message}`);
    }

    // 2. Test POST /api/romaneio/open-folder/:id
    // This will try to open explorer on the server machine. 
    // We expect a success response if the path exists.
    try {
        console.log(`\n[2/2] Testing POST /api/romaneio/open-folder/${TEST_ROMANEIO_ID}...`);
        const res = await fetch(`${API_BASE}/romaneio/open-folder/${TEST_ROMANEIO_ID}`, { method: 'POST' });
        const json = await res.json();
        if (res.ok && json.success) {
            console.log(`✅ Success: ${json.message}`);
        } else {
            console.error(`❌ Failed: ${json.message}`);
        }
    } catch (e) {
        console.error(`❌ Connection Error: ${e.message}`);
    }
}

verifyNewEndpoints();
