const fs = require('fs');
let code = fs.readFileSync('C:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/utils/constants.ts', 'utf8');

// remove the trailing ]; if present
code = code.replace(/];[\s\S]*$/, '');

code += `
    { id: 'superadmin', icon: 'ShieldAlert', label: 'Superadmin', href: '/superadmin' },
    { id: 'tarefas', icon: 'ListTodo', label: 'Tarefas', href: '/tarefas' },
    { id: 'teste-final-montagem', icon: 'ClipboardCheck', label: 'Teste Final Montagem', href: '/teste-final-montagem' },
    { id: 'recursos-fabricacao', icon: 'Settings2', label: 'Recursos de Fabricação', href: '/recursos-fabricacao' },
    { id: 'tipos-produto', icon: 'Boxes', label: 'Tipos Produto', href: '/tipos-produto' },
    { id: 'visao-geral-pendencias', icon: 'ListChecks', label: 'Todas as Pendências', href: '/visao-geral-pendencias' },
    { id: 'unidades-medida', icon: 'Ruler', label: 'Unidades de Medida', href: '/unidades-medida' },
    { id: 'usuarios', icon: 'Users', label: 'Usuários', href: '/usuarios' },
    { id: 'visao-geral-engenharia', icon: 'Network', label: 'Visão Engenharia', href: '/visao-geral-engenharia' },
    { id: 'visao-geral-producao', icon: 'BarChart3', label: 'Visão Geral Produção', href: '/visao-geral-producao' },
];
`;

fs.writeFileSync('C:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/utils/constants.ts', code);
