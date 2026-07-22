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
          console.log(`[${dbName}] Found montapeca. Initializing QtdeUnitaria...`);
          // Use NULLIF to handle empty strings
          await db.executeOnDefault(`UPDATE \`${dbName}\`.\`montapeca\` SET QtdeUnitaria = CAST(NULLIF(PecaQtde, '') AS DECIMAL(18,4)) WHERE QtdeUnitaria IS NULL`);
          console.log(`[${dbName}] QtdeUnitaria initialized.`);
        }
      } catch (e) {
         console.error(`Error on db ${dbName}:`, e.message);
      }
    }
  } catch (e) { console.error(e); }
  console.log("Global schema update completed.");
  process.exit(0);
}

run();
