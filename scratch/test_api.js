const axios = require('axios');
axios.get('http://localhost:3000/api/visao-geral/projeto/15/ordens-servico')
    .then(res => console.log('API Response:', res.data))
    .catch(err => {
        if (err.response) console.log('API Error:', err.response.status, err.response.data);
        else console.log('Error:', err.message);
    });
