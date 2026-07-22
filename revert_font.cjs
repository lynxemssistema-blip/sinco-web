const fs = require('fs');

let cadPath = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/CadastroUsuario.tsx';
let cadContent = fs.readFileSync(cadPath, 'utf8');

cadContent = cadContent.replace(
    /text-sm font-black text-slate-900/g,
    'text-[11px] font-bold text-slate-700'
);

fs.writeFileSync(cadPath, cadContent);
console.log('CadastroUsuario.tsx reverted font sizes');
