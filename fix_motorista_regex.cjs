const fs = require('fs');

let motoristaPath = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/Motorista.tsx';
let content = fs.readFileSync(motoristaPath, 'utf8');

const regex = /<div className="mt-1 flex justify-center px-4 py-3 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors bg-gray-50\/50">[\s\S]*?<\/div>[\s\S]*?<\/div>/m;

const replaceStr = `<div className="mt-1 flex justify-center w-full">
 <div className="space-y-1 text-center w-full">
 {formData.ImagemCNH ? (
 <div className="flex flex-col items-center gap-2">
 <div className="relative inline-block group/img" onMouseLeave={() => setZoomLevel(1)}>
 <img src={getAuthImageUrl(formData.ImagemCNH)} alt="CNH" className="mx-auto h-16 w-auto rounded object-cover shadow-sm cursor-zoom-in" />
 
 {/* Fullscreen Lightbox View on Hover */}
 <div className="fixed inset-0 z-[100] flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 pointer-events-none group-hover/img:pointer-events-auto bg-black/40 backdrop-blur-sm" onWheel={handleWheel}>
 <img src={getAuthImageUrl(formData.ImagemCNH)} alt="CNH Ampliada" className="max-w-[90vw] max-h-[90vh] object-contain drop-shadow-2xl rounded-lg transition-transform duration-75" style={{ transform: \`scale(\${zoomLevel})\` }} />
 </div>
 </div>
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
 </div>
 <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF até 10MB</p>
 </>
 )}
 </div>
 </div>`;

if (regex.test(content)) {
    content = content.replace(regex, replaceStr);
    fs.writeFileSync(motoristaPath, content);
    console.log('Motorista.tsx patched (restored layout)');
} else {
    console.log('Regex did not match Motorista.tsx');
}
