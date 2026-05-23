const normalizeDate = (d) => {
    if(!d) return null;
    if(d.includes('/')) {
        const parts = d.split(' ')[0].split('/');
        if(parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return d.split(' ')[0];
};

const req = { query: { planInicioDe: '2026-03-01', planInicioAte: '2026-05-22', planFimDe: '', planFimAte: '', setor: 'corte', os: '23' } };
const { planInicioDe, planInicioAte, planFimDe, planFimAte, setor, os } = req.query;

const row = {
    IdOrdemServicoItem: 33196,
    IdOrdemServico: '23',
    Projeto: 'PROJETO WEB-N OVA-001',
    Tag: 'TAG 1  PROJETO WEB-001',
    CodMatFabricante: 'MONT1',
    DescResumo: '',
    QtdeTotal: 1,
    OSDescricao: 'TESTE  - Esta O.S. é uma cópia da OS de referência Numero: 2 para teste web',
    PlanejadoInicioCorte: '06/04/2026',
    PlanejadoFinalCorte: '16/04/2026',
    txtCorte: '1'
};

let result = [];

const processSetor = (row, s) => {
    const hasSetor = row[`txt${s}`] === '1' || row[`Txt${s}`] === '1' || (s==='Montagem' && row.txtMontagem === '1');
    if(!hasSetor) return;
    const dtIniRaw = row[`PlanejadoInicio${s}`];
    const dtFimRaw = row[`PlanejadoFinal${s}`];
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

    if(include) {
        result.push(row);
    }
};

if(!setor || setor === 'todos' || setor.toLowerCase() === 'corte') processSetor(row, 'Corte');

console.log('Result:', result.length);
