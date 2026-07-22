const fs = require('fs');
const file = 'frontend/src/pages/MontaPecaManufaturada.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix token
content = content.replace("if (!token, 'error') return;", "if (!token) return;");

// 2. Fix api
content = content.replace(
  "fetch('/api/recursos', { headers: authHdr() })\n      .then(r => r.json())\n      .then(j => {\n        if (j.success) {\n          const mapped = j.data.map((d: any) => ({ ...d, ProcessoFabricacao: d.processofabricacao }));\n          setTipos(mapped);\n        }\n      });",
  "fetch(`${API}/processos`, { headers: authHdr() })\n      .then(r => r.json())\n      .then(j => {\n        if (j.success) {\n          setTipos(j.data);\n        }\n      });"
);

// 3. Fix handleSaveComp3
content = content.replace(
  "fetchComp2(selMat1.IdMaterial);\n        setSelecionados3(new Set());\n        setQuantidades3({});\n\n      } else { \n        showAlert('Erro: ' + j.message); \n      }\n    } finally { \n      setSaving3(false, 'error'); \n    }",
  "fetchComp2(selMat1.IdMaterial);\n        setSelecionados3(new Set());\n        setQuantidades3({});\n        setMateriais1(prev => prev.map(m => m.IdMaterial === selMat1.IdMaterial ? { ...m, PecaManufat: 'S' } : m));\n        setSelMat1(prev => prev ? { ...prev, PecaManufat: 'S' } : null);\n      } else { \n        showAlert('Erro: ' + j.message); \n      }\n    } finally { \n      setSaving3(false); \n    }"
);

// 4. Add states
content = content.replace(
  "const [fDesc3, setFDesc3] = useState('');",
  "const [fDesc3, setFDesc3] = useState('');\n  const [filtroCod3, setFiltroCod3] = useState('');\n  const [filtroDesc3, setFiltroDesc3] = useState('');"
);

// 5. Filter materiais3Filtrados
content = content.replace(
  "    if (comp2.some(c => c.IdMaterial === m.IdMaterial)) return false;\n    return true;",
  "    if (comp2.some(c => c.IdMaterial === m.IdMaterial)) return false;\n    if (filtroCod3 && !m.CodMatFabricante.toLowerCase().includes(filtroCod3.toLowerCase())) return false;\n    if (filtroDesc3 && !(m.DescResumo || '').toLowerCase().includes(filtroDesc3.toLowerCase())) return false;\n    return true;"
);

// 6. Grid 2 header
const grid2HeaderOld = `<th className={colsCls}>Recurso</th>`;
const grid2HeaderNew = `<th className={colsCls}>\n                      <div className="flex flex-col gap-1">\n                        <span>Recurso</span>\n                        <input type="text" placeholder="Filtro..." value={procTableFiltro} onChange={e => setProcTableFiltro(e.target.value)} className="w-full px-1 py-0.5 text-[9px] font-normal border border-gray-200 rounded focus:outline-none focus:border-teal-500 bg-white" />\n                      </div>\n                    </th>`;
content = content.replace(grid2HeaderOld, grid2HeaderNew);

// 7. Grid 3 header
const grid3HeaderNew = `<th className={colsCls}>\n                        <div className="flex flex-col gap-1">\n                          <span>Código</span>\n                          <input type="text" placeholder="Filtro Cód..." value={filtroCod3} onChange={e=>setFiltroCod3(e.target.value)} className="w-full px-1 py-0.5 text-[9px] font-normal border border-gray-200 rounded focus:outline-none focus:border-indigo-500 bg-white" />\n                        </div>\n                      </th>\n                      <th className={colsCls}>\n                        <div className="flex flex-col gap-1">\n                          <span>Descrição</span>\n                          <input type="text" placeholder="Filtro Desc..." value={filtroDesc3} onChange={e=>setFiltroDesc3(e.target.value)} className="w-full px-1 py-0.5 text-[9px] font-normal border border-gray-200 rounded focus:outline-none focus:border-indigo-500 bg-white" />\n                        </div>\n                      </th>`;
content = content.replace(
  /<th className={colsCls}>C.digo<\/th>\s*<th className={colsCls}>Descri..o<\/th>/,
  grid3HeaderNew
);

fs.writeFileSync(file, content, 'utf8');
console.log('Restored and applied filters.');
