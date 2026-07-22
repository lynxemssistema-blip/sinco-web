/**
 * Refatoração do cálculo de percentual:
 * 
 * NOVO: percentual = {Setor}TotalExecutado / SUM(QtdeTotal WHERE txt{Setor}='1')
 * 
 * Mudanças:
 * 1. Backend tag query: adicionar SumQtde{Setor} para cada setor
 * 2. Frontend TAG_SECTORS: usar novo campo como denominador  
 * 3. Frontend: remover uso de TotalExecutar no percentual
 */

const fs = require('fs');

// ─── 1. BACKEND: adicionar SumQtde{Setor} na query de tags ───────────────────

const serverPath = 'src/server.js';
let serverContent = fs.readFileSync(serverPath, 'utf8');

const BASE_TAG_WHERE = `os.IdTag = tags.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '')`;

const setores = [
    { name: 'Corte',         txt: "osi.txtCorte = '1'",         execField: 'CorteTotalExecutado',         afterField: 'CorteTotalExecutar',    sumAlias: 'SumQtdeCorte'         },
    { name: 'Dobra',         txt: "osi.txtDobra = '1'",         execField: 'DobraTotalExecutado',         afterField: 'DobraTotalExecutar',    sumAlias: 'SumQtdeDobra'         },
    { name: 'Solda',         txt: "osi.txtSolda = '1'",         execField: 'SoldaTotalExecutado',         afterField: 'SoldaTotalExecutar',    sumAlias: 'SumQtdeSolda'         },
    { name: 'Pintura',       txt: "osi.txtPintura = '1'",       execField: 'PinturaTotalExecutado',       afterField: 'PinturaTotalExecutar',  sumAlias: 'SumQtdePintura'       },
    { name: 'Montagem',      txt: "osi.TxtMontagem = '1'",      execField: 'MontagemTotalExecutado',      afterField: 'MontagemTotalExecutar', sumAlias: 'SumQtdeMontagem'      },
    { name: 'CorteaLaser',   txt: "osi.txtCorteaLaser = '1'",   execField: 'CorteaLaserTotalExecutado',   afterField: 'CorteaLaserTotalExecutar', sumAlias: 'SumQtdeCorteaLaser' },
    { name: 'Pulsionadeira', txt: "osi.txtPULSIONADEIRA = '1'", execField: 'PULSIONADEIRATotalExecutado', afterField: 'PULSIONADEIRATotalExecutar', sumAlias: 'SumQtdePulsionadeira' },
    { name: 'Galvanizar',    txt: "osi.txtGALVANIZAR = '1'",   execField: 'GALVANIZARTotalExecutado',    afterField: 'GALVANIZARTotalExecutar',   sumAlias: 'SumQtdeGalvanizar'    },
];

for (const s of setores) {
    // Inserir SumQtde{Setor} logo após a linha de {Setor}TotalExecutar na query de tags
    const afterMarker = `AS ${s.afterField},`;
    const newSubquery = `\n                (SELECT COALESCE(SUM(CAST(NULLIF(osi.QtdeTotal,'') AS DECIMAL(10,2))), 0) FROM ordemservicoitem osi INNER JOIN ordemservico os ON os.IdOrdemServico = osi.IdOrdemServico WHERE ${BASE_TAG_WHERE} AND ${s.txt}) AS ${s.sumAlias},`;
    
    if (serverContent.includes(afterMarker)) {
        // Inserir apenas UMA vez (verificar se já não existe)
        if (!serverContent.includes(s.sumAlias)) {
            serverContent = serverContent.replace(afterMarker, afterMarker + newSubquery);
            console.log(`[OK] ${s.sumAlias} adicionado à query de tags`);
        } else {
            console.log(`[SKIP] ${s.sumAlias} já existe`);
        }
    } else {
        console.warn(`[AVISO] Marcador '${afterMarker}' não encontrado para ${s.name}`);
    }
}

fs.writeFileSync(serverPath, serverContent, 'utf8');
console.log('\n[Backend] Query de tags atualizada com SumQtde{Setor}');

// ─── 2. FRONTEND: atualizar TAG_SECTORS para usar SumQtde como denominador ───

const frontendPath = 'frontend/src/pages/VisaoGeralProducao.tsx';
let frontContent = fs.readFileSync(frontendPath, 'utf8');

// Mapeamento: setor -> novo campo sumQtde do backend
const tagSectorMap = {
    'Corte':         'SumQtdeCorte',
    'Dobra':         'SumQtdeDobra',
    'Solda':         'SumQtdeSolda',
    'Pintura':       'SumQtdePintura',
    'Montagem':      'SumQtdeMontagem',
    'CorteaLaser':   'SumQtdeCorteaLaser',
    'Pulsionadeira': 'SumQtdePulsionadeira',
    'Galvanizar':    'SumQtdeGalvanizar',
};

// Substituir TAG_SECTORS: adicionar campo 'q' (sumQtde) a cada entrada
for (const [sName, sumField] of Object.entries(tagSectorMap)) {
    // Padrão: { k: 'Corte', ex: 'CorteTotalExecutado', t: 'CorteTotalExecutar', p: 'CortePercentual', c: 'bg-[#32423D]',
    // Adicionar q: 'SumQtdeCorte' após o campo p
    const oldPattern = new RegExp(`(\\{ k: '${sName}', ex: '[^']+', t: '[^']+', p: '[^']+')`);
    const match = frontContent.match(oldPattern);
    if (match && !frontContent.includes(`q: '${sumField}'`)) {
        frontContent = frontContent.replace(oldPattern, `$1, q: '${sumField}'`);
        console.log(`[OK] TAG_SECTORS.${sName} recebeu q: '${sumField}'`);
    } else if (frontContent.includes(`q: '${sumField}'`)) {
        console.log(`[SKIP] TAG_SECTORS.${sName} já tem q`);
    } else {
        console.warn(`[AVISO] Padrão TAG_SECTORS.${sName} não encontrado`);
    }
}

// ─── 3. FRONTEND: atualizar cálculo pct nas linhas das tags ──────────────────
// Linhas que calculam pct usando t.QtdeTotalPecas ou saldo como denominador
// Nova lógica: pct = raw > 0 ? raw : safePct(e, qtde) onde qtde = t[s.q]

const oldPctLine = `  const e = toNum(t[s.ex as keyof Tag] as any), saldo = toNum(t[s.t as keyof Tag] as any), raw = toNum(t[s.p as keyof Tag] as any), pct = raw > 0 ? raw : safePct(e as any, saldo as any);`;
const newPctLine = `  const e = toNum(t[s.ex as keyof Tag] as any), qtde = toNum((t as any)[s.q || s.t] as any), raw = toNum(t[s.p as keyof Tag] as any), pct = raw > 0 ? raw : (qtde > 0 ? Math.min(100, Math.round((e / qtde) * 100)) : 0);`;

const countBefore = (frontContent.match(new RegExp(oldPctLine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
frontContent = frontContent.split(oldPctLine).join(newPctLine);
const countAfter = (frontContent.match(new RegExp(newPctLine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
console.log(`\n[Frontend] Linhas de cálculo pct substituídas: ${countBefore} → ${countAfter}`);

// ─── 4. FRONTEND: corrigir display (e/saldo) → (e/qtde) ─────────────────────
const oldDisplay = `({e}/{saldo})`;
const newDisplay = `({e}/{qtde})`;
frontContent = frontContent.split(oldDisplay).join(newDisplay);
console.log(`[Frontend] Display atualizado: e/saldo → e/qtde`);

// Corrigir condição de 100% no display  
const oldCond100 = `pct >= 100 && saldo > 0`;
const newCond100 = `pct >= 100 && qtde > 0`;
frontContent = frontContent.split(oldCond100).join(newCond100);

fs.writeFileSync(frontendPath, frontContent, 'utf8');
console.log('\n✅ Refatoração concluída!');
console.log('Verificar sintaxe: node -c src/server.js');
