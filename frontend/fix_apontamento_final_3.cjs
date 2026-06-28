const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'ApontamentoProducao.tsx');
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(/interface SelectOption \{[\s\S]*?\}/g, '/* interface SelectOption { value: string; label: string; } */');
code = code.replace(/\} catch \(_err: unknown\) \{/g, '} catch {');
code = code.replace(/\} catch \(e\) \{ \} finally \{ setLoadingPendencias\(false\); \}/g, '} catch { } finally { setLoadingPendencias(false); }');

fs.writeFileSync(filePath, code);
console.log('Fixed final final errors in ApontamentoProducao');
