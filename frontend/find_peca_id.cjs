const http = require('http');
http.get('http://localhost:3000/api/config/menu', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    const findPeca = (items) => {
      for (const item of items) {
        if (item.label && item.label.includes('Manufaturada')) {
          console.log('Found:', item);
        }
        if (item.children) findPeca(item.children);
      }
    };
    findPeca(json.menu);
  });
});
