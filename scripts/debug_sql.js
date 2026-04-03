const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'server.js');
let content = fs.readFileSync(filePath, 'utf8');

// Find _handlePlanoItens block
const handleIdx = content.indexOf('function _handlePlanoItens');
const handleEnd = content.indexOf('\napp.get', handleIdx + 1);
let handleBlock = content.substring(handleIdx, handleEnd);

// Show the exact SELECT block to understand the syntax issue
const selectIdx = handleBlock.indexOf('const [rows] = await connection.execute');
const selectEnd = handleBlock.indexOf('`, params)', selectIdx);
const selectBlock = handleBlock.substring(selectIdx, selectEnd + 10);

console.log('=== SELECT BLOCK ===');
// Show each line
selectBlock.split('\n').forEach((line, i) => {
    console.log(`${i+1}: ${line}`);
});

// The fix: replace the complex UPPER(REPLACE(...)) patterns with simpler ones
// The issue is that \\\\ in the template literal creates \\ in the SQL
// which MySQL interprets as an escaped backslash.
// But the UPPER( wrapping and the quoting might be causing issues
// Let's just use simple field references without REPLACE for now,
// since the frontend can handle ## replacement if needed

// Actually, looking at the hex dump: 5c5c5c5c = 4 literal backslashes
// In a JS template literal: \\\\  = produces 2 chars: \\
// But 5c5c5c5c means the source code has FOUR actual backslash characters
// which in a template literal produces 4 chars: \\\\ in the SQL  
// That causes MySQL to see \\\\ which is two escaped backslashes = "two literal backslashes"
// This should be fine, but the error is about syntax near that area

// Let me look at the actual generated SQL by tracing the template literal evaluation
const simulatedSQL = handleBlock.substring(
    handleBlock.indexOf('`\n', selectIdx) + 1,
    handleBlock.indexOf('`', handleBlock.indexOf('ORDER BY', selectIdx))
);

console.log('\n=== What MySQL receives (simulated) ===');
// Each \\ in source = one \ in SQL, so 4 \ in source = 2 \ in SQL
console.log('(Note: in reality each pair of \\ becomes one \\)');
