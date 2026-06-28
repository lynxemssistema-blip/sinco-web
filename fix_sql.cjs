const fs = require('fs');
const p = 'src/routes/pecaManufaturada.js';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(/AND \(PecaManufat IS NULL OR PecaManufat <> 'S'\)/g, "AND (PecaManufat IS NULL OR TRIM(UPPER(PecaManufat)) != 'S')");
fs.writeFileSync(p, c);
console.log('Fixed SQL syntax');
