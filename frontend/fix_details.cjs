const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/MontaPecaManufaturada.tsx', 'utf8');

// 1. Add showDet1 state
if (!c.includes('const [showDet1, setShowDet1] = useState(false);')) {
  c = c.replace(/const \[loadingSub, setLoadingSub\] = useState<\{\[key:number\]:boolean\}>\(\{\}\);/, 
    `const [loadingSub, setLoadingSub] = useState<{[key:number]:boolean}>({});\n  const [showDet1, setShowDet1] = useState(false);`);
}

// 2. Update selectMat1
c = c.replace(/const selectMat1 = async \(m: MatRow\) => \{\n\s*setSelMat1\(null\);/,
  `const selectMat1 = async (m: MatRow) => {
    if (selMat1 && selMat1.IdMaterial === m.IdMaterial) return;
    setShowDet1(false);
    setSelMat1(null);`);

// 3. Update details render block
const regexBlock = /<div className="text-\[9\.5px\] font-bold text-\[\#32423D\] uppercase tracking-wider mb-2 flex items-center justify-between border-b border-gray-200 pb-1">\s*<span className="flex items-center gap-1\.5"><Package size=\{12\} className="text-emerald-600"\/> \{selMat1\.CodMatFabricante\}<\/span>\s*<\/div>\s*<div className="grid grid-cols-4 gap-x-2 gap-y-2\.5">\s*(<div>.*?<\/div>\s*){7}<\/div>/ms;

const replacementBlock = `<div className="text-[9.5px] font-bold text-[#32423D] uppercase tracking-wider flex items-center justify-between pb-1 border-b border-gray-200">
                   <span className="flex items-center gap-1.5"><Package size={12} className="text-emerald-600"/> {selMat1.CodMatFabricante}</span>
                   <button onClick={() => setShowDet1(!showDet1)} className="text-[#32423D] hover:text-[#25322e] underline text-[8.5px] cursor-pointer">
                     {showDet1 ? 'OCULTAR DETALHES' : 'VER DETALHES'}
                   </button>
                 </div>
                 {showDet1 && (
                   <div className="grid grid-cols-4 gap-x-2 gap-y-2.5 pt-2 mt-1">
                     <div><div className="text-[8px] text-gray-400 uppercase font-bold tracking-wide">Espessura</div><div className="text-[10px] font-bold text-gray-800">{fmt(selMat1.Espessura)}</div></div>
                     <div><div className="text-[8px] text-gray-400 uppercase font-bold tracking-wide">Área Pint.</div><div className="text-[10px] font-bold text-gray-800">{fmt(selMat1.AreaPintura)}</div></div>
                     <div><div className="text-[8px] text-gray-400 uppercase font-bold tracking-wide">Peso</div><div className="text-[10px] font-bold text-gray-800">{fmt(selMat1.Peso)}</div></div>
                     <div><div className="text-[8px] text-gray-400 uppercase font-bold tracking-wide">Unidade</div><div className="text-[10px] font-bold text-gray-800">{fmt(selMat1.Unidade)}</div></div>
                     <div><div className="text-[8px] text-gray-400 uppercase font-bold tracking-wide">Altura</div><div className="text-[10px] font-bold text-gray-800">{fmt(selMat1.Altura)}</div></div>
                     <div><div className="text-[8px] text-gray-400 uppercase font-bold tracking-wide">Largura</div><div className="text-[10px] font-bold text-gray-800">{fmt(selMat1.Largura)}</div></div>
                     <div><div className="text-[8px] text-gray-400 uppercase font-bold tracking-wide">Qtde</div><div className="text-[10px] font-bold text-gray-800">{fmt(selMat1.Qtde)}</div></div>
                   </div>
                 )}`;

if (regexBlock.test(c)) {
  c = c.replace(regexBlock, replacementBlock);
  fs.writeFileSync('frontend/src/pages/MontaPecaManufaturada.tsx', c);
  console.log("Sucesso ao atualizar detalhes");
} else {
  console.log("Bloco de detalhes não encontrado!");
}
