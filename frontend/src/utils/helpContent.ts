export interface HelpContent {
    title: string;
    description: string;
    icon?: string;
}

export const helpContents: Record<string, HelpContent> = {

    // ── PRINCIPAL ───────────────────────────────────────────────────
    'dashboard': {
        title: 'Dashboard',
        description: '🎯 Objetivo: Fornecer um panorama instantâneo e gerencial de toda a operação industrial.\n\n⚙️ Como Trabalhar:\n• Utilize os atalhos no topo para navegar rapidamente para as funções mais usadas.\n• Observe os gráficos de produção para identificar se a fábrica está operando na meta.\n• Clique nos cards de resumo para verificar O.S. abertas e status dos projetos.',
        icon: '📊'
    },

    // ── CADASTROS ───────────────────────────────────────────────────
    'pessoa-juridica': {
        title: 'Pessoa Jurídica',
        description: '🎯 Objetivo: Cadastrar e manter o banco de dados de clientes, fornecedores e parceiros da empresa.\n\n⚙️ Como Trabalhar:\n• Para adicionar, preencha a aba "Novo" com CNPJ, Razão Social e dados de contato reais.\n• Ao faturar romaneios ou criar projetos, os clientes serão puxados deste cadastro.\n• Evite cadastros duplicados; sempre busque pela razão social antes de criar um novo.',
        icon: '🏢'
    },
    'monta-peca-manufaturada': {
        title: 'Peça Manufaturada',
        description: '🎯 Objetivo: Vincular matérias-primas e recursos de fabricação a um Produto acabado.\n\n⚙️ Como Trabalhar:\n• Selecione o produto principal (código do fabricante) no grid superior.\n• No painel, adicione os insumos necessários (lista de materiais).\n• Adicione e ordene a seqüência de setores/recursos (ex: Corte -> Dobra -> Solda) por onde a peça passará.',
        icon: '📦'
    },
    'group_1781618991422': {
        title: 'Peça Manufaturada',
        description: '🎯 Objetivo: Vincular matérias-primas e recursos de fabricação a um Produto acabado.\n\n⚙️ Como Trabalhar:\n• Selecione o produto principal (código do fabricante) no grid superior.\n• No painel, adicione os insumos necessários (lista de materiais).\n• Adicione e ordene a seqüência de setores/recursos (ex: Corte -> Dobra -> Solda) por onde a peça passará.',
        icon: '📦'
    },
    'unidades-medida': {
        title: 'Unidades de Medida',
        description: '🎯 Objetivo: Padronizar as grandezas matemáticas usadas no estoque e faturamento (KG, M2, UN).\n\n⚙️ Como Trabalhar:\n• Crie a sigla (ex: "KG") e a descrição exata.\n• Esses dados alimentam os formulários de Materiais e Ordens de Serviço.\n• Atenção: Mudar uma unidade em uso afeta cálculos históricos; prefira desativar.',
        icon: '📐'
    },
    'familia': {
        title: 'Família de Produtos',
        description: '🎯 Objetivo: Categorizar os produtos para facilitar relatórios contábeis e de desempenho.\n\n⚙️ Como Trabalhar:\n• Crie agrupamentos amplos (Ex: "Estruturas Metálicas", "Tubulações").\n• Ao criar um material novo, você deverá selecionar obrigatoriamente a qual família ele pertence.',
        icon: '🗂️'
    },
    'acabamento': {
        title: 'Tipos de Acabamento',
        description: '🎯 Objetivo: Definir o tratamento superficial que a peça receberá.\n\n⚙️ Como Trabalhar:\n• Adicione acabamentos (Galvanizado a Fogo, Pintura Epóxi, Polido).\n• Essas opções aparecerão nos apontamentos de O.S. para que a fábrica saiba como finalizar a peça.',
        icon: '🎨'
    },
    'materiais': {
        title: 'Materiais',
        description: '🎯 Objetivo: Manter o catálogo geral de insumos e produtos (chapas, parafusos, vigas).\n\n⚙️ Como Trabalhar:\n• Use o botão lateral para "Novo Material".\n• Preencha obrigatoriamente o "Código Material".\n• Insira medidas (Peso, Altura) rigorosas, pois elas influenciam o módulo de Plano de Corte.\n• Vincule a Família e o Fornecedor corretos.',
        icon: '⚗️'
    },
    'tipos-produto': {
        title: 'Tipos de Produto',
        description: '🎯 Objetivo: Subclassificar o que a fábrica constrói (Comercialização, Uso e Consumo, Industrialização).\n\n⚙️ Como Trabalhar:\n• Adicione classificações ficais ou de gestão interna.\n• Útil para aplicar regras de ICMS diferentes em relatórios financeiros.',
        icon: '🏷️'
    },
    'projetos': {
        title: 'Projetos',
        description: '🎯 Objetivo: Agrupar grandes obras ou contratos (Um projeto contém várias O.S.).\n\n⚙️ Como Trabalhar:\n• Crie um projeto com um código interno e vincule-o a um Cliente.\n• Defina tags específicas (áreas da obra) dentro do projeto.\n• Todas as Ordens de Serviço deverão ser alocadas num Projeto existente.',
        icon: '🏗️'
    },

    // ── ORDENS DE SERVIÇO ───────────────────────────────────────────
    'criar-ordem-servico': {
        title: 'Criar Ordem Serviço',
        description: '🎯 Objetivo: Gerar rapidamente uma O.S. para autorizar o chão de fábrica a produzir.\n\n⚙️ Como Trabalhar:\n• Selecione o Projeto; o sistema limitará as Tags ao projeto escolhido.\n• No campo "Produto Padrão", digite o código do material; a descrição será carregada automaticamente.\n• Defina o "Fator" (quantidades) e o "Tipo de Liberação" (Total/Parcial).\n• Salve para enviar a O.S. diretamente à fila de produção.',
        icon: '📝'
    },
    'ordens-servico': {
        title: 'Ordens de Serviço (O.S.)',
        description: '🎯 Objetivo: Listar, alterar e controlar o documento que manda fabricar algo.\n\n⚙️ Como Trabalhar:\n• Use a busca avançada por "Projeto" ou "Tag" para achar O.S. antigas.\n• Visualize o detalhamento técnico e os arquivos anexados de cada O.S.\n• Permite emitir relatórios de andamento específicos de uma ordem.',
        icon: '📋'
    },

    // ── PLANO DE CORTE ──────────────────────────────────────────────
    'montagem-plano-corte': {
        title: 'Montagem do Plano de Corte',
        description: '🎯 Objetivo: Otimizar aproveitamento de chapa metálica e tubo, juntando O.S. semelhantes.\n\n⚙️ Como Trabalhar:\n• Filtre O.S. por espessura/material idênticos.\n• Marque as caixas das O.S. que vão ser cortadas juntas e "Aglutine".\n• Um lote de corte será criado para o setor primário processar de uma só vez.',
        icon: '✂️'
    },
    'producao-plano-corte': {
        title: 'Produção do Plano de Corte',
        description: '🎯 Objetivo: O operador da máquina de corte informa o que realmente cortou do lote.\n\n⚙️ Como Trabalhar:\n• Localize o lote (Plano de Corte) liberado para seu turno.\n• Insira a quantidade realizada em cada sub-item.\n• Os itens 100% finalizados são enviados automaticamente ao setor subsequente (ex: Dobra).',
        icon: '🪚'
    },

    // ── APONTAMENTO ─────────────────────────────────────────────────
    'apontamento': {
        title: 'Apontamento de Produção',
        description: '🎯 Objetivo: Dizer ao sistema que uma etapa fabril (ex: Solda, Pintura) de uma O.S. foi concluída.\n\n⚙️ Como Trabalhar:\n• Busque a O.S. com código de barras ou numeração.\n• Informe a quantidade boa fabricada e eventuais perdas.\n• Quando a etapa é apontada, o sistema libera a peça para a próxima máquina na fila.\n• Atenção: Não é possível apontar quantidades maiores que as liberadas pela etapa anterior.',
        icon: '⚙️'
    },
    'apontamentos-parciais': {
        title: 'Apontamentos Parciais',
        description: '🎯 Objetivo: Gerenciar O.S. que não foram 100% terminadas no turno.\n\n⚙️ Como Trabalhar:\n• Localize os saldos retidos nas máquinas.\n• Se foram fabricadas 50 de 100, este painel permite visualizar que 50 estão travadas e precisam de novo apontamento.\n• Ideal para líderes de turno encerrarem pendências antigas.',
        icon: '🔢'
    },

    // ── ACOMPANHAMENTO ───────────────────────────────────────────────
    'acompanhamento-geral': {
        title: 'Acompanhamento Geral',
        description: '🎯 Objetivo: Visão macro do status atual da fábrica para diretores e gerentes.\n\n⚙️ Como Trabalhar:\n• Expanda as colunas para ver a evolução de cada etapa (% concluído).\n• Barras de progresso vermelhas indicam atraso severo em relação à previsão.\n• Sem ação operacional: a tela é para consulta gerencial pesada.',
        icon: '📈'
    },
    'visao-geral-producao': {
        title: 'Visão Geral Produção',
        description: '🎯 Objetivo: Painel tático para os líderes e chefes de fábrica.\n\n⚙️ Como Trabalhar:\n• O grid mostra EXATAMENTE onde cada O.S. está parada no momento.\n• Use os botões de ação rápida para redistribuir a carga de máquinas.\n• Monitore os tempos parados nas "filas" (buffers) de cada setor.',
        icon: '🏭'
    },
    'visao-geral-engenharia': {
        title: 'Visão Geral Engenharia',
        description: '🎯 Objetivo: Controlar o "Projeto antes do Projeto" (Cronograma do escritório).\n\n⚙️ Como Trabalhar:\n• Alimente as datas de emissão de Isométricos, Aprovação de Cliente e Entrega.\n• Mantenha as previsões atualizadas para que o chão de fábrica saiba quando os desenhos vão chegar.',
        icon: '🛠️'
    },
    'acompanhamento-etapas': {
        title: 'Visão Geral Engenharia',
        description: '🎯 Objetivo: Controlar o "Projeto antes do Projeto" (Cronograma do escritório).\n\n⚙️ Como Trabalhar:\n• Alimente as datas de emissão de Isométricos, Aprovação de Cliente e Entrega.\n• Mantenha as previsões atualizadas para que o chão de fábrica saiba quando os desenhos vão chegar.',
        icon: '🛠️'
    },

    // ── EXPEDIÇÃO ────────────────────────────────────────────────────
    'romaneio-envio': {
        title: 'Romaneio de Envio',
        description: '🎯 Objetivo: Criar a "nota física" de entrega das peças fabricadas para os caminhões.\n\n⚙️ Como Trabalhar:\n• Selecione Cliente, Transportadora e Placa.\n• Escolha as O.S. (itens) que já estão liberadas pelo Controle de Qualidade.\n• Registre e imprima o PDF oficial com código de barras para o motorista levar.',
        icon: '🚚'
    },
    'romaneio-retorno': {
        title: 'Romaneio de Retorno',
        description: '🎯 Objetivo: Dar baixa de recebimento em materiais que foram terceirizados e estão voltando.\n\n⚙️ Como Trabalhar:\n• Selecione o Romaneio original de envio.\n• Informe que "X" peças voltaram com sucesso, e se alguma não voltou.\n• Retornos completos fecham o ciclo. Retornos parciais mantêm o romaneio original pendente.',
        icon: '↩️'
    },
    'controle-expedicao': {
        title: 'Controle de Expedição',
        description: '🎯 Objetivo: Relatório tático de tudo que está na rua ou na fila de caminhões.\n\n⚙️ Como Trabalhar:\n• Monitore o status da frota e datas de saída.\n• Permite reimprimir cópias de romaneios antigos em caso de extravio.',
        icon: '📦'
    },
    'pendencia-romaneio': {
        title: 'Pendências do Romaneio',
        description: '🎯 Objetivo: Tratar itens rejeitados ou não entregues pelo cliente.\n\n⚙️ Como Trabalhar:\n• Registre a reclamação associada ao Romaneio de Envio.\n• Gere solicitações de correção (RNC) que voltarão à produção para re-trabalho.',
        icon: '⚠️'
    },

    // ── QUALIDADE / PENDÊNCIAS ───────────────────────────────────────
    'visao-geral-pendencias': {
        title: 'Visão Geral de Pendências (RNC)',
        description: '🎯 Objetivo: Painel do Inspetor de Qualidade. Concentra falhas detectadas na linha.\n\n⚙️ Como Trabalhar:\n• Insira a causa raiz do problema e defina quem é o responsável (Setor ou Operador).\n• Aplique as ações corretivas/preventivas.\n• Dê baixa (Fechamento) na pendência quando a peça for reparada.',
        icon: '🔎'
    },
    'pecas-reposicao': {
        title: 'Peças em Reposição',
        description: '🎯 Objetivo: Fabricar "remendos" e peças de perda (scrap) que faltaram numa O.S.\n\n⚙️ Como Trabalhar:\n• Busque a O.S. original.\n• Adicione a solicitação da nova quantidade.\n• Este fluxo cria uma "mini O.S." para que a máquina corte novamente a peça faltante.',
        icon: '🔄'
    },

    // ── TESTE FINAL ──────────────────────────────────────────────────
    'teste-final-montagem': {
        title: 'Teste Final de Montagem',
        description: '🎯 Objetivo: Check-out final da peça antes da expedição. (Inspeção visual e laudos).\n\n⚙️ Como Trabalhar:\n• Puxe a O.S. montada.\n• Marque "Aprovado" se estiver conforme normas, ou "Reprovado" gerando RNC automática.\n• Somente itens "Aprovados" aqui caem no grid de Expedição/Romaneio.',
        icon: '✅'
    },

    // ── DESENHOS / DOCUMENTOS ────────────────────────────────────────
    'pesquisar-desenho': {
        title: 'Pesquisar Desenho Técnico',
        description: '🎯 Objetivo: Livrar a fábrica do uso do papel. Encontre o PDF de qualquer peça.\n\n⚙️ Como Trabalhar:\n• Digite o código da peça ou o projeto.\n• Ao clicar no resultado, o desenho original da engenharia abre diretamente na tela em tela-cheia.\n• Use o zoom do tablet industrial para visualizar cotas em campo.',
        icon: '📐'
    },

    // ── PLANEJAMENTO ─────────────────────────────────────────────────
    'visao-geral-tags': {
        title: 'Visão Geral de Tags Globais',
        description: '🎯 Objetivo: Alteração e gerenciamento em massa do cronograma das obras.\n\n⚙️ Como Trabalhar:\n• Utilize para rolar prazos inteiros de obras atrasadas de uma só vez.\n• Modificar a Data de Previsão de uma Tag altera automaticamente os prazos das O.S. alocadas nela.',
        icon: '🏷️'
    },

    // ── IMPORTAÇÃO E POWERBUILD ──────────────────────────────────────
    'blockset': {
        title: 'Importação Blockset',
        description: '🎯 Objetivo: Ler o Excel exportado diretamente do SolidWorks e transformá-lo em O.S. no sistema.\n\n⚙️ Como Trabalhar:\n• Use o botão de "Carregar Arquivo" e aguarde a validação.\n• O sistema alertará se existem códigos de chapa desconhecidos.\n• Confirme a importação para gerar as O.S. automaticamente.',
        icon: '📤'
    },
    'leitura-dados': {
        title: 'Leitura de Dados',
        description: '🎯 Objetivo: Ingestão de planilhas genéricas de controle legado.\n\n⚙️ Como Trabalhar:\n• Faça upload do XLS/CSV e mapeie as colunas de "Código" e "Quantidade" com o sistema.',
        icon: '📥'
    },
    'lista-planilhas': {
        title: 'Lista de Planilhas',
        description: '🎯 Objetivo: Auditoria do que foi importado no passado.\n\n⚙️ Como Trabalhar:\n• Consulte o histórico para descobrir "quem" importou a planilha X e "quando".\n• Permite reverter lotes importados equivocadamente, desde que não tenham produção apontada.',
        icon: '📑'
    },
    'powerbuild-list': {
        title: 'Lista PowerBuild',
        description: '🎯 Objetivo: Igual à "Lista de Planilhas", focado em integrações PowerBuild.\n\n⚙️ Como Trabalhar:\n• Consulte o histórico e baixe a planilha original importada para checar discrepâncias do projetista.',
        icon: '📑'
    },
    'revisao-itens': {
        title: 'Revisão de Itens',
        description: '🎯 Objetivo: Interface de "Estágio de Triagem" antes da fábrica produzir algo importado.\n\n⚙️ Como Trabalhar:\n• O sistema lista tudo o que foi importado na planilha.\n• Navegue linha a linha para corrigir nomenclaturas quebradas ou matérias-primas ausentes no cadastro central.\n• Ao terminar de revisar, confirme o envio definitivo para o setor fabril.',
        icon: '🔍'
    },
    'powerbuild-revision': {
        title: 'Revisão PowerBuild',
        description: '🎯 Objetivo: Interface de "Estágio de Triagem" antes da fábrica produzir algo importado.\n\n⚙️ Como Trabalhar:\n• Navegue linha a linha para corrigir nomenclaturas quebradas ou matérias-primas ausentes no cadastro.\n• Ao terminar de revisar, confirme o envio definitivo para o setor fabril.',
        icon: '🔍'
    },
    'visualizacao-aglutinacao': {
        title: 'Aglutinação de Itens',
        description: '🎯 Objetivo: Unir O.S. gêmeas geradas por importação antes do corte.\n\n⚙️ Como Trabalhar:\n• O sistema destacará em amarelo O.S. com mesma espessura e material.\n• Clique em "Aglutinar" para fundi-las, fazendo com que a guilhotina ou laser poupem tempo não parando a máquina duas vezes.',
        icon: '🔗'
    },
    'powerbuild-agglutination': {
        title: 'Aglutinação PowerBuild',
        description: '🎯 Objetivo: Unir O.S. gêmeas geradas por importação antes do corte.\n\n⚙️ Como Trabalhar:\n• O sistema destacará em amarelo O.S. com mesma espessura e material.\n• Clique em "Aglutinar" para fundi-las, poupando setup da máquina.',
        icon: '🔗'
    },

    // ── ADMINISTRATIVO E CONFIGURAÇÃO ───────────────────────────────
    'usuarios': {
        title: 'Usuários do Sistema',
        description: '🎯 Objetivo: Controlar quem entra no sistema e as senhas.\n\n⚙️ Como Trabalhar:\n• Busque o colaborador e altere a aba "Acessos".\n• Se a pessoa saiu da empresa, desative-a. Não exclua para manter o histórico de rastreabilidade dela no chão de fábrica.',
        icon: '👥'
    },
    'cadastro-de-usuario': {
        title: 'Cadastro de Usuário',
        description: '🎯 Objetivo: Criar um novo perfil com permissões seguras.\n\n⚙️ Como Trabalhar:\n• Preencha CPF e dados pessoais corretos.\n• Associe a pessoa a um "Setor" para que o tablet do chão de fábrica saiba quais máquinas ele tem direito a apontar produção.',
        icon: '👤'
    },
    'cadastro-usuario': {
        title: 'Cadastro de Usuário',
        description: '🎯 Objetivo: Criar um novo perfil com permissões seguras.\n\n⚙️ Como Trabalhar:\n• Preencha CPF e dados pessoais corretos.\n• Associe a pessoa a um "Setor" para que o tablet da fábrica saiba quais operações ele acessa.',
        icon: '👤'
    },
    'config': {
        title: 'Configurações do Sistema',
        description: '🎯 Objetivo: Parametrizações locais do navegador e do usuário.\n\n⚙️ Como Trabalhar:\n• Alterne visualizações (Modo Escuro).\n• Defina limites de linhas exibidas em tabelas longas para acelerar o PC local.',
        icon: '⚙️'
    },
    'config-sistema': {
        title: 'Configurações Avançadas',
        description: '🎯 Objetivo: Ajuste de variáveis de ambiente sensíveis.\n\n⚙️ Como Trabalhar:\n• Modifique parâmetros globais da empresa, limites de tolerância de erro de maquinário e links de integração. Apenas usuários Administradores Sênior devem operar aqui.',
        icon: '🔧'
    },
    'superadmin': {
        title: 'Painel Superadministrador',
        description: '🎯 Objetivo: Gestão das licenças e clientes multitenant da plataforma.\n\n⚙️ Como Trabalhar:\n• Tela restrita. Use para conectar novos bancos de dados ao sistema e liberar licenças de SaaS. Não afeta a rotina operacional da fábrica.',
        icon: '👑'
    },
    'tarefas': {
        title: 'Tarefas',
        description: '🎯 Objetivo: Kanban interno de recados e requisições para a equipe.\n\n⚙️ Como Trabalhar:\n• Crie tickets para a Engenharia arrumar desenhos, ou para a TI cadastrar novos logins.\n• Arraste os cards pelas colunas (A Fazer, Fazendo, Concluído).',
        icon: '✅'
    },
    'relatorios': {
        title: 'Relatórios',
        description: '🎯 Objetivo: Impressão e PDF dos extratos do mês.\n\n⚙️ Como Trabalhar:\n• Selecione o template desejado (Ex: Kg produzidos por operador).\n• Informe o range de datas, e gere planilhas para a contabilidade ou para o RH calcular bônus fabril.',
        icon: '📊'
    },

    // ── FALLBACK ─────────────────────────────────────────────────────
    'default': {
        title: 'Sobre esta Tela',
        description: '🎯 Objetivo: Gerenciar as informações deste módulo do sistema.\n\n⚙️ Como Trabalhar:\n• Utilize os filtros laterais ou superiores para restringir os registros.\n• No botão "Novo" ou "Ações", você pode incluir novos dados.\n• Em tabelas, procure o ícone de lápis ou lixeira na última coluna para edições.',
        icon: '📌'
    }
};
