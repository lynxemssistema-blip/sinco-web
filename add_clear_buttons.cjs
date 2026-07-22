const fs = require('fs');
const file = 'frontend/src/pages/MontaPecaManufaturada.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Grid 1 Composition Filters
content = content.replace(
  /<input type="text" placeholder="Filtro Cód\.\.\." value=\{compFiltroCod\}/,
  `<div className="relative"><input type="text" placeholder="Filtro Cód..." value={compFiltroCod}`
);
content = content.replace(
  /className="w-20 px-1 py-0\.5 text-\[9px\] border border-gray-300 rounded focus:outline-none focus:border-teal-500 bg-white" \/>/,
  `className="w-20 px-1 pr-4 py-0.5 text-[9px] border border-gray-300 rounded focus:outline-none focus:border-teal-500 bg-white" />{compFiltroCod && <button onClick={()=>setCompFiltroCod('')} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500" title="Limpar"><X size={10} /></button>}</div>`
);

content = content.replace(
  /<input type="text" placeholder="Filtro Desc\.\.\." value=\{compFiltroDesc\}/,
  `<div className="relative"><input type="text" placeholder="Filtro Desc..." value={compFiltroDesc}`
);
content = content.replace(
  /className="w-24 px-1 py-0\.5 text-\[9px\] border border-gray-300 rounded focus:outline-none focus:border-teal-500 bg-white" \/>/,
  `className="w-24 px-1 pr-4 py-0.5 text-[9px] border border-gray-300 rounded focus:outline-none focus:border-teal-500 bg-white" />{compFiltroDesc && <button onClick={()=>setCompFiltroDesc('')} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500" title="Limpar"><X size={10} /></button>}</div>`
);

// 2. Grid 2 Process Filter
content = content.replace(
  /<input type="text" placeholder="Filtro\.\.\." value=\{procTableFiltro\}/,
  `<div className="relative"><input type="text" placeholder="Filtro..." value={procTableFiltro}`
);
content = content.replace(
  /className="w-full px-1 py-0\.5 text-\[9px\] font-normal border border-gray-200 rounded focus:outline-none focus:border-teal-500 bg-white" \/>\s*<\/div>\s*<\/th>/,
  `className="w-full px-1 pr-4 py-0.5 text-[9px] font-normal border border-gray-200 rounded focus:outline-none focus:border-teal-500 bg-white" />{procTableFiltro && <button onClick={()=>setProcTableFiltro('')} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500" title="Limpar"><X size={10} /></button>}</div></div></th>`
);


// 3. Grid 3 Material Filters
content = content.replace(
  /<input type="text" placeholder="Filtro Cód\.\.\." value=\{filtroCod3\}/,
  `<div className="relative"><input type="text" placeholder="Filtro Cód..." value={filtroCod3}`
);
content = content.replace(
  /className="w-full px-1 py-0\.5 text-\[9px\] font-normal border border-gray-200 rounded focus:outline-none focus:border-indigo-500 bg-white" \/>\s*<\/div>\s*<\/th>\s*<th className=\{colsCls\}>/,
  `className="w-full px-1 pr-4 py-0.5 text-[9px] font-normal border border-gray-200 rounded focus:outline-none focus:border-indigo-500 bg-white" />{filtroCod3 && <button onClick={()=>setFiltroCod3('')} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500" title="Limpar"><X size={10} /></button>}</div></div></th><th className={colsCls}>`
);


content = content.replace(
  /<input type="text" placeholder="Filtro Desc\.\.\." value=\{filtroDesc3\}/,
  `<div className="relative"><input type="text" placeholder="Filtro Desc..." value={filtroDesc3}`
);
content = content.replace(
  /className="w-full px-1 py-0\.5 text-\[9px\] font-normal border border-gray-200 rounded focus:outline-none focus:border-indigo-500 bg-white" \/>\s*<\/div>\s*<\/th>\s*<th className=\{`\$\{colsCls\}/,
  `className="w-full px-1 pr-4 py-0.5 text-[9px] font-normal border border-gray-200 rounded focus:outline-none focus:border-indigo-500 bg-white" />{filtroDesc3 && <button onClick={()=>setFiltroDesc3('')} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500" title="Limpar"><X size={10} /></button>}</div></div></th><th className={\`` + "${colsCls}"
);


fs.writeFileSync(file, content, 'utf8');
console.log('Added clear buttons to all filters.');
