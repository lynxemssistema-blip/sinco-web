const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'AcompanhamentoGeral.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// Unused useRef
code = code.replace(/useRef } from 'react';/g, '} from "react";');

// Unused showFilters
code = code.replace(/const \[showFilters, setShowFilters\] = usePersistentState/g, '// const [showFilters, setShowFilters] = usePersistentState');

fs.writeFileSync(filePath, code);
console.log('Fixed last 3 errors in AcompanhamentoGeral');
