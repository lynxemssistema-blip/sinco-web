const fs = require('fs');

// 1. TipoProduto.tsx
const tpPath = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/TipoProduto.tsx';
if (fs.existsSync(tpPath)) {
    let content = fs.readFileSync(tpPath, 'utf8');
    content = content.replace(/className=\{\`\\\$\{inputOptional\} uppercase\`\}/g, 'className={`${inputOptional} uppercase`}');
    fs.writeFileSync(tpPath, content);
    console.log('Fixed TipoProduto.tsx border');
}

// 2. OrdemServico.tsx
const osPath = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/OrdemServico.tsx';
if (fs.existsSync(osPath)) {
    let content = fs.readFileSync(osPath, 'utf8');
    
    // Fix Grouped View Header
    const groupHeaderMatch = /<span className="flex-1 min-w-0">OS \/ Tag \/ Projeto<\/span>/g;
    content = content.replace(groupHeaderMatch, '<span className="flex-1 min-w-0">OS / Tag / Projeto</span>\n                                <span className="hidden sm:block w-24 text-center">Data Prev.</span>');
    
    // Fix renderOSCard Prev Data
    const renderPrev = /{os\.DataPrevisao && \(\s*<>\s*<span className="w-1 h-1 rounded-full bg-gray-300"><\/span>\s*<span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-1\.5 py-0\.5 rounded font-medium" title="Data de Previsão">\s*<Calendar size=\{10\} \/>\s*Prev: \{formatDateBR\(os\.DataPrevisao\)\}\s*<\/span>\s*<\/>\s*\)}/g;
    
    content = content.replace(renderPrev, '');

    // Add Prev column block
    const replaceBlock = /\{\/\* Descrição da OS \*\/\}/g;
    content = content.replace(replaceBlock, `
                    {/* Data de Previsão */}
                    <div className="hidden sm:flex flex-col items-center justify-center w-24 min-w-0" title="Data de Previsão">
                        {os.DataPrevisao ? (
                            <span className="flex items-center gap-1 text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded font-bold border border-orange-100 shadow-sm">
                                <Calendar size={10} />
                                {formatDateBR(os.DataPrevisao)}
                            </span>
                        ) : (
                            <span className="text-xs text-gray-400 font-medium">-</span>
                        )}
                    </div>

                    {/* Descrição da OS */}`);
    
    fs.writeFileSync(osPath, content);
    console.log('Fixed OrdemServico.tsx columns');
}

// 3. MontagemPlanoCorte.tsx
const mpcPath = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/MontagemPlanoCorte.tsx';
if (fs.existsSync(mpcPath)) {
    let content = fs.readFileSync(mpcPath, 'utf8');
    
    const refreshBtnOld = `<button
 onClick={() => setExibirConcluidos(!exibirConcluidos)}
 className={\`p-2.5 rounded-lg transition-colors border shadow-sm \${exibirConcluidos ? 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}\`}
 title={exibirConcluidos ? 'Exibindo todos os planos — clique para só pendentes' : 'Exibindo apenas pendentes — clique para ver todos'}
 >
 <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
 </button>`;

    const refreshBtnNew = `<button
 onClick={() => setExibirConcluidos(!exibirConcluidos)}
 className={\`px-3 py-1.5 flex items-center gap-1.5 rounded-lg transition-colors border shadow-sm font-bold text-[10px] uppercase \${exibirConcluidos ? 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}\`}
 title={exibirConcluidos ? 'Ocultar os planos concluídos' : 'Exibir planos pendentes e concluídos'}
 >
 <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
 {exibirConcluidos ? 'Ocultar Concluídos' : 'Exibir Todos'}
 </button>`;

    content = content.replace(refreshBtnOld, refreshBtnNew);
    
    // Just in case formatting is slightly different, let's use a regex replacement as fallback
    if (!content.includes(refreshBtnNew)) {
         content = content.replace(/className=\{\`p-2.5 rounded-lg transition-colors border shadow-sm \$\{exibirConcluidos \? 'bg-emerald[^}]+\}\`/g, 
           `className={\`px-3 py-1.5 flex items-center gap-1.5 rounded-lg transition-colors border shadow-sm font-bold text-[10px] uppercase \${exibirConcluidos ? 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}\``);
           
         content = content.replace(/<RefreshCw size=\{14\}([^>]+) \/>\s*<\/button>/g, `<RefreshCw size={12}$1 />\n {exibirConcluidos ? 'Ocultar Concluídos' : 'Exibir Todos'}\n </button>`);
    }

    fs.writeFileSync(mpcPath, content);
    console.log('Fixed MontagemPlanoCorte.tsx refresh button text');
}

