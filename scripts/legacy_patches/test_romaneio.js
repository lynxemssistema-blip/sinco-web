const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log("Checking romaneioitem for IdRomaneio=3:");
        const [rows1] = await pool.query("SELECT * FROM romaneioitem WHERE IdRomaneio = 3");
        console.log("romaneioitem rows:", rows1.length);
        if (rows1.length > 0) {
            console.log("First row from romaneioitem:", JSON.stringify(rows1[0], null, 2));
        }

        console.log("\nChecking viewromaneioitem for IdRomaneio=3:");
        const [rows2] = await pool.query("SELECT * FROM viewromaneioitem WHERE IdRomaneio = 3");
        console.log("viewromaneioitem rows:", rows2.length);
        if (rows2.length > 0) {
            console.log("First row from viewromaneioitem:", JSON.stringify(rows2[0], null, 2));
        }

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
run();
