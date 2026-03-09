// Using built-in fetch (available in Node.js 18+)

const API_BASE = 'http://localhost:3000/api';

async function testFilter() {
    console.log('--- Testing Filter: mostrarFinalizados=false (Default) ---');
    try {
        const resDefault = await fetch(`${API_BASE}/romaneio/v-itens-projeto-aberto?mostrarFinalizados=false`);
        const jsonDefault = await resDefault.json();
        if (jsonDefault.success) {
            const finishedItems = jsonDefault.data.filter(item => item.OrdemServicoItemFinalizado === 'C');
            console.log(`Found ${finishedItems.length} finished items (expected 0).`);
            if (finishedItems.length > 0) {
                console.error('FAIL: Finished items found when they should be hidden.');
            } else {
                console.log('PASS: No finished items found.');
            }
        } else {
            console.error('Error in API call:', jsonDefault.message);
        }

        console.log('\n--- Testing Filter: mostrarFinalizados=true ---');
        const resShow = await fetch(`${API_BASE}/romaneio/v-itens-projeto-aberto?mostrarFinalizados=true`);
        const jsonShow = await resShow.json();
        if (jsonShow.success) {
            const finishedItems = jsonShow.data.filter(item => item.OrdemServicoItemFinalizado === 'C');
            console.log(`Found ${finishedItems.length} finished items.`);
            const totalItems = jsonShow.data.length;
            console.log(`Total items returned: ${totalItems}`);
            console.log('Check complete.');
        } else {
            console.error('Error in API call:', jsonShow.message);
        }
    } catch (err) {
        console.error('Connection failed. Is the server running?', err.message);
    }
}

testFilter();
