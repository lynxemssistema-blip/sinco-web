const db = require('./src/config/db');

async function testPut() {
    const id = 17; // PULSIONADEIRA
    const reqBody = {
        processofabricacao: 'PULSIONADEIRA',
        CodigoProcessoFabricacao: 'PUL-01',
        Fabrica: 'NÂO',
        DataLiberada: 'NÂO',
        Setup: '25.00',
        TempoPadrao: '12.00'
    };

    const query = "UPDATE processofabricacao SET processofabricacao = ?, CodigoProcessoFabricacao = ?, Fabrica = ?, DataLiberada = ?, Setup = ?, TempoPadrao = ? WHERE IdProcessoFabricacao = ?";
    const params = [
        reqBody.processofabricacao, 
        reqBody.CodigoProcessoFabricacao || '', 
        reqBody.Fabrica || 'NAO', 
        reqBody.DataLiberada || 'NAO', 
        reqBody.Setup || null, 
        reqBody.TempoPadrao || null, 
        id
    ];

    try {
        console.log("Executando UPDATE...", params);
        const [result] = await db.execute(query, params);
        console.log("Update OK", result);
    } catch(e) {
        console.error("Erro UPDATE", e);
    } finally {
        process.exit();
    }
}
testPut();
