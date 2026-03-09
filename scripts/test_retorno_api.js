const axios = require('axios');

async function testApi() {
    try {
        console.log('--- Testing API: GET /api/romaneio-retorno/items?romaneio=15 ---');
        const response = await axios.get('http://localhost:3000/api/romaneio-retorno/items?romaneio=15');
        console.log('Response Status:', response.status);
        console.log('Response Data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('API Error:', error.message);
        if (error.response) {
            console.error('Response Data:', error.response.data);
        }
    }
}

testApi();
