// Entry point for Hostinger Node.js
console.log('--- INICIANDO SINCO-WEB ---');
console.log('Diretório Atual:', process.cwd());
console.log('Porta:', process.env.PORT || 3000);

try {
    require('./src/server.js');
    console.log('✅ Server script carregado com sucesso.');
} catch (err) {
    console.error('❌ ERRO AO CARREGAR O SERVIDOR:', err);
    process.exit(1);
}
