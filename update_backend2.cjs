const fs = require('fs');
let fileContent = fs.readFileSync('src/routes/pecaManufaturada.js', 'utf8');
const lines = fileContent.split('\n');
// We want to delete from line 185 (0-indexed 184) to line 199 (0-indexed 198) which correspond to:
// 186:         }
// ...
// 199: });
// 
const newLines = [];
let i = 0;
for (; i < lines.length; i++) {
    if (lines[i] === "        }" && lines[i+1] === "" && lines[i+2] && lines[i+2].includes("const pool = db(req);")) {
       // skip these lines up to "});"
       while(!lines[i].startsWith("});")) {
           i++;
       }
       continue;
    }
    newLines.push(lines[i]);
}
fs.writeFileSync('src/routes/pecaManufaturada.js', newLines.join('\n'));
console.log("Lines deleted");
