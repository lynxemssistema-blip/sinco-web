import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface OrdemServico {
 IdOrdemServico: number;
 // ...
}

interface FatorOSModalProps {
 os: OrdemServico;
 onClose: () => void;
 onConfirm: (fator: string) => void;
}

export function FatorOSModal({ os, onClose, onConfirm }: FatorOSModalProps) {
 const [novoFator, setNovoFator] = useState<string>('');

 return (
 <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 animate-in fade-in duration-200">
 <div className="bg-white rounded-md w-full max-w-sm shadow-xl flex flex-col animate-in zoom-in-95 duration-200 border border-gray-100 overflow-hidden">
 <div className="bg-red-50 px-4 py-2 flex items-center gap-3 border-b border-red-100">
 <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
 <AlertTriangle size={20} />
 </div>
 <div>
 <h3 className="text-sm font-semibold text-red-800">Fator Inválido ou Ausente</h3>
 <p className="text-xs text-red-600/80">O fator da O.S. não pode ser zero.</p>
 </div>
 </div>
 
 <div className="p-6">
 <p className="text-sm text-gray-600 mb-4 text-center">
 Por favor, informe um novo Fator Multiplicador para a Ordem de Serviço <span className="font-semibold text-gray-800">OS {os.IdOrdemServico}</span> antes de prosseguir com a liberação.
 </p>
 
 <div className="space-y-2">
 <label className="text-xs font-semibold text-gray-700 ml-1">Fator Multiplicador (Apenas Inteiros)</label>
 <input 
 type="number" 
 step="1"
 min="1"
 autoFocus
 value={novoFator}
 onChange={(e) => setNovoFator(e.target.value.replace(/\D/g, ''))}
 placeholder="Ex: 1, 2, 3..."
 className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
 />
 </div>
 </div>
 
 <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2 justify-end">
 <button
 onClick={onClose}
 className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-white transition-colors"
 >
 Cancelar
 </button>
 <button
 disabled={!novoFator || parseInt(novoFator) <= 0}
 onClick={() => onConfirm(novoFator)}
 className="px-6 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
 >
 Confirmar e Liberar
 </button>
 </div>
 </div>
 </div>
 );
}
