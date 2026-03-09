const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '../src/server.js');
let code = fs.readFileSync(serverFile, 'utf8');

// The replace tool broke the route. Let's fix it manually.
// First, find "// --- CRUD: Projetos ---"
const marker = "// --- CRUD: Projetos ---";
const nextMarker = "res.json({ success: true, data: rows });";

const fixedRoute = `// --- CRUD: Projetos ---

// LIST (Read All) 
app.get('/api/projeto', async (req, res) => {
    try {
        const [rows] = await pool.execute(\`
            SELECT *
            FROM projetos 
            WHERE D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = ''
            ORDER BY IdProjeto DESC
            LIMIT 200
        \`);
        `;

const idxStart = code.indexOf(marker);
const idxEnd = code.indexOf(nextMarker, idxStart);

if (idxStart !== -1 && idxEnd !== -1) {
    code = code.substring(0, idxStart) + fixedRoute + code.substring(idxEnd);
    fs.writeFileSync(serverFile, code, 'utf8');
    console.log("Fixed route!");
} else {
    console.log("Could not find markers.");
}
