const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Dashboard.tsx');
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(/ CheckCircle2,/g, '');

fs.writeFileSync(filePath, code);
console.log('Fixed Dashboard 4');
