const fs = require('fs');
let content = fs.readFileSync('src/server.js', 'utf8');

// The local 'const pool = require...' shadowed the global. Let's remove it and use the global pool.
content = content.replace(/const pool = require\('\.\.\/config\/db'\);\s*connection = await pool\.getConnection\(\);/g, 'connection = await pool.getConnection();');

fs.writeFileSync('src/server.js', content, 'utf8');
console.log('Fixed pool require path in server.js');
