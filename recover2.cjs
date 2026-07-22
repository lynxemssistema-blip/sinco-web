const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('C:\\Users\\MEC050922\\.gemini\\antigravity\\brain\\629cae92-bcae-49a4-9ed9-24a9cd8dfb62\\.system_generated\\logs\\overview.txt');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let maxLines = 0;
  let bestContent = "";

  for await (const line of rl) {
    if (line.includes('TOOL_RESPONSE') && line.includes('view_file') && line.includes('MontaPecaManufaturada.tsx')) {
      try {
        let data = JSON.parse(line);
        if (data.results && data.results.length > 0) {
            let text = data.results[0].text;
            let fileContent = text.match(/The following code has been modified.*?\n([\s\S]*)$/);
            if (fileContent) {
                let linesStr = fileContent[1].trim();
                let actualLines = linesStr.split('\n');
                if (actualLines.length > maxLines) {
                    maxLines = actualLines.length;
                    
                    // Decode lines
                    bestContent = actualLines.map(l => {
                        let m = l.match(/^\d+: (.*)$/);
                        return m ? m[1] : l;
                    }).join('\n');
                }
            }
        }
      } catch (e) {
          // ignore
      }
    }
  }

  if (bestContent) {
      fs.writeFileSync('frontend/src/pages/MontaPecaManufaturada_recovered.tsx', bestContent);
      console.log(`Recovered file with ${maxLines} lines.`);
  } else {
      console.log("Could not find a valid TOOL_RESPONSE for view_file with the code.");
  }
}

processLineByLine();
