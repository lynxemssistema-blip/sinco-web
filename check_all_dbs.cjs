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
          console.log('Found montapeca in', dbName);
          const [cols] = await db.executeOnDefault(`SHOW COLUMNS FROM \`${dbName}\`.\`montapeca\``);
          const colNames = cols.map(c => c.Field);
          if (!colNames.includes('CodMatFabricantePeca')) {
             console.log('  -> Missing CodMatFabricantePeca');
          } else {
             console.log('  -> Has CodMatFabricantePeca');
          }
          if (!colNames.includes('QtdeUnitaria')) {
             console.log('  -> Missing QtdeUnitaria');
          } else {
             console.log('  -> Has QtdeUnitaria');
          }
        }
      } catch (e) {
         // console.error('Error on db', dbName, e.message);
      }
    }
  } catch (e) { console.error(e); }
  process.exit(0);
}
run();
