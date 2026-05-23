const http = require('http');

const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
}, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
        const token = JSON.parse(d).token;
        if (!token) {
            console.error("No token:", d);
            return;
        }
        
        http.get({
            hostname: 'localhost',
            port: 3000,
            path: '/api/apontamento/planejamento/diario?planInicioDe=2026-03-01&planInicioAte=2026-05-22&planFimDe=&planFimAte=&setor=corte&os=23',
            headers: { Authorization: 'Bearer ' + token }
        }, r => {
            let e = '';
            r.on('data', c => e += c);
            r.on('end', () => console.log(JSON.stringify(JSON.parse(e), null, 2)));
        });
    });
});
req.write(JSON.stringify({ username: 'MEC050922', password: '123' })); // Wait, what is the dev user pass?
req.end();
