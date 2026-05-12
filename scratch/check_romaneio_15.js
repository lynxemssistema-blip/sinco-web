const db = require('../src/config/db');

async function checkRomaneio() {
    try {
        const [rom] = await db.execute("SELECT * FROM romaneio WHERE idRomaneio = 15");
        console.log('Romaneio 15:', rom);

        if (rom.length > 0) {
            const [items] = await db.execute("SELECT * FROM romaneioitem WHERE idRomaneio = 15");
            console.log('Itens do Romaneio 15:', items.length);
            
            const [viewItems] = await db.execute("SELECT * FROM viewromaneioitem WHERE idRomaneio = 15");
            console.log('Itens na viewromaneioitem para Romaneio 15:', viewItems.length);
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
