const fs = require('fs');
const file = './frontend/src/pages/AcompanhamentoGeral.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `{/* Progress fill */}
                                                        <div
                                                            className="absolute top-0 left-0 h-full transition-all"
                                                            style={{
                                                                width: \`\${bar.pct}%\`,
                                                                backgroundColor: bar.color,
                                                                opacity: 0.8,
                                                            }}
                                                        />
                                                        
                                                    </div>`;

const replaceStr = `{/* Progress fill */}
                                                        <div
                                                            className="absolute top-0 left-0 h-full transition-all"
                                                            style={{
                                                                width: \`\${bar.pct}%\`,
                                                                backgroundColor: bar.color,
                                                                opacity: 0.8,
                                                            }}
                                                        />
                                                        <span className="relative z-10 px-1 text-[8px] font-black text-slate-800 whitespace-nowrap leading-none mix-blend-multiply drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]">
                                                            {bar.realStart && fmtDateShort(bar.realStart)}
                                                            {bar.realEnd && bar.realEnd !== bar.realStart && \` - \${fmtDateShort(bar.realEnd)}\`}
                                                        </span>
                                                    </div>`;

content = content.replace(targetStr, replaceStr);

fs.writeFileSync(file, content, 'utf8');
console.log('Restored text to gantt bar');
