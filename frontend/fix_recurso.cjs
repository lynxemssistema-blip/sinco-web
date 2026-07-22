const fs = require('fs');
const src = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducao.tsx';
const dest = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx';

let content = fs.readFileSync(src, 'utf8');

// 1. Rename Component
content = content.replace(/export default function ApontamentoProducaoPage\(\) \{/, 'export default function ApontamentoProducaoRecursoPage() {');

// 2. Add /api/recursos fetching
const hookStr = `const [setorAtivo, setSetorAtivo] = useState<Setor>('mapa');`;
const replaceHookStr = `const [recursosList, setRecursosList] = useState<any[]>([]);
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

content = content.replace(hookStr, replaceHookStr);

// 3. Replace Tabs with Combobox
const tabsRegex = /\{showTabs && \([\s\S]*?<\/div>\r?\n\s*\)\}/;
const tabsReplace = `{showTabs && (
        <div className="flex items-center gap-3 bg-gray-50/50 p-2 rounded-lg border border-gray-100 shrink-0">
            <label className="text-xs font-semibold text-gray-700 uppercase">Recurso de Fabricação:</label>
            <select
                value={setorAtivo as string}
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
      )}`;
content = content.replace(tabsRegex, tabsReplace);

// 4. Ações
const thRegex = /<th className="px-2 py-1\.5 text-left text-\[10px\] font-semibold text-white uppercase tracking-wider">Status<\/th>/;
const thReplace = `<th className="px-2 py-1.5 text-left text-[10px] font-semibold text-white uppercase tracking-wider">Status</th>
                  <th className="px-2 py-1.5 text-center text-[10px] font-semibold text-white uppercase tracking-wider">Ações</th>`;
content = content.replace(thRegex, thReplace);

// Double click
content = content.replace(/onDoubleClick=\{[^}]*\}/g, '');

// Ação column cell
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
content = content.replace(tdRegex, tdReplace);

// 5. Change "setores" error
// Find `const checkPredecessorStatus = (item: ApontamentoItem, currentSetor: Setor) => {`
content = content.replace(/const checkPredecessorStatus = \(item: ApontamentoItem, currentSetor: Setor\) => \{/, 'const checkPredecessorStatus = (item: ApontamentoItem, currentSetor: any) => {');

// Because setorAtivo is no longer just 'Setor', replace all currentSetor: Setor to any
content = content.replace(/currentSetor: Setor/g, 'currentSetor: any');

fs.writeFileSync(dest, content);
console.log('Modified successfully');
