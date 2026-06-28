const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/MontaPecaManufaturada.tsx', 'utf8');
c = c.replace('<th className={${colsCls} text-center w-16}>QTD.</th>', '<th className={`\\${colsCls} text-center w-16`}>QTD.</th>');
fs.writeFileSync('frontend/src/pages/MontaPecaManufaturada.tsx', c);
console.log('Fixed syntax error!');
