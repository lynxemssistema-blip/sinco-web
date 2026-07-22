const fs = require('fs');
let fileContent = fs.readFileSync('src/routes/pecaManufaturada.js', 'utf8');
const lines = fileContent.split('\n');
const newLines = lines.slice(0, 185).concat(lines.slice(199));
fs.writeFileSync('src/routes/pecaManufaturada.js', newLines.join('\n'));
console.log("Lines deleted correctly");
