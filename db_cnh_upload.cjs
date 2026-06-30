const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function run() {
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST || 'lynxlocal.mysql.uhserver.com',
      user: process.env.DB_USER || 'lynxlocal',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE || 'lynxlocal'
    });

    console.log('Connected to DB');

    // Create the column
    try {
      await db.execute('ALTER TABLE motorista ADD COLUMN ImagemCNH VARCHAR(255) DEFAULT NULL;');
      console.log('Added ImagemCNH column.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('ImagemCNH column already exists.');
      } else {
        throw e;
      }
    }

    await db.end();

    // Create directory
    const dir = path.join(__dirname, 'public/uploads/cnh');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log('Created directory: ' + dir);
    } else {
      console.log('Directory already exists: ' + dir);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

run();
