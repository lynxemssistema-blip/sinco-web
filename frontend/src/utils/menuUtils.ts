import type { MenuItem } from './iconMap';
import { defaultMenuItems } from './constants';

export const getMergedMenu = (savedMenu: MenuItem[]): MenuItem[] => {
  let menu = [...savedMenu];

  // FORCE override href for Peça Manufaturada regardless of what the DB says
  const fixPecaHref = (items: MenuItem[]) => {
    items.forEach(item => {
      if (item.id === 'peca-manufaturada' || item.id === 'monta-peca-manufaturada' || item.id === 'group_1781618991422' || item.id === 'peça-manufaturada') {
         item.href = '/peca-manufaturada';
      }
      if (item.children) fixPecaHref(item.children);
    });
  };
  fixPecaHref(menu);

  // Force add 'romaneio' parent if missing
  if (!menu.find(item => item.id === 'romaneio')) {
    const romaneioItem = defaultMenuItems.find(item => item.id === 'romaneio');
    if (romaneioItem) menu = [romaneioItem, ...menu];
  }

  // Force add 'visao-geral-producao' if missing
  if (!menu.find(item => item.id === 'visao-geral-producao')) {
    const vgItem = defaultMenuItems.find(item => item.id === 'visao-geral-producao');
    if (vgItem) {
      const apontIdx = menu.findIndex(item => item.id === 'apontamento');
      if (apontIdx >= 0) {
        menu = [...menu.slice(0, apontIdx + 1), vgItem, ...menu.slice(apontIdx + 1)];
      } else {
        menu = [...menu, vgItem];
      }
    }
  }

  // Force add 'acompanhamento-geral' if missing
  if (!menu.find(item => item.id === 'acompanhamento-geral')) {
    const agItem = defaultMenuItems.find(item => item.id === 'acompanhamento-geral');
    if (agItem) {
      const vgIdx = menu.findIndex(item => item.id === 'visao-geral-producao');
      if (vgIdx >= 0) {
        menu = [...menu.slice(0, vgIdx + 1), agItem, ...menu.slice(vgIdx + 1)];
      } else {
        menu = [...menu, agItem];
      }
    }
  }

  // Force add 'acompanhamento-etapas' if missing
  if (!menu.find(item => item.id === 'acompanhamento-etapas')) {
    const aeItem = defaultMenuItems.find(item => item.id === 'acompanhamento-etapas');
    if (aeItem) {
      const agIdx = menu.findIndex(item => item.id === 'acompanhamento-geral');
      if (agIdx >= 0) {
        menu = [...menu.slice(0, agIdx + 1), aeItem, ...menu.slice(agIdx + 1)];
      } else {
        menu = [...menu, aeItem];
      }
    }
  }

  // Explicitly remove 'visao-geral-engenharia' (the new one with Network icon) as requested
  menu = menu.filter(item => item.id !== 'visao-geral-engenharia');

  // Force add 'plano-corte' se missing
  if (!menu.find(item => item.id === 'plano-corte')) {
    const pcItem = defaultMenuItems.find(item => item.id === 'plano-corte');
    if (pcItem) {
      const osIdx = menu.findIndex(item => item.id === 'ordens-servico');
      if (osIdx >= 0) {
        menu = [...menu.slice(0, osIdx + 1), pcItem, ...menu.slice(osIdx + 1)];
      } else {
        menu = [...menu, pcItem];
      }
    }
  }

  // Force add 'controle-expedicao'
  if (!menu.find(item => item.id === 'controle-expedicao')) {
    const ceItem = defaultMenuItems.find(item => item.id === 'controle-expedicao');
    if (ceItem) {
      const vgIdx = menu.findIndex(item => item.id === 'visao-geral-engenharia');
      if (vgIdx >= 0) {
        menu = [...menu.slice(0, vgIdx + 1), ceItem, ...menu.slice(vgIdx + 1)];
      } else {
        menu = [...menu, ceItem];
      }
    }
  }

  // Force add 'teste-final-montagem'
  if (!menu.find(item => item.id === 'teste-final-montagem')) {
    const tfmItem = defaultMenuItems.find(item => item.id === 'teste-final-montagem');
    if (tfmItem) {
        menu = [...menu, tfmItem];
    }
  }

  return menu;
};
