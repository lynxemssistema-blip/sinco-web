const fs = require('fs');

let code = fs.readFileSync('frontend/src/pages/Motorista.tsx', 'utf8');

// 1. Add state variables for Vencimento filter
if (!code.includes('filterVencimentoStart')) {
  code = code.replace(
    "const [searchNome, setSearchNome] = useState('');",
    "const [searchNome, setSearchNome] = useState('');\n const [filterVencimentoStart, setFilterVencimentoStart] = useState('');\n const [filterVencimentoEnd, setFilterVencimentoEnd] = useState('');"
  );
}

// 2. Update filteredMotoristas logic
const filterLogicOld = `const filteredMotoristas = motoristas.filter(motorista => {
   if (!searchNome) return true;
   return motorista.Motorista.toLowerCase().includes(searchNome.toLowerCase());
 });`;

const filterLogicNew = `const filteredMotoristas = motoristas.filter(motorista => {
   let match = true;
   
   if (searchNome && !motorista.Motorista.toLowerCase().includes(searchNome.toLowerCase())) {
     match = false;
   }
   
   if (filterVencimentoStart || filterVencimentoEnd) {
     if (!motorista.DataVencimentoCNH) {
       match = false;
     } else {
       const motoristaDate = new Date(motorista.DataVencimentoCNH + 'T12:00:00');
       if (filterVencimentoStart) {
         const startDate = new Date(filterVencimentoStart + 'T12:00:00');
         if (motoristaDate < startDate) match = false;
       }
       if (filterVencimentoEnd) {
         const endDate = new Date(filterVencimentoEnd + 'T12:00:00');
         if (motoristaDate > endDate) match = false;
       }
     }
   }
   
   return match;
 });`;

if (code.includes('const filteredMotoristas = motoristas.filter(motorista => {') && !code.includes('filterVencimentoStart || filterVencimentoEnd')) {
  // It might not exactly match filterLogicOld due to formatting, so we'll replace via regex
  code = code.replace(
    /const filteredMotoristas = motoristas\.filter\(motorista => \{[\s\S]*?\}\);/g,
    filterLogicNew
  );
}

// 3. Update the UI for Search Filters Section
const searchFiltersOldRegex = /<div className="grid grid-cols-1 md:grid-cols-2 gap-3">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*\)}/;

const searchFiltersNew = `<div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
   <div>
     <div className="flex items-center justify-between mb-0.5">
       <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Nome do Motorista:</label>
       {searchNome && (
         <button onClick={() => setSearchNome('')} className="text-[10px] text-red-500 hover:text-red-700 uppercase">Limpar</button>
       )}
     </div>
     <div className="relative">
       <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
       <input
         type="search"
         placeholder="Pesquisar por nome..."
         value={searchNome}
         onChange={(e) => setSearchNome(e.target.value)}
         className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded text-gray-600 focus:outline-none focus:border-[#32423D] focus:ring-1 focus:ring-[#32423D] transition-colors"
       />
     </div>
   </div>
   
   <div>
     <div className="flex items-center justify-between mb-0.5">
       <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Vencimento CNH (De):</label>
       {filterVencimentoStart && (
         <button onClick={() => setFilterVencimentoStart('')} className="text-[10px] text-red-500 hover:text-red-700 uppercase">Limpar</button>
       )}
     </div>
     <input
       type="date"
       value={filterVencimentoStart}
       onChange={(e) => setFilterVencimentoStart(e.target.value)}
       className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded text-gray-600 focus:outline-none focus:border-[#32423D] focus:ring-1 focus:ring-[#32423D] transition-colors"
     />
   </div>

   <div>
     <div className="flex items-center justify-between mb-0.5">
       <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Vencimento CNH (Até):</label>
       {filterVencimentoEnd && (
         <button onClick={() => setFilterVencimentoEnd('')} className="text-[10px] text-red-500 hover:text-red-700 uppercase">Limpar</button>
       )}
     </div>
     <input
       type="date"
       value={filterVencimentoEnd}
       onChange={(e) => setFilterVencimentoEnd(e.target.value)}
       className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded text-gray-600 focus:outline-none focus:border-[#32423D] focus:ring-1 focus:ring-[#32423D] transition-colors"
     />
   </div>
   </div>
   
   {(searchNome || filterVencimentoStart || filterVencimentoEnd) && (
     <div className="mt-3 flex justify-end">
       <button 
         onClick={() => {
           setSearchNome('');
           setFilterVencimentoStart('');
           setFilterVencimentoEnd('');
         }}
         className="text-[10px] bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded transition-colors uppercase font-bold border border-red-100 flex items-center gap-1"
       >
         <X size={11} /> Limpar Todos os Filtros
       </button>
     </div>
   )}
   
   </div>
   )}`;

if (code.match(searchFiltersOldRegex)) {
  code = code.replace(searchFiltersOldRegex, searchFiltersNew);
} else {
  console.log('Failed to match search filters UI block.');
}

fs.writeFileSync('frontend/src/pages/Motorista.tsx', code);
console.log('Filters added to Motorista.tsx successfully');
