const fs = require('fs');
const log = fs.readFileSync('C:/Users/MEC050922/.gemini/antigravity/brain/281f776f-b26c-4a93-83fa-f42aec4579a0/.system_generated/logs/overview.txt', 'utf8');
const lines = log.split('\n');

let results = [];
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('multi_replace_file_content') && lines[i].includes('procTableFiltro')) {
        results.push('--- multi_replace ---');
        try {
            const p = JSON.parse(lines[i]);
            results.push(JSON.stringify(p, null, 2));
        } catch(e) {
            results.push('parse error');
        }
    }
}
fs.writeFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/chunks.txt', results.join('\n'));
