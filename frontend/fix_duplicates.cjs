const fs = require('fs');
let content = fs.readFileSync('src/pages/VisaoGeralProducao.tsx', 'utf-8');

const sectorsCorrect = `const SECTORS = [
 { k: 'Corte', ex: 'ExecCorte', t: 'TotalCorte', c: 'bg-[#32423D]' }, { k: 'Dobra', ex: 'ExecDobra', t: 'TotalDobra', c: 'bg-indigo-600' },
 { k: 'Solda', ex: 'ExecSolda', t: 'TotalSolda', c: 'bg-red-600' }, { k: 'Pintura', ex: 'ExecPintura', t: 'TotalPintura', c: 'bg-amber-500' },
 { k: 'Montagem', ex: 'ExecMontagem', t: 'TotalMontagem', c: 'bg-emerald-600' },
 { k: 'CorteaLaser', ex: 'ExecCorteaLaser', t: 'TotalCorteaLaser', c: 'bg-purple-600' },
 { k: 'Pulsionadeira', ex: 'ExecPULSIONADEIRA', t: 'TotalPULSIONADEIRA', c: 'bg-pink-600' },
 { k: 'Galvanizar', ex: 'ExecGALVANIZAR', t: 'TotalGALVANIZAR', c: 'bg-cyan-600' }
];`;

// Remove everything from "const SECTORS = [" up to "];\n\nconst TAG_SECTORS"
content = content.replace(/const SECTORS = \[\s*\{ k: 'Corte'[\s\S]*?\];\s*const TAG_SECTORS/m, sectorsCorrect + '\n\nconst TAG_SECTORS');

const tagSectorsCorrect = `const TAG_SECTORS = [
 { k: 'Corte', ex: 'CorteTotalExecutado', t: 'CorteTotalExecutar', p: 'CortePercentual', c: 'bg-[#32423D]', 
 fields: { pi: 'PlanejadoInicioCorte', pf: 'PlanejadoFinalCorte', ri: 'RealizadoInicioCorte', rf: 'RealizadoFinalCorte' } },
 { k: 'Dobra', ex: 'DobraTotalExecutado', t: 'DobraTotalExecutar', p: 'DobraPercentual', c: 'bg-indigo-500',
 fields: { pi: 'PlanejadoInicioDobra', pf: 'PlanejadoFinalDobra', ri: 'RealizadoInicioDobra', rf: 'RealizadoFinalDobra' } },
 { k: 'Solda', ex: 'SoldaTotalExecutado', t: 'SoldaTotalExecutar', p: 'SoldaPercentual', c: 'bg-red-500',
 fields: { pi: 'PlanejadoInicioSolda', pf: 'PlanejadoFinalSolda', ri: 'RealizadoInicioSolda', rf: 'RealizadoFinalSolda' } },
 { k: 'Pintura', ex: 'PinturaTotalExecutado', t: 'PinturaTotalExecutar', p: 'PinturaPercentual', c: 'bg-amber-500',
 fields: { pi: 'PlanejadoInicioPintura', pf: 'PlanejadoFinalPintura', ri: 'RealizadoInicioPintura', rf: 'RealizadoFinalPintura' } },
 { k: 'Montagem', ex: 'MontagemTotalExecutado', t: 'MontagemTotalExecutar', p: 'MontagemPercentual', c: 'bg-emerald-500',
 fields: { pi: 'PlanejadoInicioMontagem', pf: 'PlanejadoFinalMontagem', ri: 'RealizadoInicioMontagem', rf: 'RealizadoFinalMontagem' } },
 { k: 'CorteaLaser', ex: 'CorteaLaserTotalExecutado', t: 'CorteaLaserTotalExecutar', p: 'CorteaLaserPercentual', c: 'bg-purple-500',
 fields: { pi: 'PlanejadoInicioCorteaLaser', pf: 'PlanejadoFinalCorteaLaser', ri: 'RealizadoInicioCorteaLaser', rf: 'RealizadoFinalCorteaLaser' } },
 { k: 'Pulsionadeira', ex: 'PULSIONADEIRATotalExecutado', t: 'PULSIONADEIRATotalExecutar', p: 'PULSIONADEIRAPercentual', c: 'bg-pink-500',
 fields: { pi: 'PlanejadoInicioPULSIONADEIRA', pf: 'PlanejadoFinalPULSIONADEIRA', ri: 'RealizadoInicioPULSIONADEIRA', rf: 'RealizadoFinalPULSIONADEIRA' } },
 { k: 'Galvanizar', ex: 'GALVANIZARTotalExecutado', t: 'GALVANIZARTotalExecutar', p: 'GALVANIZARPercentual', c: 'bg-cyan-500',
 fields: { pi: 'PlanejadoInicioGALVANIZAR', pf: 'PlanejadoFinalGALVANIZAR', ri: 'RealizadoInicioGALVANIZAR', rf: 'RealizadoFinalGALVANIZAR' } }
];`;

// Remove everything from "const TAG_SECTORS = [" up to "];\n\nexport default"
content = content.replace(/const TAG_SECTORS = \[\s*\{ k: 'Corte'[\s\S]*?\];\s*export default/m, tagSectorsCorrect + '\n\nexport default');

// I also need to remove the broken import React that got injected:
content = content.replace(/import React, \{ useState, useEffect \} from 'react';\nimport \{ createPortal \} from 'react-dom';\n\nimport \{ Search.*?\nimport VisaoGeralTagsGlobais.*?\n\nconst API_BASE.*?\n\n\/\/.*?Interfaces.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n/gs, "");

fs.writeFileSync('src/pages/VisaoGeralProducao.tsx', content);
