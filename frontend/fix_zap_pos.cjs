const fs = require('fs');
let file = fs.readFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx', 'utf8');

// Localizar o ponto exato pela sequência única: 
// "flex gap-0.5 border-l border-gray-200 pl-1" + ">" + CRLF + espaços + "<button"
// Pegar o índice do ">" depois de "pl-1"
const baseAnchor = 'flex gap-0.5 border-l border-gray-200 pl-1';
const startIdx = file.indexOf(baseAnchor);
console.log('baseAnchor at:', startIdx);

if (startIdx >= 0) {
  // Depois do "pl-1"", o próximo char é ">" que fecha o div
  const divEndIdx = file.indexOf('>', startIdx) + 1; // position after >
  console.log('divEnd char:', JSON.stringify(file[divEndIdx]), 'pos:', divEndIdx);
  
  // After the > comes \r\n and then spaces and then <button
  // We insert after the > + \r\n (i.e., at position divEndIdx + 2 if CRLF)
  const crlf = file.substring(divEndIdx, divEndIdx + 2);
  console.log('After div:', JSON.stringify(crlf));
  
  // Get indentation of next line
  let lineStart = divEndIdx + (crlf === '\r\n' ? 2 : 1);
  let indent = '';
  while (lineStart < file.length && (file[lineStart] === ' ')) {
    indent += ' ';
    lineStart++;
  }
  console.log('Indent length:', indent.length);
  
  const eol = crlf === '\r\n' ? '\r\n' : '\n';
  const ind = indent; // same indentation as existing button
  
  const zapInsert = `${ind}{/* Apontamento Parcial */}${eol}${ind}<button${eol}${ind}onClick={(e) => {${eol}${ind}e.stopPropagation();${eol}${ind}if ((Number(item.QtdeTotal) || 0) <= 0) return;${eol}${ind}setSelectedItem(item);${eol}${ind}setModalSetor(setorAtivo);${eol}${ind}setModalOpen(true);${eol}${ind}setLoadingDetails(true);${eol}${ind}setQtdeApontar('');${eol}${ind}setConfirmingMapa(false);${eol}${ind}fetch(\`\${API_BASE}/apontamento/item/\${item.IdOrdemServicoItem}/\${setorAtivo}\`)${eol}${ind}.then(r => r.json())${eol}${ind}.then(json => { if (json.success) setItemDetails(json.data); })${eol}${ind}.catch(console.error)${eol}${ind}.finally(() => setLoadingDetails(false));${eol}${ind}}}${eol}${ind}disabled={(Number(item.QtdeTotal) || 0) <= 0}${eol}${ind}className={\`flex items-center justify-center w-6 h-6 rounded transition-colors border \${${eol}${ind}(Number(item.QtdeTotal) || 0) <= 0${eol}${ind}? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'${eol}${ind}: 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200'${eol}${ind}}\`}${eol}${ind}title={(Number(item.QtdeTotal) || 0) <= 0 ? 'Sem saldo a executar' : 'Apontamento Parcial'}${eol}${ind}>${eol}${ind}<Zap size={12} />${eol}${ind}</button>${eol}`;
  
  const insertPos = divEndIdx + crlf.length;
  file = file.substring(0, insertPos) + zapInsert + file.substring(insertPos);
  fs.writeFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx', file);
  console.log('✅ Zap button inserted at position', insertPos);
}
