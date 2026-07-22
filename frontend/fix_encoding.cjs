const fs = require('fs');
let content = fs.readFileSync('src/pages/VisaoGeralProducao.tsx', 'utf8');

const replaces = [
    [/\u01DCo/g, 'ão'], // ǜo -> ão
    [/\u01DCes/g, 'ções'],
    [/\u01ADvel/g, 'ável'],
    [/\u01E6ncia/g, 'ência'],
    [/\u01F8trico/g, 'étrico'],
    [/\u01DFO/g, 'ÇÃO'],
    [/\u01DCO/g, 'ÇÃO'],
    [/\uFFFD\?\"/g, '-"'], // fallback
    [/Histrico/g, 'Histórico'],
    [/Peas/g, 'Peças'],
    [/Servio/g, 'Serviço'],
    [/Produ\u01DCo/g, 'Produção'],
    [/Aprova\u01DCo/g, 'Aprovação'],
    [/N\u01DCo/g, 'Não'],
    [/Descri\u01DCo/g, 'Descrição'],
    [/aç\u01DCo/g, 'ação'] // wait, \u01DCo is 'ão', so 'ação' is 'aç'+'ão' or 'ac'+'ão'?
];

content = content.replace(/N\u01DCo/g, 'Não');
content = content.replace(/a\u01DCo/g, 'ação');
content = content.replace(/ser\u01DCo/g, 'serão');
content = content.replace(/aplica\u01DCo/g, 'aplicação');
content = content.replace(/S\u01DCo/g, 'São');
content = content.replace(/descri\u01DCo/g, 'descrição');
content = content.replace(/Descri\u01DCo/g, 'Descrição');
content = content.replace(/Previs\u01DCo/g, 'Previsão');
content = content.replace(/edi\u01DCo/g, 'edição');
content = content.replace(/op\u01DCo/g, 'opção');
content = content.replace(/propaga\u01DCo/g, 'propagação');
content = content.replace(/aten\u01DCo/g, 'atenção');
content = content.replace(/avalia\u01DCo/g, 'avaliação');
content = content.replace(/aprova\u01DCo/g, 'aprovação');
content = content.replace(/conclus\u01DCo/g, 'conclusão');
content = content.replace(/inclus\u01DCo/g, 'inclusão');
content = content.replace(/exclus\u01DCo/g, 'exclusão');
content = content.replace(/revis\u01DCo/g, 'revisão');
content = content.replace(/libera\u01DCo/g, 'liberação');
content = content.replace(/informa\u01DCes/g, 'informações');
content = content.replace(/opera\u01DCes/g, 'operações');
content = content.replace(/Respons\u01ADvel/g, 'Responsável');
content = content.replace(/respons\u01ADvel/g, 'responsável');
content = content.replace(/Pend\u01E6ncia/g, 'Pendência');
content = content.replace(/pend\u01E6ncia/g, 'pendência');
content = content.replace(/Ocorr\u01E6ncia/g, 'Ocorrência');
content = content.replace(/ocorr\u01E6ncia/g, 'ocorrência');
content = content.replace(/Isom\u01F8trico/g, 'Isométrico');
content = content.replace(/Medi\u01DCo/g, 'Medição');
content = content.replace(/medi\u01DCo/g, 'medição');
content = content.replace(/Expedi\u01DCo/g, 'Expedição');
content = content.replace(/expedi\u01DCo/g, 'expedição');
content = content.replace(/Manuten\u01DCo/g, 'Manutenção');
content = content.replace(/manuten\u01DCo/g, 'manutenção');
content = content.replace(/Finaliza\u01DCo/g, 'Finalização');
content = content.replace(/finaliza\u01DCo/g, 'finalização');
content = content.replace(/J\u01AD/g, 'Já');
content = content.replace(/j\u01AD/g, 'já');
content = content.replace(/Ser\u01DCo/g, 'Serão');
content = content.replace(/Resolu\u01DCo/g, 'Resolução');
content = content.replace(/Execu\u01DCo/g, 'Execução');
content = content.replace(/Pe\u011Fas/g, 'Peças');
content = content.replace(/pe\u011Fas/g, 'peças');
content = content.replace(/Pe\u011Fa/g, 'Peça');
content = content.replace(/pe\u011Fa/g, 'peça');
content = content.replace(/Servi\u011Fo/g, 'Serviço');
content = content.replace(/A\u01DCo/g, 'Ação');
content = content.replace(/Finaliza\u01DFO/g, 'FINALIZAÇÃO');

content = content.replace(//g, '-');

fs.writeFileSync('src/pages/VisaoGeralProducao.tsx', content, 'utf8');
console.log('Replaced successfully');
