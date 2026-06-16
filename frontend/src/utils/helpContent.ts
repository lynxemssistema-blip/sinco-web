export interface HelpContent {
    title: string;
    description: string;
    icon?: string;
}

export const helpContents: Record<string, HelpContent> = {

    // ── PRINCIPAL ───────────────────────────────────────────────────
    'dashboard': {
        title: 'Dashboard',
        description: 'Painel de controle geral do sistema. Apresenta os principais indicadores de produção, atalhos rápidos para as telas mais utilizadas e um resumo do status atual das ordens e projetos em andamento.',
        icon: '📊'
    },

    // ── CADASTROS ───────────────────────────────────────────────────
    'pessoa-juridica': {
        title: 'Pessoa Jurídica',
        description: 'Manutenção do cadastro de empresas (clientes e fornecedores): incluir, alterar e excluir registros. Os dados aqui cadastrados são usados em romaneios, projetos e documentos de expedição.',
        icon: '🏢'
    },
    'group_1781618991422': {
        title: 'Monta Peça Manufaturada',
        description: 'Para criar uma peça manufaturada selecione um desenho (lado esquerdo). Depois de selecionado, busque os itens que farão parte desta nova peça no catálogo e adicione à receita.',
        icon: '📦'
    },
    'monta-peca-manufaturada': {
        title: 'Monta Peça Manufaturada',
        description: 'Para criar uma peça manufaturada selecione um desenho (lado esquerdo). Depois de selecionado, busque os itens que farão parte desta nova peça no catálogo e adicione à receita.',
        icon: '📦'
    },
    'unidades-medida': {
        title: 'Unidades de Medida',
        description: 'Manutenção das unidades de medida do sistema (ex: kg, m², peça, conjunto): incluir, alterar e excluir. As unidades cadastradas aqui são usadas em Ordens de Serviço e relatórios de produção.',
        icon: '📐'
    },
    'familia': {
        title: 'Família de Produtos',
        description: 'Manutenção das famílias de produtos fabricados: incluir, alterar e excluir categorias. Permite agrupar tipos de produto semelhantes, facilitando filtros e relatórios de produção.',
        icon: '🗂️'
    },
    'acabamento': {
        title: 'Tipos de Acabamento',
        description: 'Manutenção dos tipos de acabamento superficial disponíveis (ex: pintura, galvanização, fosfatização): incluir, alterar e excluir registros. Os tipos cadastrados aqui são selecionados nas Ordens de Serviço para especificar o tratamento de cada peça.',
        icon: '🎨'
    },
    'materiais': {
        title: 'Materiais',
        description: 'Manutenção do cadastro de matérias-primas (ex: aço SAE 1020, alumínio 6061): incluir, alterar e excluir. Os materiais cadastrados são referenciados nos itens das Ordens de Serviço para controle de especificação técnica.',
        icon: '⚗️'
    },
    'tipos-produto': {
        title: 'Tipos de Produto',
        description: 'Manutenção dos tipos de produto fabricados pela empresa: incluir, alterar e excluir categorias. Essa classificação é usada nos filtros de produção e nos relatórios de desempenho por linha de produto.',
        icon: '🏷️'
    },
    'projetos': {
        title: 'Projetos',
        description: 'Manutenção dos projetos e obras da empresa: incluir, alterar e excluir. Cada projeto agrupa diversas Ordens de Serviço sob um mesmo cliente ou contrato. O acompanhamento de prazos e progresso por projeto é feito a partir deste cadastro.',
        icon: '🏗️'
    },

    // ── ORDENS DE SERVIÇO ───────────────────────────────────────────
    'ordens-servico': {
        title: 'Ordens de Serviço',
        description: 'Crie e gerencie as Ordens de Serviço (O.S.) que orientam o chão de fábrica. Defina o que deve ser fabricado (itens, materiais, quantidades), para qual projeto e em qual prazo. A O.S. é o documento central que move a produção.',
        icon: '📋'
    },

    // ── PLANO DE CORTE ──────────────────────────────────────────────
    'montagem-plano-corte': {
        title: 'Montagem do Plano de Corte',
        description: 'Monte planos de corte agrupando itens de O.S. com mesma espessura e material. Se já existir um plano de corte para a combinação espessura/MaterialSW selecionada, o item é adicionado a ele; caso contrário, um novo plano de corte é criado automaticamente. O objetivo é otimizar o aproveitamento da chapa e reduzir desperdício.',
        icon: '✂️'
    },
    'producao-plano-corte': {
        title: 'Produção do Plano de Corte',
        description: 'Acompanhe e registre a execução dos planos de corte já montados. Informe as quantidades cortadas por plano, atualizando o progresso de cada O.S. vinculada. Permite visualizar quais planos estão pendentes, em corte ou finalizados.',
        icon: '🪚'
    },

    // ── APONTAMENTO ─────────────────────────────────────────────────
    'apontamento': {
        title: 'Apontamento de Produção',
        description: 'Registre em tempo real o que está sendo produzido em cada setor (corte, dobra, solda, pintura, montagem). O operador informa as quantidades executadas por item/O.S., atualizando o avanço e liberando o saldo para o setor seguinte.',
        icon: '⚙️'
    },
    'apontamentos-parciais': {
        title: 'Apontamentos Parciais',
        description: 'Visualize e controle itens que foram apontados com quantidades menores do que o total previsto. Rastreie o saldo pendente de cada peça por setor e identifique gargalos onde a produção ficou incompleta.',
        icon: '🔢'
    },

    // ── ACOMPANHAMENTO ───────────────────────────────────────────────
    'acompanhamento-geral': {
        title: 'Acompanhamento Geral',
        description: 'Monitore o andamento de toda a produção em visão consolidada. Identifique quais projetos e O.S. estão no prazo, atrasados ou adiantados, com indicadores visuais de progresso por setor. Ferramenta para gestores e supervisores.',
        icon: '📈'
    },
    'acompanhamento-etapas': {
        title: 'Visão Geral Engenharia',
        description: 'Acompanhe o planejamento e a execução das etapas de engenharia por projeto e tag. Visualize e atualize as datas planejadas e realizadas de cada fase (engenharia, isométrico, aprovação, expedição), garantindo aderência ao cronograma.',
        icon: '🛠️'
    },
    'visao-geral-producao': {
        title: 'Visão Geral Produção',
        description: 'Painel operacional do dia a dia dos setores produtivos. Exibe a fila de trabalho de cada setor com quantidades a executar e o progresso atual, ajudando líderes a distribuir tarefas e acompanhar o ritmo da produção em tempo real.',
        icon: '🏭'
    },
    'visao-geral-engenharia': {
        title: 'Visão Geral Engenharia',
        description: 'Acompanhe o planejamento e a execução das etapas de engenharia por projeto e tag. Visualize e atualize as datas planejadas e realizadas de cada fase (engenharia, isométrico, aprovação, expedição), garantindo aderência ao cronograma.',
        icon: '🛠️'
    },

    // ── EXPEDIÇÃO ────────────────────────────────────────────────────
    'romaneio-envio': {
        title: 'Romaneio de Envio',
        description: 'Gerencie as remessas que saem da fábrica. Crie o romaneio de expedição informando os dados do transporte (motorista, placa, transportadora), selecione os itens a enviar e gere o documento oficial de saída para o cliente ou serviço terceirizado.',
        icon: '🚚'
    },
    'romaneio-retorno': {
        title: 'Romaneio de Retorno',
        description: 'Registre e acompanhe o retorno de peças enviadas para serviços externos (galvanização, pintura, etc.). Controle quais itens voltaram, em que quantidade e condição, fechando o ciclo de expedição e retorno. ⚠️ Exibe apenas romaneios já liberados — itens de romaneios em status "Novo" ou "Registrado" não aparecem nesta tela.',
        icon: '↩️'
    },
    'controle-expedicao': {
        title: 'Controle de Expedição',
        description: 'Visualize o histórico completo de todas as expedições realizadas. Consulte quais itens foram enviados, datas de despacho, transportadora, status (pendente, enviado, finalizado) e confirme o recebimento pelo cliente.',
        icon: '📦'
    },
    'pendencia-romaneio': {
        title: 'Pendências do Romaneio',
        description: 'Gerencie as não conformidades e pendências relacionadas aos itens de um romaneio específico. Registre problemas detectados no recebimento pelo cliente, acompanhe as ações corretivas e finalize as pendências quando resolvidas.',
        icon: '⚠️'
    },

    // ── QUALIDADE / PENDÊNCIAS ───────────────────────────────────────
    'visao-geral-pendencias': {
        title: 'Visão Geral de Pendências (RNC)',
        description: 'Central de controle de Registros de Não Conformidade (RNCs). Visualize todos os problemas de qualidade abertos, em andamento e finalizados. Registre a causa, o setor responsável e as ações corretivas adotadas.',
        icon: '🔎'
    },
    'pecas-reposicao': {
        title: 'Peças em Reposição',
        description: 'Acompanhe as solicitações de refabricação de peças com defeito ou fora de especificação. Controle o status de cada reposição (solicitada, em produção, concluída) e vincule ao item original da O.S. para rastreabilidade.',
        icon: '🔄'
    },

    // ── TESTE FINAL ──────────────────────────────────────────────────
    'teste-final-montagem': {
        title: 'Teste Final de Montagem',
        description: 'Registre e acompanhe os testes de aceitação realizados após a montagem final do produto. Informe o resultado do teste (aprovado/reprovado), anexe observações técnicas e finalize o item quando aprovado para expedição.',
        icon: '✅'
    },

    // ── DESENHOS / DOCUMENTOS ────────────────────────────────────────
    'pesquisar-desenho': {
        title: 'Pesquisar Desenho Técnico',
        description: 'Localize e acesse os arquivos de desenho técnico (PDF, DXF, 3D) de qualquer peça ou item de O.S. Pesquise pelo código do fabricante, material ou O.S. e abra o arquivo como referência durante a fabricação.',
        icon: '📐'
    },

    // ── PLANEJAMENTO ─────────────────────────────────────────────────
    'visao-geral-tags': {
        title: 'Visão Geral de Tags',
        description: 'Consulta global de todas as tags de todos os projetos ativos. Permite visualizar e atualizar datas de planejamento e realização por setor, acompanhar o progresso de cada tag e filtrar por qualquer critério.',
        icon: '🏷️'
    },

    // ── IMPORTAÇÃO ───────────────────────────────────────────────────
    'blockset': {
        title: 'Importação Blockset',
        description: 'Importe listas de materiais exportadas pela engenharia no Excel (formato Blockset/SolidWorks). O sistema processa o arquivo, interpreta os itens e cria automaticamente as Ordens de Serviço correspondentes, eliminando a digitação manual.',
        icon: '📤'
    },
    'leitura-dados': {
        title: 'Leitura de Dados',
        description: 'Importe dados externos de planilhas ou arquivos estruturados para o sistema. Use para sincronizar cadastros de materiais, projetos ou itens gerados em outras ferramentas de engenharia.',
        icon: '📥'
    },
    'lista-planilhas': {
        title: 'Lista de Planilhas',
        description: 'Visualize todas as planilhas (importações PowerBuild) que foram processadas pelo sistema. Acompanhe o status de cada importação e acesse os detalhes dos itens gerados.',
        icon: '📑'
    },
    'powerbuild-list': {
        title: 'Lista PowerBuild',
        description: 'Visualize todas as planilhas importadas via PowerBuild. Acompanhe o status de processamento de cada arquivo e acesse os itens gerados para revisão antes de confirmar as Ordens de Serviço.',
        icon: '📑'
    },
    'revisao-itens': {
        title: 'Revisão de Itens',
        description: 'Revise os itens importados de planilhas PowerBuild antes de confirmá-los no sistema. Corrija inconsistências de material, espessura ou quantidade e valide cada linha antes de gerar as Ordens de Serviço.',
        icon: '🔍'
    },
    'powerbuild-revision': {
        title: 'Revisão PowerBuild',
        description: 'Revise os itens importados de planilhas PowerBuild antes de confirmá-los. Corrija inconsistências de material, espessura ou quantidade e valide cada linha antes de gerar as Ordens de Serviço.',
        icon: '🔍'
    },
    'visualizacao-aglutinacao': {
        title: 'Aglutinação de Itens',
        description: 'Visualize e gerencie a aglutinação de itens similares importados (mesma espessura/material). O sistema sugere agrupamentos para otimizar o plano de corte e reduzir o número de O.S. com características idênticas.',
        icon: '🔗'
    },
    'powerbuild-agglutination': {
        title: 'Aglutinação PowerBuild',
        description: 'Visualize e aprove os agrupamentos de itens similares sugeridos pelo sistema após importação. Itens com mesma espessura e material são aglutinados para otimizar o plano de corte e reduzir desperdício de chapa.',
        icon: '🔗'
    },

    // ── ADMINISTRATIVO ───────────────────────────────────────────────
    'usuarios': {
        title: 'Usuários do Sistema',
        description: 'Manutenção dos usuários com acesso ao sistema: incluir, alterar e desativar contas. Defina o nível de acesso (operador, supervisor, administrador), setor de atuação e permissões de cada colaborador.',
        icon: '👥'
    },
    'cadastro-de-usuario': {
        title: 'Cadastro de Usuário',
        description: 'Formulário de criação ou edição de um usuário do sistema. Preencha nome completo, login, senha, setor e nível de acesso. O usuário criado aqui poderá acessar o sistema conforme as permissões definidas.',
        icon: '👤'
    },
    'cadastro-usuario': {
        title: 'Cadastro de Usuário',
        description: 'Formulário de criação ou edição de um usuário do sistema. Preencha nome completo, login, senha, setor e nível de acesso. O usuário criado aqui poderá acessar o sistema conforme as permissões definidas.',
        icon: '👤'
    },
    'config': {
        title: 'Configurações do Sistema',
        description: 'Personalize o comportamento do sistema: defina os processos/setores visíveis, o limite máximo de registros exibidos por tela, os módulos ativos no menu lateral e outras preferências globais do ambiente.',
        icon: '⚙️'
    },
    'config-sistema': {
        title: 'Configurações Avançadas',
        description: 'Acesso às configurações avançadas do sistema. Gerencie parâmetros internos, integrações e opções de ambiente que afetam o comportamento global da plataforma.',
        icon: '🔧'
    },
    'superadmin': {
        title: 'Superadministrador',
        description: 'Painel exclusivo do superadministrador. Gerencie os bancos de dados (tenants) conectados à plataforma, configure novas empresas clientes e monitore o status de cada ambiente ativo no sistema.',
        icon: '👑'
    },
    'tarefas': {
        title: 'Tarefas',
        description: 'Gerencie a lista de tarefas e atividades internas da equipe. Crie, atribua e acompanhe o status de cada tarefa (pendente, em andamento, concluída), definindo responsáveis e prazos.',
        icon: '✅'
    },
    'relatorios': {
        title: 'Relatórios',
        description: 'Gere relatórios gerenciais e operacionais do sistema. Selecione o tipo de relatório (produção, expedição, não conformidades), o período desejado e exporte em PDF ou Excel.',
        icon: '📊'
    },

    // ── FALLBACK ─────────────────────────────────────────────────────
    'default': {
        title: 'Sobre esta Tela',
        description: 'Use esta tela para consultar, cadastrar ou gerenciar as informações desta área do sistema. Utilize os filtros disponíveis para localizar registros e os botões de ação para incluir, alterar ou excluir dados.',
        icon: '📌'
    }
};
