const http = require('http');

function get(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({ status: res.statusCode, body: data, headers: res.headers });
            });
        }).on('error', reject);
    });
}

async function test() {
    try {
        const res = await get('http://localhost:3000/api/producao-plano-corte/lista');
        console.log(`Status: ${res.status}`);
        console.log(`Content-Type: ${res.headers['content-type']}`);
        console.log(`Body (first 100 chars): ${res.body.substring(0, 100)}`);
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

test();
