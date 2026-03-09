const axios = require('axios');
require('dotenv').config({ path: '../.env' }); // Adjust if needed

const API_URL = 'http://localhost:3000/api/romaneio';
const TEST_ID = 10; // Ensure this ID exists or use a dynamic one

async function testActions() {
    console.log(`Testing Romaneio Actions for ID: ${TEST_ID}`);

    try {
        // 1. Registrar
        console.log('\n[1] Testing "Registrar"...');
        let res = await axios.put(`${API_URL}/${TEST_ID}/action`, { action: 'registrar', usuario: 'Tester' });
        console.log('Result:', res.data);

        // 2. Liberar
        console.log('\n[2] Testing "Liberar"...');
        res = await axios.put(`${API_URL}/${TEST_ID}/action`, { action: 'liberar', usuario: 'Tester' });
        console.log('Result:', res.data);

        // 3. Finalizar
        console.log('\n[3] Testing "Finalizar"...');
        res = await axios.put(`${API_URL}/${TEST_ID}/action`, { action: 'finalizar', usuario: 'Tester' });
        console.log('Result:', res.data);

        // 4. Cancelar Finalização
        console.log('\n[4] Testing "Cancelar Finalização"...');
        res = await axios.put(`${API_URL}/${TEST_ID}/action`, { action: 'cancelar_fin', usuario: 'Tester' });
        console.log('Result:', res.data);

        // 5. Cancelar Liberação
        console.log('\n[5] Testing "Cancelar Liberação"...');
        res = await axios.put(`${API_URL}/${TEST_ID}/action`, { action: 'cancelar_lib', usuario: 'Tester' });
        console.log('Result:', res.data);

        console.log('\nAll actions tested successfully (check data manually if needed).');

    } catch (error) {
        console.error('Test Failed:', error.response ? error.response.data : error.message);
    }
}

testActions();
