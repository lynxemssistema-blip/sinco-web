const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let count = 0;
walkDir('src', function(filePath) {
  if (filePath.endsWith('OrdemServico.tsx')) return;
  
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.startsWith('/* eslint-disable */\n')) {
      content = content.replace('/* eslint-disable */\n', '');
      fs.writeFileSync(filePath, content);
      count++;
    }
  }
});
console.log(`Removed eslint-disable from ${count} files.`);
