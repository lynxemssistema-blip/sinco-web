const pool = require('../src/config/db');

async function checkTagsSchema() {
    try {
        const [tagsCols] = await pool.execute("SHOW COLUMNS FROM tags");
        console.log("tags columns related to engineering:");
        tagsCols.forEach(c => {
            const f = c.Field.toLowerCase();
            if (f.includes('projeto') || f.includes('desc') || f.includes('produto') || f.includes('iso') || f.includes('medicao') || f.includes('eng') || f.includes('aprovacao') || f.includes('empresa') || f.includes('projetista')) {
                console.log(c.Field);
            }
        });
        console.log("-------------------");
        console.log("All tags columns:", tagsCols.map(c => c.Field).join(', '));
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkTagsSchema();
