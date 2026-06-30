import sys

file_path = 'frontend/src/pages/Material.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update search state
content = content.replace(
    "const [searchTerm, setSearchTerm] = useState('');",
    "const [searchFields, setSearchFields] = useState({ codigo: '', descricao: '', familia: '', fornecedor: '' });"
)

# 2. Add getUser function before fetchOptions
content = content.replace(
    "// Fetch dropdown options",
    "const getUser = () => { try { const u = JSON.parse(localStorage.getItem('sinco_user') || '{}'); return u.NomeCompleto || u.nome || u.username || 'Sistema'; } catch { return 'Sistema'; } };\n\n  // Fetch dropdown options"
)

# 3. Update filteredMateriais logic
old_filter = """  const filteredMateriais = materiais.filter(m =>
    m.CodMatFabricante?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.DescResumo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.DescFamilia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.Fornecedor?.toLowerCase().includes(searchTerm.toLowerCase())
  );"""
new_filter = """  const filteredMateriais = materiais.filter(m =>
    (!searchFields.codigo || m.CodMatFabricante?.toLowerCase().includes(searchFields.codigo.toLowerCase())) &&
    (!searchFields.descricao || m.DescResumo?.toLowerCase().includes(searchFields.descricao.toLowerCase()) || m.DescDetal?.toLowerCase().includes(searchFields.descricao.toLowerCase())) &&
    (!searchFields.familia || m.DescFamilia?.toLowerCase().includes(searchFields.familia.toLowerCase())) &&
    (!searchFields.fornecedor || m.Fornecedor?.toLowerCase().includes(searchFields.fornecedor.toLowerCase()))
  );"""
content = content.replace(old_filter, new_filter)

# 4. Update handleSubmit
old_submit = """      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });"""
new_submit = """      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, usuario: getUser() }),
      });"""
content = content.replace(old_submit, new_submit)

# 5. Update handleDelete
old_delete = """      const res = await fetch(`${API_BASE}/material/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: 'Edson' }),
      });"""
new_delete = """      const res = await fetch(`${API_BASE}/material/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: getUser() }),
      });"""
content = content.replace(old_delete, new_delete)

# 6. Replace search UI
old_search_ui = """            {showFilters ? (
              <div className="relative max-w-md flex-1 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar por código, descrição, família ou fornecedor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#E0E800]/50 focus:border-[#E0E800] transition-all"
                  />
                </div>
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="p-2.5 rounded-lg border border-gray-200 text-gray-500 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors" title="Limpar pesquisa">
                    <X size={18} />
                  </button>
                )}
              </div>
            ) : ("""
new_search_ui = """            {showFilters ? (
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
            ) : ("""
content = content.replace(old_search_ui, new_search_ui)

# 7. Disable camera/gallery
old_camera = """          <label className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 cursor-pointer text-[#32423D]" title="Câmera">
            <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
            <Camera size={16} />
          </label>
          <label className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 cursor-pointer text-[#32423D]" title="Galeria">
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            <ImageIcon size={16} />
          </label>"""
new_camera = """          <label className="p-1.5 rounded border border-gray-200 bg-gray-100 cursor-not-allowed text-gray-400 opacity-50" title="Câmera (Desativado)">
            <input type="file" accept="image/*" capture="environment" disabled className="hidden" />
            <Camera size={16} />
          </label>
          <label className="p-1.5 rounded border border-gray-200 bg-gray-100 cursor-not-allowed text-gray-400 opacity-50" title="Galeria (Desativado)">
            <input type="file" accept="image/*" disabled className="hidden" />
            <ImageIcon size={16} />
          </label>"""
content = content.replace(old_camera, new_camera)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated Material.tsx successfully')
