const pool = require('../src/config/db');

async function checkTag() {
    try {
        const [rows] = await pool.execute("SELECT IdTag, Finalizado FROM tags WHERE IdTag = 7");
        console.log("Tag 7:", rows[0]);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkTag();
