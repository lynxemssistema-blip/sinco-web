// ============================================================
// PM2 Ecosystem Config — SincoWeb
// Mantém Backend + Frontend sempre ativos com restart automático
// Uso: pm2 start ecosystem.config.js
// ============================================================
module.exports = {
    apps: [
        {
            name: 'sinco-backend',
            script: 'src/server.js',
            cwd: 'C:\\SincoWeb\\SINCO-WEB\\SINCO-WEB',
            interpreter: 'node',
            watch: false,
            autorestart: true,
            max_restarts: 20,
            restart_delay: 2000,
            max_memory_restart: '512M',
            env: {
                NODE_ENV: 'development',
                PORT: 3000
            },
            error_file: 'logs/backend-error.log',
            out_file:   'logs/backend-out.log',
            log_date_format: 'DD/MM/YYYY HH:mm:ss',
            merge_logs: true
        },
        {
            // Wrapper Node que faz spawn do Vite — compativel com PM2 no Windows
            name: 'sinco-frontend',
            script: 'frontend/vite-start.cjs',
            cwd: 'C:\\SincoWeb\\SINCO-WEB\\SINCO-WEB',
            interpreter: 'node',
            watch: false,
            autorestart: true,
            max_restarts: 20,
            restart_delay: 3000,
            max_memory_restart: '512M',
            env: {
                NODE_ENV: 'development'
            },
            error_file: 'logs/frontend-error.log',
            out_file:   'logs/frontend-out.log',
            log_date_format: 'DD/MM/YYYY HH:mm:ss',
            merge_logs: true
        }
    ]
};
