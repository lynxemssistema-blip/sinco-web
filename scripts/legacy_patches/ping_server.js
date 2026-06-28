const http = require('http');

http.get('http://localhost:3000/api/visao-geral/projetos', (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.on('data', () => { });
    res.on('end', () => console.log('Ping success'));
}).on('error', (e) => {
    console.error(`Got error: ${e.message}`);
});
