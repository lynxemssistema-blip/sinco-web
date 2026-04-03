// Test the plano-corte/itens route with authentication
const http = require('http');

// First, login to get a session cookie
const loginData = JSON.stringify({ username: 'superadmin', password: 'superadmin' });

const loginReq = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length }
}, (loginRes) => {
    let body = '';
    loginRes.on('data', d => body += d);
    loginRes.on('end', () => {
        console.log('Login status:', loginRes.statusCode);
        const cookies = loginRes.headers['set-cookie'];
        console.log('Cookies received:', cookies ? cookies.length : 0);
        
        let result;
        try { result = JSON.parse(body); } catch(e) { console.log('Login raw:', body.substring(0, 200)); return; }
        console.log('Login result:', result.success, result.message || '');
        
        if (!result.success) return;
        
        // Extract token
        const token = result.token;
        const cookieStr = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';
        
        // Now test the itens route
        const testPaths = [
            '/api/producao-plano-corte/itens/2',
            '/api/producao-plano-corte/itens/2?exibirTodos=true',
            '/api/plano-corte/itens/2'
        ];
        
        testPaths.forEach(path => {
            const req = http.get({
                hostname: 'localhost',
                port: 3000,
                path: path,
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Cookie': cookieStr
                }
            }, (res) => {
                let data = '';
                res.on('data', d => data += d);
                res.on('end', () => {
                    console.log(`\n--- ${path} ---`);
                    console.log('Status:', res.statusCode);
                    try {
                        const r = JSON.parse(data);
                        console.log('Success:', r.success, '| Records:', r.total || r.data?.length || 0);
                        if (r.data && r.data.length > 0) {
                            console.log('First item ID:', r.data[0].IdOrdemServicoItem);
                        }
                        if (r.message) console.log('Msg:', r.message);
                    } catch(e) {
                        console.log('Parse error:', e.message);
                        console.log('Raw:', data.substring(0, 300));
                    }
                });
            });
            req.on('error', e => console.log(`Error ${path}:`, e.message));
        });
    });
});

loginReq.on('error', e => console.log('Login error:', e.message));
loginReq.write(loginData);
loginReq.end();
