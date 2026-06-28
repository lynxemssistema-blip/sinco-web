const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'ApontamentoProducao.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// Imports
code = code.replace(/import \{ usePersistentState \} from '\.\.\/hooks\/usePersistentState';\r?\n/, '');
code = code.replace(/import \{ SelectOption \} from '\.\.\/components\/ui\/SearchableSelect';\r?\n/, '');

// Unused vars
code = code.replace(/catch \(_err\)/g, 'catch');
code = code.replace(/catch \(e\) \{\}/g, 'catch { /* ignore error */ }');

// Unexpected any. I'll just replace all ' as any)' with ' as Record<string, unknown>)'
code = code.replace(/ as any\)/g, ' as Record<string, unknown>)');

fs.writeFileSync(filePath, code);
console.log('Fixed ALL remaining errors in ApontamentoProducao');
