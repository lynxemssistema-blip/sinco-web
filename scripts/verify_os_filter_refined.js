const axios = require('axios');

async function verifyFilter() {
    try {
        console.log('Testing Corte API (Status=todos or undefined - should show ALL)...');
        const res = await axios.get('http://localhost:3000/api/apontamento/corte?os=8');
        const items = res.data.data;

        console.log(`Total items returned for OS 8 in Corte: ${items.length}`);

        const ids = items.map(i => i.IdOrdemServicoItem);
        console.log('Items IDs:', ids);

        const completedIdsPresent = items.filter(i => i.StatusSetor === 'C').map(i => i.IdOrdemServicoItem);
        console.log('Completed items present in "Todos":', completedIdsPresent);

        if (completedIdsPresent.length > 0) {
            console.log('SUCCESS: Completed items (67, 68) are now present in "Todos" view.');
        } else {
            console.warn('FAIL: Completed items are still missing from "Todos" view.');
        }

        console.log('\nTesting Corte API (Status=pendente)...');
        const resPendente = await axios.get('http://localhost:3000/api/apontamento/corte?os=8&status=pendente');
        const pendenteIds = resPendente.data.data.map(i => i.IdOrdemServicoItem);
        console.log(`Total pending items: ${pendenteIds.length}`);
        if (pendenteIds.includes(67) || pendenteIds.includes(68)) {
            console.error('FAIL: Items 67/68 found in "Pendentes" view!');
        } else {
            console.log('SUCCESS: Items 67/68 filtered out from "Pendentes" view.');
        }

    } catch (error) {
        console.error('Error during verification:', error.message);
    }
}

verifyFilter();
