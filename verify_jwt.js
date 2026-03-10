const axios = require('axios');

async function testSecurity() {
    const API_URL = 'http://localhost:3000/api/romaneio';

    console.log('--- Teste de Segurança SincoWeb ---');

    // 1. Testar acesso sem token
    console.log('\n[Teste 1] Acesso sem token...');
    try {
        await axios.get(API_URL);
        console.log('FAIL: Conseguiu acessar sem token!');
    } catch (error) {
        if (error.response && error.response.status === 401) {
            console.log('SUCCESS: Acesso negado (401) como esperado.');
        } else {
            console.log('ERROR: Resposta inesperada:', error.message);
        }
    }

    // 2. Testar acesso com header antigo (não deve mais funcionar se for a única coisa)
    console.log('\n[Teste 2] Acesso com header x-tenant-db (sem token)...');
    try {
        await axios.get(API_URL, {
            headers: { 'x-tenant-db': 'lynxlocal' }
        });
        console.log('FAIL: Conseguiu acessar apenas com o header antigo!');
    } catch (error) {
        if (error.response && error.response.status === 401) {
            console.log('SUCCESS: Acesso negado (401) mesmo com header antigo.');
        } else {
            console.log('ERROR: Resposta inesperada:', error.message);
        }
    }
}

testSecurity();
