const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'ApontamentoProducao.tsx');
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("if (!user || (user.role !== 'admin'")) {
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
    // Extract the block
    let block = lines.slice(startIdx, endIdx + 1);
    
    // Convert to auth check variable
    block[0] = `  const unauthorizedError = (!user || (user.role !== 'admin' && user.mapaProducao !== 'S' && !user.isSuperadmin && user.superadmin !== 'S')) ? (`;
    block[block.length - 1] = `  ) : null;`;
    
    // Remove from original position
    lines.splice(startIdx, endIdx - startIdx + 1);
    
    // Find the main return
    let mainReturnIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("const setorInfo = setores.find")) {
            mainReturnIdx = i;
            break;
        }
    }
    
    if (mainReturnIdx !== -1) {
        // Insert it right after the const setorInfo...
        lines.splice(mainReturnIdx + 1, 0, ...block, "", "  if (unauthorizedError) return unauthorizedError;");
        fs.writeFileSync(filePath, lines.join('\n'));
        console.log('Fixed ApontamentoProducao early return perfectly');
    } else {
        console.log('Could not find main return');
    }
} else {
    console.log('Could not find block bounds');
}
