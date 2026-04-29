const fs = require('fs');
const path = 'c:\\SincoWeb\\SINCO-WEB\\SINCO-WEB\\src\\server.js';
let content = fs.readFileSync(path, 'utf8');

const marker = "app.post('/api/admin/databases', authenticateAdmin, async (req, res) => {";
const nextMarker = "app.post('/api/admin/sync-users/:dbId'";

let start = content.indexOf(marker);
let end = content.indexOf(nextMarker, start);

if (start === -1 || end === -1) {
    console.error('Markers not found');
    process.exit(1);
}

const newBlock = `app.post('/api/admin/databases', authenticateAdmin, async (req, res) => {
    const { nome_cliente, db_host, db_user, db_pass, db_name, db_port, copia_banco_dados } = req.body;
    let connection;
    try {
        connection = await mysql.createConnection(CENTRAL_DB_CONFIG);
        await connection.execute(
            'INSERT INTO conexoes_bancos (nome_cliente, db_host, db_user, db_pass, db_name, db_port, copia_banco_dados) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nome_cliente, db_host, db_user, db_pass, db_name, db_port || 3306, copia_banco_dados || null]
        );
        res.json({ success: true, message: 'Banco cadastrado com sucesso' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error saving database: ' + error.message });
    } finally {
        if (connection) await connection.end();
    }
});

`;

const updatedContent = content.substring(0, start) + newBlock + content.substring(end);
fs.writeFileSync(path, updatedContent);
console.log('server.js updated successfully');
