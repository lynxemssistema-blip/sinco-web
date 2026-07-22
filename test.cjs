const db = require('./src/config/db.js'); 
async function run() { 
  const [rows] = await db.executeOnDefault("SELECT CodMatFabricante FROM lynxlocal.material WHERE CodMatFabricante LIKE '%2121%' AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') LIMIT 5"); 
  console.log(rows); 
  process.exit(0); 
} 
run();
