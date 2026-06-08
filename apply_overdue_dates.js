/**
 * Corrige a tabela ListaReposicao.tsx:
 * 1. Adiciona <colgroup> para alinhamento perfeito
 * 2. Reordena thead: move Ações para depois de Desc. Resumo
 * 3. Corrige tbody: adiciona td de Id.OS e Id.Item e reposiciona coluna Ações
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'frontend/src/pages/ListaReposicao.tsx');
let src = fs.readFileSync(FILE, 'utf8');

// =========================================================
// 1. Substituir <table ... > + <thead> completo
// =========================================================
const oldTheadBlock = `                        <table className="w-full text-left text-[11px] whitespace-nowrap">
                            <thead className="bg-[#567469] text-white bg-[#567469] text-white bg-[#567469] text-white font-bold uppercase tracking-wider text-[9px] sticky top-0 z-20 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                                <tr>
                                    <th className="px-3 py-2">Situação (Sttxt)</th>
                                    <th className="px-3 py-2">Id. OS</th>
                                    <th className="px-3 py-2">Id. Item</th>
                                    <th className="px-3 py-2">Desc. Empresa</th>
                                    <th className="px-3 py-2">Projeto</th>
                                    <th className="px-3 py-2">Tag</th>
                                    <th className="px-3 py-2 text-center">Qtde Total</th>
                                    <th className="px-3 py-2">Espessura</th>
                                    <th className="px-3 py-2">Material SW</th>
                                    <th className="px-3 py-2">Cód. Mat. Fabr.</th>
                                    <th className="px-3 py-2">Desc. Resumo</th>
                                    <th className="px-3 py-2">Corte Total Ex.</th>
                                    <th className="px-3 py-2">Corte Tot. Executar</th>
                                    <th className="px-3 py-2 text-center w-32">Ações</th>
                                </tr>
                            </thead>`;

const newTheadBlock = `                        <table className="w-full text-left text-[11px] whitespace-nowrap" style={{tableLayout:'fixed'}}>
                            <colgroup>
                                <col style={{width:'90px'}} />
                                <col style={{width:'58px'}} />
                                <col style={{width:'58px'}} />
                                <col style={{width:'110px'}} />
                                <col style={{width:'75px'}} />
                                <col style={{width:'68px'}} />
                                <col style={{width:'62px'}} />
                                <col style={{width:'72px'}} />
                                <col style={{width:'130px'}} />
                                <col style={{width:'108px'}} />
                                <col style={{width:'150px'}} />
                                <col style={{width:'148px'}} />
                                <col style={{width:'80px'}} />
                                <col style={{width:'90px'}} />
                            </colgroup>
                            <thead className="bg-[#567469] text-white font-bold uppercase tracking-wider text-[9px] sticky top-0 z-20 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                                <tr>
                                    <th className="px-3 py-2">Situação</th>
                                    <th className="px-3 py-2">Id. OS</th>
                                    <th className="px-3 py-2">Id. Item</th>
                                    <th className="px-3 py-2">Desc. Empresa</th>
                                    <th className="px-3 py-2">Projeto</th>
                                    <th className="px-3 py-2">Tag</th>
                                    <th className="px-3 py-2 text-center">Qtde</th>
                                    <th className="px-3 py-2">Espessura</th>
                                    <th className="px-3 py-2">Material SW</th>
                                    <th className="px-3 py-2">Cód. Mat. Fabr.</th>
                                    <th className="px-3 py-2">Desc. Resumo</th>
                                    <th className="px-3 py-2 text-center">Ações</th>
                                    <th className="px-3 py-2">Corte Total Ex.</th>
                                    <th className="px-3 py-2">Corte Executar</th>
                                </tr>
                            </thead>`;

if (!src.includes(oldTheadBlock)) {
    console.error('ERRO: bloco thead original não encontrado!');
    process.exit(1);
}
src = src.replace(oldTheadBlock, newTheadBlock);
console.log('[OK] thead substituído com colgroup e Ações movido');

// =========================================================
// 2. Substituir o <tr> do tbody — corrigir colunas faltando
// =========================================================
const oldTbodyRow = `                                        <tr 
                                            key={item.IdOrdemServicoItem} 
                                            onClick={() => setSelectedItem(item)}
                                            className={\`cursor-pointer transition-colors \${selectedItem?.IdOrdemServicoItem === item.IdOrdemServicoItem ? 'bg-orange-50 border-orange-200 hover:bg-orange-100' : 'hover:bg-slate-50'}\`}
                                        >
                                            <td className="px-3 py-2">
                                                {sttxt === 'C' ? <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold border border-emerald-200">CONCLUÍDO</span> : <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold border border-amber-200">PENDENTE</span>}
                                            </td>
                                            
                                            
                                            <td className="px-3 py-2 text-slate-600 max-w-[100px] truncate" title={item.DescEmpresa}>{item.DescEmpresa}</td>
                                            <td className="px-3 py-2 font-bold text-slate-700">{item.Projeto}</td>
                                            <td className="px-3 py-2 font-bold text-[#32423D]">{item.Tag}</td>
                                            <td className="px-3 py-2 text-center font-bold text-slate-800">{item.QtdeTotal}</td>
                                            <td className="px-3 py-2 text-slate-600">{item.Espessura}</td>
                                            <td className="px-3 py-2 text-slate-600">{item.MaterialSW}</td>
                                            <td className="px-3 py-2 font-mono text-slate-500">{item.CodMatFabricante}</td>
                                            <td className="px-3 py-2 text-slate-600 truncate max-w-[150px]" title={item.DescResumo}>{item.DescResumo}</td>
                                            <td className="px-3 py-2 font-bold text-green-700">{item.cortetotalexecutado ?? '-'}</td>
                                            <td className="px-3 py-2 font-bold text-[#32423D]">{item.cortetotalexecutar ?? '-'}</td>
                                            <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-center gap-1">
                                                    {/* 1 - Abrir Desenho 3D */}
                                                    <button
                                                        onClick={() => abrirArquivoLocal(getCaminho(item), '3d')}
                                                        title="1 - Abrir Desenho 3D"
                                                        className="flex flex-col items-center justify-center p-1 w-9 bg-[#E0E800]/30 text-[#32423D] hover:bg-[#32423D] hover:text-white rounded transition-colors border border-blue-200 hover:border-[#32423D] shadow-sm"
                                                    >
                                                        <Box size={12} />
                                                        <span className="text-[8px] font-bold leading-none mt-0.5">3D</span>
                                                    </button>
                                                    {/* 2 - Abrir Desenho PDF */}
                                                    <button
                                                        onClick={() => abrirArquivoLocal(getCaminho(item), 'pdf')}
                                                        title="2 - Abrir Desenho PDF"
                                                        className="flex flex-col items-center justify-center p-1 w-9 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded transition-colors border border-red-200 hover:border-red-600 shadow-sm"
                                                    >
                                                        <FileText size={12} />
                                                        <span className="text-[8px] font-bold leading-none mt-0.5">PDF</span>
                                                    </button>
                                                    {/* 3 - Abrir Desenho DXF */}
                                                    <button
                                                        onClick={() => abrirArquivoLocal(getCaminho(item), 'dxf')}
                                                        title="3 - Abrir Desenho DXF"
                                                        className="flex flex-col items-center justify-center p-1 w-9 bg-cyan-50 text-cyan-700 hover:bg-cyan-600 hover:text-white rounded transition-colors border border-cyan-200 hover:border-cyan-600 shadow-sm"
                                                    >
                                                        <span className="font-mono text-[9px] font-bold leading-none">DXF</span>
                                                        <span className="text-[8px] leading-none mt-0.5 opacity-60">CAD</span>
                                                    </button>
                                                    {/* Apontar (condicional) */}
                                                    {item.sttxtCorte !== 'C' && Number(item.cortetotalexecutar) > 0 && (
                                                        <button
                                                            onClick={() => handleAbrirApontamento(item)}
                                                            title="Apontar Reposição"
                                                            className="flex flex-col items-center justify-center p-1 w-9 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded transition-colors border border-emerald-200 hover:border-emerald-600 shadow-sm"
                                                        >
                                                            <Target size={12} />
                                                            <span className="text-[8px] font-bold leading-none mt-0.5">Apt</span>
                                                        </button>
                                                    )}
                                                    {/* 4 - Excluir linha */}
                                                    <button
                                                        onClick={() => excluirItem(item)}
                                                        title="4 - Excluir linha selecionada"
                                                        className="flex flex-col items-center justify-center p-1 w-9 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded transition-colors border border-rose-200 hover:border-rose-600 shadow-sm"
                                                    >
                                                        <Trash2 size={12} />
                                                        <span className="text-[8px] font-bold leading-none mt-0.5">Del</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>`;

const newTbodyRow = `                                        <tr 
                                            key={item.IdOrdemServicoItem} 
                                            onClick={() => setSelectedItem(item)}
                                            className={\`cursor-pointer transition-colors \${selectedItem?.IdOrdemServicoItem === item.IdOrdemServicoItem ? 'bg-orange-50 border-orange-200 hover:bg-orange-100' : 'hover:bg-slate-50'}\`}
                                        >
                                            {/* 1 - Situação */}
                                            <td className="px-3 py-2">
                                                {sttxt === 'C' ? <span className="bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded font-bold border border-emerald-200 text-[9px]">CONCLUÍDO</span> : <span className="bg-amber-100 text-amber-800 px-1 py-0.5 rounded font-bold border border-amber-200 text-[9px]">PENDENTE</span>}
                                            </td>
                                            {/* 2 - Id. OS */}
                                            <td className="px-3 py-2 font-mono text-slate-600">{item.IdOrdemServico}</td>
                                            {/* 3 - Id. Item */}
                                            <td className="px-3 py-2 font-mono text-slate-500">{item.IdOrdemServicoItem}</td>
                                            {/* 4 - Desc. Empresa */}
                                            <td className="px-3 py-2 text-slate-600 overflow-hidden text-ellipsis" title={item.DescEmpresa}>{item.DescEmpresa}</td>
                                            {/* 5 - Projeto */}
                                            <td className="px-3 py-2 font-bold text-slate-700 overflow-hidden text-ellipsis">{item.Projeto}</td>
                                            {/* 6 - Tag */}
                                            <td className="px-3 py-2 font-bold text-[#32423D] overflow-hidden text-ellipsis">{item.Tag}</td>
                                            {/* 7 - Qtde */}
                                            <td className="px-3 py-2 text-center font-bold text-slate-800">{item.QtdeTotal}</td>
                                            {/* 8 - Espessura */}
                                            <td className="px-3 py-2 text-slate-600">{item.Espessura}</td>
                                            {/* 9 - Material SW */}
                                            <td className="px-3 py-2 text-slate-600 overflow-hidden text-ellipsis">{item.MaterialSW}</td>
                                            {/* 10 - Cód. Mat. Fabr. */}
                                            <td className="px-3 py-2 font-mono text-slate-500 overflow-hidden text-ellipsis">{item.CodMatFabricante}</td>
                                            {/* 11 - Desc. Resumo */}
                                            <td className="px-3 py-2 text-slate-600 overflow-hidden text-ellipsis" title={item.DescResumo}>{item.DescResumo}</td>
                                            {/* 12 - Ações (logo após Desc. Resumo) */}
                                            <td className="px-2 py-1.5 text-center" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-center gap-0.5">
                                                    <button onClick={() => abrirArquivoLocal(getCaminho(item), '3d')} title="Abrir Desenho 3D"
                                                        className="flex flex-col items-center justify-center p-1 w-8 bg-[#E0E800]/30 text-[#32423D] hover:bg-[#32423D] hover:text-white rounded transition-colors border border-blue-200 hover:border-[#32423D] shadow-sm">
                                                        <Box size={11} />
                                                        <span className="text-[7px] font-bold leading-none mt-0.5">3D</span>
                                                    </button>
                                                    <button onClick={() => abrirArquivoLocal(getCaminho(item), 'pdf')} title="Abrir Desenho PDF"
                                                        className="flex flex-col items-center justify-center p-1 w-8 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded transition-colors border border-red-200 hover:border-red-600 shadow-sm">
                                                        <FileText size={11} />
                                                        <span className="text-[7px] font-bold leading-none mt-0.5">PDF</span>
                                                    </button>
                                                    <button onClick={() => abrirArquivoLocal(getCaminho(item), 'dxf')} title="Abrir Desenho DXF"
                                                        className="flex flex-col items-center justify-center p-1 w-8 bg-cyan-50 text-cyan-700 hover:bg-cyan-600 hover:text-white rounded transition-colors border border-cyan-200 hover:border-cyan-600 shadow-sm">
                                                        <span className="font-mono text-[8px] font-bold leading-none">DXF</span>
                                                        <span className="text-[7px] leading-none mt-0.5 opacity-60">CAD</span>
                                                    </button>
                                                    {item.sttxtCorte !== 'C' && Number(item.cortetotalexecutar) > 0 && (
                                                        <button onClick={() => handleAbrirApontamento(item)} title="Apontar Reposição"
                                                            className="flex flex-col items-center justify-center p-1 w-8 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded transition-colors border border-emerald-200 hover:border-emerald-600 shadow-sm">
                                                            <Target size={11} />
                                                            <span className="text-[7px] font-bold leading-none mt-0.5">Apt</span>
                                                        </button>
                                                    )}
                                                    <button onClick={() => excluirItem(item)} title="Excluir linha"
                                                        className="flex flex-col items-center justify-center p-1 w-8 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded transition-colors border border-rose-200 hover:border-rose-600 shadow-sm">
                                                        <Trash2 size={11} />
                                                        <span className="text-[7px] font-bold leading-none mt-0.5">Del</span>
                                                    </button>
                                                </div>
                                            </td>
                                            {/* 13 - Corte Total Ex. */}
                                            <td className="px-3 py-2 font-bold text-green-700">{item.cortetotalexecutado ?? '-'}</td>
                                            {/* 14 - Corte Executar */}
                                            <td className="px-3 py-2 font-bold text-[#32423D]">{item.cortetotalexecutar ?? '-'}</td>
                                        </tr>`;

if (!src.includes(oldTbodyRow)) {
    console.error('ERRO: bloco tbody row original não encontrado!');
    process.exit(1);
}
src = src.replace(oldTbodyRow, newTbodyRow);
console.log('[OK] tbody row corrigido: Id.OS e Id.Item adicionados, Ações reposicionado');

// =========================================================
// 3. Atualizar colSpan da mensagem vazia: era 14, continua 14
// =========================================================
// ja está correto, nenhuma mudança necessária

fs.writeFileSync(FILE, src, 'utf8');
console.log('\n✅ ListaReposicao.tsx atualizado com sucesso!');
