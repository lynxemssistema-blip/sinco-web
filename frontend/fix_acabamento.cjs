const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Acabamento.tsx');
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(/import \{ createPortal \} from 'react-dom';/g, '// import { createPortal } from "react-dom";');
code = code.replace(/const inputOptional = /g, '// const inputOptional = ');
code = code.replace(/catch \(err\)/g, 'catch');

fs.writeFileSync(filePath, code);
console.log('Fixed Acabamento');
