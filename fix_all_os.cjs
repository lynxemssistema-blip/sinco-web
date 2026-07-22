require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixAllOS() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });
    
    try {
        const [oses] = await conn.execute(`SELECT IdOrdemServico FROM ordemservico WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')`);
        console.log(`Encontradas ${oses.length} Ordens de Servico para recalcular.`);
        
        let count = 0;
        for (let os of oses) {
            const IdOrdemServico = os.IdOrdemServico;
            
            await conn.execute(`
                UPDATE ordemservico os
                SET 
                    QtdeTotalItens = (SELECT COALESCE(SUM(oi.QtdeTotal), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                    PesoTotal = (SELECT COALESCE(SUM(oi.Peso), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                    AreaPinturaTotal = (SELECT COALESCE(SUM(oi.AreaPintura), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                    
                    -- Pecas Executadas: minimo entre setores ativos.
                    QtdePecasExecutadas = (
                        SELECT COALESCE(SUM(
                            CASE 
                                WHEN (IFNULL(oi.txtCorte,'')!='1' AND IFNULL(oi.txtDobra,'')!='1' AND IFNULL(oi.txtSoldagem,'')!='1' AND IFNULL(oi.txtPintura,'')!='1' AND IFNULL(oi.TxtMontagem,'')!='1' AND IFNULL(oi.txtMedicao,'')!='1' AND IFNULL(oi.txtAcabamento,'')!='1' AND IFNULL(oi.txtAprovacao,'')!='1' AND IFNULL(oi.txtIsometrico,'')!='1' AND IFNULL(oi.txtEngenharia,'')!='1') 
                                THEN oi.QtdeTotal
                                ELSE
                                    CASE WHEN LEAST(
                                        COALESCE(CASE WHEN IFNULL(oi.txtCorte, '')='1' THEN oi.CorteTotalExecutado ELSE 999999999 END, 999999999),
                                        COALESCE(CASE WHEN IFNULL(oi.txtDobra, '')='1' THEN oi.DobraTotalExecutado ELSE 999999999 END, 999999999),
                                        COALESCE(CASE WHEN IFNULL(oi.txtSoldagem, '')='1' THEN oi.SoldaTotalExecutado ELSE 999999999 END, 999999999),
                                        COALESCE(CASE WHEN IFNULL(oi.txtPintura, '')='1' THEN oi.PinturaTotalExecutado ELSE 999999999 END, 999999999),
                                        COALESCE(CASE WHEN IFNULL(oi.TxtMontagem, '')='1' THEN oi.MontagemTotalExecutado ELSE 999999999 END, 999999999),
                                        COALESCE(CASE WHEN IFNULL(oi.txtMedicao, '')='1' THEN oi.MEDICAOTotalExecutado ELSE 999999999 END, 999999999),
                                        COALESCE(CASE WHEN IFNULL(oi.txtAcabamento, '')='1' THEN oi.ACABAMENTOTotalExecutado ELSE 999999999 END, 999999999),
                                        COALESCE(CASE WHEN IFNULL(oi.txtIsometrico, '')='1' THEN oi.ISOMETRICOTotalExecutado ELSE 999999999 END, 999999999),
                                        COALESCE(CASE WHEN IFNULL(oi.txtEngenharia, '')='1' THEN oi.ENGENHARIATotalExecutado ELSE 999999999 END, 999999999)
                                    ) >= 999999999 THEN 0
                                    ELSE LEAST(
                                        COALESCE(CASE WHEN IFNULL(oi.txtCorte, '')='1' THEN oi.CorteTotalExecutado ELSE 999999999 END, 999999999),
                                        COALESCE(CASE WHEN IFNULL(oi.txtDobra, '')='1' THEN oi.DobraTotalExecutado ELSE 999999999 END, 999999999),
                                        COALESCE(CASE WHEN IFNULL(oi.txtSoldagem, '')='1' THEN oi.SoldaTotalExecutado ELSE 999999999 END, 999999999),
                                        COALESCE(CASE WHEN IFNULL(oi.txtPintura, '')='1' THEN oi.PinturaTotalExecutado ELSE 999999999 END, 999999999),
                                        COALESCE(CASE WHEN IFNULL(oi.TxtMontagem, '')='1' THEN oi.MontagemTotalExecutado ELSE 999999999 END, 999999999),
                                        COALESCE(CASE WHEN IFNULL(oi.txtMedicao, '')='1' THEN oi.MEDICAOTotalExecutado ELSE 999999999 END, 999999999),
                                        COALESCE(CASE WHEN IFNULL(oi.txtAcabamento, '')='1' THEN oi.ACABAMENTOTotalExecutado ELSE 999999999 END, 999999999),
                                        COALESCE(CASE WHEN IFNULL(oi.txtIsometrico, '')='1' THEN oi.ISOMETRICOTotalExecutado ELSE 999999999 END, 999999999),
                                        COALESCE(CASE WHEN IFNULL(oi.txtEngenharia, '')='1' THEN oi.ENGENHARIATotalExecutado ELSE 999999999 END, 999999999)
                                    )
                                    END
                            END
                        ), 0)
                        FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')
                    ),

                    CorteTotalExecutado = (SELECT COALESCE(SUM(oi.CorteTotalExecutado), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                    CorteTotalExecutar = (SELECT COALESCE(SUM(oi.CorteTotalExecutar), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                    DobraTotalExecutado = (SELECT COALESCE(SUM(oi.DobraTotalExecutado), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                    DobraTotalExecutar = (SELECT COALESCE(SUM(oi.DobraTotalExecutar), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                    SoldaTotalExecutado = (SELECT COALESCE(SUM(oi.SoldaTotalExecutado), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                    SoldaTotalExecutar = (SELECT COALESCE(SUM(oi.SoldaTotalExecutar), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                    PinturaTotalExecutado = (SELECT COALESCE(SUM(oi.PinturaTotalExecutado), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                    PinturaTotalExecutar = (SELECT COALESCE(SUM(oi.PinturaTotalExecutar), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                    MontagemTotalExecutado = (SELECT COALESCE(SUM(oi.MontagemTotalExecutado), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                    MontagemTotalExecutar = (SELECT COALESCE(SUM(oi.MontagemTotalExecutar), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = ''))
                WHERE os.IdOrdemServico = ?
            `, [IdOrdemServico]);
            
            // Percentual
            await conn.execute(`
                UPDATE ordemservico os
                SET 
                    PercentualPecas = CASE WHEN os.QtdeTotalItens > 0 THEN TRUNCATE((os.QtdePecasExecutadas / os.QtdeTotalItens) * 100, 2) ELSE 0 END,
                    CortePercentual = CASE WHEN os.QtdeTotalItens > 0 THEN TRUNCATE((os.CorteTotalExecutado / os.QtdeTotalItens) * 100, 2) ELSE 0 END,
                    DobraPercentual = CASE WHEN os.QtdeTotalItens > 0 THEN TRUNCATE((os.DobraTotalExecutado / os.QtdeTotalItens) * 100, 2) ELSE 0 END,
                    SoldaPercentual = CASE WHEN os.QtdeTotalItens > 0 THEN TRUNCATE((os.SoldaTotalExecutado / os.QtdeTotalItens) * 100, 2) ELSE 0 END,
                    PinturaPercentual = CASE WHEN os.QtdeTotalItens > 0 THEN TRUNCATE((os.PinturaTotalExecutado / os.QtdeTotalItens) * 100, 2) ELSE 0 END,
                    MontagemPercentual = CASE WHEN os.QtdeTotalItens > 0 THEN TRUNCATE((os.MontagemTotalExecutado / os.QtdeTotalItens) * 100, 2) ELSE 0 END
                WHERE os.IdOrdemServico = ?
            `, [IdOrdemServico]);

            // Propagar para TAG e PROJETO (Simplificado, apenas recarregando dados reais)
            const [osInfo] = await conn.execute(`SELECT IdTag, IdProjeto FROM ordemservico WHERE IdOrdemServico = ?`, [IdOrdemServico]);
            if (osInfo && osInfo.length > 0) {
                const { IdTag, IdProjeto } = osInfo[0];
                if (IdTag) {
                    await conn.execute(`
                        UPDATE tags t
                        SET 
                            QtdeOS = (SELECT COUNT(*) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '')),
                            QtdeOSExecutadas = (SELECT COUNT(*) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '') AND TRIM(COALESCE(os.OrdemServicoFinalizado,'')) = 'C'),
                            QtdePecasOS = (SELECT COALESCE(SUM(os.QtdeTotalItens), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '')),
                            QtdePecasExecutadas = (SELECT COALESCE(SUM(os.QtdePecasExecutadas), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '')),
                            PesoTotal = (SELECT COALESCE(SUM(os.PesoTotal), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '')),
                            AreaPinturaTotal = (SELECT COALESCE(SUM(os.AreaPinturaTotal), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = ''))
                        WHERE t.IdTag = ?
                    `, [IdTag]);
                }
                if (IdProjeto) {
                    await conn.execute(`
                        UPDATE projetos p
                        SET 
                            QtdeTags = (SELECT COUNT(*) FROM tags t WHERE t.IdProjeto = p.IdProjeto AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '')),
                            QtdePecasTags = (SELECT COALESCE(SUM(t.QtdePecasOS), 0) FROM tags t WHERE t.IdProjeto = p.IdProjeto AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '')),
                            QtdePecasExecutadas = (SELECT COALESCE(SUM(t.QtdePecasExecutadas), 0) FROM tags t WHERE t.IdProjeto = p.IdProjeto AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '')),
                            PesoTotal = (SELECT COALESCE(SUM(t.PesoTotal), 0) FROM tags t WHERE t.IdProjeto = p.IdProjeto AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '')),
                            AreaPinturaTotal = (SELECT COALESCE(SUM(t.AreaPinturaTotal), 0) FROM tags t WHERE t.IdProjeto = p.IdProjeto AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = ''))
                        WHERE p.IdProjeto = ?
                    `, [IdProjeto]);
                }
            }

            count++;
            if (count % 10 === 0) console.log(`Atualizados ${count}/${oses.length} O.S`);
        }
        
        console.log('Todos atualizados com sucesso!');
    } catch(err) {
        console.error("Erro executing query:", err);
    }
    
    conn.end();
}
fixAllOS().catch(console.error);
