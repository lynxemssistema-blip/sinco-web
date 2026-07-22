const fs = require('fs');

let fileContent = fs.readFileSync('frontend/src/pages/MontaPecaManufaturada.tsx', 'utf8');

const target = `  const selectMat1 = async (m: MatRow) => {
    setSelMat1(null);`;

const replacement = `  const selectMat1 = async (m: MatRow) => {
    // Evitar atualização da tela se o item selecionado for o mesmo
    if (selMat1 && selMat1.IdMaterial === m.IdMaterial) return;
    
    setSelMat1(null);`;

if (fileContent.includes(target)) {
  fileContent = fileContent.replace(target, replacement);
  fs.writeFileSync('frontend/src/pages/MontaPecaManufaturada.tsx', fileContent);
  console.log("selectMat1 updated successfully.");
} else {
  console.log("Could not find target in selectMat1.");
}
