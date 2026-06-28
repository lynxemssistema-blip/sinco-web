const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'CadastroUsuario.tsx');
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(/ AtSign,/g, '');
code = code.replace(/const body: any = \{/g, 'const body: Record<string, unknown> = {');
code = code.replace(/appearance: 'none' as any/g, 'appearance: "none" as React.CSSProperties["appearance"]');

// And line 633 e not used + empty block
code = code.replace(/catch \(e\)/g, 'catch');

fs.writeFileSync(filePath, code);
console.log('Fixed remaining CadastroUsuario');
