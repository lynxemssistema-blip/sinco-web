const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

async function run() {
    const token = jwt.sign(
        { id: 1, usuario: 'admin', nivel: 'admin', tenantId: 'lynxlocal' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    try {
        const res = await axios.get('http://localhost:3000/api/apontamento/dobra?os=12', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const items = res.data.data;
        const target = items.find(i => i.IdOrdemServicoItem === 32874);
        console.log('Result for item 32874:', target);
    } catch (e) {
        console.error('Error:', e.response ? e.response.data : e.message);
    }
}
run();
