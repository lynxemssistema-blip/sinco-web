const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/AcompanhamentoGeral.tsx', 'utf8');

const newSetores = `const SETORES = [
 { key: 'Corte', label: 'Corte', icon: Scissors, color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', solid: '#2563eb' },
 { key: 'CorteaLaser', label: 'Corte a Laser', icon: Scissors, color: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8', solid: '#db2777' },
 { key: 'Pulsionadeira', label: 'Pulsionadeira', icon: Package, color: '#14b8a6', bg: '#f0fdfa', border: '#ccfbf1', solid: '#0d9488' },
 { key: 'Dobra', label: 'Dobra', icon: Wrench, color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe', solid: '#7c3aed' },
 { key: 'Solda', label: 'Solda', icon: Flame, color: '#ef4444', bg: '#fef2f2', border: '#fecaca', solid: '#dc2626' },
 { key: 'Galvanizar', label: 'Galvanizar', icon: Package, color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', solid: '#475569' },
 { key: 'Pintura', label: 'Pintura', icon: Paintbrush, color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', solid: '#d97706' },
 { key: 'Montagem', label: 'Montagem', icon: HardHat, color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0', solid: '#059669' },
] as const;`;

code = code.replace(/const SETORES = \[\s+\{ key: 'Corte'[\s\S]*?\] as const;/m, newSetores);

// Now, replace the logic for setoresAtivos inside AcompanhamentoGeralPage
// Old: 
// const { processosVisiveis } = useAppConfig();
// const setoresAtivos = SETORES.filter(s => processosVisiveis.includes(s.label.toLowerCase()));
// 
// New:
// const { processosVisiveis } = useAppConfig();
// const setoresAtivos = useMemo(() => {
//    return SETORES.filter(s => {
//       // Check if ANY of the current projects has a Total > 0 for this sector
//       return projetos.some(p => Number(p[\`Total\${s.key}\`]) > 0);
//    });
// }, [projetos]);
// But wait, what if projetos is empty? Then it shows 0 columns. Maybe we should fall back to processosVisiveis if empty?
// Yes. 

const oldLogic = `const { processosVisiveis } = useAppConfig();
 const setoresAtivos = SETORES.filter(s => processosVisiveis.includes(s.label.toLowerCase()));`;

const newLogic = `const { processosVisiveis } = useAppConfig();
 const setoresAtivos = useMemo(() => {
    if (!projetos || projetos.length === 0) {
      return SETORES.filter(s => processosVisiveis.includes(s.label.toLowerCase()) || processosVisiveis.includes(s.key.toLowerCase()));
    }
    return SETORES.filter(s => projetos.some(p => Number((p as Record<string, unknown>)[\`Total\${s.key}\`]) > 0));
 }, [projetos, processosVisiveis]);`;

code = code.replace(oldLogic, newLogic);

// Also need to fix it for the DetalheProjetoView if it uses a different `setoresAtivos` logic?
// Wait, DetalheProjetoView receives `setoresVisiveis` as prop.
// The prop passed is `setoresAtivos`. So it will inherit the filtered sectors!
// But wait, the `totais` object inside `DetalheProjetoView` needs to initialize dynamically or have all keys!
// Let's check DetalheProjetoView:
// const t = { Corte: [0,0], Dobra: [0,0], Solda: [0,0], Pintura: [0,0], Montagem: [0,0] };
// We need to dynamically build this `t` based on the tags!
const oldTotais = `const t = { Corte: [0,0], Dobra: [0,0], Solda: [0,0], Pintura: [0,0], Montagem: [0,0] };
  tags.forEach(tag => {
  t.Corte[0] += Number(tag.CorteTotalExecutar) || 0;
  t.Corte[1] += Number(tag.CorteTotalExecutado) || 0;
  t.Dobra[0] += Number(tag.DobraTotalExecutar) || 0;
  t.Dobra[1] += Number(tag.DobraTotalExecutado) || 0;
  t.Solda[0] += Number(tag.SoldaTotalExecutar) || 0;
  t.Solda[1] += Number(tag.SoldaTotalExecutado) || 0;
  t.Pintura[0] += Number(tag.PinturaTotalExecutar) || 0;
  t.Pintura[1] += Number(tag.PinturaTotalExecutado) || 0;
  t.Montagem[0] += Number(tag.MontagemTotalExecutar) || 0;
  t.Montagem[1] += Number(tag.MontagemTotalExecutado) || 0;
  });`;

const newTotais = `const t: Record<string, [number, number]> = {};
  SETORES.forEach(s => { t[s.key] = [0, 0]; });
  tags.forEach(tag => {
    SETORES.forEach(s => {
       t[s.key][0] += Number((tag as Record<string, unknown>)[\`\${s.key}TotalExecutar\`]) || 0;
       t[s.key][1] += Number((tag as Record<string, unknown>)[\`\${s.key}TotalExecutado\`]) || 0;
    });
  });`;

code = code.replace(oldTotais, newTotais);

fs.writeFileSync('frontend/src/pages/AcompanhamentoGeral.tsx', code);
console.log('patched AcompanhamentoGeral.tsx');
