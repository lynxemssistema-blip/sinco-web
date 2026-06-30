const fs = require('fs');
const path = require('path');

const dir = 'frontend/src/pages';

function processDirectory(directory) {
    const files = fs.readdirSync(directory);
    for (const file of files) {
        const fullPath = path.join(directory, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let newContent = content;

            // 1. Compact Grids
            newContent = newContent.replace(/px-4 py-4/g, 'px-2 py-1')
                 .replace(/px-4 py-3/g, 'px-2 py-1')
                 .replace(/px-4 py-2/g, 'px-2 py-1')
                 .replace(/px-3 py-2/g, 'px-2 py-1')
                 .replace(/px-3 py-1\.5/g, 'px-2 py-0.5')
                 .replace(/text-sm/g, 'text-xs')
                 .replace(/size=\{16\}/g, 'size={14}')
                 .replace(/size=\{18\}/g, 'size={15}');

            // 2. Uppercase Descriptions
            newContent = newContent.replace(/const \{ name, value \} = e\.target;/g, "const name = e.target.name;\n    const value = name.toLowerCase().includes('desc') ? e.target.value.toUpperCase() : e.target.value;");

            // 3. Projeto.tsx specific
            if (file === 'Projeto.tsx') {
                newContent = newContent.replace(/'text-gray-400 hover:text-\[#32423D\] hover:bg-\[#E0E800\]\/10'/g, "'text-[#32423D] hover:bg-[#E0E800]/10'")
                .replace(/'text-gray-400 hover:text-green-600 hover:bg-green-50'/g, "'text-green-600 hover:bg-green-50'")
                .replace(/'text-gray-400 hover:text-orange-600 hover:bg-orange-50'/g, "'text-orange-600 hover:bg-orange-50'")
                .replace(/"p-1\.5 rounded-md text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"/g, '"p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"')
                .replace(/"p-1\.5 rounded-md text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 transition-colors"/g, '"p-1.5 rounded-md text-yellow-600 hover:bg-yellow-50 transition-colors"')
                .replace(/"p-1\.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"/g, '"p-1.5 rounded-md text-red-600 hover:bg-red-50 transition-colors"')
                .replace(/'text-gray-400 hover:text-\[#32423D\] hover:bg-\[#E0E800\]\/20'/g, "'text-[#32423D] hover:bg-[#E0E800]/20'")
                .replace(/'text-gray-400 hover:text-red-500 hover:bg-red-50'/g, "'text-red-500 hover:bg-red-50'")
                .replace(/"p-1\.5 rounded-lg text-gray-400 hover:text-\[#32423D\] hover:bg-\[#E0E800\]\/20 transition-colors"/g, '"p-1.5 rounded-lg text-[#32423D] hover:bg-[#E0E800]/20 transition-colors"')
                .replace(/"p-1\.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"/g, '"p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"');
                
                newContent = newContent.replace(/let value = target\.value;/g, "let value = name.toLowerCase().includes('desc') ? target.value.toUpperCase() : target.value;");
            }

            // 4. TipoProduto.tsx specific
            if (file === 'TipoProduto.tsx') {
                newContent = newContent.replace(/<textarea[\s\S]*?name="Descricao"[\s\S]*?onChange=\{handleInputChange\}[\s\S]*?\/>/, match => {
                    return match.replace('onChange={handleInputChange}', 'onChange={(e) => setFormData(prev => ({ ...prev, Descricao: e.target.value.toUpperCase() }))}').replace('className={inputOptional}', 'className={${inputOptional} uppercase}');
                });
            }

            // 5. ListaReposicao.tsx specific
            if (file === 'ListaReposicao.tsx') {
                newContent = newContent.replace(/<td className="px-2 py-1 text-slate-600 max-w-\[100px\] truncate" title=\{item\.DescEmpresa\}>\{item\.DescEmpresa\}<\/td>/g, '<td className="px-2 py-1 text-slate-600 font-mono">{item.IdOrdemServico}</td>\n<td className="px-2 py-1 text-slate-600 font-mono">{item.IdOrdemServicoItem}</td>\n<td className="px-2 py-1 text-slate-600 max-w-[100px] truncate" title={item.DescEmpresa}>{item.DescEmpresa}</td>');
            }

            if (content !== newContent) {
                fs.writeFileSync(fullPath, newContent, 'utf8');
                console.log('Fixed', fullPath);
            }
        }
    }
}

processDirectory(dir);
