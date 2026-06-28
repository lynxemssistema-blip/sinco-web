const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'ApontamentoProducao.tsx');
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(/\} catch \{ \} finally \{/g, '} catch { /* ignore */ } finally {');

fs.writeFileSync(filePath, code);
console.log('Fixed empty block statement in ApontamentoProducao');
