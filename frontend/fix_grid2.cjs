const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/MontaPecaManufaturada.tsx', 'utf8');

const regex = /<div className="flex gap-2 items-end flex-wrap">[\s\S]*?<Plus size=\{12\}\/> Adicionar\s*<\/button>\s*<\/div>/;

const replacement = `<div className="flex gap-2 items-end flex-wrap">
                    <div className="flex flex-col flex-1 min-w-[130px]">
                      <span className="text-[8.5px] text-gray-500 uppercase font-bold tracking-wide mb-0.5">Recurso <span className="text-red-500">*</span></span>
                      <select value={selId} onChange={e => {
                          const val = e.target.value ? Number(e.target.value) : '';
                          setSelId(val);
                          if (val !== '') {
                            const proc = tipos.find(t => t.IdProcessoFabricacao === val);
                            if (proc) {
                              setEstMinStr(proc.Setup != null ? String(proc.Setup) : '');
                              setPadMinStr(proc.TempoPadrao != null ? String(proc.TempoPadrao) : '');
                            }
                          } else { setEstMinStr(''); setPadMinStr(''); }
                        }}
                        className="h-8 px-2 text-[10px] border border-gray-300 rounded shadow-sm focus:outline-none focus:border-[#32423D] bg-white">
                        <option value="">- Selecione -</option>
                        {tipos.map(t=>(<option key={t.IdProcessoFabricacao} value={t.IdProcessoFabricacao}>{t.ProcessoFabricacao}</option>))}
                      </select>
                    </div>
                    <div className="flex flex-col items-center shrink-0">
                      <span className="text-[8.5px] text-gray-500 uppercase font-bold tracking-wide mb-0.5">Seq.</span>
                      <input type="number" min="1" step="1" value={seq} onChange={e=>setSeq(e.target.value)} placeholder={String(nextSeq())} className="w-12 h-8 px-1 text-center text-[10px] font-mono border border-gray-300 rounded shadow-sm focus:outline-none focus:border-[#32423D]"/>
                    </div>
                    <div className="flex flex-col items-center shrink-0">
                      <span className="text-[8.5px] text-gray-500 uppercase font-bold tracking-wide mb-0.5">Setup <span className="text-[7px] text-gray-400 lowercase">(min)</span></span>
                      <input type="number" min="0" value={estMinStr} onChange={e=>setEstMinStr(e.target.value)} placeholder="0" className="w-12 h-8 px-1 text-center text-[10px] font-mono border border-gray-300 rounded shadow-sm focus:outline-none focus:border-[#32423D]"/>
                    </div>
                    <div className="flex flex-col items-center shrink-0">
                      <span className="text-[8.5px] text-gray-500 uppercase font-bold tracking-wide mb-0.5">Padrão <span className="text-red-500">*</span></span>
                      <input type="number" min="0" value={padMinStr} onChange={e=>setPadMinStr(e.target.value)} placeholder="0" className="w-12 h-8 px-1 text-center text-[10px] font-mono border border-gray-300 rounded shadow-sm focus:outline-none focus:border-[#32423D]"/>
                    </div>
                    <div className="flex flex-col flex-1 min-w-[100px]">
                      <span className="text-[8.5px] text-gray-500 uppercase font-bold tracking-wide mb-0.5">Observação</span>
                      <input value={ob} onChange={e=>setOb(e.target.value)} placeholder="..." className="w-full h-8 px-2 text-[10px] border border-gray-300 rounded shadow-sm focus:outline-none focus:border-[#32423D]"/>
                    </div>
                    <button onClick={handleAddProc} disabled={!selId} className="flex items-center justify-center gap-1 h-8 px-3 bg-[#32423D] text-white text-[10px] font-bold rounded shadow-sm hover:bg-[#25322e] disabled:opacity-40 transition-colors">
                      <Plus size={12}/> Adicionar
                    </button>
                  </div>`;

if (regex.test(c)) {
  c = c.replace(regex, replacement);
  fs.writeFileSync('frontend/src/pages/MontaPecaManufaturada.tsx', c);
  console.log("Substituído com sucesso");
} else {
  console.log("Não encontrado");
}
