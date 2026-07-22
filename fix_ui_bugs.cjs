const fs = require('fs');
const file = 'frontend/src/pages/MontaPecaManufaturada.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove Top Banner
content = content.replace(
  /\s*{\/\* HEADER \*\/}.*?<\/div>/s,
  ''
);

// 2. Fix saveProcs function
content = content.replace(
  /const saveProcs = async \(newStaging\) => \{\s*if\(!piece\) return;\s*setSaving\(true\);\s*try\{\s*const body=\{ processos:newStaging\.map\(s=>\(\{IdProcesso:s\.IdProcesso,SequenciaExecucao:s\.seq,TempoEstimadoMin:s\.estMin,TempoPadraoMin:s\.padMin,Observacao:s\.obs\}\)\),\s*codmatFabricante:piece\.CodMatFabricante, idMatriz, usuarioCriacao:uCriacao, replace:true \};\s*const r=await fetch\(`\$\{API\}\/material-processo`,\{method:'POST',headers:\{\.\.\.authHdr\(\), 'Content-Type':'application\/json'\},body:JSON\.stringify\(body\)\}\);\s*const j=await r\.json\(\);\s*if\(j\.success\) \{\s*setStaging\(newStaging\);\s*fetchProcs\(piece\.CodMatFabricante\);\s*\}\s*else showAlert\('Erro: '\+j\.message, "error"\);\s*\}finally\{ setSaving\(false\); \}\s*\};/g,
  `const saveProcs = async (newStaging: Proc[]) => {
    if(!selMat1) return;
    setSavingProc(true);
    try{
      const body={ processos:newStaging.map(s=>({IdProcesso:s.IdProcesso,SequenciaExecucao:s.seq,TempoEstimadoMin:s.estMin,TempoPadraoMin:s.padMin,Observacao:s.obs})),
        codmatFabricante:selMat1.CodMatFabricante, idMatriz, usuarioCriacao:uCriacao, replace:true };
      const r=await fetch(\`\${API}/material-processo\`,{method:'POST',headers:{...authHdr(), 'Content-Type':'application/json'},body:JSON.stringify(body)});
      const j=await r.json();
      if(j.success) {
        setStaging(newStaging);
        fetchProcs(selMat1.CodMatFabricante);
      }
      else showAlert('Erro: '+j.message, "error");
    }finally{ setSavingProc(false); }
  };`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed banner and saveProcs');
