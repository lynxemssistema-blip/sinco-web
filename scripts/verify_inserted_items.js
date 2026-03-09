const API_BASE = 'http://localhost:3000/api';

async function testInsertedItems() {
    console.log('--- Testing API: GET /api/romaneio/10/inserted-items ---');
    try {
        const res = await fetch(`${API_BASE}/romaneio/10/inserted-items`);
        const json = await res.json();
        if (json.success) {
            console.log(`Found ${json.data.length} items in Romaneio #10.`);
            if (json.data.length > 0) {
                console.log('Sample item:', json.data[0].Projeto, '-', json.data[0].Tag);
            }
            console.log('PASS: API returned data successfully.');
        } else {
            console.error('FAIL: Error in API call:', json.message);
        }
    } catch (err) {
        console.error('Connection failed. Is the server running?', err.message);
    }
}

testInsertedItems();
