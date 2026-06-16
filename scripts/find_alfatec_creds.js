require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
    const p = mysql.createPool({
        host: process.env.DB_HOST, user: process.env.DB_USER,
        password: process.env.DB_PASSWORD, database: 'lynxlocal'
    });

    // Procurar configurações do tenant alfatec
    const [tables] = await p.query("SHOW TABLES");
    console.log('Tabelas lynxlocal:', tables.map(t => Object.values(t)[0]).join(', '));

    // Procurar tabela de tenants/empresas
    const hasTenants = tables.find(t => Object.values(t)[0].toLowerCase().includes('tenant'));
    const hasEmpresas = tables.find(t => Object.values(t)[0].toLowerCase().includes('empresa'));
    const hasConfig = tables.find(t => Object.values(t)[0].toLowerCase().includes('config'));

    if (hasTenants) {
        const [r] = await p.query('SELECT * FROM tenants WHERE dbName LIKE "%alfatec%" LIMIT 5');
        console.log('Tenants alfatec:', JSON.stringify(r, null, 2));
    }

    // Verificar se existe tabela de credenciais de banco
    const [dbCred] = await p.query("SHOW TABLES LIKE '%banco%'");
    console.log('Tabelas banco:', JSON.stringify(dbCred));

    // Verificar tabela usuarios/sessoes para encontrar alfatec
    const [users] = await p.query("SELECT * FROM usuarios WHERE banco LIKE '%alfatec%' OR email LIKE '%alfatec%' LIMIT 5").catch(() => [[]]);
    console.log('Usuarios alfatec:', JSON.stringify(users, null, 2));

    await p.end();
})().catch(e => console.error('ERRO:', e.message));
