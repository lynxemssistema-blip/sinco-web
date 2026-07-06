import { useState, useEffect, useRef } from 'react';
import type { MenuItem } from './utils/iconMap';
import { defaultMenuItems } from './utils/constants'; // Import default structure
import { getMergedMenu } from './utils/menuUtils';
import { AppLayout } from './layout/AppLayout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AlertProvider } from './contexts/AlertContext';
import { AppConfigProvider, useAppConfig } from './contexts/AppConfigContext';
import LoginPage from './pages/Login';

// Pages
import DashboardPage from './pages/Dashboard';
import PessoaJuridicaPage from './pages/PessoaJuridica';
import UnidadeMedidaPage from './pages/UnidadeMedida';
import FamiliaPage from './pages/Familia';
import AcabamentoPage from './pages/Acabamento';
import MaterialPage from './pages/Material';
import ProjetoPage from './pages/Projeto';
import TipoProdutoPage from './pages/TipoProduto';
import SetorPage from './pages/Setor';
import RecursoFabricacaoPage from './pages/RecursoFabricacao';
import MotoristaPage from './pages/Motorista';
import OrdemServicoPage from './pages/OrdemServico';
import ApontamentoProducaoPage from './pages/ApontamentoProducao';
import ApontamentoProducaoRecursoPage from './pages/ApontamentoProducaoRecurso';
import ApontamentosParciaisPage from './pages/ApontamentosParciais';
import ConfiguracaoPage from './pages/Configuracao';
import ConfiguracaoSistemaPage from './pages/ConfiguracaoSistema';
import UsuarioPage from './pages/Usuario';
import CameraPage from './pages/Camera';
import SuperadminPage from './pages/Superadmin';
import RomaneioPage from './pages/Romaneio';
import PendenciaRomaneioPage from './pages/PendenciaRomaneio';
import RomaneioRetornoPage from './pages/RomaneioRetorno';
import VisaoGeralProducaoPage from './pages/VisaoGeralProducao';
import AcompanhamentoGeralPage from './pages/AcompanhamentoGeral';
import AcompanhamentoEtapasPage from './pages/AcompanhamentoEtapas';
import VisaoGeralEngenhariaPage from './pages/VisaoGeralEngenharia';
import ControleExpedicaoPage from './pages/ControleExpedicao';
import PesquisarDesenhoPage from './pages/PesquisarDesenho';
import TarefasPage from './pages/Tarefas';
import VisaoGeralPendenciasPage from './pages/VisaoGeralPendencias';
import ListaReposicaoPage from './pages/ListaReposicao';
import MontagemPlanoCortePage from './pages/MontagemPlanoCorte';
import ProducaoPlanoCortePage from './pages/ProducaoPlanoCorte';
import TesteFinalMontagemPage from './pages/TesteFinalMontagem';
import CadastroUsuarioPage from './pages/CadastroUsuario';
import LoginAcessoPage from './pages/LoginAcesso';
import BlockSetPage from './pages/BlockSet/BlockSet';
import PowerBuildListPage from './pages/BlockSet/PowerBuildList';
import PowerBuildImportPage from './pages/BlockSet/PowerBuildImport';
import PowerBuildRevisionPage from './pages/BlockSet/PowerBuildRevision';
import PowerBuildAgglutinationPage from './pages/BlockSet/PowerBuildAgglutination';
import MontaPecaManufaturadaPage from './pages/MontaPecaManufaturada';
import CriarOrdemServicoPage from './pages/CriarOrdemServico';

function AppContent() {
  const { user, logout, token } = useAuth();
  const { mostrarPowerBuild } = useAppConfig();
  const [activePageId, setActivePageId] = useState('dashboard');
  const [menuItems, setMenuItems] = useState<MenuItem[]>(defaultMenuItems);
  const [selectedRncItem, setSelectedRncItem] = useState<number | null>(null);
  const hasInitialized = useRef(false); // prevent URL mapping from running more than once

  // Autenticação local obrigatória: verifica se o usuário já autenticou contra a tabela usuario do banco ativo
  const [isLocallyAuthenticated, setIsLocallyAuthenticated] = useState<boolean>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('sinco_user') || '{}');
      const dbName = stored.dbName || '';
      return sessionStorage.getItem(`sinco_local_auth_${dbName}`) === 'true';
    } catch { return false; }
  });

  useEffect(() => {
    const loadMenu = () => {
      if (!user) return; // Don't fetch if not logged in

      // Fetch menu structure from backend
      fetch(`/api/config/menu?t=${Date.now()}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.menu) {
          let savedMenu: MenuItem[] = data.menu;

          savedMenu = getMergedMenu(savedMenu);

          // Force add 'power-build' (Power Build) dependendo apenas da configuração mostrarPowerBuild
          if (mostrarPowerBuild) {
            if (!savedMenu.find(item => item.id === 'power-build')) {
              const pbItem = defaultMenuItems.find(item => item.id === 'power-build');
              if (pbItem) {
                savedMenu = [...savedMenu, pbItem];
              }
            }
          } else {
             savedMenu = savedMenu.filter(item => item.id !== 'power-build');
          }

          
          // Force add 'recursos-fabricacao' if missing
          if (!savedMenu.find(item => item.id === 'recursos-fabricacao')) {
            const rfItem = defaultMenuItems.find(item => item.id === 'recursos-fabricacao');
            if (rfItem) {
              savedMenu.push(rfItem);
            }
          }

          // Force add 'pesquisar-desenho' if missing
          if (!savedMenu.find(item => item.id === 'pesquisar-desenho')) {
            const pdItem = defaultMenuItems.find(item => item.id === 'pesquisar-desenho');
            if (pdItem) {
              const ceIdx = savedMenu.findIndex(item => item.id === 'controle-expedicao');
              if (ceIdx >= 0) {
                savedMenu = [...savedMenu.slice(0, ceIdx + 1), pdItem, ...savedMenu.slice(ceIdx + 1)];
              } else {
                savedMenu = [...savedMenu, pdItem];
              }
            }
          }

          // Force add 'tarefas' if missing
          if (!savedMenu.find(item => item.id === 'tarefas')) {
            const tarefasItem = defaultMenuItems.find(item => item.id === 'tarefas');
            if (tarefasItem) {
              const pdIdx = savedMenu.findIndex(item => item.id === 'pesquisar-desenho');
              if (pdIdx >= 0) {
                savedMenu = [...savedMenu.slice(0, pdIdx + 1), tarefasItem, ...savedMenu.slice(pdIdx + 1)];
              } else {
                savedMenu = [...savedMenu, tarefasItem];
              }
            }
          }

          // Force add 'visao-geral-pendencias' if missing
          if (!savedMenu.find(item => item.id === 'visao-geral-pendencias')) {
            const vgpItem = defaultMenuItems.find(item => item.id === 'visao-geral-pendencias');
            if (vgpItem) {
              const tarefasIdx = savedMenu.findIndex(item => item.id === 'tarefas');
              if (tarefasIdx >= 0) {
                // Insere logo apos asTarefas
                savedMenu = [...savedMenu.slice(0, tarefasIdx + 1), vgpItem, ...savedMenu.slice(tarefasIdx + 1)];
              } else {
                savedMenu = [...savedMenu, vgpItem];
              }
            }
          }

          // Force add 'pecas-reposicao' se missing
          if (!savedMenu.find(item => item.id === 'pecas-reposicao')) {
            const repoItem = defaultMenuItems.find(item => item.id === 'pecas-reposicao');
            if (repoItem) {
              const vgpIdx = savedMenu.findIndex(item => item.id === 'visao-geral-pendencias');
              if (vgpIdx >= 0) {
                savedMenu = [...savedMenu.slice(0, vgpIdx + 1), repoItem, ...savedMenu.slice(vgpIdx + 1)];
              } else {
                savedMenu = [...savedMenu, repoItem];
              }
            }
          }

          // Force add 'apontamentos-parciais' if missing
          if (!savedMenu.find(item => item.id === 'apontamentos-parciais')) {
            const apItem = defaultMenuItems.find(item => item.id === 'apontamentos-parciais');
            if (apItem) {
              const baseIdx = savedMenu.findIndex(item => item.id === 'apontamento');
              if (baseIdx >= 0) {
                savedMenu = [...savedMenu.slice(0, baseIdx + 1), apItem, ...savedMenu.slice(baseIdx + 1)];
              } else {
                savedMenu = [...savedMenu, apItem];
              }
            }
          }

          // Remove any manually-created 'Login' entries from the menu
          savedMenu = savedMenu.filter(item => item.id !== 'login' && item.label?.toLowerCase() !== 'login');

          let finalMenu = savedMenu;
          if (!isSuperUser) {
            finalMenu = savedMenu.filter(item =>
              item.id !== 'superadmin' &&
              !(item.id === 'controle-expedicao' && user.dbName !== 'lynxlocal' && user.dbName !== 'alfatec2') &&
              !(item.id === 'teste-final-montagem' && user.dbName !== 'lynxlocal' && user.dbName !== 'alfatec2')
            );
          }
          setMenuItems(sortMenuRecursive(finalMenu));
        } else {
          // Menu não salvo: superadmins recebem tudo
          const isSuperDefault =
            user.isSuperadmin === true ||
            user.superadmin === 'S' ||
            user.login?.toLowerCase() === 'superadmin';
          if (isSuperDefault) {
            setMenuItems(sortMenuRecursive(defaultMenuItems));
          } else {
            // Qualquer outro usuário: menu sem SuperAdmin
            const filtered = defaultMenuItems.filter(item =>
              item.id !== 'superadmin' &&
              !(item.id === 'controle-expedicao' && user.dbName !== 'lynxlocal' && user.dbName !== 'alfatec2') &&
              !(item.id === 'teste-final-montagem' && user.dbName !== 'lynxlocal' && user.dbName !== 'alfatec2')
            );
            setMenuItems(sortMenuRecursive(filtered));
          }
        }
      })
      .catch(err => {
        console.error('Failed to load custom menu, using default.', err);
        const isSuperFallback =
          user.isSuperadmin === true ||
          user.superadmin === 'S' ||
          user.login?.toLowerCase() === 'superadmin';
        if (isSuperFallback) {
          setMenuItems(sortMenuRecursive(defaultMenuItems));
          return;
        }
        const filtered = defaultMenuItems.filter(item => {
          if (item.id === 'superadmin') return false;
          
          return true;
        });
        setMenuItems(sortMenuRecursive(filtered));
      });


    // Handle initial URL mapping — only once on first load
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      const path = window.location.pathname;
      if (path.startsWith('/blockset')) {
        setActivePageId('blockset');
      } else {
        const foundItem = findItemByHref(defaultMenuItems, path);
        if (foundItem) {
          setActivePageId(foundItem.id);
        }
      }
    }
  };

  loadMenu();

  window.addEventListener('sinco_menu_updated', loadMenu);
  return () => window.removeEventListener('sinco_menu_updated', loadMenu);
}, [user, mostrarPowerBuild]);

    const handleNavigate = (id: string) => {
    // Busca a href correta no defaultMenuItems invés do menuItems (que pode vir corrompido do DB)
    const staticItem = findItemById(defaultMenuItems, id);
    if (staticItem && staticItem.href) {
      window.history.pushState({}, '', staticItem.href);
    } else {
      const item = findItemById(menuItems, id);
      if (item && item.href) {
        window.history.pushState({}, '', item.href);
      }
    }
    setActivePageId(id);
  };

  // Helper to find item label for header
  const getActiveLabel = () => {
    const item = findItemById(menuItems, activePageId);
    return item ? item.label : 'Dashbaord';
  };

  const handleSmartLogout = () => {
    // Limpa flag de autenticação local ao fazer logoff
    const dbName = user?.dbName || '';
    sessionStorage.removeItem(`sinco_local_auth_${dbName}`);
    setIsLocallyAuthenticated(false);
    logout();
  };

  
  
  const renderPage = () => {
    let resolvedId = activePageId;
    const dynamicItem = findItemById(menuItems, activePageId);
    if (dynamicItem) {
      const staticMatch = 
        (dynamicItem.href ? findItemByHref(defaultMenuItems, dynamicItem.href) : null) || 
        defaultMenuItems.find(i => i.label === dynamicItem.label);
        
      if (staticMatch) {
        resolvedId = staticMatch.id;
      } else if (dynamicItem.label && dynamicItem.label.toLowerCase().includes('recurso')) {
        resolvedId = 'recursos-fabricacao';
      }
    }

    switch (resolvedId) {


      case 'dashboard':
        return <DashboardPage onNavigate={handleNavigate} />;
      case 'camera':
        return <CameraPage />;
      case 'calendario':
        return <div className="p-8 text-center text-gray-500">Módulo de Calendário em Desenvolvimento</div>;
      case 'pessoa-juridica':
        return <PessoaJuridicaPage />;
      case 'unidades-medida':
        return <UnidadeMedidaPage />;
      case 'familia':
        return <FamiliaPage />;
      case 'acabamento':
        return <AcabamentoPage />;
      case 'materiais':
        return <MaterialPage />;
      case 'projetos':
        return <ProjetoPage />;
      case 'recursos-fabricacao':
        return <RecursoFabricacaoPage />;
      case 'tipos-produto':
        return <TipoProdutoPage />;
      case 'setor':
      case 'group_1781115534701':
      case 'cadastros_setor':
        return <SetorPage />;
      case 'motorista':
      case 'group_1781115591581':
      case 'cadastros_motorista':
        return <MotoristaPage />;
      case 'ordens-servico':
        return <OrdemServicoPage />;
      case 'criar-ordem-servico':
        return <CriarOrdemServicoPage />;
      case 'montagem-plano-corte':
        return <MontagemPlanoCortePage />;
      case 'producao-plano-corte':
        return <ProducaoPlanoCortePage />;
      case 'apontamento':
        return <ApontamentoProducaoPage />;
      case 'apontamento-producao-recurso':
        return <ApontamentoProducaoRecursoPage />;
      case 'apontamentos-parciais':
        return <ApontamentosParciaisPage />;
      case 'acompanhamento-geral':
        return <AcompanhamentoGeralPage />;
      case 'acompanhamento-etapas':
        return <AcompanhamentoEtapasPage />;
      case 'visao-geral-producao':
        return <VisaoGeralProducaoPage />;
      case 'visao-geral-engenharia':
        return <VisaoGeralEngenhariaPage />;
      case 'controle-expedicao':
        
        return <ControleExpedicaoPage />;
      case 'teste-final-montagem':
        
        return <TesteFinalMontagemPage />;
      case 'pesquisar-desenho':
        return <PesquisarDesenhoPage />;
      case 'tarefas':
        return <TarefasPage />;
      case 'visao-geral-pendencias':
        return <VisaoGeralPendenciasPage />;
      case 'pecas-reposicao':
        return <ListaReposicaoPage />;
      case 'relatorios':
        return <div className="p-8 text-center text-gray-500">Módulo de Relatórios em Desenvolvimento</div>;
      case 'sst':
        return <div className="p-8 text-center text-gray-500">Módulo SST em Desenvolvimento</div>;
      case 'cipa':
        return <div className="p-8 text-center text-gray-500">Módulo CIPA em Desenvolvimento</div>;
      case 'sgq':
        return <div className="p-8 text-center text-gray-500">Módulo SGQ em Desenvolvimento</div>;
      case 'usuarios': {
        const isSuperOnUsuarios =
          user?.isSuperadmin === true ||
          user?.superadmin === 'S' ||
          user?.login?.toLowerCase() === 'superadmin' ||
          (user?.role === 'admin' && user?.dbName === 'lynxlocal');
        if (isSuperOnUsuarios) {
          return <SuperadminPage defaultTab="users" />;
        }
        return <UsuarioPage />;
      }
      case 'cadastro-de-usuario':
      case 'cadastro-usuario':
      case 'group_1775495483371':
        return <CadastroUsuarioPage />;
      case 'config':
        return <ConfiguracaoPage />;
      case 'romaneio-envio':
        return <RomaneioPage onNavigate={handleNavigate} onSetRncItem={setSelectedRncItem} />;
      case 'romaneio-retorno':
        return <RomaneioRetornoPage />;
      case 'pendencia-romaneio':
        return <PendenciaRomaneioPage onNavigate={handleNavigate} idRomaneioItem={selectedRncItem} />;
      case 'config-sistema':
        const isMasterOrSuper = user?.isSuperadmin || user?.login?.toLowerCase() === 'superadmin' || user?.login?.toLowerCase() === 'admin';
        if (!isMasterOrSuper) {
          return <div className="p-8 text-center text-red-500 font-bold">Acesso Negado - Apenas o usuário Admin ou Superadmin pode acessar.</div>;
        }
        return <ConfiguracaoSistemaPage />;
      case 'superadmin':
        return <SuperadminPage />;
      case 'login':
        return <LoginAcessoPage />;
      case 'blockset':
        return <BlockSetPage />;
      case 'leitura-dados':
      case 'powerbuild-import':
        return <PowerBuildImportPage />;
      case 'lista-planilhas':
      case 'powerbuild-list':
        return <PowerBuildListPage onNavigate={handleNavigate} />;
      case 'revisao-itens':
      case 'powerbuild-revision':
        return <PowerBuildRevisionPage />;
      case 'visualizacao-aglutinacao':
      case 'powerbuild-agglutination':
        return <PowerBuildAgglutinationPage onNavigate={handleNavigate} />;
      case 'peça-manufaturada':
      case 'peca-manufaturada':
      case 'group_1781618991422':
      case 'monta-peca-manufaturada':
        return <MontaPecaManufaturadaPage usuario={user?.nomeCompleto || user?.login} />;
      default:
        // Handle custom pages or IDs dynamically if needed, for now fallback to Dashboard
        return <DashboardPage onNavigate={handleNavigate} />;
    }
  };

  if (!user) {
    return <LoginPage />;
  }

  const isSuperUser =
    user?.isSuperadmin === true ||
    user?.superadmin === 'S' ||
    user?.login?.toLowerCase() === 'superadmin';

  // O segundo login foi removido conforme solicitado para evitar que o pedido de login se repita.

  return (
    <AppLayout
      menuItems={menuItems}
      activePageId={activePageId}
      activeLabel={getActiveLabel()}
      onNavigate={handleNavigate}
      onLogout={handleSmartLogout}
      user={user}
    >
      {renderPage()}
    </AppLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AlertProvider>
        <AppConfigProvider>
          <AppContent />
        </AppConfigProvider>
      </AlertProvider>
    </AuthProvider>
  );
}

// Helpers
const findItemByHref = (items: MenuItem[], href: string): MenuItem | undefined => {
  for (const item of items) {
    if (item.href === href) return item;
    if (item.children) {
      const found = findItemByHref(item.children, href);
      if (found) return found;
    }
  }
  return undefined;
};

const findItemById = (items: MenuItem[], id: string): MenuItem | undefined => {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.children) {
      const found = findItemById(item.children, id);
      if (found) return found;
    }
  }
  return undefined;
};

const sortMenuRecursive = (items: MenuItem[]): MenuItem[] => {
  return [...items]
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
    .map(item => ({
      ...item,
      children: item.children ? sortMenuRecursive(item.children) : undefined
    }));
};
