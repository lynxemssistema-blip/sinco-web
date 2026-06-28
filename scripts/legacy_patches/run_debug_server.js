const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'server_debug.log');
const out = fs.openSync(logFile, 'a');
const err = fs.openSync(logFile, 'a');

console.log('Starting server in background, logging to server_debug.log...');

const server = spawn('node', ['src/server.js'], {
    detached: true,
    stdio: ['ignore', out, err],
    cwd: __dirname
});

server.unref();
process.exit(0);
