const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/VisaoGeralProducao.tsx', 'utf8');

content = content.replace(
    /const businessDaysUntil = \(dateStr: string\) => \{\n if \(\!dateStr\) return null;\n const m = dateStr\.match/g,
    'const businessDaysUntil = (dateStr: string) => {\n if (!dateStr) return null;\n if (dateStr && dateStr.includes("-")) dateStr = isoToBr(dateStr);\n const m = dateStr.match'
);

fs.writeFileSync('frontend/src/pages/VisaoGeralProducao.tsx', content, 'utf8');
console.log('Fixed');
