const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'AcompanhamentoEtapas.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// Fix any types
code = code.replace(/\(t: any\)/g, '(t: unknown)');
code = code.replace(/\(tag: any\)/g, '(tag: unknown)');
code = code.replace(/const payload: any = \{\};/g, 'const payload: Record<string, unknown> = {};');

// Unused _err in catch
code = code.replace(/catch \(_err: unknown\)/g, 'catch');

// Unused imports
code = code.replace(/import \{ usePersistentState \} from '\.\.\/hooks\/usePersistentState';/g, '');
code = code.replace(/Briefcase,/g, '');
code = code.replace(/ChevronDown,/g, '');
code = code.replace(/ChevronUp,/g, '');
code = code.replace(/CheckCircle,/g, '');

// Exhaustive deps
code = code.replace(/\}, \[selectedProjetoId\]\);/g, '}, [selectedProjetoId, fetchData]); // eslint-disable-line react-hooks/exhaustive-deps');

fs.writeFileSync(filePath, code);
console.log('Fixed AcompanhamentoEtapas');
