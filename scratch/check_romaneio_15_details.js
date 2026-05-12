const db = require('../src/config/db');

async function checkRomaneio() {
    try {
        console.log('--- Romaneio 15 ---');
        const [rom] = await db.execute("SELECT * FROM romaneio WHERE idRomaneio = 15");
        console.log('Romaneio:', JSON.stringify(rom, null, 2));

        if (rom.length > 0) {
            console.log('\n--- Itens na viewromaneioitem ---');
            const [viewItems] = await db.execute("SELECT * FROM viewromaneioitem WHERE idRomaneio = 15");
            viewItems.forEach(item => {
                console.log(`ID: ${item.IdRomaneioItem}, Tag: ${item.TAG}, D_E_L_E_T_E: "${item.D_E_L_E_T_E}", MarcarComoFinalizado: "${item.MarcarComoFinalizado}"`);
            });
            
            console.log('\n--- Itens na romaneioitem ---');
            const [rawItems] = await db.execute("SELECT * FROM romaneioitem WHERE idRomaneio = 15");
            rawItems.forEach(item => {
                console.log(`ID: ${item.IdRomaneioItem}, D_E_L_E_T_E: "${item.D_E_L_E_T_E}", MarcarComoFinalizado: "${item.MarcarComoFinalizado}"`);
            });
        } else {
            console.log('Romaneio 15 não encontrado no banco de dados.');
        }
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkRomaneio();
