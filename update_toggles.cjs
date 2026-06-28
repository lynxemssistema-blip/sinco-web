const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/MontaPecaManufaturada.tsx', 'utf8');

c = c.replace(
  /const toggleSel = \(id:number\)=>\{ setSelecionados\(prev=>\{ const n=new Set\(prev\); n\.has\(id\)\?n\.delete\(id\):n\.add\(id\);\s*return n; \}\); \};\s*const toggleTodos = \(\)=>\{ setSelecionados\(prev=>prev\.size===materiais2\.length \? new Set\(\) : new Set\(materiais2\.map\(m=>m\.IdMaterial\)\)\); \};/,
  `const toggleSel = (id:number)=>{ 
    const m = materiais2.find(x => x.IdMaterial === id);
    if (m && dezenhoSel && m.CodMatFabricante === dezenhoSel.CodMatFabricante) {
      alert("O material selecionado é o mesmo da peça principal. Uma peça não pode ser composta por si mesma.");
      return;
    }
    setSelecionados(prev=>{ const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; }); 
  };
  const toggleTodos = ()=>{ 
    const validos = materiais2.filter(m => !(dezenhoSel && m.CodMatFabricante === dezenhoSel.CodMatFabricante));
    setSelecionados(prev=>prev.size===validos.length ? new Set() : new Set(validos.map(m=>m.IdMaterial))); 
  };`
);

fs.writeFileSync('frontend/src/pages/MontaPecaManufaturada.tsx', c);
console.log('Updated toggle selections with regex!');
