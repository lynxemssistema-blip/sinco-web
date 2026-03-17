const http = require('http');

const body = JSON.stringify({
    idRnc: 110,
    descricao: "pendencia web-sinco 13 UPDATED",
    setor: "COMERCIAL",
    tipoTarefa: "Revisão",
    usuario: "ADMIN",
    dataExec: "2026-03-11",
    isFinalizando: false
});

const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/visao-geral/pendencias',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
    }
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('Response:', data));
});

req.on('error', e => console.error(e));
req.write(body);
req.end();
