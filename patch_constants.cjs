const fs = require('fs');
let code = fs.readFileSync('frontend/src/utils/constants.ts', 'utf8');
if (!code.includes("id: 'motorista'")) {
  code = code.replace(
    "{ id: 'materiais', icon: 'Package', label: 'Materiais', href: '/materiais' },",
    "{ id: 'materiais', icon: 'Package', label: 'Materiais', href: '/materiais' },\n    { id: 'motorista', icon: 'Car', label: 'Motorista', href: '/motorista' },\n    { id: 'cadastros_motorista', icon: 'Car', label: 'Motorista', href: '/motorista' },"
  );
  fs.writeFileSync('frontend/src/utils/constants.ts', code);
  console.log('constants.ts updated for motorista');
} else {
  console.log('already has motorista');
}
