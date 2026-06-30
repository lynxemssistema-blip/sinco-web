const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'pages', 'Material.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Update search state
content = content.replace(
    /const \[searchTerm, setSearchTerm\] = useState\(''\);/,
    "const [searchFields, setSearchFields] = useState({ codigo: '', descricao: '', familia: '', fornecedor: '' });"
);

// 2. Add getUser function before fetchOptions
content = content.replace(
    /(\s*\/\/ Fetch dropdown options\s*const fetchOptions = async \(\) => {)/,
    "\n  const getUser = () => { try { const u = JSON.parse(localStorage.getItem('sinco_user') || '{}'); return u.NomeCompleto || u.nome || u.username || 'Sistema'; } catch { return 'Sistema'; } };\n$1"
);

// 3. Update filteredMateriais logic (Regex to match any spacing)
content = content.replace(
    /const filteredMateriais = materiais\.filter\(m =>[\s\S]*?m\.Fornecedor\?\.toLowerCase\(\)\.includes\(searchTerm\.toLowerCase\(\)\)[\s\S]*?\);/,
    `const filteredMateriais = materiais.filter(m =>
    (!searchFields.codigo || m.CodMatFabricante?.toLowerCase().includes(searchFields.codigo.toLowerCase())) &&
    (!searchFields.descricao || m.DescResumo?.toLowerCase().includes(searchFields.descricao.toLowerCase()) || m.DescDetal?.toLowerCase().includes(searchFields.descricao.toLowerCase())) &&
    (!searchFields.familia || m.DescFamilia?.toLowerCase().includes(searchFields.familia.toLowerCase())) &&
    (!searchFields.fornecedor || m.Fornecedor?.toLowerCase().includes(searchFields.fornecedor.toLowerCase()))
  );`
);

// 4. Update handleSubmit
content = content.replace(
    /body: JSON\.stringify\(formData\),/,
    "body: JSON.stringify({ ...formData, usuario: getUser() }),"
);

// 5. Update handleDelete
content = content.replace(
    /body: JSON\.stringify\({ usuario: 'Edson' }\),/,
    "body: JSON.stringify({ usuario: getUser() }),"
);

// 6. Replace search UI (Regex matching the showFilters block)
content = content.replace(
    /\{showFilters \? \([\s\S]*?\{searchTerm && \([\s\S]*?<\/button>[\s\S]*?\) : \(/,
    `{showFilters ? (
              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2 mr-2">
                <input
                  type="text"
                  placeholder="Código..."
                  value={searchFields.codigo}
                  onChange={(e) => setSearchFields(prev => ({ ...prev, codigo: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#E0E800]/50"
                />
                <input
                  type="text"
                  placeholder="Descrição..."
                  value={searchFields.descricao}
                  onChange={(e) => setSearchFields(prev => ({ ...prev, descricao: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#E0E800]/50"
                />
                <input
                  type="text"
                  placeholder="Família..."
                  value={searchFields.familia}
                  onChange={(e) => setSearchFields(prev => ({ ...prev, familia: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#E0E800]/50"
                />
                <input
                  type="text"
                  placeholder="Fornecedor..."
                  value={searchFields.fornecedor}
                  onChange={(e) => setSearchFields(prev => ({ ...prev, fornecedor: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#E0E800]/50"
                />
              </div>
            ) : (`
);

// 7. Disable camera/gallery
content = content.replace(
    /<label className="p-1\.5 rounded border border-gray-200 hover:bg-gray-50 cursor-pointer text-\[#32423D\]" title="Câmera">[\s\S]*?<ImageIcon size=\{16\} \/>\s*<\/label>/,
    `<label className="p-1.5 rounded border border-gray-200 bg-gray-100 cursor-not-allowed text-gray-400 opacity-50" title="Câmera (Desativado)">
            <input type="file" accept="image/*" capture="environment" disabled className="hidden" />
            <Camera size={16} />
          </label>
          <label className="p-1.5 rounded border border-gray-200 bg-gray-100 cursor-not-allowed text-gray-400 opacity-50" title="Galeria (Desativado)">
            <input type="file" accept="image/*" disabled className="hidden" />
            <ImageIcon size={16} />
          </label>`
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Updated Material.tsx successfully');
