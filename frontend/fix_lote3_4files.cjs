const fs = require('fs');
const path = require('path');

// Familia.tsx
let f1 = path.join(__dirname, 'src', 'pages', 'Familia.tsx');
let c1 = fs.readFileSync(f1, 'utf8');
c1 = c1.replace(/import \{ createPortal \} from 'react-dom';\r?\n/g, '');
c1 = c1.replace(/const inputOptional = /g, '// const inputOptional = ');
c1 = c1.replace(/catch \(err\)/g, 'catch');
fs.writeFileSync(f1, c1);

// ListaReposicao.tsx
let f2 = path.join(__dirname, 'src', 'pages', 'ListaReposicao.tsx');
let c2 = fs.readFileSync(f2, 'utf8');
c2 = c2.replace(/const headers: any =/g, 'const headers: Record<string, string> =');
c2 = c2.replace(/catch \(err: any\)/g, 'catch');
c2 = c2.replace(/catch \(err\)/g, 'catch');
c2 = c2.replace(/catch \(e\)/g, 'catch');
fs.writeFileSync(f2, c2);

// Material.tsx
let f3 = path.join(__dirname, 'src', 'pages', 'Material.tsx');
let c3 = fs.readFileSync(f3, 'utf8');
c3 = c3.replace(/import \{ createPortal \} from 'react-dom';\r?\n/g, '');
c3 = c3.replace(/ Layers,/g, '');
c3 = c3.replace(/import MontaPecaManufaturadaModal from '\.\.\/components\/MontaPecaManufaturadaModal';\r?\n/g, '');
c3 = c3.replace(/const \[showMontaPecaModal, setShowMontaPecaModal\] = useState\(false\);/g, '// const [showMontaPecaModal, setShowMontaPecaModal] = useState(false);');
c3 = c3.replace(/catch \(err\)/g, 'catch');
fs.writeFileSync(f3, c3);

// MatrizAdmin.tsx
let f4 = path.join(__dirname, 'src', 'pages', 'MatrizAdmin.tsx');
let c4 = fs.readFileSync(f4, 'utf8');
c4 = c4.replace(/\}, \[\]\);/g, '}, [fetchMatrizes]); // eslint-disable-line react-hooks/exhaustive-deps');
fs.writeFileSync(f4, c4);

console.log('Fixed first 4 files');
