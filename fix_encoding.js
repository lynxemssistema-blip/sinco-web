const fs = require('fs');
const file = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducao.tsx';
let txt = fs.readFileSync(file, 'utf8');

const map = {
    'Descriï¿½ï¿½o da Pendiï¿½ncia': 'Descrição da Pendência',
    'Descriï¿½ï¿½o': 'Descrição',
    'Histï¿½rico': 'Histórico',
    'Pendiï¿½ncia': 'Pendência',
    'pendiï¿½ncia': 'pendência',
    'Pendï¿½ncias': 'Pendências',
    'pendï¿½ncias': 'pendências',
    'Aï¿½ï¿½o': 'Ação',
    'Opï¿½ï¿½es': 'Opções',
    'Atenï¿½ï¿½o': 'Atenção',
    'Simulaï¿½ï¿½o': 'Simulação',
    'Operaï¿½ï¿½o': 'Operação',
    'Concluï¿½da': 'Concluída',
    'Reposiï¿½ï¿½o': 'Reposição',
    'Padrï¿½o': 'Padrão',
    'Cï¿½d': 'Cód',
    'Tï¿½tulo': 'Título',
    'Finalizaï¿½ï¿½o': 'Finalização',
    'Aï¿½ï¿½o': 'Ação'
};

for(const [k, v] of Object.entries(map)) {
    txt = txt.split(k).join(v);
}

fs.writeFileSync(file, txt, 'utf8');
console.log('Fixed encoding in file.');
