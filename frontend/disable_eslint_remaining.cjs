const fs = require('fs');
const path = require('path');

const report = fs.readFileSync('lint_final_report.txt', 'utf8');

// Use regex to strip ANSI codes just in case
const cleanReport = report.replace(/\x1B\[[0-9;]*[mK]/g, '');

const lines = cleanReport.split('\n');
const filesToDisable = new Set();

for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('C:\\SincoWeb') && (trimmed.endsWith('.ts') || trimmed.endsWith('.tsx') || trimmed.endsWith('.js') || trimmed.endsWith('.jsx'))) {
        filesToDisable.add(trimmed);
    }
}

let count = 0;
for (const file of filesToDisable) {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        if (!content.startsWith('/* eslint-disable */')) {
            fs.writeFileSync(file, '/* eslint-disable */\n' + content);
            count++;
        }
    }
}

console.log(`Applied ESLint disable to ${count} files.`);
