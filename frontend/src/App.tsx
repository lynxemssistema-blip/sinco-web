import { useState, useEffect, useRef } from 'react';
import type { MenuItem } from './utils/iconMap';
import { defaultMenuItems } from './utils/constants'; // Import default structure
import { AppLayout } from './layout/AppLayout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AlertProvider } from './contexts/AlertContext';
import { AppConfigProvider } from './contexts/AppConfigContext';
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
import OrdemServicoPage from './pages/OrdemServico';
import ApontamentoProducaoPage from './pages/ApontamentoProducao';
import ConfiguracaoPage from './pages/Configuracao';
import ConfiguracaoSistemaPage from './pages/ConfiguracaoSistema';
import UsuarioPage from './pages/Usuario';
import CameraPage from './pages/Camera';
import SuperadminPage from './pages/Superadmin';
import RomaneioPage from './pages/Romaneio';
import PendenciaRomaneioPage from './pages/PendenciaRomaneio';
import RomaneioRetornoPage from './pages/RomaneioRetorno';
import VisaoGeralProducaoPage from './pages/VisaoGeralProducao';
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
function AppContent() {
  const { user, logout } = useAuth();
  const [activePageId, setActivePageId] = useState('dashboard');
  const [menuItems, setMenuItems] = useState<MenuItem[]>(defaultMenuItems);
  const [selectedRncItem, setSelectedRncItem] = useState<number | null>(null);
  const hasInitialized = useRef(false); // prevent URL mapping from running more than once

  useEffect(() => {
    if (!user) return; // Don't fetch if not logged in

    // Fetch menu structure from backend
    fetch('/api/config/menu')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.menu) {
          let savedMenu: MenuItem[] = data.menu;

          // Ensure Superadmin menu is always visible
          if (!savedMenu.find(item => item.id === 'superadmin')) {
            const superadminItem = defaultMenuItems.find(item => item.id === 'superadmin');
            if (superadminItem) {
              savedMenu = [...savedMenu, superadminItem];
            }
          }

          // Force add 'romaneio' parent if missing
          if (!savedMenu.find(item => item.id === 'romaneio')) {
            const romaneioItem = defaultMenuItems.find(item => item.id === 'romaneio');
            if (romaneioItem) {
              savedMenu = [romaneioItem, ...savedMenu];
            }
          }

          // Force add 'visao-geral-producao' if missing
          if (!savedMenu.find(item => item.id === 'visao-geral-producao')) {
            const vgItem = defaultMenuItems.find(item => item.id === 'visao-geral-producao');
            if (vgItem) {
              const apontIdx = savedMenu.findIndex(item => item.id === 'apontamento');
              if (apontIdx >= 0) {
                savedMenu = [...savedMenu.slice(0, apontIdx + 1), vgItem, ...savedMenu.slice(apontIdx + 1)];
              } else {
                savedMenu = [...savedMenu, vgItem];
              }
            }
          }

          // Force add 'visao-geral-engenharia' if missing
          if (!savedMenu.find(item => item.id === 'visao-geral-engenharia')) {
            const veItem = defaultMenuItems.find(item => item.id === 'visao-geral-engenharia');
            if (veItem) {
              const vgIdx = savedMenu.findIndex(item => item.id === 'visao-geral-producao');
              if (vgIdx >= 0) {
                savedMenu = [...savedMenu.slice(0, vgIdx + 1), veItem, ...savedMenu.slice(vgIdx + 1)];
              } else {
                savedMenu = [...savedMenu, veItem];
              }
            }
          }

          // Force add 'plano-corte' se missing
          if (!savedMenu.find(item => item.id === 'plano-corte')) {
            const pcItem = defaultMenuItems.find(item => item.id === 'plano-corte');
            if (pcItem) {
              const osIdx = savedMenu.findIndex(item => item.id === 'ordens-servico');
              if (osIdx >= 0) {
                savedMenu = [...savedMenu.slice(0, osIdx + 1), pcItem, ...savedMenu.slice(osIdx + 1)];
              } else {
                savedMenu = [...savedMenu, pcItem];
              }
            }
          }

          // Force add 'controle-expedicao' if it belongs to lynxlocal or alfatec
          if (user.dbName === 'lynxlocal' || user.dbName === 'alfatec') {
            if (!savedMenu.find(item => item.id === 'controle-expedicao')) {
              const ceItem = defaultMenuItems.find(item => item.id === 'controle-expedicao');
              if (ceItem) {
                const vgIdx = savedMenu.findIndex(item => item.id === 'visao-geral-engenharia');
                if (vgIdx >= 0) {
                  savedMenu = [...savedMenu.slice(0, vgIdx + 1), ceItem, ...savedMenu.slice(vgIdx + 1)];
                } else {
                  savedMenu = [...savedMenu, ceItem];
                }
              }
            }
          } else {
             // Remove it if present and user is not one of those dbNames
             savedMenu = savedMenu.filter(item => item.id !== 'controle-expedicao');
          }

          // Force add 'teste-final-montagem' restrito a alfatec2 e lynxlocal
          const TFM_BANKS = ['lynxlocal', 'alfatec2'];
          if (TFM_BANKS.includes(user.dbName ?? '')) {
            if (!savedMenu.find(item => item.id === 'teste-final-montagem')) {
              const tfmItem = defaultMenuItems.find(item => item.id === 'teste-final-montagem');
              if (tfmItem) {
                const ceIdx = savedMenu.findIndex(item => item.id === 'controle-expedicao');
                if (ceIdx >= 0) {
                  savedMenu = [...savedMenu.slice(0, ceIdx + 1), tfmItem, ...savedMenu.slice(ceIdx + 1)];
                } else {
                  savedMenu = [...savedMenu, tfmItem];
                }
              }
            }
          } else {
            savedMenu = savedMenu.filter(item => item.id !== 'teste-final-montagem');
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

          // Force add 'cadastro-usuarios' group if missing (Check by ID and label to avoid duplicates)
          const hasCadastro = savedMenu.some(item => 
            item.id === 'cadastro-usuarios' || 
            item.label.toLowerCase() === 'cadastro usuarios'
          );

          if (!hasCadastro) {
            const cuItem = defaultMenuItems.find(item => item.id === 'cadastro-usuarios');
            if (cuItem) {
              const usrIdx = savedMenu.findIndex(item => item.id === 'usuarios');
              if (usrIdx >= 0) {
                savedMenu = [...savedMenu.slice(0, usrIdx + 1), cuItem, ...savedMenu.slice(usrIdx + 1)];
              } else {
                savedMenu = [...savedMenu, cuItem];
              }
            }
          }

          setMenuItems(sortMenuRecursive(savedMenu));
        } else {
          const filtered = defaultMenuItems.filter(item => 
             !(item.id === 'controle-expedicao' && user.dbName !== 'lynxlocal' && user.dbName !== 'alfatec')
          );
          setMenuItems(sortMenuRecursive(filtered));
        }
      })
      .catch(err => {
        console.error("Failed to load custom menu, using default.", err);
        const filtered = defaultMenuItems.filter(item => {
          if (!user.isSuperadmin && item.id === 'superadmin') return false;
          if (item.id === 'controle-expedicao' && user.dbName !== 'lynxlocal' && user.dbName !== 'alfatec') return false;
          return true;
        });
        setMenuItems(sortMenuRecursive(filtered));
      });

    // Handle initial URL mapping — only once on first load
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      const path = window.location.pathname;
      const foundItem = findItemByHref(defaultMenuItems, path);
      if (foundItem) {
        setActivePageId(foundItem.id);
      }
    }
  }, [user]);

  const handleNavigate = (id: string) => {
    const item = findItemById(menuItems, id);
    if (item && item.href) {
      window.history.pushState({}, '', item.href);
    }
    setActivePageId(id);
  };

  // Helper to find item label for header
  const getActiveLabel = () => {
    const item = findItemById(menuItems, activePageId);
    return item ? item.label : 'Dashbaord';
  };

  const handleSmartLogout = () => {
    // 1. Check if masquerading (Entity impersonation)
    const storedSA = localStorage.getItem('original_superadmin');
    if (storedSA) {
      try {
        const saData = JSON.parse(storedSA);
        if (saData.active) {
          // Restore Superadmin Context
          const superadminUser = {
            id: 1,
            nome: 'Superadmin',
            login: saData.originalLogin || 'superadmin',
            role: 'admin',
            isSuperadmin: true,
            superadmin: 'S'
          };

          localStorage.setItem('sinco_user', JSON.stringify(superadminUser));
          window.location.href = '/superadmin';
          return;
        }
      } catch (e) {
        console.error("Error parsing superadmin state", e);
      }
    }

    // 2. Check if the current user is explicitly a Superadmin ('S')
    // "caso o conteudo do campo 'superadmin' ... seja dieferente de 'S', fechar o app, se não voltar para tela anterior"
    if (user && user.superadmin === 'S') {
      // "Voltar para tela anterior" -> In this context, it implies going to the Superadmin Panel
      window.location.href = '/superadmin';
      return;
    }

    // Fallback/Standard Logout ("fechar o app")
    logout();
  };

  const renderPage = () => {
    switch (activePageId) {
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
      case 'tipos-produto':
        return <TipoProdutoPage />;
      case 'ordens-servico':
        return <OrdemServicoPage />;
      case 'montagem-plano-corte':
        return <MontagemPlanoCortePage />;
      case 'producao-plano-corte':
        return <ProducaoPlanoCortePage />;
      case 'apontamento':
        return <ApontamentoProducaoPage />;
      case 'visao-geral-producao':
        return <VisaoGeralProducaoPage />;
      case 'visao-geral-engenharia':
        return <VisaoGeralEngenhariaPage />;
      case 'controle-expedicao':
        if (user?.dbName !== 'lynxlocal' && user?.dbName !== 'alfatec') return <div className="p-8 text-center text-red-500 font-bold">Acesso Negado</div>;
        return <ControleExpedicaoPage />;
      case 'teste-final-montagem':
        if (user?.dbName !== 'lynxlocal' && user?.dbName !== 'alfatec2') return <div className="p-8 text-center text-red-500 font-bold">Acesso Negado</div>;
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
      case 'usuarios':
        if (user?.login === 'SUPERADMIN' || user?.isSuperadmin) {
          return <SuperadminPage defaultTab="users" />;
        }
        return <UsuarioPage />;
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
        if (!user?.role || user.role !== 'admin') {
          return <div className="p-8 text-center text-red-500 font-bold">Acesso Negado - Apenas Administradores</div>;
        }
        return <ConfiguracaoSistemaPage />;
      case 'superadmin':
        return <SuperadminPage />;
      default:
        // Handle custom pages or IDs dynamically if needed, for now fallback to Dashboard
        return <DashboardPage onNavigate={handleNavigate} />;
    }
  };

  if (!user) {
    return <LoginPage />;
  }

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
