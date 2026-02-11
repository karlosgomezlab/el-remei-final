'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ArrowLeft, Plus, Search, Trash2, Edit2, Package, Scale, Save, X, AlertCircle, History } from 'lucide-react';
import Link from 'next/link';
import { Ingredient } from '@/types';
import { toast, Toaster } from 'sonner';
import { notify } from '@/lib/notifications';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function InventoryPage() {
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentIngredient, setCurrentIngredient] = useState<Partial<Ingredient>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchIngredients();

        // Subscribe to changes
        const channel = supabase
            .channel('ingredients_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, () => {
                fetchIngredients();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchIngredients = async () => {
        const { data, error } = await supabase
            .from('ingredients')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error fetching ingredients:', error);
            notify.error('Error', 'Al cargar ingredientes');
        } else {
            setIngredients(data || []);
        }
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        if (!currentIngredient.name || !currentIngredient.unit || !currentIngredient.cost_per_unit) {
            notify.error('Datos incompletos', 'Por favor rellena los campos obligatorios');
            setIsSaving(false);
            return;
        }

        try {
            if (currentIngredient.id) {
                // Update
                const { error } = await supabase
                    .from('ingredients')
                    .update({
                        name: currentIngredient.name,
                        unit: currentIngredient.unit,
                        cost_per_unit: currentIngredient.cost_per_unit,
                        stock: currentIngredient.stock || 0,
                        min_stock_alert: currentIngredient.min_stock_alert,
                        supplier: currentIngredient.supplier,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', currentIngredient.id);

                if (error) throw error;
                notify.success('Ingrediente actualizado');
            } else {
                // Insert
                const { error } = await supabase
                    .from('ingredients')
                    .insert([{
                        name: currentIngredient.name,
                        unit: currentIngredient.unit,
                        cost_per_unit: currentIngredient.cost_per_unit,
                        stock: currentIngredient.stock || 0,
                        min_stock_alert: currentIngredient.min_stock_alert,
                        supplier: currentIngredient.supplier
                    }]);

                if (error) throw error;
                notify.success('Ingrediente creado');
            }
            setIsModalOpen(false);
            setCurrentIngredient({});
        } catch (error) {
            console.error('Error saving ingredient:', error);
            notify.error('Error', 'Al guardar ingrediente');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Seguro que quieres eliminar este ingrediente?')) return;

        const { error } = await supabase
            .from('ingredients')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting:', error);
            notify.error('Error al eliminar', 'Puede que esté en uso en una receta');
        } else {
            notify.success('Ingrediente eliminado');
        }
    };

    const openEdit = (ingredient: Ingredient) => {
        setCurrentIngredient(ingredient);
        setIsModalOpen(true);
    };

    const openCreate = () => {
        setCurrentIngredient({ unit: 'kg', stock: 0 });
        setIsModalOpen(true);
    };

    const filteredIngredients = ingredients.filter(i =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 bg-zinc-950 min-h-screen text-white font-sans">
            <Toaster position="top-right" richColors />

            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <Link href="/dashboard" className="p-2 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-all">
                            <ArrowLeft className="w-5 h-5 text-zinc-400" />
                        </Link>
                        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600 flex items-center gap-3 italic">
                            INVENTARIO & COSTES
                        </h1>
                    </div>
                    <p className="text-zinc-500 font-medium uppercase tracking-tighter ml-14">Gestión de materia prima y control de stock</p>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Buscar ingrediente..."
                            className="w-full bg-zinc-900 border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all border outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Link href="/inventory/history" className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white px-4 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all">
                        <History className="w-5 h-5" />
                        <span className="hidden md:inline">HISTORIAL</span>
                    </Link>
                    <button
                        onClick={openCreate}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="hidden md:inline">NUEVO INGREDIENTE</span>
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredIngredients.map((ingredient) => (
                        <div key={ingredient.id} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 hover:bg-zinc-900 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
                                        <Package className="w-6 h-6 text-blue-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-white leading-tight">{ingredient.name}</h3>
                                        {ingredient.supplier && (
                                            <p className="text-zinc-500 text-xs uppercase font-bold tracking-wider">{ingredient.supplier}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => openEdit(ingredient)}
                                        className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(ingredient.id)}
                                        className="p-2 hover:bg-red-900/30 rounded-xl text-zinc-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <div className="bg-zinc-950/50 p-3 rounded-2xl border border-zinc-800/50">
                                    <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Coste Unitario</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xl font-bold">{ingredient.cost_per_unit}€</span>
                                        <span className="text-zinc-600 text-xs font-bold">/ {ingredient.unit}</span>
                                    </div>
                                </div>
                                <div className="bg-zinc-950/50 p-3 rounded-2xl border border-zinc-800/50">
                                    <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Stock Actual</p>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-xl font-bold ${ingredient.min_stock_alert && ingredient.stock <= ingredient.min_stock_alert ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {ingredient.stock}
                                        </span>
                                        {ingredient.min_stock_alert && ingredient.stock <= ingredient.min_stock_alert && (
                                            <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredIngredients.length === 0 && (
                        <div className="col-span-full py-20 text-center opacity-30">
                            <Scale className="w-20 h-20 mx-auto mb-4" />
                            <p className="text-xl font-black uppercase">No hay ingredientes</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal de Creación/Edición */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                            <h2 className="text-xl font-black italic text-white">
                                {currentIngredient.id ? 'EDITAR INGREDIENTE' : 'NUEVO INGREDIENTE'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-black uppercase text-zinc-500 mb-1.5 ml-1">Nombre del Ingrediente *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold"
                                    placeholder="Ej: Tomate Triturado"
                                    value={currentIngredient.name || ''}
                                    onChange={e => setCurrentIngredient({ ...currentIngredient, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase text-zinc-500 mb-1.5 ml-1">Unidad de Medida *</label>
                                    <select
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold appearance-none"
                                        value={currentIngredient.unit || 'kg'}
                                        onChange={e => setCurrentIngredient({ ...currentIngredient, unit: e.target.value })}
                                    >
                                        <option value="kg">Kilogramo (kg)</option>
                                        <option value="g">Gramo (g)</option>
                                        <option value="l">Litro (l)</option>
                                        <option value="ml">Mililitro (ml)</option>
                                        <option value="u">Unidad (u)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-zinc-500 mb-1.5 ml-1">Coste por Unidad (€) *</label>
                                    <input
                                        type="number"
                                        step="0.0001"
                                        required
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold"
                                        placeholder="0.00"
                                        value={currentIngredient.cost_per_unit || ''}
                                        onChange={e => setCurrentIngredient({ ...currentIngredient, cost_per_unit: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase text-zinc-500 mb-1.5 ml-1">Stock Actual</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold"
                                        placeholder="0"
                                        value={currentIngredient.stock || ''}
                                        onChange={e => setCurrentIngredient({ ...currentIngredient, stock: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-zinc-500 mb-1.5 ml-1">Alerta Stock Bajo</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold"
                                        placeholder="Opcional"
                                        value={currentIngredient.min_stock_alert || ''}
                                        onChange={e => setCurrentIngredient({ ...currentIngredient, min_stock_alert: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase text-zinc-500 mb-1.5 ml-1">Proveedor (Opcional)</label>
                                <input
                                    type="text"
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold"
                                    placeholder="Nombre del proveedor"
                                    value={currentIngredient.supplier || ''}
                                    onChange={e => setCurrentIngredient({ ...currentIngredient, supplier: e.target.value })}
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-zinc-800 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-3 rounded-xl font-bold bg-zinc-800 hover:bg-zinc-700 transition-colors"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-6 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center gap-2"
                                >
                                    {isSaving ? <span className="animate-spin">⏳</span> : <Save className="w-5 h-5" />}
                                    GUARDAR
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
