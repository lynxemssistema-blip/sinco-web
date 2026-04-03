// Quick test: verify all plano-corte routes respond correctly
const http = require('http');

function testRoute(path, description) {
    return new Promise((resolve) => {
        const url = `http://localhost:3000${path}`;
        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    console.log(`✅ ${description}`);
                    console.log(`   Route: ${path}`);
                    console.log(`   Status: ${res.statusCode}, Success: ${json.success}, Records: ${json.total || json.data?.length || 0}`);
                    if (json.message) console.log(`   Msg: ${json.message}`);
                    resolve(true);
                } catch (e) {
                    // Check if it's an auth error (expected without token)
                    if (res.statusCode === 401 || res.statusCode === 403) {
                        console.log(`✅ ${description}`);
                        console.log(`   Route: ${path}`);
                        console.log(`   Status: ${res.statusCode} (auth required - route EXISTS and responds)`);
                        resolve(true);
                    } else {
                        console.log(`❌ ${description}`);
                        console.log(`   Route: ${path}`);
                        console.log(`   Status: ${res.statusCode}, Parse error: ${e.message}`);
                        console.log(`   Raw: ${data.substring(0, 200)}`);
                        resolve(false);
                    }
                }
            });
        }).on('error', (e) => {
            console.log(`❌ ${description}`);
            console.log(`   Route: ${path}`);
            console.log(`   Connection error: ${e.message}`);
            resolve(false);
        });
    });
}

async function main() {
    console.log('=== Testing Plano de Corte Routes ===\n');
    
    await testRoute('/api/plano-corte/lista', 'MONTAGEM - Lista (pendentes)');
    console.log();
    await testRoute('/api/plano-corte/lista?exibirConcluidos=true', 'MONTAGEM - Lista (todos)');
    console.log();
    await testRoute('/api/producao-plano-corte/lista', 'PRODUÇÃO - Lista (pendentes)');
    console.log();
    await testRoute('/api/producao-plano-corte/lista?exibirTodos=true', 'PRODUÇÃO - Lista (todos)');
    console.log();
    await testRoute('/api/plano-corte/itens/1', 'ITENS - Plano 1 (pendentes)');
    console.log();
    await testRoute('/api/producao-plano-corte/itens/1?exibirTodos=true', 'ITENS PRODUÇÃO - Plano 1 (todos)');
    console.log();
    
    console.log('=== Done ===');
}

main();
