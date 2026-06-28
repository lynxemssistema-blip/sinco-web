const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/Material.tsx', 'utf8');

const regexImageArea = /\{\/\* Image Upload Action Area \*\/\}([\s\S]*?)\{\/\* Identificação \*\/\}/;
const compactImageArea = `{/* Image Upload Action Area */}
   <div className="flex flex-row items-center gap-4 mb-4">
     <div className="w-16 h-16 rounded bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden relative group shrink-0">
       {formData.ImagemProduto ? (
         <>
           <img src={formData.ImagemProduto} alt="Preview" className="w-full h-full object-cover" />
           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
             <button type="button" onClick={() => setFormData(prev => ({ ...prev, ImagemProduto: '' }))} className="p-1 bg-white/20 rounded-full hover:bg-white/40 text-white transition-colors" title="Remover imagem">
               <Trash2 size={14} />
             </button>
           </div>
         </>
       ) : (
         <div className="flex flex-col items-center justify-center text-gray-400">
           <Package size={20} strokeWidth={1.5} />
         </div>
       )}
     </div>
     <div className="flex-1 flex flex-col gap-2">
       <div className="flex flex-row gap-2 items-center">
         <span className="text-xs font-semibold text-gray-700 mr-2">Imagem:</span>
         <label className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 cursor-pointer text-[#32423D]" title="Câmera">
           <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
           <Camera size={16} />
         </label>
         <label className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 cursor-pointer text-[#32423D]" title="Galeria">
           <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
           <ImageIcon size={16} />
         </label>
         <button type="button" onClick={() => setShowUrlInput(!showUrlInput)} className={\`p-1.5 rounded border transition-colors \${showUrlInput ? 'bg-[#32423D] text-white border-[#32423D]' : 'border-gray-200 hover:bg-gray-50 text-[#32423D]'}\`} title="Link Web">
           <LinkIcon size={16} />
         </button>
         <button type="button" onClick={() => {
           const query = encodeURIComponent((formData.CodMatFabricante || '') + ' ' + (formData.DescResumo || ''));
           window.open(\`https://www.google.com/search?tbm=isch&q=\${query}\`, '_blank');
           setShowUrlInput(true);
         }} className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 text-[#32423D]" title="Pesquisar WEB">
           <Globe size={16} />
         </button>
       </div>
       {showUrlInput && (
         <input type="text" value={formData.ImagemProduto || ''} onChange={(e) => setFormData(prev => ({ ...prev, ImagemProduto: e.target.value }))} placeholder="URL da imagem (https://...)" className={inputOptional + " py-1 text-xs"} />
       )}
     </div>
   </div>
   {/* Identificação */}`;

const regexIdentDesc = /\{\/\* Identificação \*\/\}([\s\S]*?)\{\/\* Características \*\/\}/;
const compactIdentDesc = `{/* Identificação */}
   <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
     <div className="md:col-span-1">
       <label className="block text-xs font-medium text-gray-600 mb-0.5">Cód. Material *</label>
       <input type="text" name="CodMatFabricante" value={formData.CodMatFabricante || ''} onChange={handleInputChange} className={inputRequired + " py-1 text-xs"} required />
     </div>
     <div className="md:col-span-1">
       <label className="block text-xs font-medium text-gray-500 mb-0.5">Num RP</label>
       <input type="text" name="NumeroRP" value={formData.NumeroRP || ''} onChange={handleInputChange} className={inputOptional + " py-1 text-xs"} />
     </div>
     <div className="md:col-span-2">
       <label className="block text-xs font-medium text-gray-500 mb-0.5">Desc. Resumo</label>
       <input type="text" name="DescResumo" value={formData.DescResumo || ''} onChange={handleInputChange} className={inputOptional + " py-1 text-xs"} />
     </div>
     <div className="md:col-span-4">
       <label className="block text-xs font-medium text-gray-500 mb-0.5">Desc. Detalhada</label>
       <textarea name="DescDetal" rows={1} value={formData.DescDetal || ''} onChange={handleInputChange} className={inputOptional + " py-1 text-xs resize-y"} />
     </div>
   </div>
   {/* Características */}`;

const match1 = c.match(/\{\/\* Identifica..o \*\/\}/);
if (match1) {
  // Found with non-ascii characters. Let's make regex tolerant.
  const r1 = /\{\/\* Image Upload Action Area \*\/\}([\s\S]*?)\{\/\* Identifica..o \*\/\}/;
  const r2 = /\{\/\* Identifica..o \*\/\}([\s\S]*?)\{\/\* Caracter.sticas \*\/\}/;
  c = c.replace(r1, compactImageArea);
  c = c.replace(r2, compactIdentDesc);
}

fs.writeFileSync('frontend/src/pages/Material.tsx', c);
console.log('Compacted Material modal layout!');
