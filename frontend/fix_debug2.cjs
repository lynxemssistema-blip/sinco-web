const fs = require('fs');
let file = fs.readFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx', 'utf8');

// ── 1. Update Zap buttons (look for the actual current signature) ──────────────
const sig = file.includes('setParcialModalOpen(true);') ? 'already ok' : 'needs update';
console.log('Zap status:', sig);

// Show current zap content
const zapIdx = file.indexOf('Apontamento Parcial */}');
if (zapIdx >= 0) {
  console.log('Current zap context:', JSON.stringify(file.substring(zapIdx, zapIdx + 500)));
}

// ── 2. Insert modal by position ───────────────────────────────────────────────
const pendIdx = file.indexOf('{/* Modal de Gerar Pendência */}');
console.log('Pendencia modal at:', pendIdx);
