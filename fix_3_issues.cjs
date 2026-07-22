const fs = require('fs');

// --- 1. Aumentar tamanho do campo CÓDIGO em MontaPecaManufaturada.tsx ---
let montaPath = 'frontend/src/pages/MontaPecaManufaturada.tsx';
let monta = fs.readFileSync(montaPath, 'utf8');

// The TH cell
monta = monta.replace(
  /<th className=\{colsCls\}>Código<\/th>/g,
  '<th className={`${colsCls} w-[130px]`}>Código</th>'
);
// The TD cell
monta = monta.replace(
  /<td className=\{\`\$\{cellCls\} font-bold text-\\[#32423D\\] max-w-\\[80px\\] flex items-center gap-1\`\} title=\{m\.CodMatFabricante\}>/g,
  '<td className={`${cellCls} font-bold text-[#32423D] max-w-[130px] flex items-center gap-1`} title={m.CodMatFabricante}>'
);
fs.writeFileSync(montaPath, monta, 'utf8');


// --- 2. CriarOrdemServico.tsx: "Ordem de Serviço X criada" ---
let criarPath = 'frontend/src/pages/CriarOrdemServico.tsx';
let criar = fs.readFileSync(criarPath, 'utf8');

criar = criar.replace(
  /setMessage\(\{ type: 'success', text: 'Ordem de Serviço criada e itens incluídos com sucesso!' \}\);/g,
  "setMessage({ type: 'success', text: `Ordem de Serviço ${newOsId} criada e itens incluídos com sucesso!` });"
);
fs.writeFileSync(criarPath, criar, 'utf8');


// --- 3. OrdemServico.tsx: Totais de Peso e Área de Pintura ---
let osPath = 'frontend/src/pages/OrdemServico.tsx';
let osData = fs.readFileSync(osPath, 'utf8');

const oldTotais = `                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Peso Total:</span>
                                                <span className="text-gray-600 font-semibold">
                                                {(() => {
                                                    const pesoCalculado = (ordensItens[os.IdOS] || []).reduce((acc, item) => acc + (parseFloat(String(item.Peso || 0)) || 0), 0);
                                                    const pesoFinal = pesoCalculado > 0 ? pesoCalculado : parseFloat(String(os.PesoTotal || 0));
                                                    return pesoFinal > 0 ? \`\${pesoFinal.toFixed(2)} kg\` : '-';
                                                })()}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Área Pintura:</span>
                                                <span className="text-gray-600">{os.AreaPinturaTotal ? \`\${os.AreaPinturaTotal} m²\` : '-'}</span>
                                            </div>`;

const newTotais = `                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Peso Total:</span>
                                                <span className="text-gray-600 font-semibold">
                                                {(() => {
                                                    const itensDaOS = ordensItens[os.IdOrdemServico] || [];
                                                    const pesoCalculado = itensDaOS.reduce((acc, item) => acc + (parseFloat(String(item.Peso || 0)) * (parseFloat(String(item.QtdeTotal || 1))) || 0), 0);
                                                    const pesoFinal = pesoCalculado > 0 ? pesoCalculado : parseFloat(String(os.PesoTotal || 0));
                                                    return pesoFinal > 0 ? \`\${pesoFinal.toFixed(2)} kg\` : '-';
                                                })()}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Área Pintura:</span>
                                                <span className="text-gray-600 font-semibold">
                                                {(() => {
                                                    const itensDaOS = ordensItens[os.IdOrdemServico] || [];
                                                    const areaCalculada = itensDaOS.reduce((acc, item) => acc + (parseFloat(String(item.AreaPintura || 0)) * (parseFloat(String(item.QtdeTotal || 1))) || 0), 0);
                                                    const areaFinal = areaCalculada > 0 ? areaCalculada : parseFloat(String(os.AreaPinturaTotal || 0));
                                                    return areaFinal > 0 ? \`\${areaFinal.toFixed(2)} m²\` : '-';
                                                })()}
                                                </span>
                                            </div>`;

osData = osData.replace(oldTotais, newTotais);
fs.writeFileSync(osPath, osData, 'utf8');

console.log("All 3 fixes applied.");
