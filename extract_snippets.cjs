const fs = require('fs');

const logFile = 'C:\\Users\\MEC050922\\.gemini\\antigravity\\brain\\629cae92-bcae-49a4-9ed9-24a9cd8dfb62\\.system_generated\\logs\\overview.txt';
let log = fs.readFileSync(logFile, 'utf8');
let lines = log.split('\n');

let snippets = [];
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('multi_replace_file_content') || lines[i].includes('replace_file_content') || lines[i].includes('write_to_file')) {
        try {
            let data = JSON.parse(lines[i]);
            if (data.tool_calls) {
                for (let tc of data.tool_calls) {
                    if (tc.name === 'multi_replace_file_content' && tc.args.ReplacementChunks) {
                        // Parse JSON string
                        let chunks = JSON.parse(tc.args.ReplacementChunks);
                        for (let c of chunks) {
                            snippets.push(`--- CHUNK ---\n` + c.ReplacementContent);
                        }
                    }
                    if (tc.name === 'replace_file_content') {
                        snippets.push(`--- REPLACE ---\n` + JSON.parse('"' + tc.args.ReplacementContent + '"'));
                    }
                }
            }
        } catch (e) {}
    }
}

fs.writeFileSync('snippets.txt', snippets.join('\n\n'));
console.log("Found " + snippets.length + " snippets.");
