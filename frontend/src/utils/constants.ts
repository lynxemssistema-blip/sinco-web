import type { MenuItem } from './iconMap';

export const defaultMenuItems: MenuItem[] = [
    {
        id: 'romaneio',
        icon: 'Truck',
        label: 'Romaneio',
        children: [
            { id: 'romaneio-envio', icon: 'Truck', label: 'Romaneio-Envio', href: '/romaneio-envio' },
            { id: 'romaneio-retorno', icon: 'ArrowLeftCircle', label: 'Romaneio-Retorno', href: '/romaneio-retorno' },
        ]
    },
    { id: 'dashboard', icon: 'LayoutDashboard', label: 'Dashboard', href: '/dashboard' },
    { id: 'camera', icon: 'Camera', label: 'Câmera', href: '/camera' },
    { id: 'calendario', icon: 'Calendar', label: 'Calendário', href: '/calendario' },
    { id: 'pessoa-juridica', icon: 'Building2', label: 'Pessoa Jurídica', href: '/cadastro-pj' },
    { id: 'unidades-medida', icon: 'Ruler', label: 'Unidades de Medida', href: '/unidades-medida' },
    { id: 'familia', icon: 'FolderTree', label: 'Família', href: '/familia' },
    { id: 'acabamento', icon: 'Paintbrush', label: 'Acabamento', href: '/acabamento' },
    { id: 'materiais', icon: 'Package', label: 'Materiais', href: '/materiais' },
    { id: 'projetos', icon: 'FolderKanban', label: 'Projetos', href: '/projetos' },
    { id: 'tipos-produto', icon: 'Boxes', label: 'Tipos Produto', href: '/tipos-produto' },
    { id: 'ordens-servico', icon: 'ClipboardList', label: 'Ordens de Serviço', href: '/ordens-servico' },
    { id: 'apontamento', icon: 'Factory', label: 'Apontamento Produção', href: '/apontamento' },
    { id: 'visao-geral-producao', icon: 'BarChart3', label: 'Visão Geral Produção', href: '/visao-geral-producao' },
    { id: 'visao-geral-engenharia', icon: 'Network', label: 'Visão Geral Engenharia', href: '/visao-geral-engenharia' },
    { id: 'relatorios', icon: 'FileText', label: 'Relatórios', href: '/relatorios' },
    { id: 'sst', icon: 'ShieldCheck', label: 'SST - Segurança', href: '/sst' },
    { id: 'cipa', icon: 'HardHat', label: 'CIPA - Segurança', href: '/cipa' },
    { id: 'sgq', icon: 'ClipboardCheck', label: 'SGQ - Qualidade', href: '/sgq' },
    { id: 'usuarios', icon: 'Users', label: 'Usuários', href: '/usuarios' },
    { id: 'config', icon: 'Settings', label: 'Configurações', href: '/config' },
    { id: 'config-sistema', icon: 'Database', label: 'Config. Sistema', href: '/config-sistema' },
    { id: 'superadmin', icon: 'ShieldAlert', label: 'Superadmin', href: '/superadmin' },
];
