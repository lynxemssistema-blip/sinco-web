const { spawn } = require('child_process');
const fs = require('fs');

const logStream = fs.createWriteStream('backend.log', {flags: 'a'});

function start() {
    console.log('Starting backend process...');
    const child = spawn('node', ['src/server.js']);
    
    child.stdout.on('data', (data) => {
        process.stdout.write(data);
        logStream.write(data);
    });
    
    child.stderr.on('data', (data) => {
        process.stderr.write(data);
        logStream.write(data);
    });
    
    child.on('close', (code) => {
        console.log(`Backend exited with code ${code}. Restarting in 1s...`);
        logStream.write(`\n--- CRASH: exited with code ${code} ---\n\n`);
        setTimeout(start, 1000);
    });
}
start();
