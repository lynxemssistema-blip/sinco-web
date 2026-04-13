import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

// Chaves do localStorage para preferências situacionais
const LS_FILTRO = 'sinco_planoCorteFiltroDC';
const LS_MAX_REG = 'sinco_maxRegistros';
const LS_PROCESSOS = 'sinco_processosVisiveis';
const LS_RESTRINGIR = 'sinco_restringirApontamento';

interface AppConfig {
    // Da API (regras de negócio persistidas no banco)
    processosVisiveis: string[];
    restringirApontamento: boolean;
    // Do localStorage (preferências situacionais do usuário)
    planoCorteFiltroDC: 'corte' | 'chaparia';
    maxRegistros: number;
    loaded: boolean;
}

interface AppConfigContextValue extends AppConfig {
    refetchConfig: () => void;
}

const defaultConfig: AppConfig = {
    processosVisiveis: ['corte', 'dobra', 'solda', 'pintura', 'montagem'],
    restringirApontamento: false,
    planoCorteFiltroDC: 'corte',
    maxRegistros: 500,
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

        // 2. Regras de negócio: busca da API com fallback para localStorage
        fetch('/api/config')
            .then(res => res.json())
            .then(data => {
                let processosVisiveis = ['corte', 'dobra', 'solda', 'pintura', 'montagem'];
                let restringirApontamento = false;

                // Tenta ler local primeiro caso seja banco legado ou falha na API
                const localProcessos = localStorage.getItem(LS_PROCESSOS);
                if (localProcessos) {
                    try { processosVisiveis = JSON.parse(localProcessos); } catch (_) {}
                }
                const localRestringir = localStorage.getItem(LS_RESTRINGIR);
                if (localRestringir) restringirApontamento = localRestringir === 'Sim';

                if (data.success && data.config) {
                    const cfg = data.config;
                    try {
                        if (cfg.ProcessosVisiveis) {
                            processosVisiveis = JSON.parse(cfg.ProcessosVisiveis);
                        }
                    } catch (_) {}

                    setConfig({
                        processosVisiveis,
                        restringirApontamento: cfg.RestringirApontamentoSemSaldoAnterior === 'Sim',
                        planoCorteFiltroDC,
                        maxRegistros: maxReg,
                        loaded: true,
                    });
                } else {
                    setConfig({
                        processosVisiveis,
                        restringirApontamento,
                        planoCorteFiltroDC,
                        maxRegistros: maxReg,
                        loaded: true
                    });
                }
            })
            .catch(() => {
                // Fallback total se API offline
                const localProcessos = localStorage.getItem(LS_PROCESSOS);
                let processosVisiveis = ['corte', 'dobra', 'solda', 'pintura', 'montagem'];
                if (localProcessos) {
                    try { processosVisiveis = JSON.parse(localProcessos); } catch (_) {}
                }
                const localRestringir = localStorage.getItem(LS_RESTRINGIR);
                const restringirApontamento = localRestringir === 'Sim';

                setConfig({
                    processosVisiveis,
                    restringirApontamento,
                    planoCorteFiltroDC,
                    maxRegistros: maxReg,
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
}

/** Utilitário: verifica se um setor está visível conforme a configuração */
export function useSectorVisible(sector: string): boolean {
    const config = useAppConfig();
    return config.processosVisiveis.includes(sector.toLowerCase());
}
