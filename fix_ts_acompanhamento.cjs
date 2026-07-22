const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/AcompanhamentoGeral.tsx', 'utf8');

// The first TS error was about Number(p[\`Total\${s.key}\`]) not being valid in TS. Let's fix this logic inside AcompanhamentoGeralPage:
code = code.replace(
    /return SETORES\.filter\(s => projetos\.some\(p => Number\(\(p as Record<string, unknown>\)\[\`Total\$\{s\.key\}\`\]\) > 0\)\);/g,
    `return SETORES.filter(s => projetos.some(p => Number((p as Record<string, unknown>)[\`Total\${s.key}\`]) > 0));`
);

// Wait, the previous string wasn't properly applied because of the patch error. I didn't verify the old file content.
// Let's just fix it manually.
code = code.replace(
    /return SETORES.filter\(s => projetos.some\(p => Number\(p\[\`Total\$\{s.key\}\`\]\) > 0\)\);/g,
    `return SETORES.filter(s => projetos.some(p => Number((p as Record<string, unknown>)[\`Total\${s.key}\`]) > 0));`
);

// The second TS error:
// src/pages/AcompanhamentoGeral.tsx(740,49): error TS2769: No overload matches this call.
// Type 'string | null' is not assignable to type 'string | number | Date | null'
code = code.replace(
    /<span className="text-\[9px\] font-black" style={{ color: s.color }}>{fmtDate\(\(projeto as Record<string, unknown>\)\[\`RealizadoInicio\$\{s.key\}\`\]\)}<\/span>/g,
    `<span className="text-[9px] font-black" style={{ color: s.color }}>{fmtDate((projeto as Record<string, unknown>)[\`RealizadoInicio\${s.key}\`] as string | null)}</span>`
);
code = code.replace(
    /<span className="text-\[9px\] font-black" style={{ color: s.color }}>{fmtDate\(\(projeto as Record<string, unknown>\)\[\`RealizadoFinal\$\{s.key\}\`\]\)}<\/span>/g,
    `<span className="text-[9px] font-black" style={{ color: s.color }}>{fmtDate((projeto as Record<string, unknown>)[\`RealizadoFinal\${s.key}\`] as string | null)}</span>`
);

fs.writeFileSync('frontend/src/pages/AcompanhamentoGeral.tsx', code);
console.log('TS fixes applied');
