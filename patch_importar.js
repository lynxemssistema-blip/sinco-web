const fs = require('fs');

let content = fs.readFileSync('src/server.js', 'utf8');

const regexToReplace = /\/\/ ImportarArquivos stub - Node translation depends on server access, but for now we confirm clearance\s*res\.json\(\{ success: true, message: 'Arquivos locais\/pastas preparados com sucesso\.' \}\);/;

const replacement = `
        // ImportarArquivos (Port from VB.NET)
        const fsLib = require('fs');
        const [itens] = await connection.query('SELECT IdOrdemServicoItem, EnderecoArquivo, MaterialSW, QtdeTotal, Espessura, txtTipoDesenho, Acabamento FROM ordemservicoitem WHERE IdOrdemServico = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = "")', [IdOrdemServico]);
        
        const paramExportar = '1';

        for (const pasta of pastasLimpar) {
            const pastaUpper = pasta.toUpperCase();
            const alvoDir = path.join(diretorio, pastaUpper);
            if (!fsLib.existsSync(alvoDir)) {
                try { fsLib.mkdirSync(alvoDir, { recursive: true }); } catch(e){}
            }

            for (const item of itens) {
                if (!item.EnderecoArquivo) continue;
                
                let origem = item.EnderecoArquivo;
                
                // Adapta extensões
                const extsToReplace = ['.SLDPRT', '.SLDASM', '.ASM', '.PSM', '.PAR'];
                for (const ext of extsToReplace) {
                    const re = new RegExp(ext.replace('.', '\\.'), 'i');
                    if (re.test(origem)) {
                        origem = origem.replace(re, '.' + pastaUpper);
                        break;
                    }
                }
                
                const materialSW = item.MaterialSW || 'Sem Material';
                const qtdeTotal = item.QtdeTotal || 'Sem Quantidade'; 
                const espessura = item.Espessura || 'Sem Espessura';
                const tipoDesenho = item.txtTipoDesenho || 'Sem Tipo Desenho';

                if (fsLib.existsSync(origem)) {
                    const nomeStr = path.parse(origem).name;
                    const extStr = path.parse(origem).ext;
                    let novoNome = '';

                    const isAssembly = /\\.(SLDASM|ASM)$/i.test(item.EnderecoArquivo);

                    if (isAssembly) {
                        novoNome = \`OS_\${IdOrdemServico}_\${tipoDesenho}_\${qtdeTotal}_\${nomeStr}\${extStr}\`;
                    } else if (paramExportar === '1') {
                        novoNome = \`OS_\${IdOrdemServico}_\${espessura}_\${materialSW}_\${qtdeTotal}_\${nomeStr}\${extStr}\`;
                    } else if (paramExportar === '2') {
                        novoNome = \`OS_\${IdOrdemServico}_\${qtdeTotal}_\${nomeStr}_\${materialSW}_\${espessura}\${extStr}\`;
                    } else {
                        novoNome = \`OS_\${IdOrdemServico}_\${espessura}_\${materialSW}_\${qtdeTotal}_\${nomeStr}\${extStr}\`;
                    }

                    const destinoArquivo = path.join(alvoDir, novoNome);

                    try {
                        fsLib.copyFileSync(origem, destinoArquivo);
                        
                        if (pastaUpper === 'PDF') {
                            await connection.query('UPDATE ordemservicoitem SET EnderecoArquivoItemOrdemServico = ? WHERE IdOrdemServicoItem = ?', [destinoArquivo, item.IdOrdemServicoItem]);
                        }
                    } catch(err) {
                        console.error('Erro ao copiar arquivo:', err.message);
                    }
                }
            }
        }

        res.json({ success: true, message: 'Arquivos locais importados e pastas atualizadas com sucesso.' });
`;

if (regexToReplace.test(content)) {
    content = content.replace(regexToReplace, replacement);
    fs.writeFileSync('src/server.js', content, 'utf8');
    console.log('ImportarArquivos logic applied!');
} else {
    console.log('Regex match failed. Target stub not found in server.js');
}
