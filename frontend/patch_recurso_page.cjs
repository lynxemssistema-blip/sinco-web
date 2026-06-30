const fs = require('fs');

const path = 'C:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/RecursoFabricacao.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace standard terms
content = content.replace(/SetorPage/g, 'RecursoFabricacaoPage');
content = content.replace(/Setor/g, 'Recurso');
content = content.replace(/setor/g, 'recurso');
content = content.replace(/setores/g, 'recursos');
content = content.replace(/Setores/g, 'Recursos');
content = content.replace(/idRecurso/g, 'IdProcessoFabricacao');
content = content.replace(/\/api\/recursos\/\${formData\.IdProcessoFabricacao}/g, '/api/recursos/${formData.IdProcessoFabricacao}');

// Update Interface
content = content.replace(/interface Recurso {[\s\S]*?}/, `interface Recurso {
  IdProcessoFabricacao?: number;
  processofabricacao: string;
  CodigoProcessoFabricacao?: string;
  Fabrica: string;
  DataLiberada: string;
  Setup?: number;
  TempoPadrao?: number;
  DataCriacao?: string;
  CriadoPor?: string;
}`);

// Empty form
content = content.replace(/const emptyForm: Recurso = {[\s\S]*?};/, `const emptyForm: Recurso = {
  processofabricacao: '',
  CodigoProcessoFabricacao: '',
  Fabrica: 'NAO',
  DataLiberada: 'NAO',
  Setup: 0,
  TempoPadrao: 0
};`);

// Search filter logic
content = content.replace(/!searchNome \|\| s\.Recurso\?\.toLowerCase\(\)\.includes\(searchNome\.toLowerCase\(\)\)/, `!searchNome || s.processofabricacao?.toLowerCase().includes(searchNome.toLowerCase())`);
content = content.replace(/Nome do Recurso:/, 'Nome do Processo:');
content = content.replace(/Novo Recurso/g, 'Novo Processo');
content = content.replace(/Editar Recurso/g, 'Editar Processo');
content = content.replace(/Nenhum recurso encontrado/g, 'Nenhum processo encontrado');
content = content.replace(/Cadastrar novo recurso/g, 'Cadastrar novo processo');

// Form inputs
const formInputs = `
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Nome do Processo <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="text"
                name="processofabricacao"
                value={formData.processofabricacao || ''}
                onChange={handleInputChange}
                className={inputRequired}
                placeholder="Ex: Usinagem..."
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Código
              </label>
              <input
                type="text"
                name="CodigoProcessoFabricacao"
                value={formData.CodigoProcessoFabricacao || ''}
                onChange={handleInputChange}
                className={inputBaseClass + " border-gray-200"}
                placeholder="Ex: US-01"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Fábrica <span className="text-red-500 font-bold">*</span>
              </label>
              <select
                name="Fabrica"
                value={formData.Fabrica}
                onChange={handleInputChange}
                className={inputRequired}
                required
              >
                <option value="SIM">Sim</option>
                <option value="NAO">Não</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Data Liberada <span className="text-red-500 font-bold">*</span>
              </label>
              <select
                name="DataLiberada"
                value={formData.DataLiberada}
                onChange={handleInputChange}
                className={inputRequired}
                required
              >
                <option value="SIM">Sim</option>
                <option value="NAO">Não</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Setup (min)
              </label>
              <input
                type="number"
                step="0.01"
                name="Setup"
                value={formData.Setup === undefined ? '' : formData.Setup}
                onChange={handleInputChange}
                className={inputBaseClass + " border-gray-200"}
                placeholder="Ex: 15"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Tempo Padrão (min)
              </label>
              <input
                type="number"
                step="0.01"
                name="TempoPadrao"
                value={formData.TempoPadrao === undefined ? '' : formData.TempoPadrao}
                onChange={handleInputChange}
                className={inputBaseClass + " border-gray-200"}
                placeholder="Ex: 5"
              />
            </div>
          </div>
`;

// Replace the <div className="space-y-4"> block
content = content.replace(/<div className="space-y-4">[\s\S]*?<\/div>\s*<\/div>\s*<p className="text-xs text-gray-400 pt-2 border-t border-gray-100">/, `<div className="space-y-4">${formInputs}</div>\n\n            <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">`);

// Replace table headers
content = content.replace(/<th className="px-2 py-0.5 text-left text-\[9px\] font-semibold text-white uppercase tracking-wider">Recurso<\/th>/, `
                <th className="px-2 py-0.5 text-left text-[9px] font-semibold text-white uppercase tracking-wider">Processo</th>
                <th className="px-2 py-0.5 text-left text-[9px] font-semibold text-white uppercase tracking-wider hidden md:table-cell">Código</th>
`);
content = content.replace(/<th className="px-2 py-0.5 text-center text-\[9px\] font-semibold text-white uppercase tracking-wider hidden md:table-cell">Data Liberada<\/th>/, `
                <th className="px-2 py-0.5 text-center text-[9px] font-semibold text-white uppercase tracking-wider hidden md:table-cell">Data Liberada</th>
                <th className="px-2 py-0.5 text-right text-[9px] font-semibold text-white uppercase tracking-wider hidden sm:table-cell">Setup (min)</th>
                <th className="px-2 py-0.5 text-right text-[9px] font-semibold text-white uppercase tracking-wider hidden sm:table-cell">T. Padrão (min)</th>
`);

// Replace table cells
content = content.replace(/<td className="px-3 py-1">\s*<p className="font-medium text-\[#32423D\] text-\[11px\]">{recurso\.Recurso}<\/p>\s*<\/td>/, `
                <td className="px-3 py-1">
                  <p className="font-medium text-[#32423D] text-[11px]">{recurso.processofabricacao}</p>
                </td>
                <td className="px-3 py-1 hidden md:table-cell text-[11px] text-gray-600">
                  {recurso.CodigoProcessoFabricacao || '-'}
                </td>
`);

content = content.replace(/<td className="px-3 py-1 text-center hidden md:table-cell">\s*<span className=\{\`px-1\.5 py-0\.5 rounded text-\[10px\] font-medium \$\{recurso\.DataLiberada === 'SIM' \? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'\}\`\}>\s*\{recurso\.DataLiberada\}\s*<\/span>\s*<\/td>/, `
                <td className="px-3 py-1 text-center hidden md:table-cell">
                  <span className={\`px-1.5 py-0.5 rounded text-[10px] font-medium \${recurso.DataLiberada === 'SIM' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}\`}>
                    {recurso.DataLiberada}
                  </span>
                </td>
                <td className="px-3 py-1 text-right hidden sm:table-cell text-[11px] text-gray-600 font-medium">
                  {recurso.Setup ?? '-'}
                </td>
                <td className="px-3 py-1 text-right hidden sm:table-cell text-[11px] text-gray-600 font-medium">
                  {recurso.TempoPadrao ?? '-'}
                </td>
`);

fs.writeFileSync(path, content);
console.log('Patched RecursoFabricacao.tsx');
