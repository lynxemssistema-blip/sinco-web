import React from 'react';
import { RefreshCw, Search, ShieldAlert, FileSearch } from 'lucide-react';

const PowerBuildRevision: React.FC = () => {
 return (
 <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-gray-50 p-6 font-sans">
 <div className="max-w-4xl mx-auto w-full mt-8">
 <div className="bg-white rounded-md border border-gray-200 p-12 shadow-sm text-center space-y-8 relative overflow-hidden">
 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-300"></div>
 
 <div className="bg-emerald-50 w-24 h-24 rounded-md flex items-center justify-center mx-auto border border-emerald-100">
 <RefreshCw className="w-12 h-12 text-emerald-600" />
 </div>
 
 <div className="space-y-3">
 <h1 className="text-3xl font-extrabold text-gray-800">Revisão de Itens - Power Build</h1>
 <p className="text-gray-500 text-lg max-w-xl mx-auto">
 A ferramenta de comparação de revisões e histórico de alterações está sendo portada para a web.
 </p>
 </div>

 <div className="bg-emerald-50 p-6 rounded-md border border-emerald-100 text-left space-y-4">
 <div className="flex items-center gap-3 text-emerald-700 font-bold uppercase tracking-widest text-xs">
 <ShieldAlert className="w-4 h-4" />
 Funcionalidades Previstas
 </div>
 <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
 <li className="flex items-center gap-2">
 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
 Comparativo Delta (Rev N vs Rev N-1)
 </li>
 <li className="flex items-center gap-2">
 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
 Histórico de Alterações por Item
 </li>
 <li className="flex items-center gap-2">
 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
 Registro de Motivo de Revisão
 </li>
 <li className="flex items-center gap-2">
 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
 Relatórios de Evolução do Projeto
 </li>
 </ul>
 </div>

 <div className="pt-8 flex justify-center gap-4">
 <button disabled className="px-6 py-2.5 bg-gray-100 text-gray-400 rounded-lg font-bold flex items-center gap-2 cursor-not-allowed">
 <Search className="w-4 h-4" />
 Comparar Agora
 </button>
 <button disabled className="px-6 py-2.5 bg-gray-100 text-gray-400 rounded-lg font-bold flex items-center gap-2 cursor-not-allowed">
 <FileSearch className="w-4 h-4" />
 Ver Histórico
 </button>
 </div>
 </div>
 </div>
 </div>
 );
};

export default PowerBuildRevision;
