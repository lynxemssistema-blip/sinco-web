const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/Material.tsx', 'utf8');

c = c.replace(
  /fetch\(`\$\{API_BASE\}\/familia\/options`\),\s*fetch\(`\$\{API_BASE\}\/pj\/options`\),\s*fetch\(`\$\{API_BASE\}\/medida\/options`\)/,
  `fetch(\`\${API_BASE}/familia/options\`, { headers: { 'Authorization': \`Bearer \${localStorage.getItem('sinco_token')}\` } }),
 fetch(\`\${API_BASE}/pj/options\`, { headers: { 'Authorization': \`Bearer \${localStorage.getItem('sinco_token')}\` } }),
 fetch(\`\${API_BASE}/medida/options\`, { headers: { 'Authorization': \`Bearer \${localStorage.getItem('sinco_token')}\` } })`
);

fs.writeFileSync('frontend/src/pages/Material.tsx', c);
console.log('Fixed fetchOptions!');
