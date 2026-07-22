const fs = require('fs');
const log = fs.readFileSync('C:/Users/MEC050922/.gemini/antigravity/brain/281f776f-b26c-4a93-83fa-f42aec4579a0/.system_generated/logs/overview.txt', 'utf8');
const lines = log.split('\n');

let bestFileContent = '';
for (let i=0; i<lines.length; i++) {
    const line = lines[i];
    if (line.includes('"name":"view_file"') || line.includes('"name":"replace_file_content"')) {
        // Find if this JSON has output
        if (line.startsWith('{"step_index"') && line.includes('"output":')) {
            try {
                const parsed = JSON.parse(line);
                if (parsed.output && parsed.output.includes('Showing lines 1 to')) {
                    // Extract the file content
                    const parts = parsed.output.split('The following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.\n');
                    if (parts.length > 1) {
                        let code = parts[1];
                        if (code.includes('The above content shows the entire, complete file contents')) {
                            code = code.split('The above content shows the entire, complete file contents')[0];
                        }
                        // Remove line numbers
                        code = code.split('\n').map(l => l.replace(/^\d+:\s/, '')).join('\n');
                        if (code.length > bestFileContent.length) {
                            bestFileContent = code;
                        }
                    }
                }
            } catch(e) {}
        }
    }
}
fs.writeFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/extracted_monta.tsx', bestFileContent);
console.log('Extracted file of length:', bestFileContent.length);
