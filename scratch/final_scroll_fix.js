const fs = require('fs');
const path = 'c:\\SincoWeb\\SINCO-WEB\\SINCO-WEB\\frontend\\src\\pages\\AcompanhamentoGeral.tsx';
let content = fs.readFileSync(path, 'utf8');

// Set both main containers to be flexible and not locked by overflow hidden
const target1 = '<div className="flex flex-col h-[calc(100vh-150px)] bg-slate-50/50 font-sans overflow-hidden border border-slate-200 rounded-xl shadow-sm">';
const replacement1 = '<div className="flex flex-col w-full bg-slate-50/50 font-sans border border-slate-200 rounded-xl shadow-sm">';

const target2 = 'function DetalheProjetoView({ projeto, onVoltar }: { projeto: ProjetoAcomp; onVoltar: () => void }) {\r\n    const [tags, setTags] = useState<TagDetalhe[]>([]);\r\n    const [loading, setLoading] = useState(true);\r\n    const [error, setError] = useState<string | null>(null);\r\n    const [viewMode, setViewMode] = useState<\\'lista\\' | \\'gantt\\'>(\\'gantt\\');\r\n\r\n    useEffect(() => {';

// Re-ensuring internal scrolling in DetalheProjetoView
const target3 = '<div className="flex flex-col h-full bg-slate-50/50 font-sans overflow-hidden">';
const replacement3 = '<div className="flex flex-col w-full bg-slate-50/50 font-sans">';

let updated = content;
if (updated.indexOf(target1) !== -1) updated = updated.split(target1).join(replacement1);
if (updated.indexOf(target3) !== -1) updated = updated.split(target3).join(replacement3);

fs.writeFileSync(path, updated);
console.log('Final scroll fix applied to AcompanhamentoGeral.tsx');
