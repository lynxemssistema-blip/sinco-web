const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3000/api';
const ROMANEIO_ID = 1;

async function test() {
    console.log(`[TEST] Starting Excel generation test for Romaneio #${ROMANEIO_ID}`);

    try {
        // 1. Trigger Liberation
        console.log(`[TEST] Triggering liberation action...`);
        const resAction = await fetch(`${API_BASE}/romaneio/${ROMANEIO_ID}/action`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'liberar', usuario: 'Automated Test' })
        });
        const jsonAction = await resAction.json();
        console.log(`[TEST] Action Response:`, jsonAction);

        if (!jsonAction.success) {
            console.error(`[TEST] Liberation failed. Maybe already liberated? Attempting download anyway.`);
        }

        // 2. Test Download Endpoint
        console.log(`[TEST] Testing download endpoint...`);
        const resDownload = await fetch(`${API_BASE}/romaneio/download-excel/${ROMANEIO_ID}`);

        if (resDownload.status === 200) {
            const fileName = (resDownload.headers.get('content-disposition')?.split('filename=')[1] || 'test_output.xlsx').replace(/\"/g, '');
            const arrayBuffer = await resDownload.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const outputPath = path.join(__dirname, '..', 'public', 'test', fileName);

            if (!fs.existsSync(path.dirname(outputPath))) {
                fs.mkdirSync(path.dirname(outputPath), { recursive: true });
            }

            fs.writeFileSync(outputPath, buffer);
            console.log(`[TEST] ✅ Excel file downloaded successfully to: ${outputPath}`);
            console.log(`[TEST] File size: ${buffer.length} bytes`);
        } else {
            const text = await resDownload.text();
            console.error(`[TEST] ❌ Download failed with status ${resDownload.status}: ${text}`);
        }

    } catch (error) {
        console.error(`[TEST] ❌ Fatal Error:`, error);
    }
}

test();
