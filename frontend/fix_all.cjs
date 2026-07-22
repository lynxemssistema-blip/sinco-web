const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/VisaoGeralProducao.tsx', 'utf8');

const replaces = [
    [/N\u01DCo/g, 'Não'],
    [/a\u01DCo/g, 'ação'],
    [/ser\u01DCo/g, 'serão'],
    [/aplica\u01DCo/g, 'aplicação'],
    [/S\u01DCo/g, 'São'],
    [/descri\u01DCo/g, 'descrição'],
    [/Descri\u01DCo/g, 'Descrição'],
    [/Previs\u01DCo/g, 'Previsão'],
    [/edi\u01DCo/g, 'edição'],
    [/op\u01DCo/g, 'opção'],
    [/propaga\u01DCo/g, 'propagação'],
    [/aten\u01DCo/g, 'atenção'],
    [/avalia\u01DCo/g, 'avaliação'],
    [/aprova\u01DCo/g, 'aprovação'],
    [/conclus\u01DCo/g, 'conclusão'],
    [/inclus\u01DCo/g, 'inclusão'],
    [/exclus\u01DCo/g, 'exclusão'],
    [/revis\u01DCo/g, 'revisão'],
    [/libera\u01DCo/g, 'liberação'],
    [/informa\u01DCes/g, 'informações'],
    [/opera\u01DCes/g, 'operações'],
    [/Respons\u01ADvel/g, 'Responsável'],
    [/respons\u01ADvel/g, 'responsável'],
    [/Pend\u01E6ncia/g, 'Pendência'],
    [/pend\u01E6ncia/g, 'pendência'],
    [/Ocorr\u01E6ncia/g, 'Ocorrência'],
    [/ocorr\u01E6ncia/g, 'ocorrência'],
    [/Isom\u01F8trico/g, 'Isométrico'],
    [/Medi\u01DCo/g, 'Medição'],
    [/medi\u01DCo/g, 'medição'],
    [/Expedi\u01DCo/g, 'Expedição'],
    [/expedi\u01DCo/g, 'expedição'],
    [/Manuten\u01DCo/g, 'Manutenção'],
    [/manuten\u01DCo/g, 'manutenção'],
    [/Finaliza\u01DCo/g, 'Finalização'],
    [/finaliza\u01DCo/g, 'finalização'],
    [/J\u01AD/g, 'Já'],
    [/j\u01AD/g, 'já'],
    [/Ser\u01DCo/g, 'Serão'],
    [/Resolu\u01DCo/g, 'Resolução'],
    [/Execu\u01DCo/g, 'Execução'],
    [/A\u01DCo/g, 'Ação'],
    [/Finaliza\u01DFO/g, 'FINALIZAÇÃO'],
    [/Pe\u011Fa/g, 'Peça'],
    [/pe\u011Fa/g, 'peça'],
    [/Servi\u011Fo/g, 'Serviço'],
    [/Pe\u011Fas/g, 'Peças'],
    [/pe\u011Fas/g, 'peças'],
    [/Hist\u01F3rico/g, 'Histórico'],
];

for(let r of replaces) content = content.replace(r[0], r[1]);

content = content.replace(/No, apenas a Tag/g, 'Não, apenas a Tag');
content = content.replace(/Esta aǜo/g, 'Esta ação');
content = content.replace(/Todas as tags serǜo/g, 'Todas as tags serão');
content = content.replace(/Propagar datas para Ordens de Servi.o\?/g, 'Propagar datas para Ordens de Serviço?');
content = content.replace(/Descriǜo/g, 'Descrição');
content = content.replace(/Peas/g, 'Peças');
content = content.replace(/Servio/g, 'Serviço');
content = content.replace(/Atenǜo/g, 'Atenção');
content = content.replace(/J\?/g, 'Já');
content = content.replace(/\?"/g, '-');
content = content.replace(/Nǜo/g, 'Não');
content = content.replace(/Sǜo/g, 'São');
content = content.replace(/serǜo/g, 'serão');
content = content.replace(/aǜo/g, 'ação');
content = content.replace(/Previsǜo/g, 'Previsão');
content = content.replace(/ediǜo/g, 'edição');
content = content.replace(/opǜo/g, 'opção');
content = content.replace(/propagaǜo/g, 'propagação');
content = content.replace(/atenǜo/g, 'atenção');
content = content.replace(/avaliaǜo/g, 'avaliação');
content = content.replace(/aprovaǜo/g, 'aprovação');
content = content.replace(/conclusǜo/g, 'conclusão');
content = content.replace(/inclusǜo/g, 'inclusão');
content = content.replace(/exclusǜo/g, 'exclusão');
content = content.replace(/revisǜo/g, 'revisão');
content = content.replace(/liberaǜo/g, 'liberação');
content = content.replace(/informaǜes/g, 'informações');
content = content.replace(/operaǜes/g, 'operações');
content = content.replace(/Responsǭvel/g, 'Responsável');
content = content.replace(/responsǭvel/g, 'responsável');
content = content.replace(/PendǦncia/g, 'Pendência');
content = content.replace(/pendǦncia/g, 'pendência');
content = content.replace(/OcorrǦncia/g, 'Ocorrência');
content = content.replace(/ocorrǦncia/g, 'ocorrência');
content = content.replace(/IsomǸtrico/g, 'Isométrico');
content = content.replace(/Mediǜo/g, 'Medição');
content = content.replace(/mediǜo/g, 'medição');
content = content.replace(/Expediǜo/g, 'Expedição');
content = content.replace(/expediǜo/g, 'expedição');
content = content.replace(/Manutenǜo/g, 'Manutenção');
content = content.replace(/manutenǜo/g, 'manutenção');
content = content.replace(/Finalizaǜo/g, 'Finalização');
content = content.replace(/finalizaǜo/g, 'finalização');
content = content.replace(/Jǭ/g, 'Já');
content = content.replace(/jǭ/g, 'já');
content = content.replace(/Resoluǜo/g, 'Resolução');
content = content.replace(/Execuǜo/g, 'Execução');
content = content.replace(/Aǜo/g, 'Ação');
// Removed empty regex

// Fix Date Functions
content = content.replace(
    "const brToIso = (br: string) => { const m = br?.match(/^(\\d{2})\\/(\\d{2})\\/(\\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : ''; };",
    "const brToIso = (br: string) => { if (!br) return ''; if (br.includes('-')) return br.split(' ')[0]; const m = br.match(/^(\\d{2})\\/(\\d{2})\\/(\\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : ''; };"
);

content = content.replace(
    "const isoToBr = (iso: string) => { const [y, m, d] = (iso || '').split('-'); return d ? `${d}/${m}/${y}` : ''; };",
    "const isoToBr = (iso: string) => { if (!iso) return ''; if (iso.includes('/')) return iso; const parts = iso.split(' ')[0].split('-'); return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : iso; };"
);

content = content.replace(
    "const businessDaysUntil = (dateStr: string) => {\n if (!dateStr) return null;",
    "const businessDaysUntil = (dateStr: string) => {\n if (!dateStr) return null;\n if (dateStr && dateStr.includes('-')) dateStr = isoToBr(dateStr);"
);

// Fix Previsao formatting in DateBadge
content = content.replace(
    "const DateBadge = ({ date, label, onClick, editable = false, showStatus = true }: { date: string, label?: string, onClick?: () => void, editable?: boolean, showStatus?: boolean }) => {",
    "const DateBadge = ({ date, label, onClick, editable = false, showStatus = true }: { date: string, label?: string, onClick?: () => void, editable?: boolean, showStatus?: boolean }) => {\n date = isoToBr(date);"
);


fs.writeFileSync('frontend/src/pages/VisaoGeralProducao.tsx', content, 'utf8');
console.log('Fixed file');
