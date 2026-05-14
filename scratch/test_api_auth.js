const jwt = require('jsonwebtoken');
const axios = require('axios');
const token = jwt.sign({ dbName: 'lynxlocal', login: 'admin', superadmin: 'S' }, 'SincoWebSecret2026!KeySecure');
axios.get('http://localhost:3000/api/visao-geral/projeto/15/ordens-servico', { headers: { Authorization: 'Bearer ' + token } })
    .then(res => console.log('RESPONSE:', res.data))
    .catch(err => console.error('ERROR:', err.response ? err.response.data : err.message));
