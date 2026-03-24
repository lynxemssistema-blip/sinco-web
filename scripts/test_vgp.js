const http = require('http');

http.get('http://localhost:3000/api/producao/visao-geral', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('Status:', res.statusCode, 'Body:', data ? data.substring(0, 500) : '<empty>'));
}).on('error', err => console.log('Error:', err.message));
