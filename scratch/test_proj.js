const axios = require('axios');
axios.get('http://localhost:3000/api/acompanhamento/projetos')
    .then(res => console.log('RESPONSE:', typeof res.data, res.data))
    .catch(err => console.log('ERROR:', err.message));
