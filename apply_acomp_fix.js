const fs = require('fs');

let content = fs.readFileSync('frontend/src/pages/AcompanhamentoEtapas.tsx', 'utf8');

// 1. Add import for useAppConfig
if (!content.includes('useAppConfig')) {
    content = content.replace(
        "import { \n    Search",
        "import { useAppConfig } from '../contexts/AppConfigContext';\nimport { \n    Search"
    );
}

// 2. Add hooks and helpers inside component
if (!content.includes('const { processosVisiveis')) {
    content = content.replace(
        "export default function AcompanhamentoEtapas() {\n    const [data, setData] = useState<EtapasRow[]>([]);",
        `export default function AcompanhamentoEtapas() {
    const { processosVisiveis, nomesProcessosEngenharia } = useAppConfig();
    const isVisible = (s: string) => processosVisiveis.includes(s.toLowerCase());
    const customName = (s: string, def: string) => nomesProcessosEngenharia[s.toLowerCase()] || def;
    const visibleEngSectors = ['medicao', 'isometrico', 'engenharia', 'aprovacao', 'acabamento', 'expedicao'].filter(isVisible);

    const [data, setData] = useState<EtapasRow[]>([]);`
    );
}

// 3. Update thead headers
content = content.replace(
    /<th colSpan={2} className="p-2 text-center border-r-2 border-gray-400 bg-blue-50">Medição<\/th>\s*<th colSpan={2} className="p-2 text-center border-r-2 border-gray-400 bg-indigo-50">Isométrico<\/th>\s*<th colSpan={2} className="p-2 text-center border-r-2 border-gray-400 bg-blue-50">Engenharia<\/th>\s*<th colSpan={2} className="p-2 text-center border-r-2 border-gray-400 bg-indigo-50">Aprovação<\/th>\s*<th colSpan={2} className="p-2 text-center border-r-2 border-gray-400 bg-blue-50">Acabamento<\/th>\s*<th colSpan={2} className="p-2 text-center bg-indigo-50">Expedição<\/th>/g,
    `{isVisible('medicao') && <th colSpan={2} className="p-2 text-center border-r-2 border-gray-400 bg-blue-50">{customName('medicao', 'Medição')}</th>}
                                        {isVisible('isometrico') && <th colSpan={2} className="p-2 text-center border-r-2 border-gray-400 bg-indigo-50">{customName('isometrico', 'Isométrico')}</th>}
                                        {isVisible('engenharia') && <th colSpan={2} className="p-2 text-center border-r-2 border-gray-400 bg-blue-50">{customName('engenharia', 'Engenharia')}</th>}
                                        {isVisible('aprovacao') && <th colSpan={2} className="p-2 text-center border-r-2 border-gray-400 bg-indigo-50">{customName('aprovacao', 'Aprovação')}</th>}
                                        {isVisible('acabamento') && <th colSpan={2} className="p-2 text-center border-r-2 border-gray-400 bg-blue-50">{customName('acabamento', 'Acabamento')}</th>}
                                        {isVisible('expedicao') && <th colSpan={2} className="p-2 text-center bg-indigo-50 border-r-2 border-gray-400">{customName('expedicao', 'Expedição')}</th>}`
);

// 4. Update thead sub-headers (Falta/Ok)
content = content.replace(
    /\{Array\.from\(\{length: 6\}\)\.map\(\(_, i\) => \(\s*<React\.Fragment key=\{i\}>\s*<th className="p-1\.5 text-center border-r border-gray-200 bg-red-50 text-red-700 font-bold min-w-\[70px\]">Falta<\/th>\s*<th className="p-1\.5 text-center border-r-2 border-gray-400 bg-green-50 text-green-700 font-bold min-w-\[70px\]">Ok<\/th>\s*<\/React\.Fragment>\s*\)\)\}/g,
    `{visibleEngSectors.map((s, i) => (
                                            <React.Fragment key={s}>
                                                <th className="p-1.5 text-center border-r border-gray-200 bg-red-50 text-red-700 font-bold min-w-[70px]">Falta</th>
                                                <th className="p-1.5 text-center border-r-2 border-gray-400 bg-green-50 text-green-700 font-bold min-w-[70px]">Ok</th>
                                            </React.Fragment>
                                        ))}`
);

// 5. Update tbody main row (Falta/Ok data cells)
// We need to wrap each pair of <td> with {isVisible(...) && (<React.Fragment> ... </React.Fragment>)}
content = content.replace(/\{\/\* MEDIÇÃO \*\/\}\s*<td className="p-2 border-r border-gray-200 text-center font-semibold text-red-600 bg-red-50\/30">\{row\.FaltaMedicao\}<\/td>\s*<td className="p-2 border-r-2 border-gray-400 text-center font-semibold text-green-600 bg-green-50\/30">\{row\.OkMedicao\}<\/td>/g, 
`{/* MEDIÇÃO */}
                                                {isVisible('medicao') && <React.Fragment>
                                                    <td className="p-2 border-r border-gray-200 text-center font-semibold text-red-600 bg-red-50/30">{row.FaltaMedicao}</td>
                                                    <td className="p-2 border-r-2 border-gray-400 text-center font-semibold text-green-600 bg-green-50/30">{row.OkMedicao}</td>
                                                </React.Fragment>}`);

content = content.replace(/\{\/\* ISOMETRICO \*\/\}\s*<td className="p-2 border-r border-gray-200 text-center font-semibold text-red-600 bg-red-50\/30">\{row\.FaltaIsometrico\}<\/td>\s*<td className="p-2 border-r-2 border-gray-400 text-center font-semibold text-green-600 bg-green-50\/30">\{row\.OkIsometrico\}<\/td>/g, 
`{/* ISOMETRICO */}
                                                {isVisible('isometrico') && <React.Fragment>
                                                    <td className="p-2 border-r border-gray-200 text-center font-semibold text-red-600 bg-red-50/30">{row.FaltaIsometrico}</td>
                                                    <td className="p-2 border-r-2 border-gray-400 text-center font-semibold text-green-600 bg-green-50/30">{row.OkIsometrico}</td>
                                                </React.Fragment>}`);

content = content.replace(/\{\/\* ENGENHARIA \*\/\}\s*<td className="p-2 border-r border-gray-200 text-center font-semibold text-red-600 bg-red-50\/30">\{row\.FaltaEngenharia\}<\/td>\s*<td className="p-2 border-r-2 border-gray-400 text-center font-semibold text-green-600 bg-green-50\/30">\{row\.OkEngenharia\}<\/td>/g, 
`{/* ENGENHARIA */}
                                                {isVisible('engenharia') && <React.Fragment>
                                                    <td className="p-2 border-r border-gray-200 text-center font-semibold text-red-600 bg-red-50/30">{row.FaltaEngenharia}</td>
                                                    <td className="p-2 border-r-2 border-gray-400 text-center font-semibold text-green-600 bg-green-50/30">{row.OkEngenharia}</td>
                                                </React.Fragment>}`);

content = content.replace(/\{\/\* APROVACAO \*\/\}\s*<td className="p-2 border-r border-gray-200 text-center font-semibold text-red-600 bg-red-50\/30">\{row\.FaltaAprovacao\}<\/td>\s*<td className="p-2 border-r-2 border-gray-400 text-center font-semibold text-green-600 bg-green-50\/30">\{row\.OkAprovacao\}<\/td>/g, 
`{/* APROVACAO */}
                                                {isVisible('aprovacao') && <React.Fragment>
                                                    <td className="p-2 border-r border-gray-200 text-center font-semibold text-red-600 bg-red-50/30">{row.FaltaAprovacao}</td>
                                                    <td className="p-2 border-r-2 border-gray-400 text-center font-semibold text-green-600 bg-green-50/30">{row.OkAprovacao}</td>
                                                </React.Fragment>}`);

content = content.replace(/\{\/\* ACABAMENTO \*\/\}\s*<td className="p-2 border-r border-gray-200 text-center font-semibold text-red-600 bg-red-50\/30">\{row\.FaltaAcabamento\}<\/td>\s*<td className="p-2 border-r-2 border-gray-400 text-center font-semibold text-green-600 bg-green-50\/30">\{row\.OkAcabamento\}<\/td>/g, 
`{/* ACABAMENTO */}
                                                {isVisible('acabamento') && <React.Fragment>
                                                    <td className="p-2 border-r border-gray-200 text-center font-semibold text-red-600 bg-red-50/30">{row.FaltaAcabamento}</td>
                                                    <td className="p-2 border-r-2 border-gray-400 text-center font-semibold text-green-600 bg-green-50/30">{row.OkAcabamento}</td>
                                                </React.Fragment>}`);

content = content.replace(/\{\/\* EXPEDICAO \*\/\}\s*<td className="p-2 border-r border-gray-200 text-center font-semibold text-red-600 bg-red-50\/30">\{row\.FaltaExpedicao\}<\/td>\s*<td className="p-2 text-center font-semibold text-green-600 bg-green-50\/30 border-r-2 border-gray-400">\{row\.OkExpedicao\}<\/td>/g, 
`{/* EXPEDICAO */}
                                                {isVisible('expedicao') && <React.Fragment>
                                                    <td className="p-2 border-r border-gray-200 text-center font-semibold text-red-600 bg-red-50/30">{row.FaltaExpedicao}</td>
                                                    <td className="p-2 text-center font-semibold text-green-600 bg-green-50/30 border-r-2 border-gray-400">{row.OkExpedicao}</td>
                                                </React.Fragment>}`);

// 6. Update Dates row (Plan/Real cells inside accordeon)
const wrapDates = (sectorName, comment) => {
    const rx = new RegExp(`\\{\\/\\* ${comment} \\*\\/\\}\\s*<td className="p-1\\.5 border-r border-indigo-200 text-center bg-blue-50" style=\\{\\{minWidth:'\\d+px'\\}\\}\\>[\\s\\S]*?<\\/td>\\s*<td className="p-1\\.5 border-r-2 border-gray-400 text-center bg-emerald-50" style=\\{\\{minWidth:'\\d+px'\\}\\}\\>[\\s\\S]*?<\\/td>`, 'g');
    
    // As JS String replace requires a replacer function if we want to preserve the exact match block and wrap it
    content = content.replace(rx, (match) => {
        return `{isVisible('${sectorName}') && (<React.Fragment>\n${match}\n</React.Fragment>)}`;
    });
};

wrapDates('medicao', 'MEDIÇÃO');
wrapDates('isometrico', 'ISOMÉTRICO');
wrapDates('engenharia', 'ENGENHARIA');
wrapDates('aprovacao', 'APROVAÇÃO');
wrapDates('acabamento', 'ACABAMENTO');
wrapDates('expedicao', 'EXPEDIÇÃO');

// 7. RenderFormRow fix - inject customName and visibility check inside the function
content = content.replace(
    /const renderFormRow = \(labelStr: string, fieldPrefix: string\) => \{/g,
    `const renderFormRow = (labelStr: string, fieldPrefix: string) => {
        if (!isVisible(fieldPrefix)) return null;
        const finalLabel = customName(fieldPrefix, labelStr);`
);

content = content.replace(
    /<span className="font-bold text-\[11px\] uppercase text-gray-700 tracking-wide">\{labelStr\}<\/span>/g,
    `<span className="font-bold text-[11px] uppercase text-gray-700 tracking-wide">{finalLabel}</span>`
);

fs.writeFileSync('frontend/src/pages/AcompanhamentoEtapas.tsx', content, 'utf8');
console.log('Script aplicado com sucesso.');
