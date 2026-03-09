const http = require('http');

const data = JSON.stringify({
    restringirApontamento: 'Não',
    processosVisiveis: JSON.stringify(["corte", "dobra", "solda", "pintura", "montagem"])
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
    // console.log(`STATUS: ${res.statusCode}`);
    if (res.statusCode === 200) {
        console.log('Config reset to defaults.');
    }
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.write(data);
req.end();
