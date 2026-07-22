/**
 * Implementa:
 * 1. Função getFirstRecurso(item) -> retorna o nome do primeiro recurso ativo na cascata
 * 2. Adiciona ícone de apontamento parcial nas ações da view de lista (abre o mesmo modal)
 */

const fs = require('fs');
let file = fs.readFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx', 'utf8');

// ── 1. Adiciona helper getFirstRecurso após a função checkPredecessorStatus ──────
const helperFn = `
  // Retorna o primeiro setor ativo na cascata de produção do item
  const getFirstRecurso = (item: any): string => {
    const cascade = ['corte', 'cortealaser', 'pulsionadeira', 'puncionadeira', 'usinagem', 'dobra', 'caldeiraria', 'serralheria', 'solda', 'galvanizar', 'pintura', 'acabamento', 'montagem'];
    for (const s of cascade) {
      let base = s;
      if (s === 'cortealaser') base = 'CorteaLaser';
      else if (s === 'corte') base = 'Corte';
      else if (s === 'dobra') base = 'Dobra';
      else if (s === 'solda') base = 'Solda';
      else if (s === 'pintura') base = 'Pintura';
      else if (s === 'montagem') base = 'Montagem';
      const txtField = s === 'montagem' ? 'TxtMontagem' : \`txt\${base}\`;
      const txtFieldAlt = \`txt\${s.toLowerCase()}\`;
      const v1 = String(item[txtField] || '').trim();
      const v2 = String(item[txtFieldAlt] || '').trim();
      if (v1 === '1' || v2 === '1' || v1.toUpperCase() === 'S' || v2.toUpperCase() === 'S') {
        return s.charAt(0).toUpperCase() + s.slice(1);
      }
    }
    return '-';
  };
`;

// Inserir após o fechamento de checkPredecessorStatus
const insertAfter = `  return { allowed: true };
  };`;
if (file.includes(insertAfter)) {
  file = file.replace(insertAfter, insertAfter + '\n' + helperFn);
  console.log('✅ Função getFirstRecurso inserida');
} else {
  console.log('❌ Não encontrou ponto de inserção de getFirstRecurso');
}

// ── 2. Adicionar import do ícone Zap (apontamento parcial) ──────────────────────
if (!file.includes('Zap,') && !file.includes(', Zap')) {
  file = file.replace(
    'Maximize2, Minimize2',
    'Maximize2, Minimize2, Zap'
  );
  console.log('✅ Ícone Zap importado');
} else {
  console.log('ℹ️  Zap já importado');
}

// ── 3. Adiciona badge "SETOR" na header da lista ────────────────────────────────
const oldHeader = `<span className="w-16 shrink-0 text-center">Apontar</span>
 <span className="w-10 shrink-0 text-center">Qt</span>
 <span className="w-14 shrink-0 text-center">Prod.</span>`;

const newHeader = `<span className="w-16 shrink-0 text-center">Apontar</span>
 <span className="w-14 shrink-0 text-center">Setor</span>
 <span className="w-10 shrink-0 text-center">Qt</span>
 <span className="w-14 shrink-0 text-center">Prod.</span>`;

if (file.includes(oldHeader)) {
  file = file.replace(oldHeader, newHeader);
  console.log('✅ Header SETOR adicionado');
} else {
  console.log('❌ Header não encontrado exatamente');
}

// ── 4. Adiciona badge SETOR após o botão Apontar na linha de item ───────────────
// Procura o bloco do Apontar Button e adiciona badge de setor depois do </div> de fechamento
const oldAfterBtn = `  </div>

 {/* Quantidade Total */}
 <div className="w-10 shrink-0 text-center">
 <span className="font-black text-[#32423D]">{qtdeTotal}</span>
 </div>`;

const newAfterBtn = `  </div>

 {/* Primeiro Setor (cascata) */}
 <div className="w-14 shrink-0 flex items-center justify-center">
 <span className="text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200 px-1 py-0.5 rounded uppercase tracking-wide">
 {getFirstRecurso(item)}
 </span>
 </div>

 {/* Quantidade Total */}
 <div className="w-10 shrink-0 text-center">
 <span className="font-black text-[#32423D]">{qtdeTotal}</span>
 </div>`;

if (file.includes(oldAfterBtn)) {
  file = file.replace(oldAfterBtn, newAfterBtn);
  console.log('✅ Badge SETOR adicionado após botão Apontar');
} else {
  console.log('❌ Não encontrou ponto de inserção do badge SETOR');
}

// ── 5. Adiciona ícone de apontamento parcial nas AÇÕES da lista ─────────────────
// Procura o botão de Reposição nas ações e adiciona ANTES dele um botão de apontamento parcial
const oldReposicaoBtn = `<button
 onClick={(e) => {
 e.stopPropagation();
 setSelectedItem(item);
 setQtdeReposicao('');
 setMotivoReposicao('');
 setReposicaoModalOpen(true);
 }}
 className="flex items-center justify-center w-6 h-6 bg-amber-50 text-amber-600 rounded hover:bg-amber-100 transition-colors border border-amber-200"
 title="Reposição"
 >
 <RefreshCw size={12} />
 </button>`;

const newReposicaoBtn = `<button
 onClick={(e) => {
 e.stopPropagation();
 const temSaldo = (Number(item.QtdeTotal) || 0) > 0;
 if (!temSaldo) return;
 // Abre o mesmo modal mas com qtde vazia para entrada parcial
 setSelectedItem(item);
 setModalSetor(setorAtivo);
 setModalOpen(true);
 setLoadingDetails(true);
 setQtdeApontar('');
 setConfirmingMapa(false);
 fetch(\`\${API_BASE}/apontamento/item/\${item.IdOrdemServicoItem}/\${setorAtivo}\`)
 .then(r => r.json())
 .then(json => { if (json.success) { setItemDetails(json.data); } })
 .catch(console.error)
 .finally(() => setLoadingDetails(false));
 }}
 disabled={(Number(item.QtdeTotal) || 0) <= 0}
 className={\`flex items-center justify-center w-6 h-6 rounded transition-colors border \${(Number(item.QtdeTotal) || 0) <= 0 ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200'}\`}
 title={(Number(item.QtdeTotal) || 0) <= 0 ? 'Sem saldo a executar' : 'Apontamento Parcial'}
 >
 <Zap size={12} />
 </button>
<button
 onClick={(e) => {
 e.stopPropagation();
 setSelectedItem(item);
 setQtdeReposicao('');
 setMotivoReposicao('');
 setReposicaoModalOpen(true);
 }}
 className="flex items-center justify-center w-6 h-6 bg-amber-50 text-amber-600 rounded hover:bg-amber-100 transition-colors border border-amber-200"
 title="Reposição"
 >
 <RefreshCw size={12} />
 </button>`;

if (file.includes(oldReposicaoBtn)) {
  file = file.replace(oldReposicaoBtn, newReposicaoBtn);
  console.log('✅ Ícone de apontamento parcial adicionado nas ações');
} else {
  console.log('❌ Não encontrou o bloco do botão Reposição para inserir o parcial');
}

fs.writeFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx', file);
console.log('\n✅ Arquivo salvo.');
