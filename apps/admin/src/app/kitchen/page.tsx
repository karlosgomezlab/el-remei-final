'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ChefHat, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Order } from '@/types';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function KitchenView() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

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

    const markAsReady = async (orderId: string) => {
        await supabase.from('orders').update({ status: 'ready' }).eq('id', orderId);
    };

    const toggleItemReady = async (orderId: string, itemIdx: number) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        const newItems = [...order.items];
        // Encontramos el item real por su contenido (ya que el index del map filtrado no coincide)
        // Pero para ser más precisos, lo ideal es usar el index del array original
        newItems[itemIdx] = { ...newItems[itemIdx], is_ready: !newItems[itemIdx].is_ready };

        // Actualizamos localmente
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, items: newItems } : o));

        // Guardamos en Supabase
        await supabase
            .from('orders')
            .update({ items: newItems })
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
                            {orders.filter(order => order.items.some((item: any) => item.category !== 'bebida')).length}
                        </span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {orders
                    .filter(order => order.items.some((item: any) => item.category !== 'bebida'))
                    .map((order) => (
                        <div
                            key={order.id}
                            className={`flex flex-col bg-zinc-900 rounded-[2rem] border-2 shadow-2xl overflow-hidden transition-all duration-500 ${order.status === 'pending' ? 'border-yellow-600 bg-yellow-600/5' : 'border-zinc-800'}`}
                        >
                            <div className={`p-4 flex justify-between items-center ${order.status === 'pending' ? 'bg-yellow-600/20' : 'bg-zinc-800/50'}`}>
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
                                                className={`flex justify-between items-center gap-4 p-2 rounded-xl transition-all cursor-pointer hover:bg-white/5 ${item.is_ready ? 'opacity-30' : ''}`}
                                                onClick={() => toggleItemReady(order.id, originalIdx)}
                                            >
                                                <div className="flex gap-3 items-center">
                                                    <span className={`${item.is_ready ? 'bg-zinc-700' : 'bg-orange-600'} text-white w-6 h-6 rounded-md flex items-center justify-center font-black text-xs transition-colors`}>
                                                        {item.qty || 1}
                                                    </span>
                                                    <span className={`font-bold text-lg uppercase leading-tight ${item.is_ready ? 'line-through' : ''}`}>
                                                        {item.name}
                                                    </span>
                                                </div>
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${item.is_ready ? 'bg-green-500 border-green-500 text-white' : 'border-zinc-700'}`}>
                                                    {item.is_ready && <CheckCircle2 className="w-4 h-4" />}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>

                            <div className="p-4 bg-zinc-800/30">
                                <button
                                    onClick={() => markAsReady(order.id)}
                                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-orange-900/20"
                                >
                                    <CheckCircle2 className="w-6 h-6" />
                                    LISTO PARA SERVIR
                                </button>
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
