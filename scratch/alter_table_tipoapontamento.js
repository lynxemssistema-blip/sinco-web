const db = require('../src/config/db.js');

async function updateDb() {
    try {
        await new Promise((resolve, reject) => {
            const contextMap = new Map([['dbName', 'lynxlocal']]);
            db.asyncLocalStorage.run(contextMap, async () => {
                try {
                    console.log('Running query within lynxlocal tenant context...');
                    await db.query('ALTER TABLE ordemservicoitemcontrole ADD COLUMN TipoApontamento VARCHAR(50) DEFAULT "Total";');
                    console.log('Column TipoApontamento added successfully.');
                    resolve();
                } catch (err) {
                    if (err.code === 'ER_DUP_FIELDNAME') {
                        console.log('Column already exists.');
                        resolve();
                    } else {
                        reject(err);
                    }
                }
            });
        });
        console.log('Database update completed.');
        process.exit(0);
    } catch(err) {
        console.error('Error updating DB:', err);
        process.exit(1);
    }
}

updateDb();
