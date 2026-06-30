const fs = require('fs');
const path = require('path');

const motoristaPath = path.join(__dirname, 'frontend', 'src', 'pages', 'Motorista.tsx');
let content = fs.readFileSync(motoristaPath, 'utf8');

// Update Interface
content = content.replace(
  'Categoria: string;\n Categoria: string;\n Telefone: string;',
  'Categoria: string;\n Telefone: string;\n DataVencimentoCNH?: string;'
);
content = content.replace(
  'Categoria: string;\n Telefone: string;',
  'Categoria: string;\n Telefone: string;\n DataVencimentoCNH?: string;'
);

// Update emptyForm
content = content.replace(
  'Categoria: \'\',\n Telefone: \'\'\n};',
  'Categoria: \'\',\n Telefone: \'\',\n DataVencimentoCNH: \'\'\n};'
);
content = content.replace(
  'Categoria: \'\',\n Telefone: \'\'',
  'Categoria: \'\',\n Telefone: \'\',\n DataVencimentoCNH: \'\''
);

// Update Form Inputs (we need to add the DataVencimentoCNH input)
const phoneInputStr = `          {/* Telefone */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Telefone
            </label>
            <input
              type="text"
              name="Telefone"
              value={formData.Telefone || ''}
              onChange={handleInputChange}
              placeholder="(XX) XXXXX-XXXX"
              className={inputBaseClass + " border-gray-200"}
              maxLength={20}
            />
          </div>`;

const newPhoneAndDateInputs = `          {/* Telefone e Vencimento CNH */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Telefone
              </label>
              <input
                type="text"
                name="Telefone"
                value={formData.Telefone || ''}
                onChange={handleInputChange}
                placeholder="(XX) XXXXX-XXXX"
                className={inputBaseClass + " border-gray-200"}
                maxLength={20}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Vencimento CNH
              </label>
              <input
                type="date"
                name="DataVencimentoCNH"
                value={formData.DataVencimentoCNH || ''}
                onChange={handleInputChange}
                className={inputBaseClass + " border-gray-200"}
              />
            </div>
          </div>`;

content = content.replace(phoneInputStr, newPhoneAndDateInputs);

// Update Table headers
content = content.replace(
  '<th className="px-3 py-1.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Telefone</th>',
  '<th className="px-3 py-1.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Telefone</th>\n <th className="px-3 py-1.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Venc. CNH</th>'
);

// Update Table rows
content = content.replace(
  /<td className="px-3 py-1.5">\s*<span className="text-sm text-gray-600">\s*\{motorista\.Telefone \|\| '-'\}\s*<\/span>\s*<\/td>/g,
  `<td className="px-3 py-1.5">
  <span className="text-sm text-gray-600">
  {motorista.Telefone || '-'}
  </span>
  </td>
  <td className="px-3 py-1.5">
  <span className="text-sm text-gray-600">
  {motorista.DataVencimentoCNH ? new Date(motorista.DataVencimentoCNH + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
  </span>
  </td>`
);

fs.writeFileSync(motoristaPath, content, 'utf8');
console.log('Motorista.tsx patched for DataVencimentoCNH');
