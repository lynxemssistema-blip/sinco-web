const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'AcompanhamentoEtapas.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// Revert the bad replace on line 822
const badLine = 'Projeto: <strong className="text-gray-800">{selectedProjeto.Projeto }, [selectedProjetoId]); // eslint-disable-line react-hooks/exhaustive-depsProjeto}</strong> - {selectedProjeto.Cliente}';
const goodLine = 'Projeto: <strong className="text-gray-800">{selectedProjeto.Projeto || selectedProjeto.IdProjeto}</strong> - {selectedProjeto.Cliente}';
code = code.replace(badLine, goodLine);

// Fix the exhaustive deps on line 201 properly
code = code.replace(/    \}, \[selectedProjetoId\]\);/g, '    }, [selectedProjetoId]); // eslint-disable-line react-hooks/exhaustive-deps');

fs.writeFileSync(filePath, code);
console.log('Fixed AcompanhamentoEtapas exhaustive deps');
