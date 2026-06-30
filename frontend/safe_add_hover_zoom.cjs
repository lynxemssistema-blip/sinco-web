const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Material.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

const regex = /<div className="w-16 h-16 rounded bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden relative group shrink-0">([\s\S]*?)<\/div>\s*<div className="flex-1 flex flex-col gap-2">/m;

const replacement = `<div className="w-16 h-16 rounded bg-gray-100 border border-gray-200 flex items-center justify-center relative group shrink-0">
        {formData.ImagemProduto ? (
          <>
            <div className="w-full h-full rounded overflow-hidden relative">
              <img src={formData.ImagemProduto} alt="Preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, ImagemProduto: '' }))} className="p-1 bg-white/20 rounded-full hover:bg-white/40 text-white transition-colors" title="Remover imagem">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            
            {/* Expanded Image on Hover */}
            <div className="absolute top-0 left-20 z-[200] hidden group-hover:block pointer-events-none bg-white p-2 rounded-lg shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-200">
               <img src={formData.ImagemProduto} alt="Zoom" className="w-48 h-48 sm:w-64 sm:h-64 object-contain" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400">
            <Package size={20} strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col gap-2">`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(filePath, content);
  console.log('Material.tsx hover zoom added successfully.');
} else {
  console.log('Regex match failed!');
}
