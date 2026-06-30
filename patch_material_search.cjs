const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'pages', 'Material.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

const originalBlock = `{showFilters ? (
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
              ) : (
                <div className="flex-1 text-sm text-gray-500 italic">Pesquisa oculta</div>
              )}`;

const newBlock = `{showFilters ? (
                <div className="flex-1 flex flex-col md:flex-row items-center gap-2 mr-2">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 flex-1">
                    <div className="relative">
                      <input type="text" placeholder="Código..." value={searchFields.codigo} onChange={(e) => setSearchFields(prev => ({ ...prev, codigo: e.target.value }))} className="w-full pl-2 pr-6 py-1.5 text-xs rounded border border-gray-200 bg-white focus:outline-none focus:border-[#E0E800]" />
                      {searchFields.codigo && <button onClick={() => setSearchFields(prev => ({ ...prev, codigo: '' }))} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"><X size={12} /></button>}
                    </div>
                    <div className="relative">
                      <input type="text" placeholder="Descrição..." value={searchFields.descricao} onChange={(e) => setSearchFields(prev => ({ ...prev, descricao: e.target.value }))} className="w-full pl-2 pr-6 py-1.5 text-xs rounded border border-gray-200 bg-white focus:outline-none focus:border-[#E0E800]" />
                      {searchFields.descricao && <button onClick={() => setSearchFields(prev => ({ ...prev, descricao: '' }))} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"><X size={12} /></button>}
                    </div>
                    <div className="relative">
                      <input type="text" placeholder="Família..." value={searchFields.familia} onChange={(e) => setSearchFields(prev => ({ ...prev, familia: e.target.value }))} className="w-full pl-2 pr-6 py-1.5 text-xs rounded border border-gray-200 bg-white focus:outline-none focus:border-[#E0E800]" />
                      {searchFields.familia && <button onClick={() => setSearchFields(prev => ({ ...prev, familia: '' }))} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"><X size={12} /></button>}
                    </div>
                    <div className="relative">
                      <input type="text" placeholder="Fornecedor..." value={searchFields.fornecedor} onChange={(e) => setSearchFields(prev => ({ ...prev, fornecedor: e.target.value }))} className="w-full pl-2 pr-6 py-1.5 text-xs rounded border border-gray-200 bg-white focus:outline-none focus:border-[#E0E800]" />
                      {searchFields.fornecedor && <button onClick={() => setSearchFields(prev => ({ ...prev, fornecedor: '' }))} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"><X size={12} /></button>}
                    </div>
                  </div>
                  {(searchFields.codigo || searchFields.descricao || searchFields.familia || searchFields.fornecedor) && (
                    <button onClick={() => setSearchFields({ codigo: '', descricao: '', familia: '', fornecedor: '' })} className="text-[10px] whitespace-nowrap px-2 py-1.5 text-red-600 hover:bg-red-50 border border-red-200 rounded uppercase font-bold transition-colors">Limpar Tudo</button>
                  )}
                </div>
              ) : (
                <div className="flex-1 text-xs text-gray-500 italic">Pesquisa oculta</div>
              )}`;

content = content.replace(originalBlock, newBlock);
fs.writeFileSync(filePath, content, 'utf-8');
console.log('Patched Material.tsx search block');
