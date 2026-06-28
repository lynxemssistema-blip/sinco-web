const { exec } = require('child_process');

exec('wmic process where name="node.exe" get ProcessId, ExecutablePath, CommandLine', (err, stdout) => {
    console.log(stdout);
});
