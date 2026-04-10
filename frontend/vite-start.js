// Wrapper para iniciar o Vite dev server via PM2 no Windows
// PM2 mantém este processo vivo e reinicia automaticamente se cair
const { spawn } = require('child_process');
const path = require('path');

const frontendDir = path.join(__dirname);

// Inicia o Vite via npx
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
    console.log(`[ViteWrapper] Vite encerrou com código ${code}`);
    process.exit(code ?? 0);
});

// Repassa sinais para o processo filho
process.on('SIGINT',  () => vite.kill('SIGINT'));
process.on('SIGTERM', () => vite.kill('SIGTERM'));
