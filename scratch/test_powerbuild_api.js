const axios = require('axios');

async function testEndpoints() {
    const baseUrl = 'http://localhost:3000'; // Assuming standard port
    
    try {
        console.log('Testing /api/projeto...');
        const resProj = await axios.get(`${baseUrl}/api/projeto?liberado=S&finalizado=N`);
        console.log('Proj Response:', resProj.data.success ? 'Success' : 'Fail', resProj.data.message || '');
    } catch (e) {
        console.log('Proj Fail:', e.message);
    }

    try {
        console.log('Testing /api/blockset/init-db...');
        const resInit = await axios.post(`${baseUrl}/api/blockset/init-db`);
        console.log('Init Response:', resInit.data.success ? 'Success' : 'Fail', resInit.data.message || '');
    } catch (e) {
        console.log('Init Fail:', e.message);
    }
}

testEndpoints();
