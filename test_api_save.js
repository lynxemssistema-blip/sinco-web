const http = require('http');

const data = JSON.stringify({
    restringirApontamento: 'Sim',
    processosVisiveis: JSON.stringify(['corte', 'montagem'])
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/config',
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);

    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });

    res.on('end', () => {
        console.log('Update Check Complete. checking GET...');
        // Now check GET
        http.get('http://localhost:3000/api/config', (resGet) => {
            resGet.on('data', (d) => {
                const json = JSON.parse(d.toString());
                console.log('GET Result ProcessosVisiveis:', json.config.ProcessosVisiveis);
            });
        });
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.write(data);
req.end();
