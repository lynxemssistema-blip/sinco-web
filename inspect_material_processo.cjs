const mysql = require('mysql2/promise');
require('dotenv').config();

async function inspect() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME
  });

  // MTA-0086 = IdMaterial 67 (confirmado)
  // Buscar material_processo SEM filtro de Ativo para ver todos os valores possíveis
  const [mp] = await conn.execute(
    'SELECT * FROM material_processo WHERE IdMaterial = 67'
  );
  console.log('=== material_processo IdMaterial=67 (todos) ===');
  console.log(JSON.stringify(mp, null, 2));

  // Ver quais valores de Ativo existem no banco
  const [ativos] = await conn.execute(
    'SELECT DISTINCT Ativo FROM material_processo LIMIT 20'
  );
  console.log('\nValores distintos de Ativo:', ativos);

  // Agora buscar os processos referenciados pelos IdProcesso 1, 17, 18
  const ids = mp.map(r => r.IdProcesso).filter(Boolean);
  console.log('\nIdProcesso(s):', ids);

  if (ids.length) {
    const ph = ids.map(() => '?').join(',');
    const [pf] = await conn.execute(
      `SELECT IdProcessoFabricacao, processofabricacao, Fabrica, D_E_L_E_T_E 
       FROM processofabricacao 
       WHERE IdProcessoFabricacao IN (${ph})`,
      ids
    );
    console.log('\n=== processofabricacao para IdProcesso(s) ===');
    console.log(JSON.stringify(pf, null, 2));

    // Mapeamento recurso → campo txt
    const RECURSO_MAP = {
      'CORTE':        'txtCorte',
      'DOBRA':        'txtDobra',
      'SOLDA':        'txtSolda',
      'PINTURA':      'txtPintura',
      'MONTAGEM':     'txtMontagem',
      'CORTE A LASER':'txtCorteaLaser',
      'PULSIONADEIRA':'txtPULSIONADEIRA',
      'GALVANIZAR':   'txtGALVANIZAR',
    };

    console.log('\n=== Campos txt que devem receber valor "1" para MTA-0086 ===');
    pf.forEach(p => {
      const nome = (p.processofabricacao || '').toUpperCase().trim();
      const campo = RECURSO_MAP[nome];
      console.log(`  Processo "${p.processofabricacao}" → campo: ${campo || '⚠️ SEM MAPEAMENTO'}`);
    });
  }

  // Confirmar item da OS 32
  const [itens] = await conn.execute(
    `SELECT IdOrdemServicoItem, IdMaterial, 
            txtCorte, txtDobra, txtSolda, txtPintura, txtMontagem,
            txtCorteaLaser, txtPULSIONADEIRA, txtGALVANIZAR
     FROM ordemservicoitem WHERE IdOrdemServico = 32 LIMIT 5`
  );
  console.log('\n=== Itens OS 32 (campos txt) ===');
  console.log(JSON.stringify(itens, null, 2));

  await conn.end();
}

inspect().catch(e => console.error(e.message));
