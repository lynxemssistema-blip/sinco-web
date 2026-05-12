const mysql = require('mysql2/promise');

const config = {
    host: 'lynxlocal.mysql.uhserver.com',
    user: 'lynxlocal',
    password: 'jHAzhFG848@yN@U',
    database: 'lynxlocal'
};

async function checkAndFix() {
    const conn = await mysql.createConnection(config);
    try {
        console.log("Checking indexes on usuarios_central...");
        const [indexes] = await conn.execute("SHOW INDEX FROM usuarios_central");
        console.log("Indexes found:");
        let loginUniqueName = null;
        for (const idx of indexes) {
            console.log(`- ${idx.Key_name} (Column: ${idx.Column_name}, Non_unique: ${idx.Non_unique})`);
            if (idx.Column_name === 'login' && idx.Non_unique === 0 && idx.Key_name !== 'PRIMARY') {
                loginUniqueName = idx.Key_name;
            }
        }

        if (loginUniqueName) {
            console.log(`Found UNIQUE constraint on login: ${loginUniqueName}. Dropping it...`);
            await conn.execute(`ALTER TABLE usuarios_central DROP INDEX ${loginUniqueName}`);
            console.log("UNIQUE constraint dropped successfully!");
        } else {
            console.log("No UNIQUE constraint found on login.");
        }
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await conn.end();
    }
}

checkAndFix();
