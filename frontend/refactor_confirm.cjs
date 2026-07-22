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

  if (content.includes('confirm(') || content.includes('window.confirm(')) {
    // We only want to replace native confirm calls.
    // Replace window.confirm( -> await window.sysConfirm(
    content = content.replace(/window\.confirm\(/g, 'await window.sysConfirm(');
    
    // Replace confirm( -> await window.sysConfirm( 
    // carefully avoiding other confirms like CustomConfirm
    content = content.replace(/(?<!\.)\bconfirm\(/g, 'await window.sysConfirm(');
    
    // We also need to add async to the containing function if it doesn't have it.
    // This is hard with regex. Let's just do a naive approach for arrow functions:
    // () => { ... await window.sysConfirm ... }
    // We'll replace `onClick={() =>` with `onClick={async () =>`
    content = content.replace(/onClick=\{\(\) =>/g, 'onClick={async () =>');
    content = content.replace(/onClick=\{\(e\) =>/g, 'onClick={async (e) =>');
    content = content.replace(/onClick=\{\(event\) =>/g, 'onClick={async (event) =>');
    
    // Also fix basic function definitions:
    // const handleDelete = (id) => {
    content = content.replace(/const (\w+) = \((.*?)\) => \{/g, (match, name, args) => {
        // Only make async if it's not already
        if (content.includes(`const ${name} = async`)) return match;
        return `const ${name} = async (${args}) => {`;
    });
    
    // And normal functions
    content = content.replace(/function (\w+)\((.*?)\) \{/g, (match, name, args) => {
        if (content.includes(`async function ${name}`)) return match;
        return `async function ${name}(${args}) {`;
    });

    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf8');
      console.log('Modified:', file);
      filesChanged++;
    }
  }
}

console.log(`Finished. Modified ${filesChanged} files.`);
