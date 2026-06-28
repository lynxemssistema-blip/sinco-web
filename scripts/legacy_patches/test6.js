const pool=require('./src/config/db'); 
async function run(){ 
    try{ 
        let query = "SELECT oi.IdOrdemServicoItem, oi.IdOrdemServico, oi.Projeto, oi.Tag, oi.CodMatFabricante, oi.DescResumo, oi.QtdeTotal, oi.qtde, os.Descricao as OSDescricao, COALESCE(oi.PlanejadoInicioCorte, os.PlanejadoInicioCorte) as PlanejadoInicioCorte, COALESCE(oi.PlanejadoFinalCorte, os.PlanejadoFinalCorte) as PlanejadoFinalCorte, COALESCE(oi.PlanejadoInicioDobra, os.PlanejadoInicioDobra) as PlanejadoInicioDobra, COALESCE(oi.PlanejadoFinalDobra, os.PlanejadoFinalDobra) as PlanejadoFinalDobra, COALESCE(oi.PlanejadoInicioSolda, os.PlanejadoInicioSolda) as PlanejadoInicioSolda, COALESCE(oi.PlanejadoFinalSolda, os.PlanejadoFinalSolda) as PlanejadoFinalSolda, COALESCE(oi.PlanejadoInicioPintura, os.PlanejadoInicioPintura) as PlanejadoInicioPintura, COALESCE(oi.PlanejadoFinalPintura, os.PlanejadoFinalPintura) as PlanejadoFinalPintura, COALESCE(oi.PlanejadoInicioMontagem, os.PlanejadoInicioMontagem) as PlanejadoInicioMontagem, COALESCE(oi.PlanejadoFinalMontagem, os.PlanejadoFinalMontagem) as PlanejadoFinalMontagem, oi.txtCorte, oi.txtDobra, oi.txtSolda, oi.txtPintura, oi.TxtMontagem as txtMontagem FROM ordemservicoitem oi JOIN ordemservico os ON oi.IdOrdemServico = os.IdOrdemServico WHERE 1=1"; 
        
        const [rows]=await pool.query(query, []); 
        
        const normalizeDate = (d) => { 
            if(!d) return null; 
            if(d.includes('/')) { 
                const parts = d.split(' ')[0].split('/'); 
                if(parts.length === 3) return parts[2]+'-'+parts[1]+'-'+parts[0]; 
            } 
            return d.split(' ')[0]; 
        }; 
        
        let result = []; 
        const planInicioDe = '2026-04-01', planInicioAte = '2026-05-22', planFimDe = '', planFimAte = ''; 
        
        const processSetor = (row, s) => { 
            const dtIniRaw = row[`PlanejadoInicio${s}`]; 
            const dtFimRaw = row[`PlanejadoFinal${s}`]; 
            
            const hasSetor = row[`txt${s}`] === '1' || row[`Txt${s}`] === '1' || (s==='Montagem' && row.txtMontagem === '1') || !!dtIniRaw || !!dtFimRaw; 
            
            if(!hasSetor) return; 
            if(!dtIniRaw && !dtFimRaw) return; 
            
            const dtIni = normalizeDate(dtIniRaw); 
            const dtFim = normalizeDate(dtFimRaw); 
            
            let include = true; 
            
            if (planInicioDe || planInicioAte) { 
                if (!dtIni) { include = false; } 
                else { 
                    if (planInicioDe && dtIni < planInicioDe) include = false; 
                    if (planInicioAte && dtIni > planInicioAte) include = false; 
                } 
            } 
            
            if (planFimDe || planFimAte) { 
                if (!dtFim) { include = false; } 
                else { 
                    if (planFimDe && dtFim < planFimDe) include = false; 
                    if (planFimAte && dtFim > planFimAte) include = false; 
                } 
            } 
            
            if(include) result.push(row); 
        }; 
        
        rows.forEach(row => { 
            processSetor(row, 'Corte'); 
            processSetor(row, 'Dobra'); 
            processSetor(row, 'Solda'); 
            processSetor(row, 'Pintura'); 
            processSetor(row, 'Montagem'); 
        }); 
        
        console.log('Total DB rows fetched:', rows.length);
        console.log('Result count for dates:', result.length); 
    }catch(e){console.error(e);} 
    process.exit(0); 
} 
run();
