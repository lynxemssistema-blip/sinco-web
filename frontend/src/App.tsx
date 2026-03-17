import { useState, useEffect } from 'react';
import type { MenuItem } from './utils/iconMap';
import { defaultMenuItems } from './utils/constants'; // Import default structure
import { AppLayout } from './layout/AppLayout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AlertProvider } from './contexts/AlertContext';
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

function AppContent() {
  const { user, logout } = useAuth();
  const [activePageId, setActivePageId] = useState('dashboard');
  const [menuItems, setMenuItems] = useState<MenuItem[]>(defaultMenuItems);
  const [selectedRncItem, setSelectedRncItem] = useState<number | null>(null);

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

          // if (!user.isSuperadmin) {
          //   savedMenu = savedMenu.filter(item => item.id !== 'superadmin');
          // }
          setMenuItems(savedMenu);
        } else {
          // If no custom menu, use default.
          // Check if default needs filtering for non-admins?
          // Currently default has superadmin.
          if (!user.isSuperadmin) {
            setMenuItems(defaultMenuItems.filter(item => 
               !(item.id === 'controle-expedicao' && user.dbName !== 'lynxlocal' && user.dbName !== 'alfatec')
            )); 
          } else {
            setMenuItems(defaultMenuItems.filter(item => 
               !(item.id === 'controle-expedicao' && user.dbName !== 'lynxlocal' && user.dbName !== 'alfatec')
            ));
          }
        }
      })
      .catch(err => {
        console.error("Failed to load custom menu, using default.", err);
        if (!user.isSuperadmin) {
          setMenuItems(defaultMenuItems.filter(item => 
            item.id !== 'superadmin' && 
            !(item.id === 'controle-expedicao' && user.dbName !== 'lynxlocal' && user.dbName !== 'alfatec')
          ));
        } else {
          setMenuItems(defaultMenuItems.filter(item => 
             !(item.id === 'controle-expedicao' && user.dbName !== 'lynxlocal' && user.dbName !== 'alfatec')
          ));
        }
      });

    // Handle initial URL mapping (simple version)
    const path = window.location.pathname;
    const foundItem = findItemByHref(defaultMenuItems, path); // Use default for initial load mapping
    if (foundItem) {
      setActivePageId(foundItem.id);
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
      case 'apontamento':
        return <ApontamentoProducaoPage />;
      case 'visao-geral-producao':
        return <VisaoGeralProducaoPage />;
      case 'visao-geral-engenharia':
        return <VisaoGeralEngenhariaPage />;
      case 'controle-expedicao':
        if (user?.dbName !== 'lynxlocal' && user?.dbName !== 'alfatec') return <div className="p-8 text-center text-red-500 font-bold">Acesso Negado</div>;
        return <ControleExpedicaoPage />;
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
        <AppContent />
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
