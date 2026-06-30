const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/MontaPecaManufaturada.tsx', 'utf8');

const regexFiltroGrid1 = /\{\/\* Filtro Grid 1 \*\/\}\s*<div className="px-2 py-1\.5 border-b border-gray-100 shrink-0">\s*\{modocriar \? \(\s*<input value=\{filtroD\} onChange=\{e=>setFiltroD\(e\.target\.value\)\}\s*placeholder="Filtrar desenhos\.\.\." className="w-full px-2 py-0\.5 text-\[10px\] border border-gray-200 rounded focus:outline-none focus:border-emerald-600"\/>\s*\) : \(\s*<input value=\{fComp\} onChange=\{e=>setFComp\(e\.target\.value\)\}\s*placeholder="Filtrar\.\.\." className="w-full px-2 py-0\.5 text-\[10px\] border border-gray-200 rounded focus:outline-none focus:border-\[\#32423D\]"\/>\s*\)\s*\}/;

const newFiltroGrid1 = `{/* Filtro Grid 1 */}
            <div className="px-2 py-1.5 border-b border-gray-100 shrink-0">
              {modocriar ? (
                <div className="relative">
                  <input value={filtroD} onChange={e=>setFiltroD(e.target.value)}
                    placeholder="Filtrar desenhos..." className="w-full px-2 py-0.5 pr-6 text-[10px] border border-gray-200 rounded focus:outline-none focus:border-emerald-600"/>
                  {filtroD && <button onClick={() => setFiltroD('')} className="absolute right-1 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700" title="Limpar"><X size={12} /></button>}
                </div>
              ) : (
                <div className="relative">
                  <input value={fComp} onChange={e=>setFComp(e.target.value)}
                    placeholder="Filtrar..." className="w-full px-2 py-0.5 pr-6 text-[10px] border border-gray-200 rounded focus:outline-none focus:border-[#32423D]"/>
                  {fComp && <button onClick={() => setFComp('')} className="absolute right-1 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700" title="Limpar"><X size={12} /></button>}
                </div>
              )}
            </div>`;

if (code.match(regexFiltroGrid1)) {
    code = code.replace(regexFiltroGrid1, newFiltroGrid1);
} else {
    console.log("Could not find Grid 1 filter regex");
}

const regexFiltroGrid2 = /<input value=\{filtroM2\} onChange=\{e=>setFiltroM2\(e\.target\.value\)\}\s*placeholder="Filtrar materiais\.\.\." disabled=\{\!dezenhoSel\}\s*className="flex-1 px-2 py-0\.5 text-\[10px\] border border-gray-200 rounded focus:outline-none focus:border-indigo-500 disabled:opacity-40"\/>/;

const newFiltroGrid2 = `<div className="relative flex-1">
                  <input value={filtroM2} onChange={e=>setFiltroM2(e.target.value)}
                    placeholder="Filtrar materiais..." disabled={!dezenhoSel}
                    className="w-full px-2 py-0.5 pr-6 text-[10px] border border-gray-200 rounded focus:outline-none focus:border-indigo-500 disabled:opacity-40"/>
                  {filtroM2 && <button onClick={() => setFiltroM2('')} className="absolute right-1 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700 disabled:opacity-40" disabled={!dezenhoSel} title="Limpar"><X size={12} /></button>}
                </div>`;

if (code.match(regexFiltroGrid2)) {
    code = code.replace(regexFiltroGrid2, newFiltroGrid2);
} else {
    console.log("Could not find Grid 2 filter regex");
}

fs.writeFileSync('frontend/src/pages/MontaPecaManufaturada.tsx', code);
console.log('UI patch for clear buttons applied.');
