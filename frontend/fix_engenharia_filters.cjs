const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/VisaoGeralEngenharia.tsx', 'utf8');

// 1. Add ProjFinalizado and ProjLiberado to TagData interface
content = content.replace(
    'CaminhoIsometrico: string;',
    'CaminhoIsometrico: string;\n    ProjFinalizado?: string;\n    ProjLiberado?: string;'
);

// 2. Add useState for fProjStatus
content = content.replace(
    "const [fProjeto, setFProjeto] = useState('');",
    "const [fProjStatus, setFProjStatus] = useState<'todos'|'finalizados'|'liberados'|'nao_liberados'>('todos');\n    const [fProjeto, setFProjeto] = useState('');"
);

// 3. Update the clear filters button
content = content.replace(
    "setFProjeto('');",
    "setFProjStatus('todos'); setFProjeto('');"
);

// 4. Update the filteredTags useMemo logic
content = content.replace(
    /return tags\.filter\(t => {/,
    `return tags.filter(t => {
            if (fProjStatus === 'finalizados' && t.ProjFinalizado !== 'C') return false;
            if (fProjStatus === 'liberados' && t.ProjLiberado !== 'S' && t.ProjLiberado !== 'SIM') return false;
            if (fProjStatus === 'nao_liberados' && (t.ProjLiberado === 'S' || t.ProjLiberado === 'SIM')) return false;`
);

// 5. Update the filteredTags dependency array
content = content.replace(
    /fPrevFim\]\);/,
    "fPrevFim, fProjStatus]);"
);

// 6. Add the dropdown to the UI (Row 1 - Text Filters)
const statusDropdownStr = `
                      <div className="flex flex-col gap-0.5">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Status Projeto</label>
                          <select value={fProjStatus} onChange={e => setFProjStatus(e.target.value as any)} className="h-7 w-full border border-gray-300 rounded text-xs px-2 outline-none focus:border-[#03624C] focus:ring-1 focus:ring-[#03624C] transition bg-white text-gray-700 font-medium">
                              <option value="todos">Todos (Ativos)</option>
                              <option value="finalizados">Finalizados</option>
                              <option value="liberados">Liberados</option>
                              <option value="nao_liberados">Não Liberados</option>
                          </select>
                      </div>`;

content = content.replace(
    '<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">',
    '<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">\n' + statusDropdownStr
);

fs.writeFileSync('frontend/src/pages/VisaoGeralEngenharia.tsx', content, 'utf8');
console.log('Fixed Engenharia filters');
