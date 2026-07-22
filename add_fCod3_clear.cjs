const fs = require('fs');
const file = 'frontend/src/pages/MontaPecaManufaturada.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldFCod3 = `<input value={fCod3} onChange={e=>setFCod3(e.target.value)} disabled={!selMat1} placeholder="Cód..." className="w-[30%] px-2 py-1 text-[10px] border border-gray-300 rounded shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"/>`;
const newFCod3 = `<div className="relative w-[30%]">
                  <input value={fCod3} onChange={e=>setFCod3(e.target.value)} disabled={!selMat1} placeholder="Cód..." className="w-full px-2 pr-6 py-1 text-[10px] border border-gray-300 rounded shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"/>
                  {fCod3 && <button onClick={()=>setFCod3('')} disabled={!selMat1} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 bg-white rounded p-0.5 shadow-sm" title="Limpar"><X size={12}/></button>}
                </div>`;

const oldFDesc3 = `<input value={fDesc3} onChange={e=>setFDesc3(e.target.value)} disabled={!selMat1} placeholder="Descrição..." className="w-[40%] px-2 py-1 text-[10px] border border-gray-300 rounded shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"/>`;
const newFDesc3 = `<div className="relative w-[40%]">
                  <input value={fDesc3} onChange={e=>setFDesc3(e.target.value)} disabled={!selMat1} placeholder="Descrição..." className="w-full px-2 pr-6 py-1 text-[10px] border border-gray-300 rounded shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"/>
                  {fDesc3 && <button onClick={()=>setFDesc3('')} disabled={!selMat1} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 bg-white rounded p-0.5 shadow-sm" title="Limpar"><X size={12}/></button>}
                </div>`;

content = content.replace(oldFCod3, newFCod3);
content = content.replace(oldFDesc3, newFDesc3);

fs.writeFileSync(file, content, 'utf8');
console.log('Added clear buttons to fCod3 and fDesc3.');
