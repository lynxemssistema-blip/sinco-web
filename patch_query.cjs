const fs = require('fs');
const file = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/src/server.js';
let content = fs.readFileSync(file, 'utf8');
const searchStr = "WHERE mp.codmatFabricante = ? AND mp.Ativo = 1";
const replaceStr = "WHERE mp.codmatFabricante = ? AND mp.Ativo = 1 AND (pf.Fabrica = 'S' OR pf.Fabrica = 'SIM')";

if (content.includes(searchStr)) {
    content = content.replace(searchStr, replaceStr);
    fs.writeFileSync(file, content);
    console.log('Successfully updated the query in server.js');
} else {
    console.log('Query not found. Checking if already updated...');
    if (content.includes(replaceStr)) {
        console.log('Already updated!');
    }
}
