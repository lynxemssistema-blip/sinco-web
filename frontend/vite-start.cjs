// Wrapper CJS para iniciar o Vite dev server via PM2 no Windows
// O frontend usa "type":"module" entao este arquivo deve ser .cjs
const { spawn } = require('child_process');
const path = require('path');

const frontendDir = path.join(__dirname);

console.log('[ViteWrapper] Iniciando Vite em:', frontendDir);

const vite = spawn('npx', ['vite', '--host'], {
    cwd: frontendDir,
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
});

vite.on('error', (err) => {
    console.error('[ViteWrapper] Erro ao iniciar Vite:', err.message);
    process.exit(1);
});

vite.on('exit', (code) => {
    console.log('[ViteWrapper] Vite encerrou com codigo', code);
    process.exit(code ?? 0);
});

process.on('SIGINT',  () => vite.kill('SIGINT'));
process.on('SIGTERM', () => vite.kill('SIGTERM'));
