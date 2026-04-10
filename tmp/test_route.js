const axios = require('axios');

async function testFinalizar() {
    try {
        // Just to check if the route is registered
        await axios.get('http://localhost:3000/api/producao-plano-corte/2/finalizar');
    } catch (err) {
        // Expected 404 since it's a GET and I defined a POST, or 401 if unauthorized
        console.log('Backend response status for GET on finalize route:', err.response ? err.response.status : err.message);
    }
}

testFinalizar();
