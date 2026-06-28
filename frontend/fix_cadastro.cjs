const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'CadastroUsuario.tsx');
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("if (!user || (user.role !== 'admin' && !user.isSuperadmin)) {")) {
        startIdx = i;
        break;
    }
}

if (startIdx !== -1) {
    for (let i = startIdx; i < lines.length; i++) {
        if (lines[i].trim() === "}") {
            endIdx = i;
            break;
        }
    }
}

if (startIdx !== -1 && endIdx !== -1) {
    let block = lines.slice(startIdx, endIdx + 1);
    
    // Convert to auth check variable without the inner `return (`
    let blockStr = block.join('\n');
    blockStr = blockStr.replace(/if \(\!user \|\| \(user\.role \!\=\= 'admin' \&\& \!user\.isSuperadmin\)\) \{/, "const unauthorizedError = (!user || (user.role !== 'admin' && !user.isSuperadmin)) ? (");
    blockStr = blockStr.replace(/\r?\n\s*return \(/, "");
    blockStr = blockStr.replace(/\);\r?\n\s*\}/, ") : null;");
    
    // Remove from original position
    lines.splice(startIdx, endIdx - startIdx + 1);
    
    // Find the main return
    let mainReturnIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        // the main render starts around line 337 with `return (\n    <div className="flex flex-col...`
        if (lines[i].trim() === "return (" && lines[i+1] && lines[i+1].includes("<div className=\"flex flex-col h-[calc(100vh-4rem)]")) {
            mainReturnIdx = i;
            break;
        }
    }
    
    if (mainReturnIdx !== -1) {
        lines.splice(mainReturnIdx, 0, blockStr, "", "  if (unauthorizedError) return unauthorizedError;");
    } else {
        console.log('Could not find main return');
    }
}

let code = lines.join('\n');

// other fixes
code = code.replace(/catch \(_e: unknown\)/g, 'catch');
code = code.replace(/catch \(e\)\s*\{\}/g, 'catch { /* ignore */ }');
code = code.replace(/catch \(e: unknown\)/g, 'catch');
code = code.replace(/catch \(e\)/g, 'catch');
code = code.replace(/\(item as any\)/g, '(item as Record<string, unknown>)');
code = code.replace(/const resData: any =/g, 'const resData: Record<string, unknown> =');
code = code.replace(/ as any\)/g, ' as Record<string, unknown>)');

// unused AtSign
code = code.replace(/AtSign, /g, '');

fs.writeFileSync(filePath, code);
console.log('Fixed CadastroUsuario');
