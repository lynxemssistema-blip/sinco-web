const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/Material.tsx', 'utf8');

const regexClassificacao = /\{\/\* Classifica.*? \*\/\}([\s\S]*?)\{\/\* Dimens.*? \*\/\}/;
const compactClassificacao = `{/* Classificação */}
   <div className="border-b border-gray-100 pb-2 mb-2">
     <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
       <div>
         <label className="block text-xs font-medium text-gray-500 mb-0.5">Família</label>
         <select name="FamiliaMat" value={formData.FamiliaMat || ''} onChange={handleInputChange} className={selectClass + " py-1 text-xs"}>
           <option value="">Selecione...</option>
           {familiaOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
         </select>
       </div>
       <div>
         <label className="block text-xs font-medium text-gray-500 mb-0.5">Fornecedor</label>
         <select name="CodigoJuridicoMat" value={formData.CodigoJuridicoMat || ''} onChange={handleInputChange} className={selectClass + " py-1 text-xs"}>
           <option value="">Selecione...</option>
           {fornecedorOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
         </select>
       </div>
     </div>
   </div>
   {/* Dimensões */}`;

const regexDimensões = /\{\/\* Dimens.*? \*\/\}([\s\S]*?)\{\/\* Dados Fiscais \*\/\}/;
const compactDimensões = `{/* Dimensões */}
   <div className="border-b border-gray-100 pb-2 mb-2">
     <h3 className="text-xs font-semibold text-gray-700 mb-1">Dados Equipamento</h3>
     <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
       <div className="col-span-2">
         <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Peso</label>
         <input type="text" name="Peso" value={formData.Peso || ''} onChange={handleInputChange} className={inputOptional + " py-1 text-xs"} />
       </div>
       <div className="col-span-2">
         <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Unidade</label>
         <select name="Unidade" value={formData.Unidade || ''} onChange={handleInputChange} className={selectClass + " py-1 text-xs"}>
           <option value="">-</option>
           {unidadeOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.id}</option>)}
         </select>
       </div>
       <div className="col-span-2">
         <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Altura</label>
         <input type="text" name="Altura" value={formData.Altura || ''} onChange={handleInputChange} className={inputOptional + " py-1 text-xs"} />
       </div>
       <div className="col-span-2">
         <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Largura</label>
         <input type="text" name="Largura" value={formData.Largura || ''} onChange={handleInputChange} className={inputOptional + " py-1 text-xs"} />
       </div>
       <div className="col-span-2">
         <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Profundidade</label>
         <input type="text" name="Profundidade" value={formData.Profundidade || ''} onChange={handleInputChange} className={inputOptional + " py-1 text-xs"} />
       </div>
     </div>
   </div>
   {/* Dados Fiscais */}`;

const regexFiscais = /\{\/\* Dados Fiscais \*\/\}([\s\S]*?)\{\/\* Required fields note \*\/\}/;
const compactFiscais = `{/* Dados Fiscais */}
   <div className="pb-2">
     <h3 className="text-xs font-semibold text-gray-700 mb-1">Dados Fiscais</h3>
     <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
       <div>
         <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Valor Unit.</label>
         <input type="text" name="Valor" value={formData.Valor || ''} onChange={handleInputChange} className={inputOptional + " py-1 text-xs"} />
       </div>
       <div>
         <label className="block text-[10px] font-medium text-gray-500 mb-0.5">% ICMS</label>
         <input type="text" name="PercICMS" value={formData.PercICMS || ''} onChange={handleInputChange} className={inputOptional + " py-1 text-xs"} />
       </div>
       <div>
         <label className="block text-[10px] font-medium text-gray-500 mb-0.5">$ ICMS</label>
         <input type="text" name="vICMS" value={formData.vICMS || ''} onChange={handleInputChange} className={inputOptional + " py-1 text-xs"} />
       </div>
       <div>
         <label className="block text-[10px] font-medium text-gray-500 mb-0.5">% IPI</label>
         <input type="text" name="PercIPI" value={formData.PercIPI || ''} onChange={handleInputChange} className={inputOptional + " py-1 text-xs"} />
       </div>
       <div>
         <label className="block text-[10px] font-medium text-gray-500 mb-0.5">$ IPI</label>
         <input type="text" name="vIPI" value={formData.vIPI || ''} onChange={handleInputChange} className={inputOptional + " py-1 text-xs"} />
       </div>
       <div>
         <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Valor Líquido</label>
         <input type="text" name="vLiquido" value={formData.vLiquido || ''} onChange={handleInputChange} className={inputOptional + " py-1 text-xs"} />
       </div>
     </div>
   </div>
   {/* Required fields note */}`;

c = c.replace(regexClassificacao, compactClassificacao);
c = c.replace(regexDimensões, compactDimensões);
c = c.replace(regexFiscais, compactFiscais);

fs.writeFileSync('frontend/src/pages/Material.tsx', c);
console.log('Compacted Material fields!');
