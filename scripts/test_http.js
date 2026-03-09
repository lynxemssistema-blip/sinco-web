const http = require('http');

function testEndpoint(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: '192.168.1.11',
            port: 3000,
            path: path,
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    data: data
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.setTimeout(2000, () => {
            req.destroy();
            reject(new Error('Timeout'));
        });

        req.end();
    });
}

async function runTests() {
    console.log('🔍 Testando endpoints...\n');

    // Test 1
    console.log('📋 GET /api/config');
    try {
        const result = await testEndpoint('/api/config');
        console.log(`Status: ${result.status}`);
        console.log(`Response: ${result.data}\n`);
    } catch (error) {
        console.log(`❌ Erro: ${error.message}\n`);
    }

    // Test 2
    console.log('📋 GET /api/config/menu');
    try {
        const result = await testEndpoint('/api/config/menu');
        console.log(`Status: ${result.status}`);
        console.log(`Response: ${result.data}\n`);
    } catch (error) {
        console.log(`❌ Erro: ${error.message}\n`);
    }

    console.log('✅ Testes concluídos!');
}

runTests();
