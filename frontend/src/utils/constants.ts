import type { MenuItem } from './iconMap';

export const defaultMenuItems: MenuItem[] = [
    { id: 'acabamento', icon: 'Paintbrush', label: 'Acabamento', href: '/acabamento' },
    { id: 'apontamento', icon: 'Factory', label: 'Apontamento Produção', href: '/apontamento' },
    {
        id: 'cadastro-usuarios',
        icon: 'Users',
        label: 'Cadastro Usuarios',
        children: [
            { id: 'cadastro-de-usuario', icon: 'UserCheck', label: 'Cadastro de Usuario', href: '/cadastro-de-usuario' },
        ]
    },
    { id: 'calendario', icon: 'Calendar', label: 'Calendário', href: '/calendario' },
    { id: 'camera', icon: 'Camera', label: 'Câmera', href: '/camera' },
    { id: 'cipa', icon: 'HardHat', label: 'CIPA - Segurança', href: '/cipa' },
    { id: 'config-sistema', icon: 'Database', label: 'Config. Sistema', href: '/config-sistema' },
    { id: 'config', icon: 'Settings', label: 'Configurações', href: '/config' },
    { id: 'controle-expedicao', icon: 'PackageCheck', label: 'Controle Expedição', href: '/controle-expedicao' },
    { id: 'dashboard', icon: 'LayoutDashboard', label: 'Dashboard', href: '/dashboard' },
    { id: 'familia', icon: 'FolderTree', label: 'Família', href: '/familia' },
    { id: 'pecas-reposicao', icon: 'Wrench', label: 'Lista Peças de Reposição', href: '/pecas-reposicao' },
    { id: 'materiais', icon: 'Package', label: 'Materiais', href: '/materiais' },
    { id: 'ordens-servico', icon: 'ClipboardList', label: 'Ordens de Serviço', href: '/ordens-servico' },
    { id: 'pessoa-juridica', icon: 'Building2', label: 'Pessoa Jurídica', href: '/cadastro-pj' },
    { id: 'pesquisar-desenho', icon: 'FileSearch', label: 'Pesquisar Desenho', href: '/pesquisar-desenho' },
    {
        id: 'plano-corte',
        icon: 'Scissors',
        label: 'Plano de Corte',
        children: [
            { id: 'montagem-plano-corte', icon: 'FolderOpen', label: 'Montagem Plano de Corte', href: '/montagem-plano-corte' },
            { id: 'producao-plano-corte', icon: 'Factory', label: 'Produção Plano de Corte', href: '/producao-plano-corte' },
        ]
    },
    { id: 'projetos', icon: 'FolderKanban', label: 'Projetos', href: '/projetos' },
    { id: 'relatorios', icon: 'FileText', label: 'Relatórios', href: '/relatorios' },
    {
        id: 'romaneio',
        icon: 'Truck',
        label: 'Romaneio',
        children: [
            { id: 'romaneio-envio', icon: 'Truck', label: 'Romaneio-Envio', href: '/romaneio-envio' },
            { id: 'romaneio-retorno', icon: 'ArrowLeftCircle', label: 'Romaneio-Retorno', href: '/romaneio-retorno' },
        ]
    },
    { id: 'sgq', icon: 'ClipboardCheck', label: 'SGQ - Qualidade', href: '/sgq' },
    { id: 'sst', icon: 'ShieldCheck', label: 'SST - Segurança', href: '/sst' },
    { id: 'superadmin', icon: 'ShieldAlert', label: 'Superadmin', href: '/superadmin' },
    { id: 'tarefas', icon: 'ListTodo', label: 'Tarefas', href: '/tarefas' },
    { id: 'teste-final-montagem', icon: 'ClipboardCheck', label: 'Teste Final Montagem', href: '/teste-final-montagem' },
    { id: 'tipos-produto', icon: 'Boxes', label: 'Tipos Produto', href: '/tipos-produto' },
    { id: 'visao-geral-pendencias', icon: 'ListChecks', label: 'Todas as Pendências', href: '/visao-geral-pendencias' },
    { id: 'unidades-medida', icon: 'Ruler', label: 'Unidades de Medida', href: '/unidades-medida' },
    { id: 'usuarios', icon: 'Users', label: 'Usuários', href: '/usuarios' },
    { id: 'visao-geral-engenharia', icon: 'Network', label: 'Visão Geral Engenharia', href: '/visao-geral-engenharia' },
    { id: 'visao-geral-producao', icon: 'BarChart3', label: 'Visão Geral Produção', href: '/visao-geral-producao' },
];
