const fs = require('fs');
const path = 'c:\\SincoWeb\\SINCO-WEB\\SINCO-WEB\\frontend\\src\\pages\\AcompanhamentoGeral.tsx';
let content = fs.readFileSync(path, 'utf8');

// Target the two return divs that are locking the screen
const target = '        <div className="flex flex-col h-full bg-slate-50/50 font-sans overflow-hidden">';
const replacement = '        <div className="flex flex-col min-h-screen bg-slate-50/50 font-sans">';

// We use split/join for safety with multiple occurrences
if (content.indexOf(target) === -1) {
    console.error('Target not found in AcompanhamentoGeral.tsx');
    // Try without spaces just in case
    const targetNoSpaces = target.trim();
    if (content.indexOf(targetNoSpaces) === -1) {
        process.exit(1);
    }
}

const updatedContent = content.split(target).join(replacement);
fs.writeFileSync(path, updatedContent);
console.log('AcompanhamentoGeral.tsx updated successfully');
