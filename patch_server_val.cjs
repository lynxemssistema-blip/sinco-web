const fs = require('fs');

const file = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/src/server.js';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `                const procNameFormatado = (oldProc.processofabricacao || '').trim().replace(/\\s+/g, '');`;

const replaceStr = `                const dePara = {
                    'CORTE': 'Corte',
                    'CORTE A LASER': 'CorteaLaser',
                    'CORTE LASER': 'CorteaLaser',
                    'CORTE PUNCIONADEIRA': 'CortePuncionadeira',
                    'CORTE SERRA DE FITA': 'CorteSerradeFita',
                    'DOBRA': 'Dobra',
                    'SOLDA': 'Solda',
                    'SOLDA A LASER': 'SoldaaLaser',
                    'SOLDA MIG': 'SoldaMig',
                    'SOLDA TIG': 'SoldaTg',
                    'SOLDA TG': 'SoldaTg',
                    'PINTURA': 'Pintura',
                    'MONTAGEM': 'Montagem',
                    'USINAGEM': 'Usinagem',
                    'MEDIÇÃO': 'MEDICAO',
                    'MEDICAO': 'MEDICAO',
                    'ISOMETRICO': 'ISOMETRICO',
                    'ENGENHARIA': 'ENGENHARIA',
                    'ACABAMENTO': 'ACABAMENTO',
                    'APROVACAO': 'APROVACAO',
                    'APROVAÇÃO': 'APROVACAO',
                    'PUNCIONADEIRA': 'PUNCIONADEIRA',
                    'SERRA DE FITA': 'SERRADEFITA',
                    'CALDEIRARIA': 'CALDEIRARIA',
                    'SERRALHERIA': 'SERRALHERIA',
                    'EMBALAGENS': 'EMBALAGENS',
                    'TESTE': 'Teste'
                };
                const rawNameVal = (oldProc.processofabricacao || '').trim().toUpperCase();
                const procNameFormatado = dePara[rawNameVal] || rawNameVal.replace(/\\s+/g, '');`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, replaceStr);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Patched validation in server.js successfully.');
} else {
    console.error('Target string not found for validation patch.');
}
