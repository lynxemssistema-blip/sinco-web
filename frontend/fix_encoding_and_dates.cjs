const fs = require('fs');
let content = fs.readFileSync('src/pages/VisaoGeralProducao.tsx', 'utf8');

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
    [/Servi\u011Fo/g, 'Serviço']
];

for(let r of replaces) content = content.replace(r[0], r[1]);

// Manual replacements for some specific strings that appeared in PS output:
content = content.replace(/No, apenas a Tag/g, 'Não, apenas a Tag');
content = content.replace(/Esta aǜo/g, 'Esta ação');
content = content.replace(/todas as TAGS/g, 'todas as TAGS');
content = content.replace(/Todas as tags serǜo/g, 'Todas as tags serão');
content = content.replace(/Propagar datas para Ordens de Servio\?/g, 'Propagar datas para Ordens de Serviço?');
content = content.replace(/Deseja aplicar as mesmas datas planejadas s OS e seus itens\?/g, 'Deseja aplicar as mesmas datas planejadas às OS e seus itens?');
content = content.replace(/Somente itens com o recurso ativo no setor \(txtRecurso=1\) sero atualizados./g, 'Somente itens com o recurso ativo no setor (txtRecurso=1) serão atualizados.');
content = content.replace(/Descriǜo/g, 'Descrição');
content = content.replace(/Peas/g, 'Peças');
content = content.replace(/Servio/g, 'Serviço');
content = content.replace(/Atenǜo/g, 'Atenção');
content = content.replace(/J/g, 'Já');
content = content.replace(/ /g, '- ');
content = content.replace(/\?/g, '-');
content = content.replace(/\?"/g, '—');

// Fix Date Badge format (dd/mm/aaaa) directly in this script to be sure
content = content.replace(
    `const isoToBr = (iso: string) => { const [y, m, d] = (iso || '').split('-'); return d ? \`\${d}/\${m}/\${y}\` : ''; };`,
    `const isoToBr = (iso: string) => {
  if (!iso) return '';
  if (iso.includes('/')) return iso;
  const parts = iso.split(' ')[0].split('-');
  return parts.length === 3 ? \`\${parts[2]}/\${parts[1]}/\${parts[0]}\` : iso;
};`
);

content = content.replace(
    `const brToIso = (br: string) => { const m = br?.match(/^(\\d{2})\\/(\\d{2})\\/(\\d{4})$/); return m ? \`\${m[3]}-\${m[2]}-\${m[1]}\` : ''; };`,
    `const brToIso = (br: string) => {
  if (!br) return '';
  if (br.includes('-')) return br.split(' ')[0];
  const m = br.match(/^(\\d{2})\\/(\\d{2})\\/(\\d{4})$/);
  return m ? \`\${m[3]}-\${m[2]}-\${m[1]}\` : '';
};`
);

// Fix Previsão display if DateBadge doesn't convert it. DateBadge should display br format.
content = content.replace(
    \`<CalendarDays size={10} /> {date} {(showStatus && days === -1) ? '  Atrasado' : ((showStatus && days !== null && days >= 0) ? \`  \${days}d\` : '')}\`,
    \`<CalendarDays size={10} /> {isoToBr(date)} {(showStatus && days === -1) ? ' - Atrasado' : ((showStatus && days !== null && days >= 0) ? \` - \${days}d\` : '')}\`
);

// We should also fix businessDaysUntil to handle ISO dates just in case:
content = content.replace(
    `const businessDaysUntil = (dateStr: string) => {`,
    `const businessDaysUntil = (dateStr: string) => {
  if (dateStr && dateStr.includes('-')) dateStr = isoToBr(dateStr);`
);

// Now let's fix the Date Initialization logic in modal.
// In the modal, we need to populate data correctly:
// We notice that some sectors might not exist or use standard names.
// Wait, the tagSectorDates initialization: 
// The problem is that when a user clicks "Planejar Setores" (Planejamento de Setores), the dates are NOT pre-filled for some sectors?
// The logic says: PlanejadoInicioCorte: brToIso(t.PlanejadoInicioCorte). 
// Since we changed brToIso, it should work for both br and iso formats now.

fs.writeFileSync('src/pages/VisaoGeralProducao.tsx', content, 'utf8');
console.log('Fixed file');
