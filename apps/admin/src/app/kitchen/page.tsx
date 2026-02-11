'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ChefHat, Clock, CheckCircle2, AlertCircle, Archive, Hand } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
    const [waiterCalls, setWaiterCalls] = useState<any[]>([]);
    const audioRef = useRef<HTMLAudioElement | null>(null);

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

    useEffect(() => {
        fetchWaiterCalls();

        // Inicializar el sonido de aviso
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

        const waiterChannel = supabase
            .channel('waiter-calls')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'waiter_calls' },
                (payload) => {
                    setWaiterCalls(prev => [payload.new, ...prev]);
                    // Tocar sonido de campana
                    if (audioRef.current) {
                        audioRef.current.play().catch(e => console.log("Audio auto-play blocked"));
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'waiter_calls' },
                (payload) => {
                    if (payload.new.status !== 'pending') {
                        setWaiterCalls(prev => prev.filter(c => c.id !== payload.new.id));
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(waiterChannel); };
    }, []);

    const fetchWaiterCalls = async () => {
        const { data } = await supabase
            .from('waiter_calls')
            .select('*')
            .eq('status', 'pending');
        if (data) setWaiterCalls(data);
    };

    const dismissCall = async (callId: string) => {
        await supabase.from('waiter_calls').update({ status: 'attended' }).eq('id', callId);
        setWaiterCalls(prev => prev.filter(c => c.id !== callId));
    };

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
            // Si el estado es "ready" o "served", el plato ya no debe estar en la vista de cocina activa
            if (payload.new.status === 'ready' || payload.new.status === 'served') {
                setOrders((prev) => prev.filter(o => o.id !== payload.new.id));
            } else {
                // Actualizamos solo si el pedido existe y evitamos parpadeos si es posible
                setOrders((prev) => {
                    const exists = prev.find(o => o.id === payload.new.id);
                    if (!exists) return prev;
                    return prev.map(o => o.id === payload.new.id ? payload.new : o);
                });
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
        // Use Ref to avoid race conditions and functional update for setOrders
        const currentOrders = ordersRef.current;
        const order = currentOrders.find(o => o.id === orderId);
        if (!order) return;

        const newItems = [...order.items];
        const currentItem = newItems[itemIdx];

        let nextStatus: 'pending' | 'cooking' | 'ready' = 'pending';
        let isReady = false;

        if (!currentItem.status || currentItem.status === 'pending') {
            nextStatus = 'cooking';
            isReady = false;
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

        // Optimistic update
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, items: newItems, status: newOrderStatus } : o));

        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    items: newItems,
                    status: newOrderStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);

            if (error) throw error;
        } catch (error) {
            console.error("Error updating item status:", error);
            // Revert on error if necessary, though handleRealtimeUpdate will eventually sync
            fetchCookingOrders();
        }
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

            {/* ======= ALERTAS DE CAMARERO ======= */}
            <AnimatePresence>
                {waiterCalls.length > 0 && (
                    <div className="mb-10 flex flex-wrap gap-4">
                        {waiterCalls.map((call) => (
                            <div
                                key={call.id}
                                className="bg-red-600 animate-pulse-fast p-4 rounded-3xl flex items-center gap-4 shadow-[0_0_30px_rgba(220,38,38,0.5)] border-2 border-white/50"
                            >
                                <div className="text-3xl">🖐️</div>
                                <div>
                                    <p className="font-black text-white text-lg leading-none">MESA {call.table_number}</p>
                                    <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mt-1">Llama al camarero</p>
                                </div>
                                <button
                                    onClick={() => dismissCall(call.id)}
                                    className="ml-4 bg-white text-red-600 px-4 py-2 rounded-xl font-black text-xs uppercase hover:bg-zinc-100 transition-all"
                                >
                                    ATENDER
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {orders
                    .filter(order => Array.isArray(order.items) && order.items.some((item: any) => item.category !== 'bebida'))
                    .map((order) => (
                        <div
                            key={order.id}
                            className={`flex flex-col bg-zinc-900 rounded-[2rem] border-2 shadow-2xl overflow-hidden transition-all duration-500 ${order.status === 'pending' ? 'border-zinc-800 bg-zinc-900' : order.status === 'cooking' ? 'border-orange-600/30 bg-orange-600/5' : 'border-zinc-800'}`}
                        >
                            <div className={`p-4 flex justify-between items-center ${order.status === 'pending' ? 'bg-zinc-800/50' : order.status === 'cooking' ? 'bg-orange-600/20' : 'bg-zinc-800/50'}`}>
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

                                        const isActuallyReady = item.status === 'ready' || item.is_ready || item.is_served;

                                        return (
                                            <li
                                                key={originalIdx}
                                                className={`flex justify-between items-center gap-4 p-3 rounded-xl transition-all border ${isActuallyReady ? 'bg-green-950/20 border-green-900/30' :
                                                    item.status === 'cooking' ? 'bg-orange-600/10 border-orange-500/30' :
                                                        'bg-zinc-800/50 border-zinc-700/50'
                                                    }`}
                                            >
                                                <div className="flex gap-3 items-center min-w-0 flex-1">
                                                    <span className={`${isActuallyReady ? 'bg-green-600 text-white' : item.status === 'cooking' ? 'bg-orange-600 text-white' : 'bg-white text-black'} w-8 h-8 rounded-lg flex items-center justify-center font-black text-lg flex-shrink-0 transition-colors`}>
                                                        {isActuallyReady ? <CheckCircle2 className="w-5 h-5" /> : (item.qty || 1)}
                                                    </span>
                                                    <div className="flex flex-col">
                                                        <span className={`font-black text-sm uppercase leading-tight ${isActuallyReady ? 'line-through text-zinc-500 opacity-60' : 'text-white'}`}>
                                                            {item.name}
                                                        </span>
                                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${isActuallyReady ? 'text-green-500' : item.status === 'cooking' ? 'text-orange-500' : 'text-zinc-500'}`}>
                                                            {item.status === 'cooking' ? '🔥 Preparando...' : isActuallyReady ? '✅ Terminado' : '⏳ Pendiente'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => advanceItemStatus(order.id, originalIdx)}
                                                    className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all active:scale-95 shadow-lg ${isActuallyReady ? 'bg-zinc-800 text-zinc-600 ring-1 ring-zinc-700 cursor-not-allowed opacity-40' :
                                                        item.status === 'cooking' ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/20' :
                                                            'bg-yellow-500 hover:bg-yellow-400 text-black shadow-yellow-900/10'
                                                        }`}
                                                    disabled={isActuallyReady}
                                                >
                                                    {isActuallyReady ? (
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    ) : item.status === 'cooking' ? (
                                                        <>
                                                            <CheckCircle2 className="w-4 h-4" /> TERMINAR
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ChefHat className="w-4 h-4 bg-black/10 rounded-full p-0.5" /> EMPEZAR
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
