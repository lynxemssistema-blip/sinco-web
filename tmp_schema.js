require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkView() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });

    const [rows, fields] = await connection.execute('DESCRIBE viewordemservicoitempendencia');
    console.log(rows);
    await connection.end();
  } catch (error) {
    console.error("Error", error);
  }
}

checkView();
