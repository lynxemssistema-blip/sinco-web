const http = require('http');

const loginData = JSON.stringify({
    login: 'admin',
    senha: '123'
});

const req = http.request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': loginData.length
    }
}, (res) => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
        const body = JSON.parse(data);
        const token = body.token;

        http.get('http://localhost:3000/api/acompanhamento/projetos?projeto=0001', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }, (res2) => {
            let data2 = '';
            res2.on('data', d => data2 += d);
            res2.on('end', () => {
                const body2 = JSON.parse(data2);
                if (body2.data && body2.data.length > 0) {
                    const p = body2.data[0];
                    console.log('Project:', p.Projeto);
                    console.log('Corte:', p.TotalCorte, p.flagCorte);
                    console.log('Galvanizar:', p.TotalGalvanizar, p.flagGalvanizar);
                    console.log('Dobra:', p.TotalDobra, p.flagDobra);
                    console.log('Pulsionadeira:', p.TotalPulsionadeira, p.flagPulsionadeira);
                } else {
                    console.log('No project data:', data2);
                }
            });
        });
    });
});

req.write(loginData);
req.end();
