const fs = require('fs');
const file = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx';
let txt = fs.readFileSync(file, 'utf8');

// 1. Rename component
txt = txt.replace('export default function ApontamentoProducaoPage() {', 'export default function ApontamentoProducaoRecursoPage() {');

// 2. Add recursosList state and effect
const hookStr = `const [setorAtivo, setSetorAtivo] = useState<Setor>('mapa');`;
const newHook = `const [recursosList, setRecursosList] = useState<any[]>([]);
const [setorAtivo, setSetorAtivo] = useState<any>('usinagem');

useEffect(() => {
    fetch('/api/recursos', { headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') } })
      .then(res => res.json())
      .then(data => {
         if(data.success) {
            const list = data.data.filter((r: any) => r.Fabrica === 'SIM' || r.Fabrica === '1');
            setRecursosList(list);
            if(list.length > 0) setSetorAtivo(list[0].processofabricacao.toLowerCase().replace(/\\s+/g, ''));
         }
      })
      .catch(console.error);
}, []);`;
txt = txt.replace(hookStr, newHook);

// 3. Replace tabs rendering
let lines = txt.split('\n');
let startIdx = lines.findIndex(l => l.includes('{showTabs && ('));
let endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('</AnimatePresence>'));
if (startIdx !== -1 && endIdx !== -1) {
    lines.splice(startIdx, endIdx - startIdx, 
    `{showTabs && (
      <div className="bg-white rounded-md shadow-sm border border-gray-100 p-2 overflow-hidden mb-2">
        <div className="flex items-center gap-3 bg-gray-50/50 p-2 rounded-lg border border-gray-100">
          <label className="text-xs font-semibold text-gray-700 uppercase">Recurso de Fabricação:</label>
          <select
              value={setorAtivo}
              onChange={(e) => {
                  setSetorAtivo(e.target.value);
                  setPage(1);
                  setHasSearched(false);
              }}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#567469] focus:ring-1 focus:ring-[#567469]"
          >
              {recursosList.map((r, idx) => {
                  const val = r.processofabricacao.toLowerCase().replace(/\\s+/g, '');
                  return <option key={idx} value={val}>{r.processofabricacao}</option>;
              })}
          </select>
        </div>
      </div>
    )}`);
}
txt = lines.join('\n');

// 4. Change Setor typing
txt = txt.replace(/currentSetor: Setor/g, 'currentSetor: any');
txt = txt.replace(/modalSetor: Setor/g, 'modalSetor: any');
txt = txt.replace(/setModalSetor\] = useState<Setor>/g, 'setModalSetor] = useState<any>');

// 5. Replace Actions
const thRegex = /<th className="px-2 py-1\.5 text-left text-\[10px\] font-semibold text-white uppercase tracking-wider">Status<\/th>/;
const thReplace = `<th className="px-2 py-1.5 text-left text-[10px] font-semibold text-white uppercase tracking-wider">Status</th>
                  <th className="px-2 py-1.5 text-center text-[10px] font-semibold text-white uppercase tracking-wider">Ações</th>`;
txt = txt.replace(thRegex, thReplace);

txt = txt.replace(/onDoubleClick=\{[^}]*\}/g, '');

const tdRegex = /<td className="px-2 py-1\.5">\r?\n\s*<div className="flex items-center gap-1\.5">\r?\n\s*\{getStatusIcon\(statusConfig\)\}\r?\n\s*<span className=\{\`text-\[10px\] font-medium \$\{statusConfig\.textColor\}\`\}>\r?\n\s*\{statusConfig\.text\}\r?\n\s*<\/span>\r?\n\s*<\/div>\r?\n\s*<\/td>/g;
const tdReplace = `<td className="px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          {getStatusIcon(statusConfig)}
                          <span className={\`text-[10px] font-medium \${statusConfig.textColor}\`}>
                            {statusConfig.text}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          onClick={() => {
                            if (statusConfig.text !== 'Concluído') {
                                handleItemClick(item);
                            }
                          }}
                          disabled={statusConfig.text === 'Concluído'}
                          className="p-1.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 transition-colors"
                          title="Apontar Produção"
                        >
                          <PenTool size={14} />
                        </button>
                      </td>`;
txt = txt.replace(tdRegex, tdReplace);

fs.writeFileSync(file, txt);
console.log('Component successfully patched');
