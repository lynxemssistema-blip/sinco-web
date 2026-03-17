const pool = require('./src/config/db'); 

pool.execute('SHOW COLUMNS FROM tipotarefa')
    .then(r => console.log(r[0]))
    .catch(console.error)
    .finally(() => process.exit(0));
