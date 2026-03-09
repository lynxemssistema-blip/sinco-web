
const axios = require('axios');

async function testAPI() {
    try {
        console.log('--- Testing /api/rnc/item-data/1 ---');
        const resCtx = await axios.get('http://localhost:3000/api/rnc/item-data/1');
        console.log('Keys in item-data:', Object.keys(resCtx.data.data));
        console.log('IDOrdemServicoITEM value:', resCtx.data.data.IDOrdemServicoITEM);
        console.log('IdOrdemServicoItem value:', resCtx.data.data.IdOrdemServicoItem);

        const itemID = resCtx.data.data.IDOrdemServicoITEM || resCtx.data.data.IdOrdemServicoItem;

        console.log(`\n--- Testing /api/rnc/list/${itemID} ---`);
        const resList = await axios.get(`http://localhost:3000/api/rnc/list/${itemID}?showFinalized=true`);
        console.log('List count:', resList.data.data.length);
        if (resList.data.data.length > 0) {
            console.log('Example pendency keys:', Object.keys(resList.data.data[0]));
        }

    } catch (error) {
        console.error('Error testing API:', error.message);
    }
}

testAPI();
