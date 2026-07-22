/**
 * Patch: Fix sector percentage calculation in /api/acompanhamento/projetos
 * 
 * Problem: TotalCorte = SUM(CorteTotalExecutar) — saldo restante, não total do setor
 * Fix: Adicionar SumQtdeCorte = SUM(QtdeTotal WHERE txtCorte = '1') como denominador real
 *       E corrigir pctSetor para usar exec / sumQtde
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src', 'server.js');
let content = fs.readFileSync(filePath, 'utf8');

// ─── 1. SUBSTITUIR os TotalCorte/ExecCorte da query de projetos ───────────────
// O filtro atual para TotalCorte usa CorteTotalExecutar (ERRADO - é saldo restante)
// Deve usar SUM(QtdeTotal WHERE txtCorte = '1') para ter o universo correto

const BASE_WHERE_PROJ = `os.IdProjeto = p.IdProjeto AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '')`;
const DEL = `(os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '')`;

// Substituir cada TotalXxx (saldo) por SumQtdeXxx (soma de QtdeTotal do setor)
const setores = [
    { name: 'Corte',         txt: "osi.txtCorte = '1'",         totalField: 'TotalCorte',         execField: 'ExecCorte'         },
    { name: 'Dobra',         txt: "osi.txtDobra = '1'",         totalField: 'TotalDobra',         execField: 'ExecDobra'         },
    { name: 'Solda',         txt: "osi.txtSolda = '1'",         totalField: 'TotalSolda',         execField: 'ExecSolda'         },
    { name: 'Pintura',       txt: "osi.txtPintura = '1'",       totalField: 'TotalPintura',       execField: 'ExecPintura'       },
    { name: 'Montagem',      txt: "osi.TxtMontagem = '1'",      totalField: 'TotalMontagem',      execField: 'ExecMontagem'      },
    { name: 'CorteaLaser',   txt: "osi.txtCorteaLaser = '1'",   totalField: 'TotalCorteaLaser',   execField: 'ExecCorteaLaser'   },
    { name: 'Pulsionadeira', txt: "osi.txtPULSIONADEIRA = '1'", totalField: 'TotalPulsionadeira', execField: 'ExecPulsionadeira' },
    { name: 'Galvanizar',    txt: "osi.txtGALVANIZAR = '1'",   totalField: 'TotalGalvanizar',    execField: 'ExecGalvanizar'    },
];

// Campos executar correspondentes no banco
const executarFields = {
    'Corte':         'CorteTotalExecutar',
    'Dobra':         'DobraTotalExecutar',
    'Solda':         'SoldaTotalExecutar',
    'Pintura':       'PinturaTotalExecutar',
    'Montagem':      'MontagemTotalExecutar',
    'CorteaLaser':   'CorteaLaserTotalExecutar',
    'Pulsionadeira': 'PULSIONADEIRATotalExecutar',
    'Galvanizar':    'GALVANIZARTotalExecutar',
};

// Campos executado correspondentes no banco
const executadoFields = {
    'Corte':         'CorteTotalExecutado',
    'Dobra':         'DobraTotalExecutado',
    'Solda':         'SoldaTotalExecutado',
    'Pintura':       'PinturaTotalExecutado',
    'Montagem':      'MontagemTotalExecutado',
    'CorteaLaser':   'CorteaLaserTotalExecutado',
    'Pulsionadeira': 'PULSIONADEIRATotalExecutado',
    'Galvanizar':    'GALVANIZARTotalExecutado',
};

// ─── 2. Substituir TotalXxx na query (CorteTotalExecutar -> SUM(QtdeTotal WHERE txtCorte='1')) ───
for (const s of setores) {
    const execField   = executarFields[s.name];
    const execDoneField = executadoFields[s.name];
    
    // Padrão antigo: SUM(CorteTotalExecutar) WHERE filtro_geral_todos_setores
    const oldTotalPattern = new RegExp(
        `\\(SELECT COALESCE\\(SUM\\(CAST\\(NULLIF\\(osi\\.${execField},'\\) AS DECIMAL\\(10,2\\)\\)\\), 0\\) FROM ordemservicoitem osi INNER JOIN ordemservico os ON os\\.IdOrdemServico = osi\\.IdOrdemServico WHERE os\\.IdProjeto = p\\.IdProjeto AND \\(os\\.D_E_L_E_T_E IS NULL OR os\\.D_E_L_E_T_E = ''\\) AND \\(osi\\.txtCorte = '1' OR osi\\.txtDobra = '1' OR osi\\.txtSolda = '1' OR osi\\.txtPintura = '1' OR osi\\.TxtMontagem = '1' OR osi\\.txtGALVANIZAR = '1' OR osi\\.txtPULSIONADEIRA = '1'\\)\\) AS ${s.totalField}`,
        'g'
    );

    const newTotal = `(SELECT COALESCE(SUM(CAST(NULLIF(osi.QtdeTotal,'') AS DECIMAL(10,2))), 0) FROM ordemservicoitem osi INNER JOIN ordemservico os ON os.IdOrdemServico = osi.IdOrdemServico WHERE os.IdProjeto = p.IdProjeto AND ${DEL} AND ${s.txt}) AS ${s.totalField}`;

    const before = content;
    content = content.replace(oldTotalPattern, newTotal);
    
    if (content === before) {
        console.warn(`[AVISO] Padrão TotalXxx não encontrado para ${s.name} — tentando substituição simples`);
        
        // Substituição simples por string exata
        const simpleOld = `(SELECT COALESCE(SUM(CAST(NULLIF(osi.${execField},'') AS DECIMAL(10,2))), 0) FROM ordemservicoitem osi INNER JOIN ordemservico os ON os.IdOrdemServico = osi.IdOrdemServico WHERE os.IdProjeto = p.IdProjeto AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '') AND (osi.txtCorte = '1' OR osi.txtDobra = '1' OR osi.txtSolda = '1' OR osi.txtPintura = '1' OR osi.TxtMontagem = '1' OR osi.txtGALVANIZAR = '1' OR osi.txtPULSIONADEIRA = '1')) AS ${s.totalField}`;
        const simpleNew = `(SELECT COALESCE(SUM(CAST(NULLIF(osi.QtdeTotal,'') AS DECIMAL(10,2))), 0) FROM ordemservicoitem osi INNER JOIN ordemservico os ON os.IdOrdemServico = osi.IdOrdemServico WHERE os.IdProjeto = p.IdProjeto AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '') AND ${s.txt}) AS ${s.totalField}`;
        
        content = content.split(simpleOld).join(simpleNew);
        
        if (!content.includes(simpleNew)) {
            console.error(`[ERRO] Não foi possível substituir ${s.totalField}`);
        } else {
            console.log(`[OK] ${s.totalField} substituído (simples) → SUM(QtdeTotal WHERE ${s.txt})`);
        }
    } else {
        console.log(`[OK] ${s.totalField} substituído (regex) → SUM(QtdeTotal WHERE ${s.txt})`);
    }
    
    // Verificar ExecXxx — deve filtrar apenas pelo setor específico (não todos)
    const oldExecSimple = `(SELECT COALESCE(SUM(CAST(NULLIF(osi.${execDoneField},'') AS DECIMAL(10,2))), 0) FROM ordemservicoitem osi INNER JOIN ordemservico os ON os.IdOrdemServico = osi.IdOrdemServico WHERE os.IdProjeto = p.IdProjeto AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '') AND (osi.txtCorte = '1' OR osi.txtDobra = '1' OR osi.txtSolda = '1' OR osi.txtPintura = '1' OR osi.TxtMontagem = '1' OR osi.txtGALVANIZAR = '1' OR osi.txtPULSIONADEIRA = '1')) AS ${s.execField}`;
    const newExecSimple = `(SELECT COALESCE(SUM(CAST(NULLIF(osi.${execDoneField},'') AS DECIMAL(10,2))), 0) FROM ordemservicoitem osi INNER JOIN ordemservico os ON os.IdOrdemServico = osi.IdOrdemServico WHERE os.IdProjeto = p.IdProjeto AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '') AND ${s.txt}) AS ${s.execField}`;
    
    const before2 = content;
    content = content.split(oldExecSimple).join(newExecSimple);
    if (content !== before2) {
        console.log(`[OK] ${s.execField} filtro corrigido para apenas ${s.txt}`);
    }
}

// ─── 3. Corrigir pctSetor para usar exec/sumQtde ─────────────────────────────
const oldPctSetor = `        const pctSetor = (exec, saldo) => {
            const total = exec + saldo;
            return total > 0 ? Math.round((exec / total) * 100) : 0;
        };`;

const newPctSetor = `        // pctSetor: exec = TotalExecutado do setor; sumQtde = SUM(QtdeTotal WHERE txt{X}='1')
        // Denominador é o universo real de peças que passam pelo setor
        const pctSetor = (exec, sumQtde) => {
            return sumQtde > 0 ? Math.min(100, Math.round((exec / sumQtde) * 100)) : 0;
        };`;

const before3 = content;
content = content.replace(oldPctSetor, newPctSetor);
if (content !== before3) {
    console.log('[OK] pctSetor corrigido para usar exec/sumQtde');
} else {
    console.warn('[AVISO] pctSetor não foi alterado — verificar manualmente');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✅ Patch concluído. Verificar sintaxe com: node -c src/server.js');
