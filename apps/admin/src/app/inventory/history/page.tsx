'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Search, FileText, Calendar, Filter } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast, Toaster } from 'sonner';
import { notify } from '@/lib/notifications';

interface StockMovement {
    id: string;
    ingredient_id: string;
    quantity_change: number;
    reason: string;
    notes?: string;
    created_at: string;
    ingredient: {
        name: string;
        unit: string;
    };
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function StockHistoryPage() {
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchMovements();
    }, []);

    const fetchMovements = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('stock_movements')
            .select(`
                *,
                ingredient:ingredients(name, unit)
            `)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error('Error fetching movements:', error);
            notify.error('Error', 'Al cargar historial');
        } else {
            setMovements((data as any) || []);
        }
        setLoading(false);
    };

    const filteredMovements = movements.filter(m =>
        m.ingredient?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.reason.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getReasonLabel = (reason: string) => {
        switch (reason) {
            case 'sale': return { label: 'VENTA', color: 'bg-red-500/10 text-red-500 border-red-500/20' };
            case 'restock': return { label: 'REPOSICIÓN', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
            case 'waste': return { label: 'MERMA', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' };
            case 'correction': return { label: 'CORRECCIÓN', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
            default: return { label: reason.toUpperCase(), color: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
        }
    };

    return (
        <div className="p-6 bg-zinc-950 min-h-screen text-white font-sans">
            <Toaster position="top-right" richColors />
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <Link href="/inventory" className="p-2 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-all">
                            <ArrowLeft className="w-5 h-5 text-zinc-400" />
                        </Link>
                        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 flex items-center gap-3 italic">
                            HISTORIAL DE STOCK
                        </h1>
                    </div>
                    <p className="text-zinc-500 font-medium uppercase tracking-tighter ml-14">Registro de movimientos y auditoría</p>
                </div>

                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Buscar movimiento..."
                        className="w-full bg-zinc-900 border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-purple-500/20 transition-all border outline-none font-bold"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
                </div>
            ) : (
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-zinc-900/80 border-b border-zinc-800">
                                <tr>
                                    <th className="p-4 text-[10px] font-black uppercase text-zinc-500 tracking-wider">Fecha / Hora</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-zinc-500 tracking-wider">Ingrediente</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-zinc-500 tracking-wider">Tipo</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-zinc-500 tracking-wider text-right">Cambio</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-zinc-500 tracking-wider">Detalle</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {filteredMovements.map((move) => {
                                    const type = getReasonLabel(move.reason);
                                    const isPositive = move.quantity_change > 0;

                                    return (
                                        <tr key={move.id} className="hover:bg-zinc-900/30 transition-colors group">
                                            <td className="p-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-zinc-300 text-xs">
                                                        {format(new Date(move.created_at), 'dd MMM yyyy', { locale: es })}
                                                    </span>
                                                    <span className="text-[10px] font-black text-zinc-600 uppercase">
                                                        {format(new Date(move.created_at), 'HH:mm', { locale: es })}H
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="font-bold text-white block">{move.ingredient?.name || 'Eliminado'}</span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase border tracking-wider ${type.color}`}>
                                                    {type.label}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className={`flex items-center justify-end gap-1 font-black text-sm ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                                    {Math.abs(move.quantity_change).toFixed(3)}
                                                    <span className="text-[10px] opacity-60 ml-0.5">{move.ingredient?.unit}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 max-w-xs truncate">
                                                <span className="text-xs text-zinc-400 font-medium italic">
                                                    {move.notes || '-'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredMovements.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-zinc-500 italic">
                                            No hay movimientos registrados
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
