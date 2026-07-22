const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/peca-manufaturada/materiais-criar?cod=2121',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + require('jsonwebtoken').sign({tenantId: 1}, 'seu_segredo_jwt_aqui') // wait, I don't know the secret. 
  }
};

// I'll just write a script that instantiates the DB pool directly and runs the EXACT query.
const db = require('./src/config/db.js');
async function run() {
    try {
        const sql = `SELECT IdMaterial, CodMatFabricante, DescResumo, Espessura, MaterialSW,
                          EnderecoArquivo, TxtTipoDesenho, FamiliaMat, IdEmpresa, Peso, Valor, DescDetal, PecaManufat, AreaPintura, Unidade, Altura, Largura, Qtde
                   FROM material
                   WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') AND CodMatFabricante LIKE ? ORDER BY CodMatFabricante LIMIT 300`;
        const [rows] = await db.executeOnDefault(sql, ['%2121%']);
        console.log(`ROWS FOUND: ${rows.length}`);
        if(rows.length > 0) {
           console.log(rows[0].CodMatFabricante);
        }
    } catch(e) { console.error(e) }
    process.exit(0);
}
run();
