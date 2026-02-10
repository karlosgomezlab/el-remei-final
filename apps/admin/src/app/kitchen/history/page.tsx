'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ChefHat, ArrowLeft, History, RotateCcw, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Order } from '@/types';
import { toast, Toaster } from 'sonner';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function KitchenHistory() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();

        // Suscribirse a cambios para mantener el historial vivo si alguien recupera un plato
        const channel = supabase
            .channel('kitchen-history')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                fetchHistory();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchHistory = async () => {
        // Obtenemos pedidos que tengan AL MENOS un plato marcado como 'ready' o 'served'
        // Y que sean de HOY (para no cargar historia antigua innecesaria)
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .or('status.eq.ready,status.eq.served') // Ordenes que ya han pasado por cocina
            .gte('created_at', today)
            .order('updated_at', { ascending: false })
            .limit(50); // Últimos 50 movimientos para rendimiento

        if (error) {
            console.error('Error fetching history:', error);
            toast.error('Error al cargar el historial');
        } else if (data) {
            setOrders(data);
        }
        setLoading(false);
    };

    const recoverItemToCooking = async (orderId: string, itemIdx: number) => {
        // 1. Recuperamos el estado actual del pedido para no pisar cambios
        const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
        if (!order) return;

        const newItems = [...order.items];
        // Volvemos el estado a 'cooking' (en preparación) y quitamos el flag de 'ready'
        newItems[itemIdx] = { ...newItems[itemIdx], status: 'cooking', is_ready: false, is_served: false };

        // Si el pedido estaba 'ready' o 'served', lo devolvemos a 'cooking' globalmente
        const newStatus = 'cooking';

        const { error } = await supabase
            .from('orders')
            .update({ items: newItems, status: newStatus })
            .eq('id', orderId);

        if (error) {
            toast.error('No se pudo recuperar el plato');
        } else {
            toast.success('Plato devuelto a cocina correctamente');
            fetchHistory(); // Refrescamos la lista
        }
    };

    const [sortOption, setSortOption] = useState<'time' | 'table' | 'status'>('time');

    const [confirmDelete, setConfirmDelete] = useState<{ orderId: string, itemIdx: number } | null>(null);

    const handleDeleteClick = (orderId: string, itemIdx: number) => {
        setConfirmDelete({ orderId, itemIdx });
    }

    const confirmDeleteAction = async () => {
        if (!confirmDelete) return;
        const { orderId, itemIdx } = confirmDelete;

        const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
        if (!order) return;

        const newItems = [...order.items];
        newItems[itemIdx] = { ...newItems[itemIdx], status: 'cancelled' };

        const { error } = await supabase
            .from('orders')
            .update({ items: newItems })
            .eq('id', orderId);

        if (error) {
            toast.error('Error al eliminar registro');
        } else {
            toast.success('Registro eliminado del historial');
            fetchHistory();
        }
        setConfirmDelete(null);
    };

    const getSortedOrders = () => {
        return [...orders].sort((a, b) => {
            if (sortOption === 'time') return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            if (sortOption === 'table') return a.table_number - b.table_number;
            // Status sort logic could be complex as order has multiple items, simplifying to table for now if status selected
            return 0;
        });
    };

    if (loading) return <div className="p-20 text-center text-zinc-500 bg-zinc-950 min-h-screen font-black italic">CARGANDO HISTORIAL...</div>;

    const sortedOrders = getSortedOrders();

    return (
        <div className="p-6 bg-zinc-950 min-h-screen text-white text-sm font-sans relative">
            <Toaster position="top-right" richColors />

            {/* Custom Confirm Modal */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="p-4 bg-red-500/10 rounded-full text-red-500">
                                <Trash2 className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black italic text-white mb-2">¿ELIMINAR REGISTRO?</h3>
                                <p className="text-zinc-400 text-xs font-medium leading-relaxed">
                                    Esta acción eliminará el plato del historial. No se podrá deshacer.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 w-full mt-4">
                                <button
                                    onClick={() => setConfirmDelete(null)}
                                    className="py-3 px-4 rounded-xl bg-zinc-800 text-zinc-400 font-bold text-xs uppercase hover:bg-zinc-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDeleteAction}
                                    className="py-3 px-4 rounded-xl bg-red-600 text-white font-bold text-xs uppercase hover:bg-red-500 transition-colors shadow-lg shadow-red-900/20"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b border-zinc-800 pb-6 gap-6">
                <div className="flex items-center gap-4">
                    <Link href="/kitchen" className="bg-zinc-900 p-3 rounded-2xl hover:bg-zinc-800 transition-all border border-zinc-800">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="bg-zinc-800 p-3 rounded-2xl rotate-3">
                            <History className="w-8 h-8 text-zinc-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black italic tracking-tighter uppercase text-zinc-300">HISTORIAL DEL DÍA</h1>
                            <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest">Platos terminados y enviados</p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <span className="text-zinc-600 text-xs font-bold uppercase tracking-widest self-center mr-2">Ordenar por:</span>
                    <button
                        onClick={() => setSortOption('time')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${sortOption === 'time' ? 'bg-orange-600 text-white' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'}`}
                    >
                        Hora
                    </button>
                    <button
                        onClick={() => setSortOption('table')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${sortOption === 'table' ? 'bg-orange-600 text-white' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'}`}
                    >
                        Mesa
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedOrders.map((order) => {
                    // SÓLO mostramos los items que ya están TERMINADOS (ready/served) para este historial
                    // OJO: Filtramos solo los items de COMIDA, ignoramos bebidas
                    const completedFoodItems = order.items.filter((item: any, idx: number) =>
                        item.category !== 'bebida' && (item.status === 'ready' || item.status === 'served')
                    ).map((item: any, idx: number) => ({ ...item, originalIdx: idx })); // Guardamos índice original para poder modificarlo

                    if (completedFoodItems.length === 0) return null;

                    return (
                        <div key={order.id} className="bg-zinc-900/50 rounded-[2rem] border border-zinc-800/50 overflow-hidden flex flex-col">
                            <div className="p-4 bg-zinc-900 flex justify-between items-center border-b border-zinc-800">
                                <span className="font-black text-lg text-zinc-400">MESA {order.table_number}</span>
                                <span className="text-[10px] font-bold uppercase text-zinc-600 tracking-widest">
                                    {new Date(order.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>

                            <div className="p-4 flex-1">
                                <ul className="space-y-3">
                                    {completedFoodItems.map((item: any, i: number) => (
                                        <li key={i} className="flex justify-between items-center gap-4 p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/50 group">
                                            <div className="flex gap-3 items-center min-w-0 flex-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <span className="bg-zinc-800 text-zinc-500 w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0">
                                                    {item.qty || 1}
                                                </span>
                                                <span className="font-bold text-sm text-zinc-300 line-through decoration-zinc-600">
                                                    {item.name}
                                                </span>
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => recoverItemToCooking(order.id, item.originalIdx)}
                                                    className="p-2 bg-zinc-800 hover:bg-orange-600 hover:text-white text-zinc-500 rounded-lg transition-all active:scale-95"
                                                    title="Devolver a cocina (Marcar como error)"
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(order.id, item.originalIdx)}
                                                    className="p-2 bg-zinc-800 hover:bg-red-600 hover:text-white text-zinc-500 rounded-lg transition-all active:scale-95"
                                                    title="Eliminar del historial"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    );
                })}

                {orders.every(o => o.items.filter((i: any) => i.category !== 'bebida' && (i.status === 'ready' || i.status === 'served')).length === 0) && (
                    <div className="col-span-full py-20 flex flex-col items-center opacity-30 italic text-zinc-500">
                        <History className="w-16 h-16 mb-4" />
                        <p className="text-xl font-black uppercase tracking-widest text-center">No hay platos terminados hoy</p>
                    </div>
                )}
            </div>
        </div>
    );
}
