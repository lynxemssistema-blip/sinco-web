module.exports = {
    apps: [
        {
            name: 'sinco-backend',
            script: 'src/server.js',
            cwd: 'c:/SincoWeb/SINCO-WEB/SINCO-WEB',
            env: {
                NODE_ENV: 'production',
                PORT: 3000
            }
        },
        {
            name: 'sinco-frontend',
            script: 'node_modules/vite/bin/vite.js',
            args: '--host 0.0.0.0 --port 5173',
            cwd: 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend',
            env: {
                NODE_ENV: 'production'
            }
        }
    ]
};
