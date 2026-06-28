const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'AcompanhamentoGeral.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// Unused imports
code = code.replace(/useRef, /g, '');
code = code.replace(/Filter,/g, '');
code = code.replace(/MapPin,/g, '');
code = code.replace(/FileText,/g, '');
code = code.replace(/Clock,/g, '');
code = code.replace(/TrendingUp,/g, '');
code = code.replace(/BarChart3/g, '');

// Unused var `exec`
code = code.replace(/const exec = Number/g, '// eslint-disable-next-line @typescript-eslint/no-unused-vars\nconst exec = Number');

// Remaining unused states
code = code.replace(/const \[showFilters, setShowFilters\] = useState/g, '// const [showFilters, setShowFilters] = useState');

// Exhaustive deps on line 641
code = code.replace(/\[filtros, tags\]\)/g, '[filtros])');

fs.writeFileSync(filePath, code);
console.log('Fixed remaining errors in AcompanhamentoGeral');
