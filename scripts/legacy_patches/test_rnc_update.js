const db = require('./src/config/db');

async function testInsert() {
    try {
        const query = `
            UPDATE projetos SET qtdernc = COALESCE(qtdernc, 0) + 1, qtderncPendente = COALESCE(qtderncPendente, 0) + 1 WHERE IdProjeto = 1
        `;

        console.log("Executing update...");
        const [result] = await db.executeOnDefault(query);
        console.log("Success:", result);
    } catch (err) {
        console.error("FATAL SQL ERROR:", err.message);
        console.error(err);
    }
    process.exit();
}
testInsert();
