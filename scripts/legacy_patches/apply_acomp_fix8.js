const fs = require('fs');
const file = './frontend/src/pages/AcompanhamentoGeral.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `<span className="relative z-10 px-1 text-[8px] font-black text-slate-800 whitespace-nowrap leading-none mix-blend-multiply drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]">
                                                            {bar.realStart && fmtDateShort(bar.realStart)}
                                                            {bar.realEnd && bar.realEnd !== bar.realStart && \` - \${fmtDateShort(bar.realEnd)}\`}
                                                        </span>`;

const replaceStr = `<span className="absolute left-full ml-1 top-1/2 -translate-y-1/2 z-10 text-[9px] font-black whitespace-nowrap leading-none drop-shadow-md" style={{ color: bar.color }}>
                                                            {bar.realStart && fmtDateShort(bar.realStart)}
                                                            {bar.realEnd && bar.realEnd !== bar.realStart && \` - \${fmtDateShort(bar.realEnd)}\`}
                                                        </span>`;

content = content.replace(targetStr, replaceStr);

// To ensure no other flex-shrink issues, make the container explicit overflow-visible
content = content.replace(
    /className="absolute top-1\/2 -translate-y-1\/2 rounded flex items-center"/g,
    'className="absolute top-1/2 -translate-y-1/2 rounded flex items-center overflow-visible"'
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed span positioning');
