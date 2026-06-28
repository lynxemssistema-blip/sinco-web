const fs = require('fs');
const file = 'src/pages/OrdemServico.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/error: any;/g, 'error: unknown;');
code = code.replace(/errorInfo: any;/g, 'errorInfo: unknown;');

code = code.replace(/catch \(err: any\)/g, 'catch (_err: unknown)');
code = code.replace(/catch \(e: any\)/g, 'catch (_e: unknown)');
code = code.replace(/catch \(err\)/g, 'catch (_err)');
code = code.replace(/catch \(e\)/g, 'catch (_e)');

code = code.replace(/const \[projetos, setProjetos\]/g, 'const [, setProjetos]');
code = code.replace(/const \[tags, setTags\]/g, 'const [, setTags]');
code = code.replace(/const getStatusIcon =/g, '// const getStatusIcon =');
code = code.replace(/const handleAbrirModalExcluirItens =/g, '// const handleAbrirModalExcluirItens =');

code = code.replace(/const \[itens, setItens\] = useState/g, 'const [, setItens] = useState');

fs.writeFileSync(file, code);
console.log('OrdemServico lint fixes applied');
