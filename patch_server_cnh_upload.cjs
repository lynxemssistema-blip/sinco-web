const fs = require('fs');

let code = fs.readFileSync('src/server.js', 'utf8');

// 1. Add multer config for CNH
const multerCNHConfig = `
// Upload configurations for CNH
const storageCNH = multer.diskStorage({
    destination: function (req, file, cb) {
        const cnhDir = path.join(__dirname, '../public/uploads/cnh');
        if (!fs.existsSync(cnhDir)) {
            fs.mkdirSync(cnhDir, { recursive: true });
        }
        cb(null, cnhDir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'cnh-' + uniqueSuffix + ext)
    }
});
const uploadCNH = multer({ storage: storageCNH });
`;

if (!code.includes('storageCNH')) {
  code = code.replace(
    'const uploadIso = multer({ storage: storageIsometrico });',
    'const uploadIso = multer({ storage: storageIsometrico });\n' + multerCNHConfig
  );
}

// 2. Add POST /api/motoristas/upload-cnh endpoint
const uploadEndpoint = `
// POST /api/motoristas/upload-cnh - Fazer upload da imagem da CNH
app.post('/api/motoristas/upload-cnh', tenantMiddleware, uploadCNH.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado' });
    }
    const fileUrl = '/uploads/cnh/' + req.file.filename;
    res.json({ success: true, url: fileUrl });
});
`;

if (!code.includes('/api/motoristas/upload-cnh')) {
  code = code.replace(
    '// POST /api/motoristas - Criar novo motorista',
    uploadEndpoint + '\n// POST /api/motoristas - Criar novo motorista'
  );
}

// 3. Update POST and PUT endpoints to include ImagemCNH
// Note: We already added ImagemCNH array parameters in the previous task, but let's make sure it extracts it from req.body and adds it correctly to the array if it hasn't. Wait, we patched it to:
// `const { Motorista, CNH, Categoria, Telefone, DataVencimentoCNH } = req.body;`
// We need to add ImagemCNH to that destruction and to the query arrays.

// Fix POST body extraction and query
code = code.replace(
  'const { Motorista, CNH, Categoria, Telefone, DataVencimentoCNH } = req.body;',
  'const { Motorista, CNH, Categoria, Telefone, DataVencimentoCNH, ImagemCNH } = req.body;'
);
code = code.replace(
  '"INSERT INTO motorista (Motorista, CNH, Categoria, Telefone, DataVencimentoCNH, DataCadastro) VALUES (?, ?, ?, ?, ?, ?)",\n              [Motorista, CNH || \'\', Categoria || \'\', Telefone || \'\', DataVencimentoCNH || null, nowFormat]',
  '"INSERT INTO motorista (Motorista, CNH, Categoria, Telefone, DataVencimentoCNH, ImagemCNH, DataCadastro) VALUES (?, ?, ?, ?, ?, ?, ?)",\n              [Motorista, CNH || \'\', Categoria || \'\', Telefone || \'\', DataVencimentoCNH || null, ImagemCNH || null, nowFormat]'
);

// Fix PUT query
code = code.replace(
  '"UPDATE motorista SET Motorista = ?, CNH = ?, Categoria = ?, Telefone = ?, DataVencimentoCNH = ? WHERE IdMotorista = ?",\n              [Motorista, CNH || \'\', Categoria || \'\', Telefone || \'\', DataVencimentoCNH || null, id]',
  '"UPDATE motorista SET Motorista = ?, CNH = ?, Categoria = ?, Telefone = ?, DataVencimentoCNH = ?, ImagemCNH = ? WHERE IdMotorista = ?",\n              [Motorista, CNH || \'\', Categoria || \'\', Telefone || \'\', DataVencimentoCNH || null, ImagemCNH || null, id]'
);

fs.writeFileSync('src/server.js', code);
console.log('Backend patched for CNH upload');
