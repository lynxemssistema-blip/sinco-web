const axios = require('axios');

async function test() {
    try {
        const res = await axios.get('http://localhost:3000/api/projeto?liberado=S&finalizado=N');
        console.log('Status:', res.status);
        console.log('Data:', JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error('Error:', e.response ? e.response.status : e.message);
        if (e.response) console.error('Data:', e.response.data);
    }
}
test();
