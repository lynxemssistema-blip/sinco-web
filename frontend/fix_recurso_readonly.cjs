const fs = require('fs');
const file = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/RecursoFabricacao.tsx';
let txt = fs.readFileSync(file, 'utf8');

const target = `                          {/* INLINE EDIT MODE */}
                          <td className="px-2 py-1">
                            <input 
                              type="text" 
                              name="processofabricacao" 
                              value={editFormData.processofabricacao || ''} 
                              onChange={handleInputInline} 
                              className="w-full px-1.5 py-1 rounded border border-gray-300 text-[10px] uppercase focus:border-[#32423D] outline-none" 
                            />
                          </td>`;

const replacement = `                          {/* INLINE EDIT MODE */}
                          <td className="px-2 py-1">
                            <input 
                              type="text" 
                              name="processofabricacao" 
                              value={editFormData.processofabricacao || ''} 
                              className="w-full px-1.5 py-1 rounded border border-transparent bg-transparent font-medium text-[#32423D] text-[11px] uppercase outline-none cursor-default" 
                              disabled
                            />
                          </td>`;

if (txt.includes(target)) {
  txt = txt.replace(target, replacement);
  fs.writeFileSync(file, txt);
  console.log('Fixed processofabricacao input (disabled)');
} else {
  console.log('Target block not found!');
}
