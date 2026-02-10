'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ChefHat, Clock, CheckCircle2, AlertCircle, Archive } from 'lucide-react';
import Link from 'next/link';
import { Order } from '@/types';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function KitchenView() {
    const [orders, setOrders] = useState<Order[]>([]);
    const ordersRef = useRef<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        ordersRef.current = orders;
    }, [orders]);

    useEffect(() => {
        fetchCookingOrders();
        const channel = supabase
            .channel('kitchen-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders' },
                (payload) => handleRealtimeUpdate(payload)
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchCookingOrders = async () => {
        const { data } = await supabase
            .from('orders')
            .select('*')
            .in('status', ['pending', 'cooking']) // Mostramos los que se están cocinando o están pendientes
            .order('created_at', { ascending: true });
        if (data) setOrders(data);
        setLoading(false);
    };

    const handleRealtimeUpdate = (payload: any) => {
        if (payload.eventType === 'INSERT') {
            setOrders((prev) => [...prev, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
            if (payload.new.status === 'ready' || payload.new.status === 'served') {
                setOrders((prev) => prev.filter(o => o.id !== payload.new.id));
            } else {
                setOrders((prev) => prev.map(o => o.id === payload.new.id ? payload.new : o));
            }
        }
    };

    const markAsCooking = async (orderId: string) => {
        await supabase.from('orders').update({ status: 'cooking' }).eq('id', orderId);
    };

    const markAsReady = async (orderId: string) => {
        await supabase.from('orders').update({ status: 'ready' }).eq('id', orderId);
    };

    const advanceItemStatus = async (orderId: string, itemIdx: number) => {
        // Use Ref to avoid race conditions with stale closures during rapid clicks
        const currentOrders = ordersRef.current;
        const order = currentOrders.find(o => o.id === orderId);
        if (!order) return;

        const newItems = [...order.items];
        const currentItem = newItems[itemIdx];

        let nextStatus: 'pending' | 'cooking' | 'ready' = 'pending';
        let isReady = false;

        if (!currentItem.status || currentItem.status === 'pending') {
            nextStatus = 'cooking';
        } else if (currentItem.status === 'cooking') {
            nextStatus = 'ready';
            isReady = true;
        } else {
            return;
        }

        newItems[itemIdx] = { ...currentItem, status: nextStatus, is_ready: isReady };

        // Actualizar estado del pedido si es el primer plato en cocinarse
        let newOrderStatus = order.status;
        if (order.status === 'pending' && nextStatus === 'cooking') {
            newOrderStatus = 'cooking';
        }

        // Optimistic update of Ref to handle next click immediately
        const updatedOrders = currentOrders.map(o => o.id === orderId ? { ...o, items: newItems, status: newOrderStatus } : o);
        ordersRef.current = updatedOrders;

        // Actualizamos localmente (trigger re-render)
        setOrders(updatedOrders);

        // Guardamos en Supabase
        await supabase
            .from('orders')
            .update({ items: newItems, status: newOrderStatus })
            .eq('id', orderId);
    };

    if (loading) return <div className="p-20 text-center text-white bg-zinc-950 min-h-screen font-black italic">CALENTANDO FOGONES...</div>;

    return (
        <div className="p-6 bg-zinc-950 min-h-screen text-white text-sm">
            <header className="flex justify-between items-center mb-10 border-b border-zinc-800 pb-6">
                <div className="flex items-center gap-4">
                    <div className="bg-orange-600 p-3 rounded-2xl rotate-3">
                        <ChefHat className="w-8 h-8" />
                    </div>
                    <h1 className="text-4xl font-black italic tracking-tighter uppercase">PANTALLA COCINA</h1>
                </div>
                <div className="flex gap-4">
                    <div className="bg-zinc-900 px-6 py-3 rounded-2xl border border-zinc-800">
                        <span className="text-zinc-500 text-xs font-bold uppercase block tracking-widest">En Cola</span>
                        <span className="text-2xl font-black text-orange-500">
                            {orders.filter(order => Array.isArray(order.items) && order.items.some((item: any) => item.category !== 'bebida')).length}
                        </span>
                    </div>
                    <Link href="/kitchen/history" className="bg-zinc-900 aspect-square flex items-center justify-center rounded-2xl border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all group" title="Ver Historial de Hoy">
                        <Archive className="w-6 h-6 text-zinc-500 group-hover:text-white transition-colors" />
                    </Link>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {orders
                    .filter(order => Array.isArray(order.items) && order.items.some((item: any) => item.category !== 'bebida'))
                    .map((order) => (
                        <div
                            key={order.id}
                            className={`flex flex-col bg-zinc-900 rounded-[2rem] border-2 shadow-2xl overflow-hidden transition-all duration-500 ${order.status === 'pending' ? 'border-yellow-600 bg-yellow-600/5' : order.status === 'cooking' ? 'border-orange-600 bg-orange-600/5' : 'border-zinc-800'}`}
                        >
                            <div className={`p-4 flex justify-between items-center ${order.status === 'pending' ? 'bg-yellow-600/20' : order.status === 'cooking' ? 'bg-orange-600/20' : 'bg-zinc-800/50'}`}>
                                <div className="flex items-center gap-2">
                                    <span className="bg-black text-white px-3 py-1 rounded-lg font-black text-lg">MESA {order.table_number}</span>
                                </div>
                                <div className="flex items-center gap-2 text-zinc-400">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-xs font-bold">5 min</span>
                                </div>
                            </div>

                            <div className="p-6 flex-1">
                                <ul className="space-y-4">
                                    {order.items.map((item: any, originalIdx: number) => {
                                        if (item.category === 'bebida') return null;

                                        return (
                                            <li
                                                key={originalIdx}
                                                className={`flex justify-between items-center gap-4 p-3 rounded-xl transition-all border ${item.status === 'ready' ? 'bg-red-900/10 border-red-900/30' :
                                                    item.status === 'cooking' ? 'bg-yellow-600/10 border-yellow-500/30' :
                                                        'bg-zinc-800 border-zinc-700'
                                                    }`}
                                            >
                                                <div className="flex gap-3 items-center min-w-0 flex-1">
                                                    <span className={`${item.status === 'ready' ? 'bg-red-900/50 text-red-200' : item.status === 'cooking' ? 'bg-yellow-600 text-black' : 'bg-white text-black'} w-8 h-8 rounded-lg flex items-center justify-center font-black text-lg flex-shrink-0`}>
                                                        {item.qty || 1}
                                                    </span>
                                                    <div className="flex flex-col">
                                                        <span className={`font-black text-sm uppercase leading-tight ${item.status === 'ready' ? 'line-through text-red-500 opacity-60' : 'text-white'}`}>
                                                            {item.name}
                                                        </span>
                                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${item.status === 'ready' ? 'text-red-700' : item.status === 'cooking' ? 'text-yellow-500' : 'text-zinc-500'}`}>
                                                            {item.status === 'cooking' ? '🔥 Preparando...' : item.status === 'ready' ? '🛑 Terminado' : '⏳ Pendiente'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => advanceItemStatus(order.id, originalIdx)}
                                                    className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all active:scale-95 shadow-lg ${item.status === 'ready' ? 'bg-zinc-800 text-zinc-600 ring-1 ring-zinc-700 cursor-not-allowed' :
                                                        item.status === 'cooking' ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/20' :
                                                            'bg-yellow-600 hover:bg-yellow-500 text-white shadow-yellow-900/20'
                                                        }`}
                                                    disabled={item.status === 'ready'}
                                                >
                                                    {item.status === 'ready' ? (
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    ) : item.status === 'cooking' ? (
                                                        <>
                                                            <CheckCircle2 className="w-4 h-4" /> TERMINAR
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ChefHat className="w-4 h-4 bg-black/20 rounded-full p-0.5" /> EMPEZAR
                                                        </>
                                                    )}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>

                            <div className="p-4 bg-zinc-800/30">
                                {order.items.filter((i: any) => i.category !== 'bebida').every((i: any) => i.status === 'ready') ? (
                                    <button
                                        onClick={() => markAsReady(order.id)}
                                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 border border-zinc-700 hover:border-zinc-500"
                                    >
                                        <Archive className="w-5 h-5" />
                                        ARCHIVAR COMANDA
                                    </button>
                                ) : (
                                    <div className="w-full py-4 rounded-2xl border-2 border-dashed border-zinc-700 text-zinc-600 font-bold text-xs uppercase tracking-widest text-center">
                                        Completa todos los platos
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                {orders.filter(order => order.items.some((item: any) => item.category !== 'bebida')).length === 0 && (
                    <div className="col-span-full py-40 flex flex-col items-center opacity-20 italic">
                        <AlertCircle className="w-20 h-20 mb-4" />
                        <p className="text-3xl font-black uppercase tracking-widest">Cocina Vacía. ¡Buen trabajo!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
