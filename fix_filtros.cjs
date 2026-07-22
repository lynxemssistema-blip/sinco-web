const fs = require('fs');
const file = 'frontend/src/pages/MontaPecaManufaturada.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add states
content = content.replace(
  "const [fDesc3, setFDesc3] = useState('');",
  "const [fDesc3, setFDesc3] = useState('');\n  const [filtroCod3, setFiltroCod3] = useState('');\n  const [filtroDesc3, setFiltroDesc3] = useState('');"
);

// 2. Filter materiais3Filtrados
content = content.replace(
  "    if (comp2.some(c => c.IdMaterial === m.IdMaterial)) return false;\n    return true;",
  "    if (comp2.some(c => c.IdMaterial === m.IdMaterial)) return false;\n    if (filtroCod3 && !m.CodMatFabricante.toLowerCase().includes(filtroCod3.toLowerCase())) return false;\n    if (filtroDesc3 && !(m.DescResumo || '').toLowerCase().includes(filtroDesc3.toLowerCase())) return false;\n    return true;"
);

// 3. Grid 2 header
const grid2HeaderOld = `<th className={colsCls}>Recurso</th>`;
const grid2HeaderNew = `<th className={colsCls}>\n                      <div className="flex flex-col gap-1">\n                        <span>Recurso</span>\n                        <input type="text" placeholder="Filtro..." value={procTableFiltro} onChange={e => setProcTableFiltro(e.target.value)} className="w-full px-1 py-0.5 text-[9px] font-normal border border-gray-200 rounded focus:outline-none focus:border-teal-500 bg-white" />\n                      </div>\n                    </th>`;
content = content.replace(grid2HeaderOld, grid2HeaderNew);

// 4. Grid 3 header
const grid3HeaderOld = `<th className={colsCls}>C??digo</th>\n                      <th className={colsCls}>Descri????o</th>`.replace(/\?/g, '.');
const grid3HeaderNew = `<th className={colsCls}>\n                        <div className="flex flex-col gap-1">\n                          <span>Código</span>\n                          <input type="text" placeholder="Filtro Cód..." value={filtroCod3} onChange={e=>setFiltroCod3(e.target.value)} className="w-full px-1 py-0.5 text-[9px] font-normal border border-gray-200 rounded focus:outline-none focus:border-indigo-500 bg-white" />\n                        </div>\n                      </th>\n                      <th className={colsCls}>\n                        <div className="flex flex-col gap-1">\n                          <span>Descrição</span>\n                          <input type="text" placeholder="Filtro Desc..." value={filtroDesc3} onChange={e=>setFiltroDesc3(e.target.value)} className="w-full px-1 py-0.5 text-[9px] font-normal border border-gray-200 rounded focus:outline-none focus:border-indigo-500 bg-white" />\n                        </div>\n                      </th>`;

// Use Regex to handle encoding issues with 'Código' and 'Descrição' in the original file
content = content.replace(
  /<th className={colsCls}>C.digo<\/th>\s*<th className={colsCls}>Descri..o<\/th>/,
  grid3HeaderNew
);


fs.writeFileSync(file, content, 'utf8');
console.log('Done');
