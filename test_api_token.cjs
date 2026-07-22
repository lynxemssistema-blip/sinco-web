const jwt = require('jsonwebtoken');
const http = require('http');

const token = jwt.sign({
    id: 1,
    login: 'admin',
    nivel: 1,
    tenant_db: 'lynxlocal'
}, 'SincoWebSecret2026!KeySecure', { expiresIn: '1h' });

http.get('http://localhost:3000/api/acompanhamento/projetos?projeto=0001', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-db': 'lynxlocal'
    }
}, (res) => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
        const body = JSON.parse(data);
        if (body.data && body.data.length > 0) {
            const p = body.data[0];
            console.log('Project:', p.Projeto);
            console.log('Corte:', p.TotalCorte, 'flag:', p.flagCorte);
            console.log('Galvanizar:', p.TotalGalvanizar, 'flag:', p.flagGalvanizar);
        } else {
            console.log(data);
        }
    });
});
