import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { useAlert } from '../contexts/AlertContext';

interface Matriz {
    Id: number;
    Descricao: string;
}

export default function MatrizAdmin() {
    const { showAlert } = useAlert();
    const [matrizes, setMatrizes] = useState<Matriz[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Form state
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Matriz>({ Id: 0, Descricao: '' });
    const [originalId, setOriginalId] = useState<number | null>(null);

    // Instead of checking regular App user, we check the Superadmin token, 
    // since this component is embedded only inside SuperadminPage.
    const token = localStorage.getItem('superadmin_token') || '';

    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    const fetchMatrizes = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/matriz', { headers: authHeaders });
            const data = await res.json();
            if (data.success) {
                setMatrizes(data.data);
            } else {
                showAlert(data.message || 'Erro ao carregar matrizes', 'error');
            }
        } catch (error) {
            console.error(error);
            showAlert('Falha na comunicação com o servidor', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMatrizes();
    }, []);

    const handleEdit = (matriz: Matriz) => {
        setIsEditing(true);
        setOriginalId(matriz.Id);
        setFormData({ ...matriz });
    };

    const handleCancel = () => {
        setIsEditing(false);
        setOriginalId(null);
        setFormData({ Id: 0, Descricao: '' });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.Descricao) {
            showAlert('A Descrição é obrigatória', 'warning');
            return;
        }

        try {
            if (originalId !== null) {
                // UPDATE
                const res = await fetch(`/api/matriz/${originalId}`, {
                    method: 'PUT',
                    headers: authHeaders,
                    body: JSON.stringify({ Descricao: formData.Descricao })
                });
                const data = await res.json();
                if (data.success) {
                    showAlert('Matriz atualizada com sucesso', 'success');
                    fetchMatrizes();
                    handleCancel();
                } else {
                    showAlert(data.message, 'error');
                }
            } else {
                // CREATE
                const res = await fetch('/api/matriz', {
                    method: 'POST',
                    headers: authHeaders,
                    body: JSON.stringify(formData)
                });
                const data = await res.json();
                if (data.success) {
                    showAlert('Matriz criada com sucesso', 'success');
                    fetchMatrizes();
                    handleCancel();
                } else {
                    showAlert(data.message, 'error');
                }
            }
        } catch (error) {
            console.error(error);
            showAlert('Erro ao salvar matriz', 'error');
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm(`Tem certeza que deseja excluir a Matriz ID ${id}?`)) return;

        try {
            const res = await fetch(`/api/matriz/${id}`, {
                method: 'DELETE',
                headers: authHeaders
            });
            const data = await res.json();
            if (data.success) {
                showAlert('Matriz excluída', 'success');
                fetchMatrizes();
            } else {
                showAlert(data.message, 'error');
            }
        } catch (error) {
            console.error(error);
            showAlert('Erro ao excluir matriz', 'error');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Gestão de Matrizes</h2>
                    <p className="text-muted-foreground text-sm">Controle as empresas cadastradas no banco de dados.</p>
                </div>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium"
                    >
                        <Plus size={18} />
                        Nova Matriz
                    </button>
                )}
            </div>

            {/* Form Section */}
            {isEditing && (
                <div className="bg-card p-6 rounded-xl border border-border shadow-sm animate-fade-in">
                    <h3 className="text-lg font-semibold mb-4 text-foreground">
                        {originalId !== null ? 'Editar Matriz' : 'Cadastrar Nova Matriz'}
                    </h3>
                    <form onSubmit={handleSave} className="flex gap-4 items-end">
                        {originalId !== null && (
                            <div className="w-24">
                                <label className="block text-sm font-medium text-foreground mb-1">ID</label>
                                <input
                                    type="number"
                                    value={formData.Id || ''}
                                    disabled={true}
                                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-muted-foreground focus:outline-none disabled:opacity-60 cursor-not-allowed"
                                />
                            </div>
                        )}
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-foreground mb-1">Descrição da Nova Matriz</label>
                            <input
                                type="text"
                                value={formData.Descricao}
                                onChange={(e) => setFormData({ ...formData, Descricao: e.target.value })}
                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder="Ex: alfatec"
                                required
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <button
                                type="submit"
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm font-medium"
                            >
                                <Save size={18} />
                                Salvar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Table Section */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/50 border-b border-border text-sm">
                                <th className="p-4 font-semibold text-foreground w-32">Id da Matriz</th>
                                <th className="p-4 font-semibold text-foreground">Descrição da Matriz</th>
                                <th className="p-4 font-semibold text-foreground w-24 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-muted-foreground">
                                        Carregando matrizes...
                                    </td>
                                </tr>
                            ) : matrizes.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-muted-foreground">
                                        Nenhuma matriz cadastrada.
                                    </td>
                                </tr>
                            ) : (
                                matrizes.map((matriz) => (
                                    <tr key={matriz.Id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                                        <td className="p-4 text-foreground font-mono font-medium">{matriz.Id}</td>
                                        <td className="p-4 text-foreground font-medium uppercase">{matriz.Descricao}</td>
                                        <td className="p-4 text-center space-x-2 whitespace-nowrap">
                                            <button
                                                onClick={() => handleEdit(matriz)}
                                                className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(matriz.Id)}
                                                className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
