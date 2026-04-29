const fs = require('fs');
const path = 'c:\\SincoWeb\\SINCO-WEB\\SINCO-WEB\\frontend\\src\\pages\\AcompanhamentoGeral.tsx';
let content = fs.readFileSync(path, 'utf8');

// Use regex to match the div with flexible spacing and varying height calculations
// Matches: <div className="flex flex-col h-[...] bg-slate-50/50 font-sans overflow-hidden border border-slate-200 rounded-xl shadow-sm">
const regex = /<div className="flex flex-col h-\[.*?\].*?bg-slate-50\/50 font-sans overflow-hidden.*?">/g;

const replacement = '<div className="flex flex-col w-full bg-slate-50/50 font-sans border border-slate-200 rounded-xl shadow-sm">';

if (!regex.test(content)) {
    console.error('Regex target not found in AcompanhamentoGeral.tsx');
    // Try a simpler one
    const regexSimple = /<div className="flex flex-col h-full bg-slate-50\/50 font-sans overflow-hidden">/g;
    if (!regexSimple.test(content)) {
        process.exit(1);
    }
    content = content.replace(regexSimple, replacement);
} else {
    content = content.replace(regex, replacement);
}

fs.writeFileSync(path, content);
console.log('Failsafe scroll fix applied via regex');
