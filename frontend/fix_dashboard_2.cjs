const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Dashboard.tsx');
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(/\/\/ const item = \{\r?\n\s*hidden: \{ opacity: 0, y: 20 \},\r?\n\s*show: \{ opacity: 1, y: 0, transition: \{ type: "spring", stiffness: 300, damping: 24 \} \}\r?\n\s*\};/g, '/* const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } }; */');

fs.writeFileSync(filePath, code);
console.log('Fixed Dashboard syntax error');
