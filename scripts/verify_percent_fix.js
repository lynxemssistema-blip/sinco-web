const axios = require('axios');

async function verifyPercentFix() {
    try {
        console.log('Testing Corte API (Checking item 51 percentage)...');
        const res = await axios.get('http://localhost:3000/api/apontamento/corte?os=8');
        const items = res.data.data;

        const item51 = items.find(i => i.IdOrdemServicoItem === 51);

        if (item51) {
            console.log('Item 51 found:', JSON.stringify(item51, null, 2));
            console.log(`QtdeTotal: ${item51.QtdeTotal}`);
            console.log(`QtdeProduzidaSetor: ${item51.QtdeProduzidaSetor}`);
            console.log(`PercentualSetor (Calculated by SQL): ${item51.PercentualSetor}`);

            if (item51.PercentualSetor === 0) {
                console.log('SUCCESS: PercentualSetor is now 0 as expected (calculated from null quantity).');
            } else {
                console.warn(`FAIL: PercentualSetor is ${item51.PercentualSetor} but should be 0.`);
            }
        } else {
            console.warn('Item 51 not found in response.');
        }

    } catch (error) {
        console.error('Error during verification:', error.message);
    }
}

verifyPercentFix();
