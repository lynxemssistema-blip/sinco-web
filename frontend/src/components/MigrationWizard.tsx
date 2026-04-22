import { useState } from 'react';
import { Database, CheckCircle, AlertTriangle, Loader2, Play, Key, Bot } from 'lucide-react';
import { cn } from '../lib/cn'; // Fixed import path

// Types
type Step = 'credentials' | 'config' | 'ai-config' | 'migrating' | 'complete';

export function MigrationWizard() {
    const [step, setStep] = useState<Step>('credentials');
    const [credentials, setCredentials] = useState({
        url: 'https://hwdbefopvpuxdostjxxt.supabase.co',
        key: '',
        password: ''
    });
    const [isTestLoading, setIsTestLoading] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message?: string } | null>(null);

    const [config, setConfig] = useState({
        createTables: true,
        migrateData: true,
        aiContext: '',
        llmApiKey: ''
    });

    const [migrationLog, setMigrationLog] = useState<string[]>([]);
    const [isMigrating, setIsMigrating] = useState(false);
    const [activeDB, setActiveDB] = useState<'mysql' | 'postgres'>('mysql');

    // Fetch initial active DB
    useState(() => {
        fetch('http://localhost:3000/api/admin/get-database')
            .then(res => res.json())
            .then(data => {
                if (data.success) setActiveDB(data.active);
            });
    });

    const handleSwitchDatabase = async (type: 'mysql' | 'postgres') => {
        if (type === 'postgres' && (!credentials.url || !credentials.password)) {
            alert("Preencha URL e Senha na etapa de Conexão antes de trocar.");
            return;
        }

        try {
            let config = null;
            if (type === 'postgres') {
                // Parse URL to get host/db/user/port
                try {
                    const projectRef = credentials.url.split('//')[1].split('.')[0];
                    const host = `db.${projectRef}.supabase.co`;
                    config = {
                        user: 'postgres',
                        host: host,
                        database: 'postgres',
                        password: credentials.password,
                        port: 5432
                    };
                } catch (e) {
                    alert("Erro ao gerar config do Postgres. Verifique a URL.");
                    return;
                }
            }

            const response = await fetch('http://localhost:3000/api/admin/set-database', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, config })
            });
            const data = await response.json();
            if (data.success) {
                setActiveDB(type);
                alert(`Sucesso! Banco ativo agora é: ${type.toUpperCase()}`);
            } else {
                alert("Erro ao trocar banco: " + data.message);
            }
        } catch (error) {
            alert("Erro na requisição: " + error);
        }
    };

    const handleTestConnection = async () => {
        setIsTestLoading(true);
        setTestResult(null);
        try {
            const response = await fetch('http://localhost:3000/api/admin/migration/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });
            const data = await response.json();
            setTestResult({ success: data.success, message: data.message });
            if (data.success) {
                setTimeout(() => setStep('config'), 1000);
            }
        } catch (error) {
            setTestResult({ success: false, message: 'Erro ao conectar com servidor local.' });
        } finally {
            setIsTestLoading(false);
        }
    };

    const handleMigration = async () => {
        setStep('migrating');
        setIsMigrating(true);
        setMigrationLog(['Iniciando processo de migração...']);

        try {
            // In a real scenario, we might use EventSource or WebSockets for real-time logs.
            // For now, we'll simulate steps or just wait for the big response.
            // Better yet, we can fetch chunks or just show a loader if the backend is monolithic.
            // Let's assume a simple POST for now that streams back or just returns when done.
            // To make it feel "agentic", we will update logs manually for now.

            setMigrationLog(prev => [...prev, 'Conectando ao MySQL local...', 'Conectando ao Supabase...']);

            const response = await fetch('http://localhost:3000/api/admin/migration/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...credentials, ...config })
            });

            if (!response.body) throw new Error("ReadableStream not supported");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.replace('data: ', '');
                        if (data === '[DONE]') {
                            setIsMigrating(false);
                            setStep('complete');
                            break;
                        }
                        try {
                            const parsed = JSON.parse(data);
                            setMigrationLog(prev => [...prev, parsed.message]);
                        } catch (e) {
                            // console.log("Stream error chunk", data);
                        }
                    }
                }
            }

            setIsMigrating(false);

        } catch (error) {
            setMigrationLog(prev => [...prev, 'Erro fatal na requisição: ' + error]);
            setIsMigrating(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Header Wizard */}
            <div className="bg-slate-50 border-b border-slate-100 p-6">
                <div className="flex items-center justify-between max-w-2xl mx-auto">
                    <WizardStep
                        number={1}
                        title="Conexão"
                        active={step === 'credentials'}
                        completed={step !== 'credentials'}
                    />
                    <div className="h-0.5 w-12 bg-slate-200" />
                    <WizardStep
                        number={2}
                        title="Configuração"
                        active={step === 'config'}
                        completed={step === 'migrating' || step === 'complete'}
                    />
                    <div className="h-0.5 w-12 bg-slate-200" />
                    <WizardStep
                        number={3}
                        title="IA"
                        active={step === 'ai-config'}
                        completed={step === 'migrating' || step === 'complete'}
                    />
                    <div className="h-0.5 w-12 bg-slate-200" />
                    <WizardStep
                        number={4}
                        title="Execução"
                        active={step === 'migrating' || step === 'complete'}
                        completed={step === 'complete'}
                    />
                </div>
            </div>

            <div className="p-8 max-w-2xl mx-auto min-h-[400px]">

                {/* STEP 1: CREDENTIALS */}
                {step === 'credentials' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="text-center mb-8">
                            <h3 className="text-xl font-semibold text-slate-800">Conectar ao Supabase</h3>
                            <p className="text-slate-500 mt-1">Insira as credenciais do seu projeto Supabase (Project Settings &gt; API)</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Project URL</label>
                                <div className="relative">
                                    <Database className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={credentials.url}
                                        onChange={e => setCredentials({ ...credentials, url: e.target.value })}
                                        placeholder="https://xyz...supabase.co"
                                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Service Role Key (Secret)</label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                                    <input
                                        type="password"
                                        value={credentials.key}
                                        onChange={e => setCredentials({ ...credentials, key: e.target.value })}
                                        placeholder="eyJh..."
                                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                </div>
                                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Use a chave 'service_role' para ter permissão de criar tabelas, não a 'anon'.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Database Password (Required for DDL)</label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                                    <input
                                        type="password"
                                        value={credentials.password}
                                        onChange={e => setCredentials({ ...credentials, password: e.target.value })}
                                        placeholder="Supabase DB Password"
                                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    Necessário para conectar via Postgres e executar CREATE TABLE.
                                </p>
                            </div>
                        </div>

                        {testResult && (
                            <div className={cn(
                                "p-3 rounded-lg flex items-center gap-2 text-sm",
                                testResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                            )}>
                                {testResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                                {testResult.message}
                            </div>
                        )}

                        <button
                            onClick={handleTestConnection}
                            disabled={isTestLoading || !credentials.url || !credentials.key}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isTestLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Testar Conexão e Continuar'}
                        </button>
                    </div>
                )}


                {/* STEP 2: CONFIG */}
                {step === 'config' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="text-center mb-8">
                            <h3 className="text-xl font-semibold text-slate-800">Opções de Migração</h3>
                            <p className="text-slate-500 mt-1">Defina o que será transferido</p>
                        </div>

                        <div className="space-y-4">
                            <label className="flex items-start gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={config.createTables}
                                    onChange={e => setConfig({ ...config, createTables: e.target.checked })}
                                    className="mt-1 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                />
                                <div>
                                    <span className="block font-medium text-slate-800">Criar Tabelas (Schema)</span>
                                    <span className="block text-sm text-slate-500">Recria a estrutura das tabelas do MySQL no PostgreSQL/Supabase. Tipos serão convertidos automaticamente.</span>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={config.migrateData}
                                    onChange={e => setConfig({ ...config, migrateData: e.target.checked })}
                                    className="mt-1 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                />
                                <div>
                                    <span className="block font-medium text-slate-800">Migrar Dados</span>
                                    <span className="block text-sm text-slate-500">Copia os registros existentes. Tabelas grandes podem demorar.</span>
                                </div>
                            </label>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setStep('credentials')}
                                className="flex-1 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors"
                            >
                                Voltar
                            </button>
                            <button
                                onClick={() => setStep('ai-config')}
                                className="flex-2 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex justify-center items-center gap-2"
                            >
                                Continuar
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: AI CONFIG */}
                {step === 'ai-config' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="text-center mb-8">
                            <h3 className="text-xl font-semibold text-slate-800">Ajuda da Inteligência Artificial</h3>
                            <p className="text-slate-500 mt-1">Dê instruções para ajustar a migração (Opcional)</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Instruções para o Agente (Contexto)</label>
                                <textarea
                                    value={config.aiContext}
                                    onChange={e => setConfig({ ...config, aiContext: e.target.value })}
                                    placeholder="Ex: Renomeie a tabela 'clientes' para 'users'. Ignore a coluna 'log_antigo'. Crie uma tabela extra de auditoria."
                                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[120px]"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    O agente tentará interpretar essas regras ao criar o esquema.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">API Key do LLM (Opcional)</label>
                                <div className="relative">
                                    <Bot className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                                    <input
                                        type="password"
                                        value={config.llmApiKey}
                                        onChange={e => setConfig({ ...config, llmApiKey: e.target.value })}
                                        placeholder="sk-..."
                                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    Necessário para processar instruções complexas. Suporte a OpenAI ou Gemini.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setStep('config')}
                                className="flex-1 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors"
                            >
                                Voltar
                            </button>
                            <button
                                onClick={handleMigration}
                                className="flex-2 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex justify-center items-center gap-2"
                            >
                                <Play className="w-4 h-4" />
                                Iniciar Migração
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: RUNNING / LOGS */}
                {(step === 'migrating' || step === 'complete') && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="text-center mb-4">
                            <h3 className="text-xl font-semibold text-slate-800">
                                {step === 'complete' ? 'Migração Finalizada' : 'Migrando Dados...'}
                            </h3>
                            <p className="text-slate-500 mt-1">Acompanhe o log de execução abaixo</p>
                        </div>

                        <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-green-400 h-64 overflow-y-auto shadow-inner">
                            {migrationLog.map((log, i) => (
                                <div key={i} className="mb-1 border-l-2 border-slate-700 pl-2">
                                    <span className="text-slate-500">[{new Date().toLocaleTimeString()}]</span> {log}
                                </div>
                            ))}
                            {isMigrating && (
                                <div className="animate-pulse flex items-center gap-1 mt-2 text-indigo-400">
                                    <Loader2 className="w-3 h-3 animate-spin" /> Processando...
                                </div>
                            )}
                        </div>

                        {step === 'complete' && (
                            <div className="pt-4 text-center">
                                <button
                                    onClick={() => setStep('credentials')}
                                    className="px-6 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-lg font-medium transition-colors"
                                >
                                    Nova Migração
                                </button>
                            </div>
                        )}
                    </div>
                )}

            </div>

            {/* DATABASE SWITCHER FOOTER */}
            <div className="bg-slate-50 border-t border-slate-100 p-4 flex justify-between items-center">
                <div className="text-sm text-slate-500">
                    Banco de Dados Ativo: <span className={cn("font-bold", activeDB === 'mysql' ? "text-blue-600" : "text-green-600")}>{activeDB.toUpperCase()}</span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => handleSwitchDatabase('mysql')}
                        disabled={activeDB === 'mysql'}
                        className="px-3 py-1 text-xs font-medium rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:bg-blue-50 disabled:border-blue-200 disabled:text-blue-700"
                    >
                        Usar MySQL
                    </button>
                    <button
                        onClick={() => handleSwitchDatabase('postgres')}
                        disabled={activeDB === 'postgres'}
                        className="px-3 py-1 text-xs font-medium rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:bg-green-50 disabled:border-green-200 disabled:text-green-700"
                    >
                        Usar Supabase
                    </button>
                </div>
            </div>
        </div>
    );
}

function WizardStep({ number, title, active, completed }: { number: number, title: string, active: boolean, completed: boolean }) {
    return (
        <div className="flex items-center gap-2">
            <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors",
                active ? "bg-indigo-600 text-white shadow-md ring-2 ring-indigo-100" :
                    completed ? "bg-green-500 text-white" : "bg-slate-200 text-slate-500"
            )}>
                {completed ? <CheckCircle className="w-5 h-5" /> : number}
            </div>
            <span className={cn(
                "font-medium text-sm transition-colors",
                active ? "text-indigo-900" : completed ? "text-green-600" : "text-slate-400"
            )}>
                {title}
            </span>
        </div>
    );
}
