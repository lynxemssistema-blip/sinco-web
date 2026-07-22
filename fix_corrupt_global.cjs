const db = require('./src/config/db.js');

async function run() {
  try {
    const [dbs] = await db.executeOnDefault('SHOW DATABASES');
    for (const row of dbs) {
      const dbName = row.Database;
      if (['information_schema', 'mysql', 'performance_schema', 'sys'].includes(dbName)) continue;
      
      try {
        const [tables] = await db.executeOnDefault(`SHOW TABLES FROM \`${dbName}\` LIKE 'montapeca'`);
        if (tables.length > 0) {
           console.log(`[${dbName}] Cleaning up corrupted PecaQtde...`);
           const [result] = await db.executeOnDefault(`UPDATE \`${dbName}\`.\`montapeca\` SET PecaQtde = QtdeUnitaria WHERE PecaQtde > 1000 OR PecaQtde IS NULL`);
           if (result.changedRows > 0) {
              console.log(`[${dbName}] Fixed ${result.changedRows} rows.`);
           }
        }
      } catch (e) {
         console.error(`Error on db ${dbName}:`, e.message);
      }
    }
  } catch (e) { console.error(e); }
  console.log("Global cleanup completed.");
  process.exit(0);
}

run();
