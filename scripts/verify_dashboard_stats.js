const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/dashboard/stats',
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    }
};

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response:', data);
        try {
            const json = JSON.parse(data);
            if (json.success && json.stats && json.stats.companies === 14) {
                console.log('SUCCESS: Company count matches expected value (14).');
            } else {
                console.log('FAILURE: Company count mismatch or API error.');
            }
        } catch (e) {
            console.error('Error parsing JSON:', e);
        }
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.end();
