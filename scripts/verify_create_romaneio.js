const http = require('http');

const postData = JSON.stringify({
    descricao: 'TESTE AUTOMATIZADO ROMANEIO',
    enviarPara: 'EMPRESA TESTE LTDA',
    endereco: 'RUA DOS TESTES',
    numero: '123',
    bairro: 'BAIRRO TESTE',
    complemento: 'SALA 1',
    cidade: 'CIDADE TESTE',
    estado: 'TS',
    cep: '12345-678',
    email: 'teste@exemplo.com',
    usuario: 'Tester'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/romaneio',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        try {
            const json = JSON.parse(data);
            if (json.success) {
                console.log('SUCCESS: Romaneio created.', json);

                // Optional: Check if ID is returned
                if (json.id) console.log(`New Romaneio ID: ${json.id}`);
            } else {
                console.log('FAILURE: API returned error:', json.message);
            }
        } catch (e) {
            console.error('JSON Parse Error:', data);
        }
    });
});

req.on('error', e => console.error('Request Error:', e));
req.write(postData);
req.end();
