const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'OrdemServico.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// Fix catch (e)
code = code.replace(/} catch \(e\) {/g, '} catch {');

// Fix the ternary operation
const target = 'sel ? n.delete(item.IdOrdemServicoItem) : n.add(item.IdOrdemServicoItem);';
const replacement = 'if (sel) { n.delete(item.IdOrdemServicoItem); } else { n.add(item.IdOrdemServicoItem); }';
code = code.replace(target, replacement);

fs.writeFileSync(filePath, code);
console.log('Final 2 errors fixed');
