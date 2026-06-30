const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/MontaPecaManufaturada.tsx', 'utf8');

if (!code.includes('Settings')) {
    code = code.replace(/from 'lucide-react';/, ', Settings } from \'lucide-react\';');
    code = code.replace(/} , Settings }/, ', Settings }');
    fs.writeFileSync('frontend/src/pages/MontaPecaManufaturada.tsx', code);
    console.log("Imported Settings");
} else {
    console.log("Settings already imported");
}
