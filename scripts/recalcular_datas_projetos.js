const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const pool = mysql.createPool({
        host: process.env.CENTRAL_DB_HOST || 'lynxlocal.mysql.uhserver.com',
        user: process.env.CENTRAL_DB_USER || 'lynxlocal_root',
        password: process.env.CENTRAL_DB_PASS || 'lynx@2022',
        database: process.env.CENTRAL_DB_NAME || 'lynxlocal',
        waitForConnections: true,
        connectionLimit: 10
    });

    console.log('Iniciando recálculo das datas dos projetos...');

    try {
        const [projetos] = await pool.execute("SELECT IdProjeto FROM projetos WHERE D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = ''");
        
        let atualizados = 0;

        for (const proj of projetos) {
            const id = proj.IdProjeto;

            const queryMinMax = `
                SELECT 
                    DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(PlanejadoInicioMedicao, ''), '%d/%m/%Y')), '%d/%m/%Y') AS PlanejadoInicioMedicaoMin,
                    DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(PlanejadoFinalMedicao, ''), '%d/%m/%Y')), '%d/%m/%Y') AS PlanejadoFinalMedicaoMax,
                    DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(RealizadoInicioMedicao, ''), '%d/%m/%Y')), '%d/%m/%Y') AS RealizadoInicioMedicaoMin,
                    DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(RealizadoFinalMedicao, ''), '%d/%m/%Y')), '%d/%m/%Y') AS RealizadoFinalMedicaoMax,

                    DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(PlanejadoInicioIsometrico, ''), '%d/%m/%Y')), '%d/%m/%Y') AS PlanejadoInicioIsometricoMin,
                    DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(PlanejadoFinalIsometrico, ''), '%d/%m/%Y')), '%d/%m/%Y') AS PlanejadoFinalIsometricoMax,
                    DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(RealizadoInicioIsometrico, ''), '%d/%m/%Y')), '%d/%m/%Y') AS RealizadoInicioIsometricoMin,
                    DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(RealizadoFinalIsometrico, ''), '%d/%m/%Y')), '%d/%m/%Y') AS RealizadoFinalIsometricoMax,

                    DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(PlanejadoInicioEngenharia, ''), '%d/%m/%Y')), '%d/%m/%Y') AS PlanejadoInicioEngenhariaMin,
                    DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(PlanejadoFinalEngenharia, ''), '%d/%m/%Y')), '%d/%m/%Y') AS PlanejadoFinalEngenhariaMax,
                    DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(RealizadoInicioEngenharia, ''), '%d/%m/%Y')), '%d/%m/%Y') AS RealizadoInicioEngenhariaMin,
                    DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(RealizadoFinalEngenharia, ''), '%d/%m/%Y')), '%d/%m/%Y') AS RealizadoFinalEngenhariaMax,

                    DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(PlanejadoInicioAprovacao, ''), '%d/%m/%Y')), '%d/%m/%Y') AS PlanejadoInicioAprovacaoMin,
                    DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(PlanejadoFinalAprovacao, ''), '%d/%m/%Y')), '%d/%m/%Y') AS PlanejadoFinalAprovacaoMax,
                    DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(RealizadoInicioAprovacao, ''), '%d/%m/%Y')), '%d/%m/%Y') AS RealizadoInicioAprovacaoMin,
                    DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(RealizadoFinalAprovacao, ''), '%d/%m/%Y')), '%d/%m/%Y') AS RealizadoFinalAprovacaoMax,

                    DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(PlanejadoInicioAcabamento, ''), '%d/%m/%Y')), '%d/%m/%Y') AS PlanejadoInicioAcabamentoMin,
                    DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(PlanejadoFinalAcabamento, ''), '%d/%m/%Y')), '%d/%m/%Y') AS PlanejadoFinalAcabamentoMax,
                    DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(RealizadoInicioAcabamento, ''), '%d/%m/%Y')), '%d/%m/%Y') AS RealizadoInicioAcabamentoMin,
                    DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(RealizadoFinalAcabamento, ''), '%d/%m/%Y')), '%d/%m/%Y') AS RealizadoFinalAcabamentoMax,

                    DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(PlanejadoInicioExpedicao, ''), '%d/%m/%Y')), '%d/%m/%Y') AS PlanejadoInicioExpedicaoMin,
                    DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(PlanejadoFinalExpedicao, ''), '%d/%m/%Y')), '%d/%m/%Y') AS PlanejadoFinalExpedicaoMax,
                    DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(RealizadoInicioExpedicao, ''), '%d/%m/%Y')), '%d/%m/%Y') AS RealizadoInicioExpedicaoMin,
                    DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(RealizadoFinalExpedicao, ''), '%d/%m/%Y')), '%d/%m/%Y') AS RealizadoFinalExpedicaoMax
                FROM tags 
                WHERE IdProjeto = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
            `;
            
            const [aggRows] = await pool.execute(queryMinMax, [id]);
            if (aggRows && aggRows.length > 0) {
                const agg = aggRows[0];
                const updatesProj = [];
                const paramsProj = [];
                
                const mapFields = {
                    PlanejadoInicioMedicao: agg.PlanejadoInicioMedicaoMin,
                    PlanejadoFinalMedicao: agg.PlanejadoFinalMedicaoMax,
                    RealizadoInicioMedicao: agg.RealizadoInicioMedicaoMin,
                    RealizadoFinalMedicao: agg.RealizadoFinalMedicaoMax,

                    PlanejadoInicioIsometrico: agg.PlanejadoInicioIsometricoMin,
                    PlanejadoFinalIsometrico: agg.PlanejadoFinalIsometricoMax,
                    RealizadoInicioIsometrico: agg.RealizadoInicioIsometricoMin,
                    RealizadoFinalIsometrico: agg.RealizadoFinalIsometricoMax,

                    PlanejadoInicioEngenharia: agg.PlanejadoInicioEngenhariaMin,
                    PlanejadoFinalEngenharia: agg.PlanejadoFinalEngenhariaMax,
                    RealizadoInicioEngenharia: agg.RealizadoInicioEngenhariaMin,
                    RealizadoFinalEngenharia: agg.RealizadoFinalEngenhariaMax,

                    PlanejadoInicioAprovacao: agg.PlanejadoInicioAprovacaoMin,
                    PlanejadoFinalAprovacao: agg.PlanejadoFinalAprovacaoMax,
                    RealizadoInicioAprovacao: agg.RealizadoInicioAprovacaoMin,
                    RealizadoFinalAprovacao: agg.RealizadoFinalAprovacaoMax,

                    PlanejadoInicioAcabamento: agg.PlanejadoInicioAcabamentoMin,
                    PlanejadoFinalAcabamento: agg.PlanejadoFinalAcabamentoMax,
                    RealizadoInicioAcabamento: agg.RealizadoInicioAcabamentoMin,
                    RealizadoFinalAcabamento: agg.RealizadoFinalAcabamentoMax,

                    PlanejadoInicioExpedicao: agg.PlanejadoInicioExpedicaoMin,
                    PlanejadoFinalExpedicao: agg.PlanejadoFinalExpedicaoMax,
                    RealizadoInicioExpedicao: agg.RealizadoInicioExpedicaoMin,
                    RealizadoFinalExpedicao: agg.RealizadoFinalExpedicaoMax
                };

                for (const [f, v] of Object.entries(mapFields)) {
                    // Ignora campos que o MySQL retornou como null (se não houver datas)
                    updatesProj.push(`${f} = ?`);
                    paramsProj.push(v || '');
                }

                if (updatesProj.length > 0) {
                    paramsProj.push(id);
                    try {
                        await pool.execute(`UPDATE projetos SET ${updatesProj.join(', ')} WHERE IdProjeto = ?`, paramsProj);
                        atualizados++;
                    } catch (e) {
                        // Colunas podem não existir ainda em ambientes mais antigos
                        if (e.code === 'ER_BAD_FIELD_ERROR') {
                            console.error(`Tabela projetos não possui colunas de data. Abortando.`);
                            process.exit(1);
                        } else {
                            console.error(`Erro ao atualizar IdProjeto ${id}:`, e.message);
                        }
                    }
                }
            }
        }

        console.log(`✅ Concluído! ${atualizados} projetos foram recalculados e atualizados com o limite das tags.`);

    } catch (e) {
        console.error('Erro na execução:', e);
    } finally {
        pool.end();
    }
}

run();
