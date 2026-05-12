// ============================================================
// PM2 Ecosystem Config — SincoWeb (PRODUÇÃO)
// Domínio: alfatecsinco.lynxems.com.br
// Uso: pm2 start ecosystem.config.js
// ============================================================
module.exports = {
    apps: [
        {
            name: 'sinco-web-prod',
            script: 'src/server.js',
            cwd: 'C:\\SincoWeb\\SINCO-WEB\\SINCO-WEB\\PublicaçãoSite',
            interpreter: 'node',
            watch: false,
            autorestart: true,
            max_restarts: 50,
            restart_delay: 5000,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                PORT: 3000,
                DOMAIN: 'alfatecsinco.lynxems.com.br'
            },
            error_file: 'logs/error.log',
            out_file:   'logs/out.log',
            log_date_format: 'DD/MM/YYYY HH:mm:ss',
            merge_logs: true
        }
    ]
};
