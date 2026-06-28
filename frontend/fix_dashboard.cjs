const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Dashboard.tsx');
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(/useAnimation, /g, '');
code = code.replace(/ Calendar, /g, ' ');
code = code.replace(/ShieldCheck, /g, '');
code = code.replace(/ClipboardCheck, /g, '');
code = code.replace(/AlertCircle, /g, '');
code = code.replace(/CheckCircle2, /g, '');
code = code.replace(/import \{ cn \} from '\.\.\/lib\/utils';\r?\n/g, '');
code = code.replace(/const item = /g, '// const item = ');

fs.writeFileSync(filePath, code);
console.log('Fixed Dashboard');
