const fs = require('fs');

const lintOutput = fs.readFileSync('lint_output.txt', 'utf8').split('\n');

const errorsByFile = {};
let currentFile = '';

for (const line of lintOutput) {
    if (line.startsWith('C:\\')) {
        currentFile = line.trim();
        if (!errorsByFile[currentFile]) {
            errorsByFile[currentFile] = { 'exhaustive-deps': 0, 'no-explicit-any': 0, 'no-unused-vars': 0, 'other': 0, total: 0 };
        }
    } else if (line.includes('error') || line.includes('warning')) {
        if (!currentFile) continue;
        
        errorsByFile[currentFile].total++;
        if (line.includes('exhaustive-deps')) {
            errorsByFile[currentFile]['exhaustive-deps']++;
        } else if (line.includes('no-explicit-any')) {
            errorsByFile[currentFile]['no-explicit-any']++;
        } else if (line.includes('no-unused-vars')) {
            errorsByFile[currentFile]['no-unused-vars']++;
        } else {
            errorsByFile[currentFile]['other']++;
        }
    }
}

const sortedFiles = Object.keys(errorsByFile).sort((a, b) => errorsByFile[b].total - errorsByFile[a].total);

console.log('Top 15 Arquivos com mais problemas no Frontend:');
for (let i = 0; i < 15 && i < sortedFiles.length; i++) {
    const file = sortedFiles[i];
    const stats = errorsByFile[file];
    const shortName = file.split('frontend\\\\src\\\\')[1] || file;
    console.log(`- ${shortName}: ${stats.total} problemas (Any: ${stats['no-explicit-any']}, Unused: ${stats['no-unused-vars']}, Deps: ${stats['exhaustive-deps']})`);
}
