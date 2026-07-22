const fs = require('fs');
let code = fs.readFileSync('src/pages/MontaPecaManufaturada.tsx', 'utf8');

const badPart = `            GRID 3: INCLUSÃO DE NOVOS MATERIAIS
            ========================================= */}
        
                    <tr>`;

const goodPart = `            GRID 3: INCLUSÃO DE NOVOS MATERIAIS
            ========================================= */}
        
          <div className="flex flex-col min-h-0 bg-white shadow-sm flex-1 max-w-[33%] border-l border-indigo-100 animate-in slide-in-from-right-10 duration-200">
            <div className="px-3 py-2 bg-gradient-to-r from-indigo-50 to-indigo-100/40 border-b border-indigo-100 shrink-0 flex justify-between items-center">
              <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
                <PlusCircle size={13} /> 3. Incluir Materiais
              </span>
            </div>
            <div className="p-2 border-b border-gray-100 shrink-0 flex flex-col gap-2 bg-gray-50/30">
              <div className="flex gap-2">
                <input value={fCod3} onChange={e=>setFCod3(e.target.value)} disabled={!selMat1} placeholder="Cód..." className="w-[30%] px-2 py-1 text-[10px] border border-gray-300 rounded shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"/>
                <input value={fDesc3} onChange={e=>setFDesc3(e.target.value)} disabled={!selMat1} placeholder="Descrição..." className="w-[40%] px-2 py-1 text-[10px] border border-gray-300 rounded shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"/>
                <button onClick={handleSaveComp3} disabled={!selMat1 || selecionados3.size === 0 || saving3}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {saving3 ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>} Adicionar ({selecionados3.size})
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-gray-50/20">
              {loading3 ? (
                <div className="flex justify-center p-6"><Loader2 className="animate-spin text-indigo-500" size={18}/></div>
              ) : materiais3Filtrados.length === 0 ? (
                <div className="p-6 text-center text-[10px] text-gray-400">Nenhum material novo disponível para adição</div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-white sticky top-0 z-10 shadow-sm border-b border-gray-200">
                    <tr>`;

if(code.includes(badPart)) {
  code = code.replace(badPart, goodPart);
  console.log("Replaced using standard \n");
} else if (code.includes(badPart.replace(/\n/g, '\r\n'))) {
  code = code.replace(badPart.replace(/\n/g, '\r\n'), goodPart.replace(/\n/g, '\r\n'));
  console.log("Replaced using \r\n");
} else {
  console.log("Could not find the bad part to replace.");
}

fs.writeFileSync('src/pages/MontaPecaManufaturada.tsx', code);
