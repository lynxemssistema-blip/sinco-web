async function testRNC() {
    const baseUrl = 'http://localhost:3000/api';
    const tenantHeaders = { 'x-tenant-db': 'construcare' };

    console.log('Testing RNC Endpoints...');

    const endpoints = [
        { path: '/rnc/sectors', label: 'Sectors' },
        { path: '/rnc/collaborators', label: 'Collaborators' },
        { path: '/rnc/task-types', label: 'Task Types' },
        { path: '/rnc/item-data/1', label: 'Item Data (ID:1)' }
    ];

    for (const ep of endpoints) {
        try {
            const res = await fetch(baseUrl + ep.path, { headers: tenantHeaders });
            const data = await res.json();
            if (data.success) {
                console.log(`[PASS] ${ep.label}: ${Array.isArray(data.data) ? data.data.length + ' items' : 'OK'}`);
            } else {
                console.log(`[FAIL] ${ep.label}: ${data.message || JSON.stringify(data)}`);
            }
        } catch (e) {
            console.log(`[ERR]  ${ep.label}: ${e.message}`);
        }
    }
}

testRNC();
