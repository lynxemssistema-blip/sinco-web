const fs = require('fs');
const path = require('path');

let pTags = path.join(__dirname, 'src', 'pages', 'VisaoGeralTagsGlobais.tsx');
let cTags = fs.readFileSync(pTags, 'utf8');

// Replace hasOverlappingDates with useCallback
cTags = cTags.replace(/const hasOverlappingDates = \(/g, 'const hasOverlappingDates = useCallback((');
cTags = cTags.replace(/return false;\r?\n  \};\r?\n\r?\n  const hasOverlappingRealDates/g, 'return false;\n  }, [fSetor]);\n\n  const hasOverlappingRealDates');

cTags = cTags.replace(/const hasOverlappingRealDates = \(/g, 'const hasOverlappingRealDates = useCallback((');
cTags = cTags.replace(/return false;\r?\n  \};\r?\n\r?\n    const filtered = useMemo/g, 'return false;\n  }, [fSetor]);\n\n    const filtered = useMemo');

// add useCallback to react imports
cTags = cTags.replace(/import React, \{ useState, useEffect, useMemo \} from 'react';/g, "import React, { useState, useEffect, useMemo, useCallback } from 'react';");

// add to dependency array
cTags = cTags.replace(/\]\);\r?\n\r?\n    const limparFiltros/g, ', hasOverlappingDates, hasOverlappingRealDates]);\n\n    const limparFiltros');

fs.writeFileSync(pTags, cTags);

console.log('Fixed Lote 7 files - pass 7');
