const fs = require('fs');

let serverPath = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/src/server.js';
let serverContent = fs.readFileSync(serverPath, 'utf8');

// 1. ensureConfigColumns: Add EnderecoSalvarCNHMotorista
if (!serverContent.includes('EnderecoSalvarCNHMotorista')) {
    serverContent = serverContent.replace(
        /\{ name: 'PermitirRealizadoSemPlanejamento',     def: `VARCHAR\(10\) DEFAULT 'Sim'` \}/,
        "{ name: 'PermitirRealizadoSemPlanejamento',     def: `VARCHAR(10) DEFAULT 'Sim'` },\n        { name: 'EnderecoSalvarCNHMotorista',           def: `VARCHAR(255) DEFAULT ''` }"
    );
    serverContent = serverContent.replace(
        /\`PermitirRealizadoSemPlanejamento\` VARCHAR\(10\) DEFAULT 'Sim'/,
        "`PermitirRealizadoSemPlanejamento` VARCHAR(10) DEFAULT 'Sim',\n            `EnderecoSalvarCNHMotorista` VARCHAR(255) DEFAULT ''"
    );
    
    // In SELECT statements inside ensureConfigColumns
    serverContent = serverContent.replace(
        /SELECT RestringirApontamentoSemSaldoAnterior, ProcessosVisiveis, PlanoCorteFiltroDC,\n\s*MaxRegistros, MenuStructure, PermitirRealizadoSemPlanejamento\n/g,
        "SELECT RestringirApontamentoSemSaldoAnterior, ProcessosVisiveis, PlanoCorteFiltroDC,\n                        MaxRegistros, MenuStructure, PermitirRealizadoSemPlanejamento, EnderecoSalvarCNHMotorista\n"
    );
}

// 2. app.put('/api/config') - save EnderecoSalvarCNHMotorista
if (!serverContent.includes('enderecoSalvarCNHMotorista !== undefined')) {
    serverContent = serverContent.replace(
        /const \{ restringirApontamento, processosVisiveis, maxRegistros, permitirRealizadoSemPlanejamento \} = req\.body;/,
        "const { restringirApontamento, processosVisiveis, maxRegistros, permitirRealizadoSemPlanejamento, enderecoSalvarCNHMotorista } = req.body;"
    );
    
    let paramsPush = `if (permitirRealizadoSemPlanejamento !== undefined) {
            updates.push('PermitirRealizadoSemPlanejamento = ?');
            params.push(permitirRealizadoSemPlanejamento);
        }`;
    
    let newParamsPush = `if (permitirRealizadoSemPlanejamento !== undefined) {
            updates.push('PermitirRealizadoSemPlanejamento = ?');
            params.push(permitirRealizadoSemPlanejamento);
        }
        if (enderecoSalvarCNHMotorista !== undefined) {
            updates.push('EnderecoSalvarCNHMotorista = ?');
            params.push(enderecoSalvarCNHMotorista);
        }`;
    
    serverContent = serverContent.replace(paramsPush, newParamsPush);
}

// 3. /api/config/validar-caminho endpoint
if (!serverContent.includes('/api/config/validar-caminho')) {
    let validationRoute = `
// Validar caminho da CNH
app.post('/api/config/validar-caminho', tenantMiddleware, async (req, res) => {
    const { caminho } = req.body;
    try {
        if (!caminho) return res.json({ success: false, message: 'Caminho não fornecido' });
        
        // Verifica se é um diretório acessível
        const stats = require('fs').statSync(caminho, { throwIfNoEntry: false });
        if (!stats) {
            // Tenta criar se não existe
            require('fs').mkdirSync(caminho, { recursive: true });
        } else if (!stats.isDirectory()) {
            return res.json({ success: false, message: 'O caminho existe mas não é uma pasta' });
        }
        
        return res.json({ success: true, message: 'Caminho válido e acessível' });
    } catch (error) {
        return res.json({ success: false, message: 'O caminho especificado é inválido ou você não tem permissão de acesso.' });
    }
});
`;
    // Insert it before app.put('/api/config'
    serverContent = serverContent.replace(
        /app\.put\('\/api\/config', tenantMiddleware/,
        validationRoute + "\napp.put('/api/config', tenantMiddleware"
    );
}

// 4. storageCNH logic - fetch path dynamically
if (!serverContent.includes('SELECT EnderecoSalvarCNHMotorista FROM configuracaosistema')) {
    let oldStorageCNH = `const storageCNH = multer.diskStorage({
    destination: function (req, file, cb) {
        const cnhDir = 'C:\\\\fotosfuncionarios';
        if (!fs.existsSync(cnhDir)) {
            fs.mkdirSync(cnhDir, { recursive: true });
        }
        cb(null, cnhDir)
    },`;
    
    let newStorageCNH = `const storageCNH = multer.diskStorage({
    destination: async function (req, file, cb) {
        let cnhDir = 'C:\\\\fotosfuncionarios'; // fallback
        try {
            if (req.tenantDbPool) {
                const [rows] = await req.tenantDbPool.execute('SELECT EnderecoSalvarCNHMotorista FROM configuracaosistema LIMIT 1');
                if (rows.length > 0 && rows[0].EnderecoSalvarCNHMotorista) {
                    cnhDir = rows[0].EnderecoSalvarCNHMotorista;
                }
            }
        } catch (e) {
            console.error('Erro ao buscar dir cnh:', e);
        }
        if (!fs.existsSync(cnhDir)) {
            fs.mkdirSync(cnhDir, { recursive: true });
        }
        cb(null, cnhDir)
    },`;
    
    serverContent = serverContent.replace(oldStorageCNH, newStorageCNH);
    // There's a problem: uploadCNH is a multer instance initialized globally, but destination needs to read from db asynchronously.
    // Wait! multer.diskStorage 'destination' doesn't easily support async functions returning promises natively unless we just don't return the promise to express or something?
    // Actually, destination takes a callback `cb(err, destination)`, so we can do async/await inside it and just call cb when done! Yes!
}

fs.writeFileSync(serverPath, serverContent);
console.log('Server patched successfully!');
