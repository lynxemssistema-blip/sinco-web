const http = require('http');

function get(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject('Parse error: ' + data.substring(0, 50)); }
            });
        }).on('error', reject);
    });
}

async function test() {
    try {
        const data = await get('http://localhost:3000/api/producao-plano-corte/lista');
        console.log('Plans:', data.success ? `Found ${data.data.length} plans` : 'Error: ' + data.message);
        
        if (data.success && data.data.length > 0) {
            const id = data.data[0].IdPlanodecorte;
            const data2 = await get(`http://localhost:3000/api/producao-plano-corte/itens/${id}`);
            console.log(`Items for plan ${id}:`, data2.success ? `Found ${data2.data.length} items` : 'Error: ' + data2.message);
            if (data2.success && data2.data.length > 0) {
                console.log('Sample item Partial:', data2.data[0].Parcial);
            }
        }
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

test();
