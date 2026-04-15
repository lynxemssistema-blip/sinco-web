/**
 * Fix definitivo: encontra TODOS os backticks literais de SQL dentro de template literals JS
 * e os converte para concatenação com aspas simples, que é a forma correta.
 * 
 * Padrão problemático: `ALTER TABLE `${tableName}` ADD...`
 * Correto:             'ALTER TABLE `' + tableName + '` ADD...'
 * 
 * Ou, para manter template literal: `ALTER TABLE \`${tableName}\` ADD...`
 */
const fs = require('fs');
let content = fs.readFileSync('src/server.js', 'utf8');
const lines = content.split('\r\n');

let fixed = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Padrão: backtick SQL imediatamente antes de ${...} ou ao final
    // Ex: `ALTER TABLE `${tableName}` ...`
    // Ex: sql: `SHOW CREATE TABLE `${tableName}``
    
    // Estratégia: converter qualquer ` que aparece DENTRO de um template literal
    // (depois do primeiro ` de abertura e antes do ` de fechamento)
    // onde esse backtick interno é seguido de ${variavel} ou precede ${variavel}
    
    // Detectar padrão: `` ` `` + texto sem $ + `` ` `` + ${ ou `...` imediatamente adjacente a ${
    // Padrão simplificado: `...`${var}` ou `${var}`...`
    
    // Vamos verificar linhas com o padrão problemático específico
    if ((line.includes('`${') || line.includes('}`')) && 
        line.includes('`') &&
        !line.includes('\\`') ) {
        
        // Contar backticks na linha
        const bts = (line.match(/`/g) || []).length;
        
        // Se tiver mais de 2 backticks em uma linha que não é multiline start, é suspeito
        if (bts > 2 && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
            console.log(`Linha ${i+1} (${bts} backticks): ${line.trim().substring(0, 100)}`);
            
            // Fix: escapar backticks que ficam IMEDIATAMENTE adjacentes a ${...}
            // Padrão: `${var}` → \`${var}\`
            const fixed_line = line
                .replace(/`(\$\{[^}]+\})`/g, '\\`$1\\`')  // `${var}` → \`${var}\`
                .replace(/` (\$\{[^}]+\}) `/g, '\\` $1 \\`'); // ` ${var} ` → \` ${var} \`
            
            if (fixed_line !== line) {
                lines[i] = fixed_line;
                fixed++;
                console.log(`  → ${fixed_line.trim().substring(0, 100)}`);
            }
        }
    }
}

console.log('\nTotal de linhas corrigidas:', fixed);
if (fixed > 0) {
    fs.writeFileSync('src/server.js', lines.join('\r\n'), 'utf8');
    console.log('Salvo com sucesso.');
}
