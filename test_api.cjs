const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/peca-manufaturada/materiais-criar?cod=2121',
  method: 'GET',
  headers: {
    // I need a valid token. Since I don't have one, I'll bypass or simulate the db call.
  }
};
