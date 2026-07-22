const fs = require('fs');
const path = 'frontend/src/pages/VisaoGeralProducao.tsx';
const lines = fs.readFileSync(path, 'utf8').split('\n');

// ─── 1. Inserir novos states após linha 152 (0-indexed 151) ──────────────────
const newStates = [
    '  // Estado para propagação de datas para OS (fluxo dois passos)',
    "  const [tagDatasStep, setTagDatasStep] = useState<'edit' | 'saved'>('edit');",
    "  const [propagacaoMsg, setPropagacaoMsg] = useState<string | null>(null);"
];

// Verificar que linha 152 é o useState de tagSectorDates
console.log('Linha 152:', lines[151]);
lines.splice(152, 0, ...newStates);
console.log('[OK] States inseridos');

// Após inserção, as linhas deslocaram +3
// Linha original 414 -> agora linha 417

// ─── 2. Reescrever salvarDatasTagSetores ──────────────────────────────────────
// Encontrar por conteúdo
let saveStart = -1, saveEnd = -1;
for (let i = 415; i < 460; i++) {
    if (lines[i] && lines[i].includes('const salvarDatasTagSetores = async ()')) {
        saveStart = i;
    }
    if (saveStart > -1 && lines[i] && lines[i].trim() === '};' && i > saveStart + 5) {
        saveEnd = i;
        break;
    }
}
console.log('salvarDatasTagSetores: start=', saveStart, 'end=', saveEnd);

const newSaveFn = [
'  const salvarDatasTagSetores = async () => {',
"  if (!selTag) return; setIsSaving(true); setMsg(null); setPropagacaoMsg(null);",
'  try {',
'  const promises = [];',
'  for (const [field, isoVal] of Object.entries(tagSectorDates)) {',
"  const dataBr = isoToBr(isoVal) || (isoVal === '' ? '' : isoVal);",
'  promises.push(',
'  fetch(`${API_BASE}/visao-geral/tag/${selTag.IdTag}/setor-data`, {',
"  method: 'PUT', headers: { 'Content-Type': 'application/json' },",
'  body: JSON.stringify({ field, value: dataBr })',
'  }).then(r => r.json())',
'  );',
'  }',
'  if (promises.length === 0) {',
"  setMsg({ ok: true, t: 'Nenhuma alteração feita.' });",
'  setTimeout(() => setActionModal(null), 1000);',
'  return;',
'  }',
'  await Promise.all(promises);',
'  if (selProj) fetchTags(selProj.IdProjeto);',
'  const hasOS = selTag && parseInt(String(selTag.QtdeOS)) > 0;',
'  if (hasOS) {',
"  setTagDatasStep('saved');",
"  setMsg({ ok: true, t: 'Datas da TAG salvas! Deseja propagar para as OS?' });",
'  } else {',
"  setMsg({ ok: true, t: 'Datas atualizadas!' });",
'  setTimeout(() => setActionModal(null), 1500);',
'  }',
"  } catch { setMsg({ ok: false, t: 'Erro de conexão.' }); } finally { setIsSaving(false); }",
'  };',
'',
'  const propagarDatasParaOS = async () => {',
'  if (!selTag) return;',
'  setIsSaving(true); setPropagacaoMsg(null);',
'  try {',
'  const setores = TAG_SECTORS',
"  .filter(s => selTag[`flag${s.k}` as keyof Tag] === 1)",
'  .map(s => ({',
'  sectorName: s.k,',
'  piField: s.fields.pi,',
'  pfField: s.fields.pf,',
"  piValue: isoToBr(tagSectorDates[s.fields.pi] || ''),",
"  pfValue: isoToBr(tagSectorDates[s.fields.pf] || '')",
'  }))',
'  .filter(s => s.piValue || s.pfValue);',
'',
'  if (!setores.length) {',
"  setPropagacaoMsg('Nenhuma data preenchida para propagar.');",
'  setIsSaving(false);',
'  return;',
'  }',
'',
"  const r = await (await fetch(`${API_BASE}/visao-geral/tag/${selTag.IdTag}/propagar-datas-os`, {",
"  method: 'POST', headers: { 'Content-Type': 'application/json' },",
'  body: JSON.stringify({ setores })',
'  })).json();',
'',
'  if (r.success) {',
"  setPropagacaoMsg(r.message || 'Datas propagadas com sucesso!');",
"  setTimeout(() => { setActionModal(null); setTagDatasStep('edit'); setPropagacaoMsg(null); }, 2000);",
"  } else { setPropagacaoMsg('Erro: ' + r.message); }",
"  } catch { setPropagacaoMsg('Erro de conexão ao propagar.'); } finally { setIsSaving(false); }",
'  };'
];

if (saveStart > -1 && saveEnd > -1) {
    lines.splice(saveStart, saveEnd - saveStart + 1, ...newSaveFn);
    console.log('[OK] salvarDatasTagSetores reescrito, propagarDatasParaOS adicionado');
} else {
    console.error('[ERRO] Não encontrou salvarDatasTagSetores');
    process.exit(1);
}

fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log('✅ Frontend states e funções atualizados');
