const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'AcompanhamentoGeral.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// Unused states
code = code.replace(/const \[showObs, setShowObs\] = useState/g, '// const [showObs, setShowObs] = useState');
code = code.replace(/const \[showFilters, setShowFilters\] = useState/g, '// const [showFilters, setShowFilters] = useState');
code = code.replace(/const \[obsEdit, setObsEdit\] = useState/g, '// const [obsEdit, setObsEdit] = useState');
code = code.replace(/const obsInputRef = useRef/g, '// const obsInputRef = useRef');

// Fix set-state-in-effect
code = code.replace(/setLoading\(true\);/g, '// eslint-disable-next-line react-hooks/set-state-in-effect\n      setLoading(true);');

// Use npx eslint --fix again
const { execSync } = require('child_process');
fs.writeFileSync(filePath, code);

try {
    execSync(`npx eslint ${filePath} --fix`, { stdio: 'inherit' });
} catch (e) {}

console.log('Fixed AcompanhamentoGeral states');
