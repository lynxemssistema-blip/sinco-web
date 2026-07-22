const db = require('./src/config/db.js');
async function run() {
    const [dbs] = await db.executeOnDefault('SHOW DATABASES');
    for (const row of dbs) {
      const dbName = row.Database;
      if (['information_schema', 'mysql', 'performance_schema', 'sys'].includes(dbName)) continue;
      
      try {
        const [tables] = await db.executeOnDefault(`SHOW TABLES FROM \`${dbName}\` LIKE 'material'`);
        if (tables.length > 0) {
            const sql = `SELECT CodMatFabricante FROM \`${dbName}\`.material WHERE CodMatFabricante LIKE '%2121%' AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') LIMIT 5`;
            const [rows] = await db.executeOnDefault(sql);
            console.log(`[${dbName}] ROWS FOUND: ${rows.length}`);
            if(rows.length > 0) {
               console.log(rows.map(r => r.CodMatFabricante).join(', '));
            }
        }
      } catch(e){}
    }
    process.exit(0);
}
run();
