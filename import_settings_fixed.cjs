const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/MontaPecaManufaturada.tsx', 'utf8');

// The issue was checking `!code.includes('Settings')` which matches `<Settings />`
if (!code.includes('Settings } from \'lucide-react\'')) {
    code = code.replace(/from 'lucide-react';/, ', Settings } from \'lucide-react\';');
    code = code.replace(/} , Settings }/, ', Settings }'); // Fix if } was replaced weirdly
    fs.writeFileSync('frontend/src/pages/MontaPecaManufaturada.tsx', code);
    console.log("Imported Settings successfully");
} else {
    console.log("Settings already in import");
}
