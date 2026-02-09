'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ChefHat, CreditCard, ArrowLeft, Loader2, CheckCircle, Utensils, GlassWater, Smartphone } from 'lucide-react';
import { Order } from '@/types';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function TableDetail({ params }: { params: { id: string } | Promise<{ id: string }> }) {
    const [tableId, setTableId] = useState<string | null>(null);

    useEffect(() => {
        if (params instanceof Promise) {
            params.then(p => setTableId(p.id));
        } else {
            setTableId(params.id);
        }
    }, [params]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [customerName, setCustomerName] = useState<string | null>(null);

    useEffect(() => {
        if (!tableId) return;

        fetchTableOrders();

        const channel = supabase
            .channel(`admin-table-${tableId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders', filter: `table_number=eq.${tableId}` },
                () => {
                    fetchTableOrders();
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [tableId]);

    const fetchTableOrders = async () => {
        if (!tableId) return;

        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('table_number', parseInt(tableId))
            .neq('status', 'served');

        if (error) {
            console.error("Error fetching table orders:", error);
        } else if (data) {
            setOrders(data);
            const cId = data.find(o => o.customer_id)?.customer_id;
            if (cId) fetchCustomerName(cId);
        }
        setLoading(false);
    };

    const fetchCustomerName = async (id: string) => {
        const { data } = await supabase.from('customers').select('name').eq('id', id).single();
        if (data) setCustomerName(data.name);
    };

    const markAsServed = async () => {
        if (!tableId) return;

        const { error } = await supabase
            .from('orders')
            .update({ status: 'served' })
            .eq('table_number', parseInt(tableId))
            .neq('status', 'served');

        if (error) {
            toast.error('Error al liberar la mesa');
        } else {
            toast.success('Mesa liberada correctamente');
            // Redirigir al dashboard
            window.location.href = '/dashboard';
        }
    };

    const markDrinksAsServed = async (orderId: string) => {
        const { error } = await supabase
            .from('orders')
            .update({ drinks_served: true })
            .eq('id', orderId);

        if (error) toast.error('Error al servir bebidas');
    };

    const markFoodAsServed = async (orderId: string, itemId: string) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        const updatedItems = order.items.map((item: any) =>
            item.id === itemId ? { ...item, is_served: true } : item
        );

        const { error } = await supabase
            .from('orders')
            .update({ items: updatedItems })
            .eq('id', orderId);

        if (error) {
            toast.error('Error al marcar plato como servido');
        } else {
            toast.success('Plato servido');
        }
    };

    const allItems = orders.flatMap(o => o.items.map(item => ({ ...item, drinks_served: o.drinks_served, orderId: o.id })));
    const beverages = allItems.filter((item: any) => item.category?.toLowerCase() === 'bebida');
    const foodItems = allItems.filter((item: any) => item.category?.toLowerCase() !== 'bebida');
    const totalAmount = orders.reduce((acc, o) => acc + Number(o.total_amount || 0), 0);
    const allPaid = orders.length > 0 && orders.every(o => o.is_paid);

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-black">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-950 text-white p-6 font-sans">
            <Toaster position="top-right" richColors />

            <header className="flex items-center justify-between mb-8">
                <Link href="/dashboard" className="bg-gray-900 p-3 rounded-2xl hover:bg-gray-800 transition-all border border-gray-800">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div className="text-center">
                    <h1 className="text-3xl font-black italic">ESTADO MESA {tableId}</h1>
                    <p className="text-gray-500 text-xs uppercase tracking-widest font-bold">Detalle de Comandos y Consumo</p>
                </div>
                <div className={`px-4 py-2 rounded-xl text-xs font-black border flex items-center gap-2 ${allPaid ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : (orders.some(o => o.payment_method === 'credit') ? 'bg-zinc-800 border-orange-500 text-orange-500' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400')}`}>
                    {allPaid ? (
                        <>
                            <CheckCircle className="w-4 h-4" />
                            COBRADA
                        </>
                    ) : (
                        (() => {
                            const pMethod = orders.find(o => !o.is_paid)?.payment_method;
                            if (pMethod === 'credit') return `TE PAGO MAÑANA (${customerName || '...'})`;
                            if (pMethod === 'card') return <> <CreditCard className="w-4 h-4" /> PEDIR DATÁFONO </>;
                            if (pMethod === 'cash') return <> <Utensils className="w-4 h-4" /> PAGO EFECTIVO </>;
                            if (pMethod === 'online') return <> <Smartphone className="w-4 h-4" /> PAGO APP (OK) </>;
                            return 'PENDIENTE';
                        })()
                    )}
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Panel de Comida */}
                <div className="bg-gray-900/50 border border-white/5 rounded-[2.5rem] p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-orange-500/20 p-2 rounded-xl">
                            <ChefHat className="w-6 h-6 text-orange-400" />
                        </div>
                        <h2 className="text-xl font-black italic">COMIDA</h2>
                    </div>

                    <div className="space-y-4">
                        {foodItems.length > 0 ? foodItems.map((item: any, i) => (
                            <div key={i} className="flex flex-col gap-2">
                                <div className={`flex justify-between items-center p-4 rounded-2xl border ${item.is_served ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-gray-800/30 border-white/5'}`}>
                                    <div className="flex items-center gap-3">
                                        {item.is_served ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : (
                                            item.is_ready ? <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> : <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                                        )}
                                        <span className={`font-bold ${item.is_served ? 'line-through opacity-40' : ''}`}>{item.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-black opacity-40">x{item.qty || 1}</span>
                                        {item.is_ready && !item.is_served && (
                                            <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-black uppercase">¡Listo!</span>
                                        )}
                                    </div>
                                </div>
                                {item.is_ready && !item.is_served && (
                                    <button
                                        onClick={() => markFoodAsServed(item.orderId, item.id)}
                                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle className="w-3 h-3" />
                                        Marcar como Entregado
                                    </button>
                                )}
                            </div>
                        )) : (
                            <p className="text-gray-600 text-center py-10 italic">No hay platos de cocina</p>
                        )}
                    </div>
                </div>

                {/* Panel de Bebida */}
                <div className="bg-gray-900/50 border border-white/5 rounded-[2.5rem] p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-blue-500/20 p-2 rounded-xl">
                            <GlassWater className="w-6 h-6 text-blue-400" />
                        </div>
                        <h2 className="text-xl font-black italic">BEBIDA</h2>
                    </div>

                    <div className="space-y-4">
                        {beverages.length > 0 ? beverages.map((item: any, i) => (
                            <div key={i} className="flex flex-col gap-2">
                                <div className={`flex justify-between items-center p-4 rounded-2xl border ${item.drinks_served ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-gray-800/30 border-white/5'}`}>
                                    <div className="flex items-center gap-3">
                                        {item.drinks_served ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <GlassWater className="w-4 h-4 text-blue-400" />}
                                        <span className={`font-bold ${item.drinks_served ? 'line-through opacity-40' : ''}`}>{item.name}</span>
                                    </div>
                                    <span className="text-xs font-black opacity-40">x{item.qty || 1}</span>
                                </div>
                                {!item.drinks_served && (
                                    <button
                                        onClick={() => markDrinksAsServed(item.orderId)}
                                        className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-[10px] font-black uppercase transition-all"
                                    >
                                        Marcar como Servido
                                    </button>
                                )}
                            </div>
                        )) : (
                            <p className="text-gray-600 text-center py-10 italic">No hay bebidas pedidas</p>
                        )}
                    </div>
                </div>

                {/* Panel de Cuenta y Acciones */}
                <div className="bg-gray-900/50 border border-white/5 rounded-[2.5rem] p-8 flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-green-500/20 p-2 rounded-xl">
                            <CreditCard className="w-6 h-6 text-green-400" />
                        </div>
                        <h2 className="text-xl font-black italic">CUENTA TOTAL</h2>
                    </div>

                    <div className="flex-1 space-y-6">
                        <div className="bg-black/40 p-6 rounded-3xl border border-white/5">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-500 font-bold uppercase text-[10px]">Subtotal</span>
                                <span className="font-bold">{(totalAmount / 1.1).toFixed(2)}€</span>
                            </div>
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-gray-500 font-bold uppercase text-[10px]">IVA (10%)</span>
                                <span className="font-bold">{(totalAmount - (totalAmount / 1.1)).toFixed(2)}€</span>
                            </div>
                            <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                                <span className="text-lg font-black italic">TOTAL</span>
                                <span className="text-3xl font-black text-green-400">{totalAmount.toFixed(2)}€</span>
                            </div>
                        </div>

                        {orders.length > 0 && (
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Gestión de Mesa</p>
                                <button
                                    onClick={markAsServed}
                                    className="w-full py-6 bg-zinc-800 hover:bg-red-900 border border-white/5 rounded-3xl font-black italic transition-all shadow-xl group flex items-center justify-center gap-4"
                                >
                                    <CheckCircle className="w-6 h-6 group-hover:scale-125 transition-transform" />
                                    LIBERAR MESA Y ARCHIVAR
                                </button>
                                <p className="text-[9px] text-gray-600 text-center uppercase font-bold italic tracking-tighter">
                                    Esta acción eliminará la mesa de la vista activa y guardará el ticket en el historial.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
