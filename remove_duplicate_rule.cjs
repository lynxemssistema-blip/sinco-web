const fs = require('fs');
const file = 'frontend/src/pages/MontaPecaManufaturada.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove the dropdown filter so all resources show
content = content.replace(
  /tipos\.filter\(t=>!staging\.some\(s=>s\.IdProcesso===t\.IdProcessoFabricacao\)\)\.map\(t=>\(<option key=\{t\.IdProcessoFabricacao\} value=\{t\.IdProcessoFabricacao\}>\{t\.ProcessoFabricacao\}<\/option>\)\)/g,
  'tipos.map(t=>(<option key={t.IdProcessoFabricacao} value={t.IdProcessoFabricacao}>{t.ProcessoFabricacao}</option>))'
);

// 2. Remove the "already registered" validation block from handleAddProc
content = content.replace(
  /if \(staging\.some\(s => s\.IdProcesso === Number\(selId\)\)\) \{ showAlert\('Recurso já cadastrado nesta peça', 'error'\); return; \}/g,
  ''
);

// 3. Remove saveAllProcs function
content = content.replace(
  /const saveAllProcs = async \(\) => \{\s*if \(\!selMat1\) return;\s*setSavingProc\(true\);\s*await saveProcs\(staging\);\s*setSavingProc\(false\);\s*\};\s*/g,
  ''
);

// 4. Remove the Gravar Processos button block
content = content.replace(
  /\s*{\/\* BOTÃO SALVAR PROCESSOS \*\/}\s*<div className="p-2 border-t border-gray-200 shrink-0 bg-white flex justify-end">\s*<button onClick=\{saveAllProcs\} disabled=\{savingProc\|\|\!selMat1\|\|staging\.length===0\} className="flex items-center gap-1\.5 px-3 py-1\.5 bg-\[#32423D\] text-white text-\[10px\] font-bold rounded shadow-sm hover:bg-\[#25322e\] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">\s*\{savingProc\?<Loader2 size=\{12\} className="animate-spin"\/>:<Save size=\{12\}\/>\} Gravar Processos\s*<\/button>\s*<\/div>/g,
  ''
);

fs.writeFileSync(file, content, 'utf8');
console.log('Modifications applied successfully');
