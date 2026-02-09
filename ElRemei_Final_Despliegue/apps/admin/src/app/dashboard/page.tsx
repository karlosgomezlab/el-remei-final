'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ChefHat, CreditCard, LayoutDashboard, Loader2, Utensils, Package, CheckCircle, History, GlassWater, Users } from 'lucide-react';
import { Order } from '@/types';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';

// Inicialización de Supabase
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DashboardMesas() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const ordersRef = useRef<Order[]>([]);

    useEffect(() => {
        ordersRef.current = orders;
    }, [orders]);

    useEffect(() => {
        // 1. Carga inicial de pedidos activos
        fetchActiveOrders();

        // 2. Escucha en tiempo real (Pulse)
        const channel = supabase
            .channel('schema-db-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders' },
                (payload) => {
                    handleRealtimeUpdate(payload);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchActiveOrders = async () => {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .neq('status', 'served'); // Solo mostramos lo que está en curso

        if (error) {
            console.error("Error fetching orders:", error);
        } else if (data) {
            setOrders(data);
        }
        setLoading(false);
    };

    const handleRealtimeUpdate = (payload: any) => {
        if (payload.eventType === 'INSERT') {
            setOrders((prev) => [...prev, payload.new]);
            toast.success('¡Nuevo Pedido!', {
                description: `Mesa ${payload.new.table_number}`,
                action: { label: 'Ver', onClick: () => { } }
            });
        } else if (payload.eventType === 'UPDATE') {
            if (payload.new.status === 'served') {
                setOrders((prev) => prev.filter(o => o.id !== payload.new.id));
            } else {
                // Notificar si hay platos nuevos listos
                const oldOrder = ordersRef.current.find(o => o.id === payload.new.id);
                if (oldOrder) {
                    const newReadyItems = payload.new.items.filter((item: any) =>
                        item.is_ready && !oldOrder.items.find((i: any) => i.name === item.name)?.is_ready
                    );

                    newReadyItems.forEach((item: any) => {
                        toast('🍽️ ¡PLATO LISTO!', {
                            description: `${item.name} para Mesa ${payload.new.table_number}`,
                            duration: 8000,
                            style: {
                                background: '#10b981',
                                color: '#fff',
                                border: 'none',
                                fontWeight: 'bold'
                            }
                        });
                    });
                }
                setOrders((prev) => prev.map(o => o.id === payload.new.id ? payload.new : o));
            }
        } else if (payload.eventType === 'DELETE') {
            setOrders((prev) => prev.filter(o => o.id !== payload.old.id));
        }
    };

    // Función para liberar una mesa por completo
    const markAsServed = async (tableNumber: number) => {
        // Actualizamos localmente para que desaparezca al instante
        setOrders(prev => prev.filter(o => o.table_number !== tableNumber));

        const { error } = await supabase
            .from('orders')
            .update({ status: 'served' })
            .eq('table_number', tableNumber)
            .neq('status', 'served');

        if (error) {
            console.error('Error clearing table:', error);
            fetchActiveOrders();
            alert('Error al liberar la mesa');
        }
    };

    const markDrinksAsServed = async (orderId: string) => {
        // Actualizamos localmente
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, drinks_served: true } : o));

        const { error } = await supabase
            .from('orders')
            .update({ drinks_served: true })
            .eq('id', orderId);

        if (error) {
            console.error('Error marking drinks as served:', error);
            fetchActiveOrders();
        }
    };

    // Timer automático: marcar como servido después de 30 minutos de estar pagado
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            orders.forEach(async (order) => {
                if (order.is_paid && order.status !== 'served') {
                    const dateToUse = order.updated_at || order.created_at || new Date().toISOString();
                    const paidAt = new Date(dateToUse);
                    const minutesSincePaid = (now.getTime() - paidAt.getTime()) / (1000 * 60);

                    // Si han pasado 30 minutos desde que se pagó, marcar como servido automáticamente
                    if (minutesSincePaid >= 30) {
                        await markAsServed(order.table_number);
                    }
                }
            });
        }, 60000); // Revisar cada minuto

        return () => clearInterval(interval);
    }, [orders]);

    const stats = {
        paid: orders.filter(o => o.is_paid).length,
        bar: orders.filter(o => !o.drinks_served && o.items.some((item: any) => item.category?.toLowerCase() === 'bebida')).length,
        cooking: orders.filter(o => o.status === 'cooking' && o.items.some((item: any) => item.category?.toLowerCase() !== 'bebida')).length,
        pending: orders.filter(o => !o.is_paid && o.status === 'pending').length,
        creditDebts: orders.filter(o => o.payment_method === 'credit').length
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-green-500" />
            <p className="text-gray-400 font-mono uppercase tracking-widest">Iniciando Sistema de Sala...</p>
        </div>
    );

    return (
        <div className="p-6 bg-gray-950 min-h-screen text-white font-sans">
            <Toaster position="top-right" expand={true} richColors />
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 flex items-center gap-3 italic">
                        <LayoutDashboard className="w-8 h-8 text-green-500" />
                        CONTROL GESTIÓN EL REMEI
                    </h1>
                    <p className="text-gray-500 font-medium mt-1 uppercase tracking-tighter">Administración en Tiempo Real • Sala & Bebida</p>
                </div>

                <div className="flex flex-wrap gap-4">
                    <div className="bg-gray-900/50 border border-blue-500/30 p-4 rounded-2xl flex items-center gap-4 transition-all hover:bg-blue-900/10">
                        <div className="bg-blue-500/20 p-2 rounded-lg">
                            <GlassWater className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase font-bold">Bebida</p>
                            <p className="text-2xl font-black text-blue-400">{stats.bar}</p>
                        </div>
                    </div>
                    <div className="bg-gray-900/50 border border-emerald-500/30 p-4 rounded-2xl flex items-center gap-4 transition-all hover:bg-emerald-900/10">
                        <div className="bg-emerald-500/20 p-2 rounded-lg">
                            <CreditCard className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase font-bold">Pagado</p>
                            <p className="text-2xl font-black text-emerald-400">{stats.paid}</p>
                        </div>
                    </div>
                    <div className="bg-gray-900/50 border border-orange-500/30 p-4 rounded-2xl flex items-center gap-4 transition-all hover:bg-orange-900/10">
                        <div className="bg-orange-500/20 p-2 rounded-lg">
                            <ChefHat className="w-6 h-6 text-orange-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase font-bold">Cocina</p>
                            <p className="text-2xl font-black text-orange-400">{stats.cooking}</p>
                        </div>
                    </div>
                    <div className="bg-gray-900/50 border border-yellow-500/30 p-4 rounded-2xl flex items-center gap-4 transition-all hover:bg-yellow-900/10">
                        <div className="bg-yellow-500/20 p-2 rounded-lg">
                            <Utensils className="w-6 h-6 text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase font-bold">Pendiente</p>
                            <p className="text-2xl font-black text-yellow-400">{stats.pending}</p>
                        </div>
                    </div>
                    {stats.creditDebts > 0 && (
                        <div className="bg-gray-900/50 border border-red-500/30 p-4 rounded-2xl flex items-center gap-4 transition-all hover:bg-red-900/10">
                            <div className="bg-red-500/20 p-2 rounded-lg">
                                <CreditCard className="w-6 h-6 text-red-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase font-bold">Deudas</p>
                                <p className="text-2xl font-black text-red-400">{stats.creditDebts}</p>
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap gap-3">
                    <Link href="/kitchen" className="flex items-center gap-2 bg-zinc-900 px-4 py-2 rounded-xl text-xs font-black hover:bg-zinc-800 transition-all border border-zinc-800">
                        <ChefHat className="w-4 h-4" />
                        COCINA
                    </Link>
                    <Link href="/products" className="flex items-center gap-2 bg-zinc-900 px-4 py-2 rounded-xl text-xs font-black hover:bg-zinc-800 transition-all border border-zinc-800">
                        <Package className="w-4 h-4" />
                        STOCK
                    </Link>
                    <Link href="/customers" className="flex items-center gap-2 bg-emerald-600/10 text-emerald-500 px-4 py-2 rounded-xl text-xs font-black hover:bg-emerald-600/20 transition-all border border-emerald-500/20">
                        <Users className="w-4 h-4" />
                        CLIENTES
                    </Link>
                    <Link href="/history" className="flex items-center gap-2 bg-zinc-900 px-4 py-2 rounded-xl text-xs font-black hover:bg-zinc-800 transition-all border border-zinc-800">
                        <History className="w-4 h-4" />
                        HISTORIAL
                    </Link>
                </div>
            </header>

            {/* SECCIÓN SALA */}
            <div className="mb-12">
                <h2 className="text-xl font-black italic mb-6 text-gray-400 flex items-center gap-2">
                    <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
                    SALA PRINCIPAL (MESAS)
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => renderTableCard(num, 'Mesa'))}
                </div>
            </div>

            {/* SECCIÓN BARRA */}
            <div className="mt-12">
                <h2 className="text-xl font-black italic mb-6 text-gray-400 flex items-center gap-2">
                    <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
                    ZONA BEBIDA (TABURETES)
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-x-3 gap-y-4">
                    {Array.from({ length: 10 }, (_, i) => i + 21).map((num) => renderTableCard(num, 'Bebida', num - 20))}
                </div>
            </div>
        </div>
    );

    function renderTableCard(num: number, type: string, displayNum?: number) {
        // Obtenemos todos los pedidos activos para esta mesa
        const tableOrders = orders.filter(o => o.table_number === num);
        const display = displayNum || num;

        let statusColor = "border-gray-800 bg-gray-900/30 opacity-40";
        let label = "VACÍA";
        let pulse = false;

        if (tableOrders.length > 0) {
            const anyUnpaid = tableOrders.some(o => !o.is_paid);
            if (!anyUnpaid) {
                statusColor = "border-emerald-500 bg-emerald-950/40 text-emerald-400";
                label = "✅ PAGADO";
            } else {
                const pMethod = tableOrders.find(o => !o.is_paid)?.payment_method;
                const methodLabels: Record<string, string> = {
                    'cash': '💵 EFECTIVO',
                    'card': '💳 DATÁFONO',
                    'credit': '📙 MAÑANA',
                    'online': '📱 APP'
                };
                statusColor = "border-yellow-500 bg-yellow-950/40 text-yellow-400";
                label = methodLabels[pMethod || 'cash'] || "⏳ PENDIENTE";
                pulse = true;
            }
        }

        const allItems = tableOrders.flatMap(o => o.items.map(item => ({ ...item, drinks_served: o.drinks_served, orderId: o.id })));
        const beverages = allItems.filter((item: any) => item.category?.toLowerCase() === 'bebida');
        const foodItems = allItems.filter((item: any) => item.category?.toLowerCase() !== 'bebida');

        // Estado de bebidas: se considera servido solo si TODOS los pedidos con bebida han sido marcados
        const allDrinksServed = beverages.length > 0 && tableOrders.every(o =>
            o.items.some(i => i.category?.toLowerCase() === 'bebida') ? o.drinks_served : true
        );

        return (
            <Link
                href={`/dashboard/table/${num}`}
                key={num}
                className={`min-h-[180px] rounded-3xl flex flex-col items-center p-4 border-2 transition-all duration-300 relative group overflow-hidden ${statusColor} ${pulse ? 'animate-pulse' : ''} ${tableOrders.length > 0 ? 'scale-[1.02] shadow-xl shadow-black/50 opacity-100 cursor-pointer' : 'opacity-40 hover:opacity-100 cursor-pointer'}`}
            >
                <div className="absolute top-3 right-4 text-[9px] font-black opacity-30 tracking-widest">{type.toUpperCase()}</div>

                <span className="text-[10px] uppercase font-black tracking-[0.2em] opacity-50 mb-1">
                    {type}
                </span>
                <span className={`text-4xl font-black italic ${tableOrders.length > 0 ? 'scale-110 mb-1' : ''}`}>{display}</span>

                {tableOrders.length > 0 && (
                    <>
                        <div className={`mt-2 text-[10px] font-black px-2 py-0.5 rounded-full border mb-3 ${tableOrders.some(o => o.is_paid) ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-yellow-500/20 border-yellow-500/30'}`}>
                            {label}
                        </div>

                        <div className="w-full space-y-3 mt-auto">
                            {/* Listado de Comida */}
                            {foodItems.length > 0 && (
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[8px] font-black uppercase opacity-60">Cocina</span>
                                        {foodItems.every((item: any) => item.is_ready) && (
                                            <ChefHat className="w-3 h-3 text-orange-400" />
                                        )}
                                    </div>
                                    <div className="max-h-20 overflow-y-auto no-scrollbar space-y-0.5">
                                        {foodItems.map((item: any, i) => (
                                            <div key={i} className={`flex justify-between items-center text-[9px] font-bold ${(item.is_ready || item.is_served) ? 'text-emerald-400' : 'text-gray-300'}`}>
                                                <div className="flex items-center gap-1 truncate">
                                                    {item.is_served && <CheckCircle className="w-2.5 h-2.5 flex-shrink-0" />}
                                                    <span className={`truncate ${item.is_served ? 'line-through opacity-60' : ''}`}>{item.name}</span>
                                                </div>
                                                <span className="opacity-60 italic flex-shrink-0">x{item.qty || 1}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Listado de Bebidas */}
                            {beverages.length > 0 && (
                                <div className="pt-2 border-t border-current/10 space-y-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[8px] font-black uppercase opacity-60">Bebidas</span>
                                        {allDrinksServed ? (
                                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                                        ) : (
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    tableOrders.forEach(o => {
                                                        if (o.items.some(i => i.category?.toLowerCase() === 'bebida') && !o.drinks_served) {
                                                            markDrinksAsServed(o.id);
                                                        }
                                                    });
                                                }}
                                                className="bg-blue-600 hover:bg-blue-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-md transition-all"
                                            >
                                                SERVIR
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-16 overflow-y-auto no-scrollbar space-y-0.5">
                                        {beverages.map((item: any, i) => (
                                            <div key={i} className={`flex justify-between items-center text-[9px] font-bold ${item.drinks_served ? 'text-emerald-400' : 'text-gray-300'}`}>
                                                <div className="flex items-center gap-1 truncate">
                                                    {item.drinks_served && <CheckCircle className="w-2.5 h-2.5 flex-shrink-0" />}
                                                    <span className={`truncate ${item.drinks_served ? 'line-through opacity-60' : ''}`}>{item.name}</span>
                                                </div>
                                                <span className="opacity-60 italic flex-shrink-0">x{item.qty || 1}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Botón Maestro para liberar mesa */}
                {tableOrders.length > 0 && (
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            markAsServed(num);
                        }}
                        className="absolute top-3 left-3 bg-zinc-800 hover:bg-red-900 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-2xl border border-white/5"
                        title="Liberar por completo y enviar a historial"
                    >
                        <CheckCircle className="w-4 h-4" />
                    </button>
                )}
            </Link>
        );
    }
}
