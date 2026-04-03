const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'server.js');
let content = fs.readFileSync(filePath, 'utf8');
let changes = 0;

// Fix the SELECT in montagem lista route - add alias for EnviadoCorte -> Enviadocorte
// Also fix Concluido in the SELECT since it might have the same issue

// Find and replace in the montagem SELECT block
const oldMontagem = "EnviadoCorte, Concluido,";
const newMontagem = "EnviadoCorte AS Enviadocorte, Concluido,";

// Find only in the montagem lista route area (search near "PLANO DE CORTE — Lista para tela de MONTAGEM")
const montagemIdx = content.indexOf("Lista para tela de MONTAGEM");
if (montagemIdx === -1) {
    console.log('ERROR: could not find montagem route marker');
    process.exit(1);
}

const nextRouteIdx = content.indexOf("Lista para tela de PRODUÇÃO", montagemIdx);
const montagemBlock = content.substring(montagemIdx, nextRouteIdx);

if (montagemBlock.includes(oldMontagem)) {
    const pos = content.indexOf(oldMontagem, montagemIdx);
    content = content.substring(0, pos) + newMontagem + content.substring(pos + oldMontagem.length);
    console.log('FIX 1: Added alias Enviadocorte in montagem SELECT');
    changes++;
} else {
    console.log('FIX 1: Pattern not found in montagem block');
    // Check what's there
    const sel = montagemBlock.match(/SELECT[^F]+FROM/);
    if (sel) console.log('  SELECT:', sel[0].substring(0, 200));
}

// Fix the producao SELECT too - same issue
const producaoIdx = content.indexOf("Lista para tela de PRODUÇÃO");
if (producaoIdx !== -1) {
    const nextAfterProd = content.indexOf("Itens de um plano", producaoIdx);
    const producaoBlock = content.substring(producaoIdx, nextAfterProd || producaoIdx + 3000);
    
    if (producaoBlock.includes(oldMontagem)) {
        const pos = content.indexOf(oldMontagem, producaoIdx);
        content = content.substring(0, pos) + newMontagem + content.substring(pos + oldMontagem.length);
        console.log('FIX 2: Added alias Enviadocorte in producao SELECT');
        changes++;
    } else {
        console.log('FIX 2: Pattern not found in producao block (may already be aliased)');
    }
}

if (changes > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`\nWrote ${changes} fix(es)`);
} else {
    console.log('\nNo changes needed');
}
