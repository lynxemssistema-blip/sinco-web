const fs = require('fs');

// 1. Projeto.tsx Fix
let projPath = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/Projeto.tsx';
let projContent = fs.readFileSync(projPath, 'utf8');

// The tab bar is inside a div with border-b. It's just before {/* TAB 1 - FATURAMENTO */}
projContent = projContent.replace(
    /<div className="flex border-b border-gray-100 px-5 pt-3 overflow-x-auto custom-scrollbar">[\s\S]*?<\/div>\s*\{\/\* TAB 1 - FATURAMENTO \*\/\}/,
    '{/* TAB 1 - FATURAMENTO */}'
);
fs.writeFileSync(projPath, projContent);

// 2. AcompanhamentoGeral.tsx Fix
let acompPath = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/AcompanhamentoGeral.tsx';
let acompContent = fs.readFileSync(acompPath, 'utf8');

if (!acompContent.includes('QTDE TAGS')) {
    acompContent = acompContent.replace(
        /<th className="px-3 py-3 text-center text-\[10px\] font-bold text-white uppercase tracking-wider hidden lg:table-cell">CORTE<\/th>/,
        '<th className="px-3 py-3 text-center text-[10px] font-bold text-white uppercase tracking-wider hidden lg:table-cell">QTDE TAGS</th>\n<th className="px-3 py-3 text-center text-[10px] font-bold text-white uppercase tracking-wider hidden lg:table-cell">CORTE</th>'
    );
    acompContent = acompContent.replace(
        /<td className="px-3 py-3 hidden lg:table-cell">/,
        '<td className="px-3 py-3 hidden lg:table-cell text-center text-xs font-semibold text-gray-700">{projeto.QtdeTags || 0}</td>\n<td className="px-3 py-3 hidden lg:table-cell">'
    );
    fs.writeFileSync(acompPath, acompContent);
}

// 3. Motorista.tsx Fix
let motPath = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/Motorista.tsx';
let motContent = fs.readFileSync(motPath, 'utf8');

let newImgMarkup = `<div className="flex flex-col items-center gap-2">
    <div className="relative inline-block group/img" onMouseLeave={() => setZoomLevel(1)}>
        <img src={formData.ImagemCNH} alt="CNH" className="mx-auto h-16 w-auto rounded object-cover shadow-sm cursor-zoom-in" />
        <div className="fixed inset-0 z-[100] flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 pointer-events-none group-hover/img:pointer-events-auto bg-black/40 backdrop-blur-sm" onWheel={handleWheel}>
            <img src={formData.ImagemCNH} alt="CNH Ampliada" className="max-w-[90vw] max-h-[90vh] object-contain drop-shadow-2xl rounded-lg transition-transform duration-75" style={{ transform: \`scale(\${zoomLevel})\` }} />
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
</div>`;

motContent = motContent.replace(
    /<div className="relative inline-block group\/img" onMouseLeave=\{\(\) => setZoomLevel\(1\)\}>[\s\S]*?<\/button>\s*<\/div>/,
    newImgMarkup
);
motContent = motContent.replace(
    /<div className="flex justify-center text-sm text-gray-600 mt-2">[\s\S]*?<\/p>/,
    `{!formData.ImagemCNH && (
        <>
            <div className="flex justify-center text-sm text-gray-600 mt-2">
                <label htmlFor="cnh-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none px-2 py-1 flex items-center gap-2 border border-gray-200 hover:bg-gray-50">
                    <Camera size={14} />
                    <span>Upload foto da CNH</span>
                    <input id="cnh-upload" name="cnh-upload" type="file" accept="image/*" className="sr-only" onChange={handleImageUpload} />
                </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF até 10MB</p>
        </>
    )}`
);
fs.writeFileSync(motPath, motContent);

// 4. Configuracao.tsx Fix
let confPath = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/Configuracao.tsx';
let confContent = fs.readFileSync(confPath, 'utf8');

if (!confContent.includes('/config/validar-caminho')) {
    let oldFunc = 'const handleSaveRegras = async () => {\n  // 1. Salva preferências no localStorage';
    let newFunc = `const handleSaveRegras = async () => {
  // Verificar caminho CNH se preenchido
  if (enderecoSalvarCNHMotorista) {
      try {
          const valRes = await fetch(\`\${API_BASE}/config/validar-caminho\`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': \`Bearer \${token}\` } : {}) },
              body: JSON.stringify({ caminho: enderecoSalvarCNHMotorista })
          });
          const valData = await valRes.json();
          if (!valData.success) {
              addToast({ type: 'error', title: 'Erro de Validação', message: valData.message });
              return; // Stop saving
          }
      } catch (e) {
          addToast({ type: 'error', title: 'Erro', message: 'Erro ao validar o endereço da CNH' });
          return;
      }
  }
  // 1. Salva preferências no localStorage`;
    
    // We can also just use string replace without regex.
    confContent = confContent.replace('const handleSaveRegras = async () => {\n  // 1. Salva prefer', newFunc);
    confContent = confContent.replace('const handleSaveRegras = async () => {\r\n  // 1. Salva prefer', newFunc);
    
    let oldPayload = `restringirApontamento,
        processosVisiveis: JSON.stringify(processosVisiveis),
        maxRegistros,
        permitirRealizadoSemPlanejamento
      })`;
      
    let newPayload = `restringirApontamento,
        processosVisiveis: JSON.stringify(processosVisiveis),
        maxRegistros,
        permitirRealizadoSemPlanejamento,
        enderecoSalvarCNHMotorista
      })`;
      
    confContent = confContent.replace(oldPayload, newPayload);
    
    fs.writeFileSync(confPath, confContent);
}

console.log('React patched successfully!');
