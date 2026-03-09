const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/pj',
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        try {
            const json = JSON.parse(data);
            if (json.success) {
                console.log(`Total PJ records returned: ${json.data.length}`);
                const deleted = json.data.filter(r => r.D_E_L_E_T_E === '*');
                if (deleted.length > 0) {
                    console.log('FAILURE: Found records with D_E_L_E_T_E = "*"');
                } else {
                    console.log('SUCCESS: No records with D_E_L_E_T_E = "*" found.');
                }

                // Compare with expected count if known (e.g. 14 from dashboard)
                if (json.data.length === 14) {
                    console.log('SUCCESS: Count matches dashboard stats (14).');
                } else {
                    console.log(`WARNING: Count (${json.data.length}) differs from dashboard stats (14).`);
                }

            } else {
                console.log('API Error:', json.message);
            }
        } catch (e) {
            console.error('JSON Parse Error:', e);
        }
    });
});

req.on('error', e => console.error('Request Error:', e));
req.end();
