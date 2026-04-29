const fs = require('fs');
const path = 'c:\\SincoWeb\\SINCO-WEB\\SINCO-WEB\\frontend\\src\\pages\\AcompanhamentoGeral.tsx';
let content = fs.readFileSync(path, 'utf8');

// Restore h-full and overflow-hidden to allow internal flex-1 overflow-auto to work
const target = '        <div className="flex flex-col min-h-screen bg-slate-50/50 font-sans">';
const replacement = '        <div className="flex flex-col h-[calc(100vh-150px)] bg-slate-50/50 font-sans overflow-hidden border border-slate-200 rounded-xl shadow-sm">';

const updatedContent = content.split(target).join(replacement);
fs.writeFileSync(path, updatedContent);
console.log('AcompanhamentoGeral.tsx updated with height constraint');
