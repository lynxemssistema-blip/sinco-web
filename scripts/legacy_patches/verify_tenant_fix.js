const http = require('http');

// Config
const PORT = 3000;
const HOST = 'localhost';

function makeRequest(path, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: HOST,
            port: PORT,
            path: path,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: JSON.parse(data)
                    });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.end();
    });
}

(async () => {
    console.log('--- Verifying Tenant Context Switch ---');

    console.log('\n1. Requesting Default (Lynxlocal) - No Header');
    try {
        const res1 = await makeRequest('/api/usuario');
        const users1 = res1.data.data || [];
        const user1 = users1.find(u => u.Login === 'AAAAA');
        // Lynxlocal has 'AAAAA' user based on previous diagnosis
        if (user1) {
            console.log('✅ Default DB (Lynxlocal) confirmed. Found user AAAAA.');
        } else {
            console.warn('⚠️ Default DB might be wrong or AAAAA user missing.');
            console.log('Users found:', users1.slice(0, 3));
        }
    } catch (err) {
        console.error('Req 1 Failed:', err.message);
    }

    console.log('\n2. Requesting Construcare - Header: x-tenant-db: construcare');
    try {
        const res2 = await makeRequest('/api/usuario', { 'x-tenant-db': 'construcare' });
        const users2 = res2.data.data || [];
        const user2 = users2.find(u => u.Login === 'GUILHERME');
        // Construcare has 'GUILHERME' based on previous diagnosis

        if (user2) {
            console.log('✅ Context Switch WORKED. Found user GUILHERME in Construcare.');
        } else {
            console.error('❌ Context Switch FAILED. User GUILHERME not found.');
            console.log('Users found:', users2.slice(0, 3));
        }

        // Double check it's NOT the same as default
        const user1Again = users2.find(u => u.Login === 'AAAAA');
        if (user1Again) {
            console.error('❌ Data LEAK. Found Lynxlocal user in Construcare response!');
        } else {
            console.log('✅ Clean context. Lynxlocal users not present.');
        }

    } catch (err) {
        console.error('Req 2 Failed:', err.message);
    }

})();
