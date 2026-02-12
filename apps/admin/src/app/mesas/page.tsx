'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
    Save,
    Plus,
    Trash2,
    Layout,
    Move,
    Users,
    ChevronLeft,
    RefreshCcw,
    Maximize,
    Circle,
    Square,
    Monitor,
    Coffee
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import Link from 'next/link';
import { motion } from 'framer-motion';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface RestaurantTable {
    id: number;
    x: number;
    y: number;
    party_size: number;
    type: string;
    is_active: boolean;
}

export default function MesaConfig() {
    const [tables, setTables] = useState<RestaurantTable[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchTables();
    }, []);

    const fetchTables = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('restaurant_tables')
            .select('*')
            .order('id', { ascending: true });

        if (data) setTables(data);
        if (error) toast.error("Error cargando mesas");
        setLoading(false);
    };

    const handleUpdateTable = (field: keyof RestaurantTable, value: any) => {
        if (!selectedTable) return;
        const updated = { ...selectedTable, [field]: value };
        setSelectedTable(updated);
        setTables(prev => prev.map(t => t.id === selectedTable.id ? updated : t));
    };

    const saveChanges = async () => {
        setIsSaving(true);
        const { error } = await supabase
            .from('restaurant_tables')
            .upsert(tables);

        if (error) {
            toast.error("Error al guardar los cambios");
            console.error(error);
        } else {
            toast.success("Plano guardado correctamente");
        }
        setIsSaving(false);
    };

    const addNewTable = () => {
        const nextId = tables.length > 0 ? Math.max(...tables.map(t => t.id)) + 1 : 1;
        const newTable: RestaurantTable = {
            id: nextId,
            x: 50,
            y: 50,
            party_size: 4,
            type: 'square',
            is_active: true
        };
        setTables([...tables, newTable]);
        setSelectedTable(newTable);
    };

    const deleteTable = async (id: number) => {
        if (!confirm(`¿Estás seguro de eliminar la mesa ${id}?`)) return;

        const { error } = await supabase
            .from('restaurant_tables')
            .delete()
            .eq('id', id);

        if (error) {
            toast.error("No se pudo eliminar de la base de datos");
        } else {
            setTables(prev => prev.filter(t => t.id !== id));
            setSelectedTable(null);
            toast.success("Mesa eliminada");
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
            <RefreshCcw className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-950 text-white font-sans p-6">
            <Toaster position="top-right" richColors />

            <header className="flex justify-between items-center mb-8">
                <div>
                    <Link href="/dashboard" className="text-[10px] font-black uppercase text-gray-500 hover:text-white flex items-center gap-1 mb-2 tracking-widest transition-colors group">
                        <ChevronLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> Volver al Dashboard
                    </Link>
                    <h1 className="text-3xl font-black italic uppercase flex items-center gap-3">
                        <Layout className="w-8 h-8 text-blue-500" />
                        Editor del Plano
                    </h1>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={addNewTable}
                        className="bg-gray-900 border border-gray-800 hover:bg-gray-800 px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2 transition-all"
                    >
                        <Plus className="w-4 h-4" /> Añadir Mesa
                    </button>
                    <button
                        onClick={saveChanges}
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2 shadow-xl shadow-blue-500/20 transition-all disabled:opacity-50"
                    >
                        {isSaving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Guardar Plano
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Visual Editor */}
                <div className="lg:col-span-3">
                    <div className="bg-gray-900 rounded-[3rem] border-4 border-gray-800 relative aspect-video overflow-hidden shadow-2xl">
                        {/* Grid Background */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #4b5563 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

                        {/* Tables */}
                        <div className="absolute inset-0 p-10">
                            {tables.filter(t => t.is_active).map((table) => (
                                <motion.button
                                    key={table.id}
                                    layoutId={`table-${table.id}`}
                                    onClick={() => setSelectedTable(table)}
                                    style={{
                                        left: `${table.x}%`,
                                        top: `${table.y}%`,
                                        width: table.type === 'stool' ? '30px' : '60px',
                                        height: table.type === 'stool' ? '30px' : '60px',
                                    }}
                                    className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-xl flex items-center justify-center text-xs font-black transition-all border-2 z-10
                                        ${selectedTable?.id === table.id
                                            ? 'bg-blue-500 border-white text-white scale-125 shadow-2xl z-30 ring-4 ring-blue-500/30'
                                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-blue-400 hover:text-blue-400 hover:scale-110'}`}
                                >
                                    {table.id}
                                </motion.button>
                            ))}

                            {/* Decoraciones del plano */}
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase text-gray-700 tracking-[1em] pointer-events-none">
                                ENTRADA PRINCIPAL
                            </div>
                            <div className="absolute top-1/2 right-6 -rotate-90 text-[10px] font-black uppercase text-gray-700 tracking-[1em] pointer-events-none">
                                ZONA BARRA
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 bg-gray-900/50 p-6 rounded-3xl border border-gray-800 flex items-center gap-6 text-gray-500 italic text-sm">
                        <Move className="w-5 h-5 text-blue-500" />
                        <p>Selecciona una mesa en el plano para ajustar su posición, capacidad y tipo. Recuerda guardar los cambios para aplicarlos en la página de reservas.</p>
                    </div>
                </div>

                {/* Sidebar Controls */}
                <div className="space-y-6">
                    {selectedTable ? (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-gray-900 rounded-[2.5rem] p-8 border border-gray-800 shadow-xl sticky top-6"
                        >
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest mb-1">Editando Mesa</p>
                                    <h2 className="text-4xl font-black italic">{selectedTable.id}</h2>
                                </div>
                                <button
                                    onClick={() => deleteTable(selectedTable.id)}
                                    className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-8">
                                {/* Posicion X */}
                                <div>
                                    <div className="flex justify-between text-[10px] font-black uppercase text-gray-500 mb-3 tracking-widest">
                                        <span>Posición X (Horizontal)</span>
                                        <span className="text-white">{selectedTable.x}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="2" max="98" step="1"
                                        value={selectedTable.x}
                                        onChange={(e) => handleUpdateTable('x', parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>

                                {/* Posicion Y */}
                                <div>
                                    <div className="flex justify-between text-[10px] font-black uppercase text-gray-500 mb-3 tracking-widest">
                                        <span>Posición Y (Vertical)</span>
                                        <span className="text-white">{selectedTable.y}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="2" max="98" step="1"
                                        value={selectedTable.y}
                                        onChange={(e) => handleUpdateTable('y', parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>

                                {/* Capacidad */}
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-500 mb-3 block tracking-widest">Capacidad (Personas)</label>
                                    <div className="flex gap-2">
                                        {[2, 4, 6, 8, 10].map(n => (
                                            <button
                                                key={n}
                                                onClick={() => handleUpdateTable('party_size', n)}
                                                className={`flex-1 py-3 rounded-xl font-black transition-all border-2 ${selectedTable.party_size === n ? 'bg-blue-600 border-white text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                                            >
                                                {n}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Tipo de Mesa */}
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-500 mb-3 block tracking-widest">Estilo de Mesa</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { id: 'window', icon: Monitor, label: 'Ventana' },
                                            { id: 'square', icon: Square, label: 'Central' },
                                            { id: 'round', icon: Circle, label: 'Íntima' },
                                            { id: 'stool', icon: Coffee, label: 'Taburete' },
                                        ].map(type => (
                                            <button
                                                key={type.id}
                                                onClick={() => handleUpdateTable('type', type.id)}
                                                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${selectedTable.type === type.id ? 'bg-blue-600/10 border-blue-500 text-blue-400' : 'bg-gray-800 border-gray-700 text-gray-500'}`}
                                            >
                                                <type.icon className="w-5 h-5" />
                                                <span className="text-[8px] font-black uppercase">{type.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="bg-gray-900 rounded-[2.5rem] p-10 border border-gray-800 text-center flex flex-col items-center justify-center min-h-[400px]">
                            <div className="w-16 h-16 bg-gray-800 rounded-3xl flex items-center justify-center text-gray-700 mb-6">
                                <Maximize className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-tight mb-2">Editor del Salón</h3>
                            <p className="text-sm text-gray-500 font-medium leading-relaxed">Selecciona cualquier mesa del mapa para editar sus detalles o pulsa "Añadir Mesa" para crear una nueva.</p>
                        </div>
                    )}

                    <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden group">
                        <Users className="absolute bottom-4 right-4 w-12 h-12 opacity-10" />
                        <h4 className="font-black uppercase text-sm mb-2">Resumen Total</h4>
                        <p className="text-3xl font-black">{tables.length} Mesas</p>
                        <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-1">Capacidad: {tables.reduce((acc, t) => acc + t.party_size, 0)} pax</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
