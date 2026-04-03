const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'server.js');
let content = fs.readFileSync(filePath, 'utf8');
let changes = 0;

// =====================================================================
// FIX: SQL syntax error in _handlePlanoItens - excessive backslash escaping
// The REPLACE patterns have too many backslashes.
// In a JS template literal, to get literal \\ in SQL, we need \\\\
// Current code has \\\\\\\\ which produces \\\\ (4 literal backslashes) - too many!
// =====================================================================

const handleIdx = content.indexOf('function _handlePlanoItens');
if (handleIdx === -1) {
    console.log('ERROR: _handlePlanoItens not found');
    process.exit(1);
}

const handleEnd = content.indexOf('app.get', handleIdx + 1);
const handleBlock = content.substring(handleIdx, handleEnd);

// Find the actual REPLACE patterns in the block
console.log('=== Analyzing SQL REPLACE patterns ===');

// Look for the REPLACE EnderecoArquivo pattern
const replacePatterns = handleBlock.match(/REPLACE\([^)]+\)/g);
if (replacePatterns) {
    replacePatterns.forEach((p, i) => {
        console.log(`Pattern ${i}:`, JSON.stringify(p));
    });
}

// The fix: replace excessive backslashes with the correct amount
// In the template literal `...`, we need \\\\ to produce \\ in the SQL string
// The current handler likely has \\\\\\\\ (8 chars) producing \\\\ (4 backslashes)
// We need \\\\ (4 chars) to produce \\ (2 backslashes = one UNC separator)

// Let's fix it by replacing the entire REPLACE expression patterns
let newBlock = handleBlock;

// Fix the EnderecoArquivo REPLACE - could have \\\\\\\\, \\\\, etc.
// We need: REPLACE(EnderecoArquivo, '##', '\\\\')  -> produces SQL: REPLACE(EnderecoArquivo, '##', '\\')
// Actually in MySQL, to insert a literal backslash we need \\
// In JS template literal: '\\\\\\\\' -> '\\\\' in SQL -> \\ in MySQL = single backslash
// We want ## to become \\ (double backslash = UNC path separator)
// So SQL should be: REPLACE(x, '##', '\\\\')
// In JS template literal: '\\\\\\\\' (4 escaped = 4 literal char in string = \\\\ in SQL)
// 
// WAIT - let me think about this more carefully.
// The error message shows: near '(REPLACE(COALESCE(EnderecoArquivoItemOrdemServico,''), '##', '\\\\'))'
// This means the SQL being sent has \\\\) which is causing a syntax error
// The issue is that the backslashes in the template literal are being over-escaped
//
// In the template literal:
//   '\\\\\\\\' = 4 chars in JS string: \\\\ = in SQL: \\ = perfect (two backslashes)
//   But something is producing MORE than that, creating an invalid SQL

// Let me check what exact string is in the source
const idxReplace = newBlock.indexOf("REPLACE(COALESCE(EnderecoArquivoItemOrdemServico");
if (idxReplace !== -1) {
    const ctx = newBlock.substring(idxReplace, idxReplace + 100);
    console.log('\nEnderecoArquivoItem context:', JSON.stringify(ctx));
}

const idxReplace2 = newBlock.indexOf("REPLACE(EnderecoArquivo");
if (idxReplace2 !== -1) {
    const ctx = newBlock.substring(idxReplace2, idxReplace2 + 80);
    console.log('EnderecoArquivo context:', JSON.stringify(ctx));
}

// Now let's fix - replace excessive backslashes
// Looking at the error: the SQL has '\\\\')) which breaks because of too many backslashes
// Fix: replace any sequence of 4+ backslashes with just 2 in the REPLACE calls

// Simple approach: replace the UPPER(REPLACE(...)) patterns with corrected versions
const oldRepl1 = "UPPER(REPLACE(EnderecoArquivo, '##', '\\\\\\\\\\\\\\\\'))";
const newRepl1 = "UPPER(REPLACE(EnderecoArquivo, '##', '\\\\\\\\'))";

const oldRepl2 = "UPPER(REPLACE(COALESCE(EnderecoArquivoItemOrdemServico,''), '##', '\\\\\\\\\\\\\\\\'))";
const newRepl2 = "UPPER(REPLACE(COALESCE(EnderecoArquivoItemOrdemServico,''), '##', '\\\\\\\\'))";

if (newBlock.includes(oldRepl1)) {
    newBlock = newBlock.replace(oldRepl1, newRepl1);
    console.log('\nFix applied to EnderecoArquivo REPLACE');
    changes++;
}

if (newBlock.includes(oldRepl2)) {
    newBlock = newBlock.replace(oldRepl2, newRepl2);
    console.log('Fix applied to EnderecoArquivoItemOrdemServico REPLACE');
    changes++;
}

// Also fix Parcial CONCAT
const oldParcial = "CONCAT(COALESCE(NULLIF(CorteTotalExecutado,''),0), '\\\\\\\\\\\\\\\\', QtdeTotal)";
const newParcial = "CONCAT(COALESCE(NULLIF(CorteTotalExecutado,''),0), '\\\\\\\\', QtdeTotal)";

if (newBlock.includes(oldParcial)) {
    newBlock = newBlock.replace(oldParcial, newParcial);
    console.log('Fix applied to Parcial CONCAT');
    changes++;
}

if (changes === 0) {
    // Try different escape counts
    console.log('\nStandard fix not found, trying alternative patterns...');
    
    // Find all occurrences of ## replacement and their backslash counts
    const regex = /REPLACE\([^,]+,\s*'##',\s*'(\\+)'\)/g;
    let match;
    let tmpBlock = newBlock;
    while ((match = regex.exec(tmpBlock)) !== null) {
        const backslashes = match[1];
        console.log(`Found ## REPLACE with ${backslashes.length} backslashes at pos ${match.index}`);
        if (backslashes.length > 4) {
            // Too many backslashes, reduce to 4
            const oldPattern = match[0];
            const newPattern = oldPattern.replace(backslashes, '\\\\\\\\');
            tmpBlock = tmpBlock.replace(oldPattern, newPattern);
            console.log('Fixed excessive backslashes');
            changes++;
        }
    }
    
    if (changes > 0) {
        newBlock = tmpBlock;
    }
}

if (changes > 0) {
    content = content.substring(0, handleIdx) + newBlock + content.substring(handleEnd);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`\nWrote ${changes} fixes to server.js`);
} else {
    console.log('\nNo standard fixes matched. Let me show the raw bytes for debugging:');
    // Show raw hex of the REPLACE area
    const replIdx = handleBlock.indexOf("'##'");
    if (replIdx !== -1) {
        const area = handleBlock.substring(replIdx, replIdx + 30);
        const hex = Buffer.from(area).toString('hex');
        console.log('Raw area:', JSON.stringify(area));
        console.log('Hex:', hex);
    }
}
