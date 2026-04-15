/**
 * Script de criação de índices de performance — SincoWeb
 * Executa no banco remoto lynxlocal via pool existente
 * Uso: node create_indexes.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mysql = require('mysql2/promise');

const dbConfig = {
    host:     process.env.CENTRAL_DB_HOST || 'lynxlocal.mysql.uhserver.com',
    user:     process.env.CENTRAL_DB_USER || 'lynxlocal_root',
    password: process.env.CENTRAL_DB_PASS || 'lynx@2022',
    database: process.env.CENTRAL_DB_NAME || 'lynxlocal',
    port:     3306,
    charset:  'utf8mb4',
    connectTimeout: 30000,
};

// Índices a criar: [tabela, nome_index, coluna(s)]
const INDEXES = [
    // ── ordemservicoitem ──
    ['ordemservicoitem', 'idx_osi_idordemservico',      '(IdOrdemServico)'],
    ['ordemservicoitem', 'idx_osi_delete',              '(D_E_L_E_T_E)'],
    ['ordemservicoitem', 'idx_osi_delete_finalizado',   '(D_E_L_E_T_E, OrdemServicoItemFinalizado)'],
    ['ordemservicoitem', 'idx_osi_idprojeto',           '(IdProjeto)'],
    ['ordemservicoitem', 'idx_osi_idtag',               '(IdTag)'],
    ['ordemservicoitem', 'idx_osi_reposicao',           '(Reposicao)'],
    ['ordemservicoitem', 'idx_osi_codmat',              '(CodMatFabricante(50))'],
    // ── ordemservicoitemcontrole ──
    ['ordemservicoitemcontrole', 'idx_osic_item_proc',   '(IdOrdemServicoItem, Processo)'],
    ['ordemservicoitemcontrole', 'idx_osic_idservico',   '(IdOrdemServico)'],
    ['ordemservicoitemcontrole', 'idx_osic_delete',      '(D_E_L_E_T_E)'],
    // ── ordemservico ──
    ['ordemservico', 'idx_os_idprojeto',               '(IdProjeto)'],
    ['ordemservico', 'idx_os_idtag',                   '(IdTag)'],
    ['ordemservico', 'idx_os_delete_liberado',         '(D_E_L_E_T_E, Liberado_Engenharia)'],
    ['ordemservico', 'idx_os_finalizado',              '(OrdemServicoFinalizado)'],
    ['ordemservico', 'idx_os_projeto',                 '(Projeto(50))'],
    // ── ordemservicoitempendencia ──
    ['ordemservicoitempendencia', 'idx_osip_idprojeto',   '(IdProjeto)'],
    ['ordemservicoitempendencia', 'idx_osip_estatus',     '(Estatus)'],
    ['ordemservicoitempendencia', 'idx_osip_delete_est',  '(D_E_L_E_T_E, Estatus)'],
    ['ordemservicoitempendencia', 'idx_osip_tiporeg',     '(TipoRegistro)'],
    ['ordemservicoitempendencia', 'idx_osip_origem',      '(OrigemPendencia)'],
    ['ordemservicoitempendencia', 'idx_osip_codmat',      '(CodMatFabricante(50))'],
    // ── tags ──
    ['tags', 'idx_tags_idprojeto',        '(IdProjeto)'],
    ['tags', 'idx_tags_del_finalizado',   '(D_E_L_E_T_E, Finalizado)'],
    // ── romaneioitem ──
    ['romaneioitem', 'idx_romani_idrom',   '(IdRomaneio)'],
    ['romaneioitem', 'idx_romani_delete',  '(D_E_L_E_T_E)'],
    // ── material ──
    ['material', 'idx_mat_codmat',   '(CodMatFabricante(50))'],
];

async function indexExists(conn, table, indexName) {
    const [rows] = await conn.execute(
        `SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS 
         WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME   = ? 
           AND INDEX_NAME   = ?`,
        [table, indexName]
    );
    return rows[0].cnt > 0;
}

async function tableExists(conn, table) {
    const [rows] = await conn.execute(
        `SELECT COUNT(*) AS cnt FROM information_schema.TABLES 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [table]
    );
    return rows[0].cnt > 0;
}

async function main() {
    console.log('===========================================');
    console.log('  SincoWeb — Script de Índices de Performance');
    console.log('===========================================');
    console.log(`  Host: ${dbConfig.host}`);
    console.log(`  DB:   ${dbConfig.database}`);
    console.log('');

    let conn;
    try {
        conn = await mysql.createConnection(dbConfig);
        console.log('✅ Conexão estabelecida!\n');

        // Contar linhas das tabelas críticas
        const tablesToCount = [
            'ordemservicoitem', 'ordemservico', 'ordemservicoitemcontrole',
            'ordemservicoitempendencia', 'tags', 'romaneioitem'
        ];
        console.log('📊 Contagem de linhas das tabelas críticas:');
        for (const t of tablesToCount) {
            try {
                const [r] = await conn.execute(`SELECT COUNT(*) AS n FROM \`${t}\``);
                console.log(`   ${t.padEnd(35)} ${r[0].n.toLocaleString('pt-BR')} linhas`);
            } catch(e) {
                console.log(`   ${t.padEnd(35)} (não encontrada)`);
            }
        }
        console.log('');

        let created = 0, skipped = 0, errors = 0;

        console.log('🔧 Criando índices...\n');
        for (const [table, idxName, cols] of INDEXES) {
            // Verificar se a tabela existe
            if (!(await tableExists(conn, table))) {
                console.log(`   ⚠️  SKIP — tabela "${table}" não existe`);
                skipped++;
                continue;
            }

            // Verificar se o índice já existe
            if (await indexExists(conn, table, idxName)) {
                console.log(`   ✓  SKIP — índice "${idxName}" já existe em ${table}`);
                skipped++;
                continue;
            }

            // Criar índice
            try {
                const sql = `CREATE INDEX \`${idxName}\` ON \`${table}\` ${cols}`;
                console.log(`   ⏳ Criando ${idxName} em ${table}...`);
                const start = Date.now();
                await conn.execute(sql);
                const ms = Date.now() - start;
                console.log(`   ✅ OK (${ms}ms) — ${idxName}`);
                created++;
            } catch (e) {
                console.error(`   ❌ ERRO em ${idxName}: ${e.message}`);
                errors++;
            }
        }

        console.log('\n===========================================');
        console.log(`  Resultado: ${created} criados | ${skipped} já existentes | ${errors} erros`);
        console.log('===========================================\n');

        if (errors === 0) {
            console.log('🎉 Todos os índices foram configurados com sucesso!');
        } else {
            console.log('⚠️  Alguns índices falharam — verifique os erros acima.');
        }

    } catch (err) {
        console.error('\n❌ Falha na conexão:', err.message);
        process.exit(1);
    } finally {
        if (conn) await conn.end();
    }
}

main();
