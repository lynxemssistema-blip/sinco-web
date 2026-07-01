const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Material.tsx');
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

const newContent = `    {/* Grid Compacto (Identificação, Descrição, Classificação) */}
    <div className="grid grid-cols-1 md:grid-cols-6 gap-3 border-b border-gray-100 pb-3 mb-2">
      <div className="md:col-span-2">
        <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Código <span className="text-red-500 font-bold">*</span></label>
        <input type="text" name="CodMatFabricante" value={formData.CodMatFabricante || ''} onChange={handleInputChange} placeholder="Cód único" className={inputRequired + " text-xs py-1"} required />
      </div>
      <div>
        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">RP</label>
        <input type="text" name="NumeroRP" value={formData.NumeroRP || ''} onChange={handleInputChange} className={inputOptional + " text-xs py-1"} />
      </div>
      <div className="md:col-span-3">
        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Descrição Resumo</label>
        <input type="text" name="DescResumo" value={formData.DescResumo || ''} onChange={handleInputChange} className={inputOptional + " text-xs py-1"} />
      </div>
      
      <div className="md:col-span-6">
        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Descrição Detalhada</label>
        <textarea name="DescDetal" value={formData.DescDetal || ''} onChange={handleInputChange} rows={1} className={inputOptional + " text-xs py-1 resize-none"} />
      </div>

      <div className="md:col-span-3">
        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Família</label>
        <select name="FamiliaMat" value={formData.FamiliaMat || ''} onChange={handleInputChange} className={selectClass + " text-xs py-1"}>
          <option value="">Selecione...</option>
          {familiaOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
        </select>
      </div>
      <div className="md:col-span-3">
        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Fornecedor</label>
        <select name="CodigoJuridicoMat" value={formData.CodigoJuridicoMat || ''} onChange={handleInputChange} className={selectClass + " text-xs py-1"}>
          <option value="">Selecione...</option>
          {fornecedorOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
        </select>
      </div>
    </div>

    {/* Dimensões e Valores */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-1">
      <div>
        <h3 className="text-[11px] font-semibold text-gray-700 mb-1">Dimensões</h3>
        <div className="grid grid-cols-5 gap-2">
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Peso</label>
            <input type="text" name="Peso" value={formData.Peso || ''} onChange={handleInputChange} className={inputOptional + " text-xs py-1 px-1"} />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Unid</label>
            <select name="Unidade" value={formData.Unidade || ''} onChange={handleInputChange} className={selectClass + " text-xs py-1 px-1"}>
              <option value="">-</option>
              {unidadeOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.id}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Alt</label>
            <input type="text" name="Altura" value={formData.Altura || ''} onChange={handleInputChange} className={inputOptional + " text-xs py-1 px-1"} />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Larg</label>
            <input type="text" name="Largura" value={formData.Largura || ''} onChange={handleInputChange} className={inputOptional + " text-xs py-1 px-1"} />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Prof</label>
            <input type="text" name="Profundidade" value={formData.Profundidade || ''} onChange={handleInputChange} className={inputOptional + " text-xs py-1 px-1"} />
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-[11px] font-semibold text-gray-700 mb-1">Valores Fiscais</h3>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Unitário</label>
            <input type="text" name="Valor" value={formData.Valor || ''} onChange={handleInputChange} className={inputOptional + " text-xs py-1 px-1"} />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">% ICMS</label>
            <input type="text" name="PercICMS" value={formData.PercICMS || ''} onChange={handleInputChange} className={inputOptional + " text-xs py-1 px-1"} />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">% IPI</label>
            <input type="text" name="PercIPI" value={formData.PercIPI || ''} onChange={handleInputChange} className={inputOptional + " text-xs py-1 px-1"} />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">$ ICMS</label>
            <input type="text" name="vICMS" value={formData.vICMS || ''} onChange={handleInputChange} className={inputOptional + " text-xs py-1 px-1"} />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">$ IPI</label>
            <input type="text" name="vIPI" value={formData.vIPI || ''} onChange={handleInputChange} className={inputOptional + " text-xs py-1 px-1"} />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Líquido</label>
            <input type="text" name="vLiquido" value={formData.vLiquido || ''} onChange={handleInputChange} className={inputOptional + " text-xs py-1 px-1"} />
          </div>
        </div>
      </div>
    </div>`;

// Replace lines 543 (0-indexed 543) to 678 (inclusive)
// Wait, view_file showed:
// 544:    {/* Identificação */}
// ...
// 679:    </div>
// 680:    {/* Required fields note */}
// Line 544 is index 543. Line 679 is index 678.
const startIdx = 543;
const endIdx = 678;

lines.splice(startIdx, endIdx - startIdx + 1, newContent);

// Also replace `<div className="p-5 space-y-5 overflow-y-auto flex-1 custom-scrollbar">`
// with `<div className="p-3 space-y-2 overflow-y-auto flex-1 custom-scrollbar">`
const finalContent = lines.join('\n').replace(
    '<div className="p-5 space-y-5 overflow-y-auto flex-1 custom-scrollbar">',
    '<div className="p-3 space-y-2 overflow-y-auto flex-1 custom-scrollbar">'
);

fs.writeFileSync(filePath, finalContent, 'utf8');
console.log('Layout atualizado com sucesso!');
