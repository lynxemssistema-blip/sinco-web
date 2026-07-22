const fs = require('fs');
const path = require('path');

function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      getFiles(path.join(dir, file), fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const allFiles = getFiles(path.join(__dirname, 'src'));

let filesChanged = 0;

for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Fix: export default async function ComponentName -> export default function ComponentName
  content = content.replace(/export default async function ([A-Z]\w*)/g, 'export default function $1');
  
  // Fix: export async function ComponentName -> export function ComponentName
  content = content.replace(/export async function ([A-Z]\w*)/g, 'export function $1');
  
  // Fix: async function ComponentName -> function ComponentName
  content = content.replace(/async function ([A-Z]\w*)/g, 'function $1');
  
  // Fix: const ComponentName = async (...) => { -> const ComponentName = (...) => {
  content = content.replace(/const ([A-Z]\w*) = async \((.*?)\) =>/g, 'const $1 = ($2) =>');

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed async component in:', file);
    filesChanged++;
  }
}

console.log(`Finished. Fixed ${filesChanged} files.`);
