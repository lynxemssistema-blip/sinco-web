const fs = require('fs');

const files = [
    'c:\\\\SincoWeb\\\\SINCO-WEB\\\\SINCO-WEB\\\\frontend\\\\src\\\\pages\\\\ApontamentoProducaoRecurso.tsx',
    'c:\\\\SincoWeb\\\\SINCO-WEB\\\\SINCO-WEB\\\\frontend\\\\src\\\\pages\\\\ApontamentoProducao.tsx',
    'c:\\\\SincoWeb\\\\SINCO-WEB\\\\SINCO-WEB\\\\frontend\\\\src\\\\pages\\\\ProducaoPlanoCorte.tsx'
];

for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf8');

    if (file.includes('ProducaoPlanoCorte')) {
        content = content.replace(
            /onChange=\{\(e\) => setQtdeApontar\(e\.target\.value\)\}/g,
            `onChange={(e) => {
  let val = e.target.value;
  if (val !== '') {
    const num = parseInt(val) || 0;
    const max = lancarSaldo;
    if (num > max) val = String(max);
    else if (num < 0) val = '0';
  }
  setQtdeApontar(val);
}}`
        );
    } else {
        content = content.replace(
            /onChange=\{\(e\) => setQtdeApontar\(e\.target\.value\)\}/g,
            `onChange={(e) => {
  let val = e.target.value;
  if (val !== '') {
    const num = parseInt(val) || 0;
    const max = itemDetails?.qtdeFaltante || 0;
    if (num > max) val = String(max);
    else if (num < 0) val = '0';
  }
  setQtdeApontar(val);
}}`
        );
    }

    fs.writeFileSync(file, content);
    console.log("Patched " + file);
}
