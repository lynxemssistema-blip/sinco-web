const fs = require('fs');
let motoristaPath = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/Motorista.tsx';
let content = fs.readFileSync(motoristaPath, 'utf8');

// Replace border-dashed
content = content.replace(
  '<div className="mt-1 flex justify-center px-4 py-3 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors bg-gray-50/50">',
  '<div className="mt-1 flex justify-center w-full">'
);

// We want to replace the buttons section
const searchSection = ` <button
 type="button"
 onClick={() => setFormData(prev => ({ ...prev, ImagemCNH: '' }))}
 className="absolute -top-2 -right-2 p-1 bg-white rounded-full text-red-500 hover:text-red-700 shadow-md border border-gray-100 z-50 opacity-0 group-hover/img:opacity-100 transition-opacity"
 >
 <X size={14} />
 </button>
 </div>
 ) : (
 <ImageIcon className="mx-auto h-10 w-10 text-gray-400" />
 )}
 <div className="flex justify-center text-sm text-gray-600 mt-2">
 <label htmlFor="cnh-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none px-2 py-1 flex items-center gap-2 border border-gray-200 hover:bg-gray-50">
 <Camera size={14} />
 <span>Upload foto da CNH</span>
 <input id="cnh-upload" name="cnh-upload" type="file" accept="image/*" className="sr-only" onChange={handleImageUpload} />
 </label>
 </div>`;

const replaceSection = ` </div>
 <div className="flex gap-2 mt-2">
 <label className="cursor-pointer px-3 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded text-xs hover:bg-blue-100 transition-colors flex items-center gap-1 font-medium">
 <Camera size={14} /> Alterar Foto
 <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
 </label>
 <button type="button" onClick={() => setFormData(prev => ({ ...prev, ImagemCNH: '' }))} className="px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded text-xs hover:bg-red-100 transition-colors flex items-center gap-1 font-medium">
 <Trash2 size={14} /> Excluir Foto
 </button>
 </div>
 </div>
 ) : (
 <>
 <ImageIcon className="mx-auto h-10 w-10 text-gray-400" />
 <div className="flex justify-center text-sm text-gray-600 mt-2">
 <label htmlFor="cnh-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none px-2 py-1 flex items-center gap-2 border border-gray-200 hover:bg-gray-50">
 <Camera size={14} />
 <span>Upload foto da CNH</span>
 <input id="cnh-upload" name="cnh-upload" type="file" accept="image/*" className="sr-only" onChange={handleImageUpload} />
 </label>
 </div>`;

if (content.includes(searchSection)) {
  content = content.replace(searchSection, replaceSection);
  fs.writeFileSync(motoristaPath, content);
  console.log("Motorista.tsx correctly patched!");
} else {
  console.log("Could not find section to patch.");
}

// Check for missing </> closing tags, if we modified it
content = fs.readFileSync(motoristaPath, 'utf8');
if (content.includes('<span>Upload foto da CNH</span>') && !content.includes('</>')) {
    // Add the missing closing tag around the paragraph
    content = content.replace(
      '<p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF at',
      '</>\n <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF at'
    );
    // wait, actually the paragraph text is below, so we need to wrap the whole else branch in <> ... </>
    // Let's do it right.
}
