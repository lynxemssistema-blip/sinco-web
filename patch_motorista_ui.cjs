const fs = require('fs');

let code = fs.readFileSync('frontend/src/pages/Motorista.tsx', 'utf8');

// 1. Update interface
code = code.replace(
  'DataVencimentoCNH?: string;',
  'DataVencimentoCNH?: string;\n ImagemCNH?: string;'
);

// 2. Update emptyForm
code = code.replace(
  'DataVencimentoCNH: \'\'',
  'DataVencimentoCNH: \'\',\n ImagemCNH: \'\''
);

// 3. Add lucide icons
code = code.replace(
  'Filter, User\n} from \'lucide-react\';',
  'Filter, User, Image as ImageIcon, UploadCloud\n} from \'lucide-react\';'
);

// 4. Add upload states and function
const uploadFn = `
 const [uploadingImage, setUploadingImage] = useState(false);

 const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
   const file = e.target.files?.[0];
   if (!file) return;

   const formDataToSend = new FormData();
   formDataToSend.append('file', file);

   setUploadingImage(true);
   setError(null);

   try {
     const res = await fetch(\`\${API_BASE}/motoristas/upload-cnh\`, {
       method: 'POST',
       body: formDataToSend,
     });
     const json = await res.json();
     
     if (json.success) {
       setFormData(prev => ({ ...prev, ImagemCNH: json.url }));
     } else {
       setError(json.message || 'Erro ao fazer upload da imagem');
     }
   } catch (err) {
     setError('Erro ao enviar a imagem.');
     console.error(err);
   } finally {
     setUploadingImage(false);
   }
 };
`;

code = code.replace(
  'const [error, setError] = useState<string | null>(null);',
  'const [error, setError] = useState<string | null>(null);' + uploadFn
);

// 5. Add input field to the form
const imageUploadField = `
 <div className="pt-2 border-t border-gray-100">
   <label className="block text-xs font-medium text-gray-600 mb-2">
     Foto da CNH
   </label>
   <div className="flex items-start gap-4">
     {formData.ImagemCNH ? (
       <div className="relative group">
         <img 
           src={formData.ImagemCNH} 
           alt="CNH" 
           className="w-24 h-24 object-cover rounded-lg border border-gray-200 shadow-sm"
         />
         <button
           type="button"
           onClick={() => setFormData(prev => ({ ...prev, ImagemCNH: '' }))}
           className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
         >
           <X size={12} />
         </button>
       </div>
     ) : (
       <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-gray-50 text-gray-400 relative overflow-hidden group hover:border-[#32423D] transition-colors">
         {uploadingImage ? (
           <Loader2 size={24} className="animate-spin text-[#32423D]" />
         ) : (
           <>
             <UploadCloud size={24} className="mb-1 group-hover:text-[#32423D]" />
             <span className="text-[10px] font-medium px-2 text-center group-hover:text-[#32423D]">Anexar CNH</span>
           </>
         )}
         <input
           type="file"
           accept="image/*"
           onChange={handleFileUpload}
           disabled={uploadingImage}
           className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
         />
       </div>
     )}
     <div className="flex-1 text-[10px] text-gray-500 pt-1">
       Anexe uma foto legível da CNH do motorista. Formatos aceitos: JPG, PNG.
     </div>
   </div>
 </div>
`;

code = code.replace(
  '<p className="text-xs text-gray-400 pt-2 border-t border-gray-100">',
  imageUploadField + '\n\n <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">'
);

// 6. Add thumbnail to table
code = code.replace(
  '<th className="px-3 py-1.5 text-left text-xs font-semibold text-white uppercase tracking-wider hidden md:table-cell">Venc. CNH</th>',
  '<th className="px-3 py-1.5 text-left text-xs font-semibold text-white uppercase tracking-wider hidden md:table-cell">Venc. CNH</th>\n <th className="px-3 py-1.5 text-center text-xs font-semibold text-white uppercase tracking-wider hidden md:table-cell">Anexo</th>'
);

const tableAnexoField = `
 <td className="px-3 py-1.5 text-center hidden md:table-cell">
   {motorista.ImagemCNH ? (
     <a href={motorista.ImagemCNH} target="_blank" rel="noreferrer" className="inline-flex p-1.5 bg-[#E0E800]/20 text-[#32423D] rounded hover:bg-[#E0E800]/40 transition-colors relative group">
       <ImageIcon size={16} />
       <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 w-32 h-32 bg-white rounded shadow-lg border border-gray-200 overflow-hidden">
          <img src={motorista.ImagemCNH} alt="Preview" className="w-full h-full object-cover" />
       </div>
     </a>
   ) : (
     <span className="text-gray-300">-</span>
   )}
 </td>
`;

code = code.replace(
  '</span>\n </td>\n <td className="px-3 py-1.5">',
  '</span>\n </td>\n' + tableAnexoField + '\n <td className="px-3 py-1.5">'
);

fs.writeFileSync('frontend/src/pages/Motorista.tsx', code);
console.log('Motorista.tsx patched for CNH upload UI');
