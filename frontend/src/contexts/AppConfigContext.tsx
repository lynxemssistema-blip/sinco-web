import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

// Chaves do localStorage para preferências situacionais
const LS_FILTRO = 'sinco_planoCorteFiltroDC';
const LS_MAX_REG = 'sinco_maxRegistros';
const LS_PROCESSOS = 'sinco_processosVisiveis';
const LS_RESTRINGIR = 'sinco_restringirApontamento';
const LS_POWER_BUILD = 'sinco_mostrarPowerBuild';
const LS_NOMES_ENGENHARIA = 'sinco_nomesProcessosEngenharia';

interface AppConfig {
 // Da API (regras de negócio persistidas no banco)
 processosVisiveis: string[];
 restringirApontamento: boolean;
 // Do localStorage (preferências situacionais do usuário)
 planoCorteFiltroDC: 'corte' | 'chaparia';
 maxRegistros: number;
 mostrarPowerBuild: boolean;
 nomesProcessosEngenharia: Record<string, string>;
 loaded: boolean;
}

interface AppConfigContextValue extends AppConfig {
 refetchConfig: () => void;
}

const defaultConfig: AppConfig = {
 processosVisiveis: ['corte', 'dobra', 'solda', 'pintura', 'montagem', 'medicao', 'isometrico', 'engenharia', 'aprovacao', 'acabamento', 'expedicao'],
 restringirApontamento: false,
 planoCorteFiltroDC: 'corte',
 maxRegistros: 500,
 mostrarPowerBuild: false,
 nomesProcessosEngenharia: {
 medicao: 'Medição',
 isometrico: 'Isométrico',
 engenharia: 'Engenharia',
 aprovacao: 'Aprovação',
 acabamento: 'Acabamento',
 expedicao: 'Expedição'
 },
 loaded: false,
};;

const AppConfigContext = createContext<AppConfigContextValue>({
 ...defaultConfig,
 refetchConfig: () => {},
});

export function AppConfigProvider({ children }: { children: ReactNode }) {
 const [config, setConfig] = useState<AppConfig>(defaultConfig);
 const [tick, setTick] = useState(0);

 const loadConfig = useCallback(() => {
 // 1. Preferências situacionais: lê do localStorage
 const filtro = localStorage.getItem(LS_FILTRO);
 const maxReg = parseInt(localStorage.getItem(LS_MAX_REG) || '500') || 500;
 const planoCorteFiltroDC: 'corte' | 'chaparia' = filtro === 'chaparia' ? 'chaparia' : 'corte';
 const mostrarPowerBuild = localStorage.getItem(LS_POWER_BUILD) === 'Sim';

 // 2. Regras de negócio: busca da API com fallback para localStorage
 fetch('/api/config')
 .then(res => res.json())
 .then(data => {
 // Setores padrão: TODOS os setores (produção + engenharia) visíveis
 const ENG_SETORES_DEFAULT = ['medicao', 'isometrico', 'engenharia', 'aprovacao', 'acabamento', 'expedicao'];
 let processosVisiveis = ['corte', 'dobra', 'solda', 'pintura', 'montagem', ...ENG_SETORES_DEFAULT];
 let restringirApontamento = false;

 // Tenta ler local primeiro caso seja banco legado ou falha na API
 const localProcessos = localStorage.getItem(LS_PROCESSOS);
 if (localProcessos) {
 try { processosVisiveis = JSON.parse(localProcessos); } catch (_) {}
 }
 const localRestringir = localStorage.getItem(LS_RESTRINGIR);
 if (localRestringir) restringirApontamento = localRestringir === 'Sim';

 let nomesProcessosEngenharia = defaultConfig.nomesProcessosEngenharia;
 const localNomes = localStorage.getItem(LS_NOMES_ENGENHARIA);
 if (localNomes) {
 try { nomesProcessosEngenharia = { ...nomesProcessosEngenharia, ...JSON.parse(localNomes) }; } catch (_) {}
 }

 if (data.success && data.config) {
 const cfg = data.config;
 try {
 if (cfg.ProcessosVisiveis) {
 try {
 processosVisiveis = JSON.parse(cfg.ProcessosVisiveis);
 } catch (_) {}
 }
 } catch (_) {}

 setConfig({
 processosVisiveis,
 restringirApontamento: cfg.RestringirApontamentoSemSaldoAnterior === 'Sim',
 planoCorteFiltroDC,
 maxRegistros: maxReg,
 mostrarPowerBuild,
 nomesProcessosEngenharia,
 loaded: true,
 });
 } else {
 setConfig({
 processosVisiveis,
 restringirApontamento,
 planoCorteFiltroDC,
 maxRegistros: maxReg,
 mostrarPowerBuild,
 nomesProcessosEngenharia,
 loaded: true
 });
 }
 })
 .catch(() => {
 // Fallback total se API offline
 const localProcessos = localStorage.getItem(LS_PROCESSOS);
 // Fallback offline: usa todos os setores como default
 const ENG_SETORES_DEFAULT_FALLBACK = ['medicao', 'isometrico', 'engenharia', 'aprovacao', 'acabamento', 'expedicao'];
 let processosVisiveis = ['corte', 'dobra', 'solda', 'pintura', 'montagem', ...ENG_SETORES_DEFAULT_FALLBACK];
 if (localProcessos) {
 try {
 processosVisiveis = JSON.parse(localProcessos);
 } catch (_) {}
 }
 const localRestringir = localStorage.getItem(LS_RESTRINGIR);
 const restringirApontamento = localRestringir === 'Sim';

 let nomesProcessosEngenharia = defaultConfig.nomesProcessosEngenharia;
 const localNomes = localStorage.getItem(LS_NOMES_ENGENHARIA);
 if (localNomes) {
 try { nomesProcessosEngenharia = { ...nomesProcessosEngenharia, ...JSON.parse(localNomes) }; } catch (_) {}
 }

 setConfig({
 processosVisiveis,
 restringirApontamento,
 planoCorteFiltroDC,
 maxRegistros: maxReg,
 mostrarPowerBuild,
 nomesProcessosEngenharia,
 loaded: true,
 });
 });
 }, []);

 useEffect(() => {
 loadConfig();
 }, [loadConfig, tick]);

 const refetchConfig = useCallback(() => {
 setTick(t => t + 1);
 }, []);

 return (
 <AppConfigContext.Provider value={{ ...config, refetchConfig }}>
 {children}
 </AppConfigContext.Provider>
 );
}

export function useAppConfig(): AppConfigContextValue {
 return useContext(AppConfigContext);
}

/** Utilitário: salva preferências situacionais no localStorage */
export function saveLocalPrefs(prefs: { 
 planoCorteFiltroDC?: string; 
 maxRegistros?: number;
 processosVisiveis?: string[];
 restringirApontamento?: string;
 mostrarPowerBuild?: string;
 nomesProcessosEngenharia?: Record<string, string>;
}) {
 if (prefs.planoCorteFiltroDC !== undefined) {
 localStorage.setItem(LS_FILTRO, prefs.planoCorteFiltroDC);
 }
 if (prefs.maxRegistros !== undefined) {
 localStorage.setItem(LS_MAX_REG, String(prefs.maxRegistros));
 }
 if (prefs.processosVisiveis !== undefined) {
 localStorage.setItem(LS_PROCESSOS, JSON.stringify(prefs.processosVisiveis));
 }
 if (prefs.restringirApontamento !== undefined) {
 localStorage.setItem(LS_RESTRINGIR, prefs.restringirApontamento);
 }
 if (prefs.mostrarPowerBuild !== undefined) {
 localStorage.setItem(LS_POWER_BUILD, prefs.mostrarPowerBuild);
 }
 if (prefs.nomesProcessosEngenharia !== undefined) {
 localStorage.setItem(LS_NOMES_ENGENHARIA, JSON.stringify(prefs.nomesProcessosEngenharia));
 }
}

/** Utilitário: verifica se um setor está visível conforme a configuração */
export function useSectorVisible(sector: string): boolean {
 const config = useAppConfig();
 return config.processosVisiveis.includes(sector.toLowerCase());
}
