const db = require('../src/config/db');
(async () => {
    try {
        const [columns] = await db.execute('SHOW COLUMNS FROM tags');
        const userCols = columns.filter(c => c.Field.toLowerCase().includes('usuario')).map(c => c.Field);
        console.log('Columns in tags:', userCols);

        const [itemCols] = await db.execute('SHOW COLUMNS FROM ordemservicoitem');
        const userColsItem = itemCols.filter(c => c.Field.toLowerCase().includes('usuario')).map(c => c.Field);
        console.log('Columns in ordemservicoitem:', userColsItem);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
})();
