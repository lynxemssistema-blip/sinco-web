const fs = require('fs');

let code = fs.readFileSync('frontend/src/pages/Motorista.tsx', 'utf8');

const regex = /<div className="px-4 pb-3 pt-2">[\s\S]*?\{searchNome && \([\s\S]*?Limpar Filtro[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>/;

const newBlock = `<div className="px-4 pb-3 pt-2">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Nome do Motorista:</label>
            {searchNome && (
              <button onClick={() => setSearchNome('')} className="text-[10px] text-red-500 hover:text-red-700 font-bold uppercase transition-colors">Limpar</button>
            )}
          </div>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="search"
              placeholder="Pesquisar por nome..."
              value={searchNome}
              onChange={(e) => setSearchNome(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 border border-gray-300 bg-white text-xs focus:outline-none focus:border-[#32423D] focus:ring-1 focus:ring-[#32423D]/20 rounded-sm"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-0.5">
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Venc. CNH (A partir de):</label>
            {filterVencimentoStart && (
              <button onClick={() => setFilterVencimentoStart('')} className="text-[10px] text-red-500 hover:text-red-700 font-bold uppercase transition-colors">Limpar</button>
            )}
          </div>
          <input
            type="date"
            value={filterVencimentoStart}
            onChange={(e) => setFilterVencimentoStart(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 bg-white text-xs focus:outline-none focus:border-[#32423D] focus:ring-1 focus:ring-[#32423D]/20 rounded-sm"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-0.5">
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Venc. CNH (Até):</label>
            {filterVencimentoEnd && (
              <button onClick={() => setFilterVencimentoEnd('')} className="text-[10px] text-red-500 hover:text-red-700 font-bold uppercase transition-colors">Limpar</button>
            )}
          </div>
          <input
            type="date"
            value={filterVencimentoEnd}
            onChange={(e) => setFilterVencimentoEnd(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 bg-white text-xs focus:outline-none focus:border-[#32423D] focus:ring-1 focus:ring-[#32423D]/20 rounded-sm"
          />
        </div>
      </div>

      {(searchNome || filterVencimentoStart || filterVencimentoEnd) && (
        <div className="flex justify-end mt-3">
          <button
            onClick={() => {
              setSearchNome('');
              setFilterVencimentoStart('');
              setFilterVencimentoEnd('');
            }}
            className="px-3 py-1 text-gray-500 font-semibold text-[10px] tracking-wide rounded border border-gray-200 hover:bg-gray-50 hover:text-red-500 hover:border-red-200 transition-colors flex items-center gap-1.5 uppercase"
          >
            <X size={11} /> Limpar Todos os Filtros
          </button>
        </div>
      )}
    </div>`;

if (code.match(regex)) {
  code = code.replace(regex, newBlock);
  fs.writeFileSync('frontend/src/pages/Motorista.tsx', code);
  console.log('Successfully replaced search filters');
} else {
  console.log('Could not find regex match for search block');
}
