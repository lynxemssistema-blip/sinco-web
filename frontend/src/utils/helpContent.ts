export interface HelpContent {
    title: string;
    description: string;
}

export const helpContents: Record<string, HelpContent> = {
    'dashboard': {
        title: 'Dashboard Inicial',
        description: 'Esta é a página principal do SincoWeb. Aqui você encontrará um resumo executivo e atalhos rápidos para as funcionalidades mais importantes do sistema.'
    },
    'ordens-servico': {
        title: 'Ordens de Serviço',
        description: 'Nesta tela você gerencia suas O.S.\n\n- Use o botão superior para "Criar Nova OS"\n- Utilize a lupa para visualizar os itens.\n- O botão de cópia permite "Clonar" a O.S para outra tag ou projeto.\n- Utilize os filtros no painel superior para refinar a listagem.'
    },
    'projetos': {
        title: 'Gestão de Projetos',
        description: 'Aqui você cadastra e acompanha os projetos em vigência.\n\n- Adicione, edite e finalize projetos.\n- Você pode adicionar novas Tags aos projetos utilizando o botão "Nova Tag".\n- O status de liberação pode ser acompanhado através dos ícones à direita.'
    },
    'apontamento': {
        title: 'Apontamento de Produção',
        description: 'Módulo voltado para registro em tempo real das etapas produtivas (Corte, Dobra, Solda, Pintura, Montagem).\n\n- Utilize leitura de código de barras ou pesquise pelos itens e OS.\n- Somente após um setor ser concluído que o item avança para a próxima etapa em seu fluxo Push produtivo.'
    },
    'acompanhamento-geral': {
        title: 'Acompanhamento Geral de Produção',
        description: 'Módulo de relatório completo sobre o chão de fábrica.\n\n- Apresenta métricas visuais em formato Gantt e listas detalhadas sobre atrasos e progressos baseados no peso (KG).\n- Utilize os potentes filtros na esquerda para agrupar as informações por O.S, Tag ou Familia de materiais.'
    },
    'visao-geral-producao': {
        title: 'Visão Geral da Produção',
        description: 'Resumo em grade (dashboard técnico) da performance departamental do chão de fábrica.'
    },
    'default': {
        title: 'Ajuda do Sistema',
        description: 'Neste momento não há uma dica detalhada exclusiva para esta tela. Em caso de dúvidas sobre a operação específica, entre em contato com o administrador do sistema.'
    }
};
