'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { History, ArrowLeft, Clock, CreditCard, Utensils, Search, Trash2 } from 'lucide-react';
import { Order } from '@/types';
import Link from 'next/link';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function HistoryPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        const { data } = await supabase
            .from('orders')
            .select('*')
            .eq('status', 'served')
            .order('updated_at', { ascending: false });
        if (data) setOrders(data);
        setLoading(false);
    };

    const deleteOrder = async (id: string) => {
        const { error } = await supabase
            .from('orders')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting order:', error);
            alert('Error al eliminar el pedido');
        } else {
            setOrders(prev => prev.filter(o => o.id !== id));
        }
    };

    const filteredOrders = orders.filter(o =>
        o.table_number.toString().includes(searchTerm) ||
        o.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black gap-4 text-white">
            <History className="w-10 h-10 animate-spin text-emerald-500" />
            <p className="font-mono uppercase tracking-widest opacity-50">Cargando Historial...</p>
        </div>
    );

    return (
        <div className="p-6 bg-zinc-950 min-h-screen text-white font-sans">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <Link href="/dashboard" className="p-2 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-all">
                            <ArrowLeft className="w-5 h-5 text-zinc-400" />
                        </Link>
                        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-600 flex items-center gap-3 italic">
                            HISTORIAL DE SERVICIOS
                        </h1>
                    </div>
                    <p className="text-zinc-500 font-medium uppercase tracking-tighter ml-14">Registro de mesas finalizadas y cobradas</p>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Buscar por mesa o ID..."
                        className="w-full bg-zinc-900 border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all border outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </header>

            <div className="space-y-4">
                {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => (
                        <div key={order.id} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 hover:bg-zinc-900 transition-all">
                            <div className="flex items-center gap-6 w-full md:w-auto">
                                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex flex-col items-center justify-center border border-emerald-500/20">
                                    <span className="text-[10px] font-black text-emerald-500 uppercase">Mesa</span>
                                    <span className="text-2xl font-black text-white leading-tight">{order.table_number}</span>
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Clock className="w-3 h-3 text-zinc-500" />
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                            {order.updated_at ? new Date(order.updated_at).toLocaleString('es-ES') : new Date(order.created_at || '').toLocaleString('es-ES')}
                                        </span>
                                    </div>
                                    <p className="text-sm font-black text-zinc-300">ID: {order.id.split('-')[0].toUpperCase()}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase tracking-tighter">
                                            Finalizado
                                        </span>
                                        {order.is_paid && (
                                            <span className="bg-blue-500/20 text-blue-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-blue-500/30 uppercase tracking-tighter">
                                                Cobrado
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 w-full md:px-10">
                                <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
                                    {order.items.map((item: any, idx) => (
                                        <div key={idx} className="bg-zinc-800/50 px-3 py-1.5 rounded-xl border border-zinc-800 flex items-center gap-2 whitespace-nowrap">
                                            <span className="text-emerald-500 font-black text-xs">{item.qty || 1}x</span>
                                            <span className="text-zinc-400 font-bold text-xs uppercase">{item.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col items-end w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-zinc-800/50">
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Total Cobrado</p>
                                <p className="text-3xl font-black italic text-white leading-tight">{order.total_amount.toFixed(2)}€</p>
                                <div className="flex items-center gap-2 mt-2 text-zinc-500">
                                    <CreditCard className="w-4 h-4" />
                                    <span className="text-[10px] font-bold uppercase tracking-tighter">Stripe / QR</span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (confirm('¿Estás seguro de eliminar este registro del historial?')) {
                                            deleteOrder(order.id);
                                        }
                                    }}
                                    className="mt-4 flex items-center gap-2 text-red-500 hover:text-red-400 text-[10px] font-black uppercase tracking-widest transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-20 flex flex-col items-center justify-center opacity-20 text-white">
                        <History className="w-20 h-20 mb-4" />
                        <p className="text-2xl font-black uppercase italic tracking-tighter text-center">Todavía no hay historial de servicios</p>
                        <p className="text-sm font-bold uppercase tracking-[0.2em] mt-2">Los pedidos servidos aparecerán aquí</p>
                    </div>
                )}
            </div>
        </div>
    );
}
