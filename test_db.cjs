const mysql = require('mysql2/promise');
(async () => {
  try {
      const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'sincoweb_demo'
      });
      const [rows] = await connection.execute('SHOW COLUMNS FROM ordemservicoitem LIKE "%txt%"');
      console.log('Columns: ', rows.map(r => r.Field));
      
      const [osRows] = await connection.execute('SELECT txtCorte, txtPULSIONADEIRA, txtGALVANIZAR FROM ordemservicoitem ORDER BY IdOrdemServicoItem DESC LIMIT 10');
      console.log('Values: ', osRows);
      await connection.end();
  } catch (e) {
      console.log('Err: ', e.message);
  }
})();
