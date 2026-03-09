const http = require('http');

const data = JSON.stringify({
    IdOrdemServicoItem: 4,
    IdOrdemServico: 2,
    Processo: 'mapa',
    QtdeProduzida: 2, // Will be ignored for Mapa but required by validator
    CriadoPor: 'TestAgent'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/apontamento',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'x-tenant-db': 'lynxlocal'
    }
};

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('STATUS:', res.statusCode);
        console.log('BODY:', body);

        // After request, verify DB
        setTimeout(verifyDB, 2000);
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();

async function verifyDB() {
    const pool = require('../src/config/db');
    try {
        console.log('\n--- VERIFYING RESULTS ---\n');

        const [item] = await pool.execute('SELECT sttxtMontagem, OrdemServicoItemFinalizado FROM ordemservicoitem WHERE IdOrdemServicoItem = 4');
        console.log('Item 4:', item[0]);

        const [os] = await pool.execute('SELECT OrdemServicoFinalizado FROM ordemservico WHERE IdOrdemServico = 2');
        console.log('OS 2:', os[0]);

        const [tag] = await pool.execute('SELECT Finalizado FROM tags WHERE IdTag = 14');
        console.log('Tag 14:', tag[0]);

        const [proj] = await pool.execute('SELECT Finalizado FROM projetos WHERE IdProjeto = 9');
        console.log('Project 9:', proj[0]);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
