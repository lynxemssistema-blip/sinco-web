const fs = require('fs');
const p = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/MontaPecaManufaturada.tsx';
let c = fs.readFileSync(p, 'utf8');

// 1. Add state
c = c.replace(
  'const [selecionados, setSelecionados] = useState<Set<number>>(new Set());',
  'const [selecionados, setSelecionados] = useState<Set<number>>(new Set());\n  const [quantidades, setQuantidades] = useState<Record<number, number>>({});'
);

// 2. Reset states in clear functions
c = c.replace(
  'setSelecionados(new Set()); fetchDesenhos(); };',
  'setSelecionados(new Set()); setQuantidades({}); fetchDesenhos(); };'
);
c = c.replace(
  'setMateriais2([]); setSelecionados(new Set()); };',
  'setMateriais2([]); setSelecionados(new Set()); setQuantidades({}); };'
);
c = c.replace(
  'setLoadingM2(true); setSelecionados(new Set());',
  'setLoadingM2(true); setSelecionados(new Set()); setQuantidades({});'
);

// 3. Update toggles
c = c.replace(
  'const toggleSel = (id:number)=>{ setSelecionados(prev=>{ const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); \nreturn n; }); };',
  `const toggleSel = (id:number)=>{
    setSelecionados(prev=>{
      const n=new Set(prev);
      if(n.has(id)) {
        n.delete(id);
        setQuantidades(q => { const nq={...q}; delete nq[id]; return nq; });
      } else {
        n.add(id);
        setQuantidades(q => ({...q, [id]: 1}));
      }
      return n;
    });
  };`
);
c = c.replace(
  'const toggleTodos = ()=>{ setSelecionados(prev=>prev.size===materiais2.length ? new Set() : new \nSet(materiais2.map(m=>m.IdMaterial))); };',
  `const toggleTodos = ()=>{ 
    setSelecionados(prev => {
      if(prev.size === materiais2.length) {
        setQuantidades({});
        return new Set();
      }
      const n = new Set<number>();
      const nq: Record<number, number> = {};
      materiais2.forEach(m => { n.add(m.IdMaterial); nq[m.IdMaterial] = 1; });
      setQuantidades(nq);
      return n;
    });
  };`
);

// 4. Update handleSaveLote to send PecaQtde
c = c.replace(
  'const matsSel = materiais2.filter(m=>selecionados.has(m.IdMaterial));',
  'const matsSel = materiais2.filter(m=>selecionados.has(m.IdMaterial)).map(m=>({...m, PecaQtde: quantidades[m.IdMaterial] !== undefined ? quantidades[m.IdMaterial] : 1}));'
);

// 5. Update Grid 2 UI
c = c.replace(
  '<th className={colsCls}>Tipo</th>',
  '<th className={colsCls}>Tipo</th>\n                      <th className={colsCls}>Qtde</th>'
);

c = c.replace(
  '<td className={`${cellCls} max-w-[70px]`} title={m.TxtTipoDesenho||\'\'}>{m.TxtTipoDesenho||\'-\'}</td>',
  `<td className={\`\${cellCls} max-w-[70px]\`} title={m.TxtTipoDesenho||''}>{m.TxtTipoDesenho||'-'}</td>
                        <td className="p-1 px-2" onClick={e=>e.stopPropagation()}>
                          {selecionados.has(m.IdMaterial) ? (
                            <input type="number" min="0" step="0.01" 
                              value={quantidades[m.IdMaterial] !== undefined ? quantidades[m.IdMaterial] : 1}
                              onChange={(e) => setQuantidades(q => ({...q, [m.IdMaterial]: e.target.value === '' ? 0 : Number(e.target.value)}))}
                              className="w-16 px-1 py-0.5 text-[10px] border border-emerald-300 rounded focus:outline-none focus:border-emerald-600 bg-white"
                            />
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>`
);

fs.writeFileSync(p, c);
console.log('Fixed Grid 2 quantities');
