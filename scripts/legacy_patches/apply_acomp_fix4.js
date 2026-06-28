const fs = require('fs');
const file = './frontend/src/pages/AcompanhamentoGeral.tsx';
let content = fs.readFileSync(file, 'utf8');

// The block to replace in Gantt
const oldLabelBlockRegex = /\{\/\* Setor label \*\/\}([\s\S]*?)\{\/\* Bar area \*\/\}/;

const newLabelBlock = `{/* Setor label */}
                                            <div
                                                className="sticky left-0 z-10 shrink-0 flex items-center px-2 border-r border-slate-200"
                                                style={{ width: LABEL_WIDTH, backgroundColor: bar.active ? \`\${bar.color}10\` : '#f8fafc', borderLeft: bar.active ? \`3px solid \${bar.color}\` : '3px solid transparent' }}
                                            >
                                                <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <span className="text-[10px] font-black uppercase" style={{ color: bar.color, minWidth: '60px' }}>{bar.setor}</span>
                                                        {bar.realStart && (
                                                            <div className="flex items-center gap-1 bg-white/60 px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-700">
                                                                <span>{fmtDateShort(bar.realStart)}</span>
                                                                {(bar.realEnd) && <span className="text-slate-400">-</span>}
                                                                {(bar.realEnd) && <span>{fmtDateShort(bar.realEnd)}</span>}
                                                            </div>
                                                        )}
                                                        {!bar.realStart && bar.active && (
                                                            <span className="text-[9px] text-slate-300 font-medium">Aguardando</span>
                                                        )}
                                                    </div>

                                                    {/* Totals */}
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {bar.exec > 0 && <span className="text-[9px] font-black" style={{ color: bar.color }}>Ex: {bar.exec}</span>}
                                                        {bar.total > 0 && <span className="text-[9px] font-bold text-slate-500">Sal: {bar.total}</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Bar area */}`;

content = content.replace(oldLabelBlockRegex, newLabelBlock);

// For the filter inputs
const oldFilterRegex = /<input\s+id="acomp-data-de"[\s\S]*?className="text-xs border-0 outline-none bg-transparent text-slate-700 cursor-pointer w-\[115px\] shrink-0"\s+\/>\s+<span className="text-slate-300 text-xs">—<\/span>\s+<input\s+id="acomp-data-ate"[\s\S]*?className="text-xs border-0 outline-none bg-transparent text-slate-700 cursor-pointer w-\[115px\] shrink-0"\s+\/>/;

const newFilter = `<input
                            id="acomp-data-de"
                            type="date"
                            value={fDataDe}
                            onChange={e => setFDataDe(e.target.value)}
                            title="De"
                            className="text-xs border-0 outline-none bg-transparent text-slate-700 cursor-pointer"
                            style={{ minWidth: 120, width: 120 }}
                        />
                        <span className="text-slate-300 text-xs font-bold">—</span>
                        <input
                            id="acomp-data-ate"
                            type="date"
                            value={fDataAte}
                            onChange={e => setFDataAte(e.target.value)}
                            title="Até"
                            className="text-xs border-0 outline-none bg-transparent text-slate-700 cursor-pointer"
                            style={{ minWidth: 120, width: 120 }}
                        />`;

content = content.replace(oldFilterRegex, newFilter);

fs.writeFileSync(file, content, 'utf8');
console.log('Replaced correctly');
