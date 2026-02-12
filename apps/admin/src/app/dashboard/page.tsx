'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ChefHat, CreditCard, LayoutDashboard, Loader2, Utensils, Package, CheckCircle, History, GlassWater, Users, TrendingUp, Hand, Scale, Calendar } from 'lucide-react';
import { Order } from '@/types';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import { notify } from '@/lib/notifications';
import { LowStockAlerts } from '@/components/LowStockAlerts'; // Alertas de stock bajo en tiempo real

// Inicialización de Supabase
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DashboardMesas() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [reservations, setReservations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(true);
    const [waiterCalls, setWaiterCalls] = useState<any[]>([]);
    const ordersRef = useRef<Order[]>([]);
    const notifiedItemsRef = useRef<Set<string>>(new Set());
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        ordersRef.current = orders;
    }, [orders]);

    useEffect(() => {
        // 1. Carga inicial
        fetchActiveOrders();
        fetchActiveReservations();

        // 2. Sistema de Suscripción Robusta con Auto-Reconexión
        let channel: any;

        const setupSubscription = () => {
            if (channel) supabase.removeChannel(channel);

            channel = supabase
                .channel('admin-dashboard-sync')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'orders' },
                    (payload) => handleRealtimeUpdate(payload)
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'reservations' },
                    () => fetchActiveReservations(true)
                )
                .subscribe((status) => {
                    setIsConnected(status === 'SUBSCRIBED');
                    if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                        setTimeout(setupSubscription, 5000);
                    }
                });
        };

        setupSubscription();

        // 3. Sincronización Silenciosa (Libreta de seguridad cada 30s)
        const syncInterval = setInterval(() => {
            fetchActiveOrders(true);
            fetchActiveReservations(true);
        }, 30000);

        return () => {
            if (channel) supabase.removeChannel(channel);
            clearInterval(syncInterval);
        };
    }, []);

    const fetchActiveReservations = async (silent = false) => {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
            .from('reservations')
            .select('*')
            .gte('reservation_date', `${today}T00:00:00`)
            .lte('reservation_date', `${today}T23:59:59`)
            .neq('status', 'cancelled')
            .neq('status', 'completed');

        if (data) setReservations(data);
    };

    useEffect(() => {
        fetchWaiterCalls();
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

        const waiterChannel = supabase
            .channel('dashboard-waiter-calls')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'waiter_calls' },
                (payload) => {
                    setWaiterCalls(prev => [payload.new, ...prev]);
                    if (audioRef.current) {
                        audioRef.current.play().catch(e => console.log("Audio blocked"));
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
        const { data } = await supabase.from('waiter_calls').select('*').eq('status', 'pending');
        if (data) setWaiterCalls(data);
    };

    const dismissCall = async (callId: string) => {
        await supabase.from('waiter_calls').update({ status: 'attended' }).eq('id', callId);
        setWaiterCalls(prev => prev.filter(c => c.id !== callId));
    };

    const fetchActiveOrders = async (silent = false) => {
        if (!silent) setLoading(true);
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .neq('status', 'served')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching orders:", error);
            setIsConnected(false);
        } else if (data) {
            setOrders(data);
            setIsConnected(true);
        }
        if (!silent) setLoading(false);
    };

    const handleRealtimeUpdate = (payload: any) => {
        if (payload.eventType === 'INSERT') {
            setOrders((prev) => [...prev, payload.new]);
            notify.newOrder(payload.new.table_number);
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
                        const notificationId = `${payload.new.id}-${item.id || item.name}-ready`;
                        if (!notifiedItemsRef.current.has(notificationId)) {
                            notifiedItemsRef.current.add(notificationId);


                            notify.kitchen(
                                '¡Plato Listo!',
                                item.name,
                                `Mesa ${payload.new.table_number}`
                            );
                        }
                    });
                }
                setOrders((prev) => prev.map(o => o.id === payload.new.id ? payload.new : o));
            }
        } else if (payload.eventType === 'DELETE') {
            setOrders((prev) => prev.filter(o => o.id !== payload.old.id));
        }
    };

    // Función para liberar una mesa por completo con deducción de stock
    const markAsServed = async (tableNumber: number) => {
        // Optimistic update
        setOrders(prev => prev.filter(o => o.table_number !== tableNumber));

        try {
            // 1. Obtener pedidos de la mesa
            const { data: dbOrders } = await supabase
                .from('orders')
                .select('id')
                .eq('table_number', tableNumber)
                .neq('status', 'served');

            if (dbOrders && dbOrders.length > 0) {
                // 2. Descontar stock
                const deductionPromises = dbOrders.map(o =>
                    supabase.rpc('deduct_stock_from_order', { order_uuid: o.id })
                );
                await Promise.all(deductionPromises);
            }

            // 3. Archivar
            const { error } = await supabase
                .from('orders')
                .update({ status: 'served' })
                .eq('table_number', tableNumber)
                .neq('status', 'served');

            if (error) throw error;

            notify.success(`Mesa ${tableNumber} Liberada`, 'Stock actualizado correctamente');

        } catch (error) {
            console.error('Error clearing table:', error);
            fetchActiveOrders(); // Revertir si hay error
            notify.error('Error', 'No se pudo liberar la mesa');
        }
    };

    const markAsDelivering = async (orderId: string) => {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'delivering' } : o));
        await supabase.from('orders').update({ status: 'delivering' }).eq('id', orderId);
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
            <LowStockAlerts />
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 flex items-center gap-3 italic">
                        <LayoutDashboard className="w-8 h-8 text-green-500" />
                        CONTROL GESTIÓN EL REMEI
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-gray-500 font-medium uppercase tracking-tighter">Sala • Stock • Fichas Técnicas</p>
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${isConnected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500 animate-pulse'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                            {isConnected ? 'Sincronizado' : 'Reconectando...'}
                        </div>
                    </div>
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
                    <Link href="/inventory" className="flex items-center gap-2 bg-blue-900/20 text-blue-400 px-4 py-2 rounded-xl text-xs font-black hover:bg-blue-900/30 transition-all border border-blue-500/20">
                        <Scale className="w-4 h-4" />
                        INVENTARIO
                    </Link>
                    <Link href="/recipes" className="flex items-center gap-2 bg-orange-900/20 text-orange-400 px-4 py-2 rounded-xl text-xs font-black hover:bg-orange-900/30 transition-all border border-orange-500/20">
                        <ChefHat className="w-4 h-4" />
                        RECETARIO
                    </Link>
                    <Link href="/customers" className="flex items-center gap-2 bg-emerald-600/10 text-emerald-500 px-4 py-2 rounded-xl text-xs font-black hover:bg-emerald-600/20 transition-all border border-emerald-500/20">
                        <Users className="w-4 h-4" />
                        CLIENTES
                    </Link>
                    <Link href="/history" className="flex items-center gap-2 bg-zinc-900 px-4 py-2 rounded-xl text-xs font-black hover:bg-zinc-800 transition-all border border-zinc-800">
                        <History className="w-4 h-4" />
                        HISTORIAL
                    </Link>
                    <Link href="/mesas" className="flex items-center gap-2 bg-blue-600/10 text-blue-500 px-4 py-2 rounded-xl text-xs font-black hover:bg-blue-600/20 transition-all border border-blue-500/20">
                        <Scale className="w-4 h-4" />
                        PLANO SALÓN
                    </Link>
                    <Link href="/bookings" className="flex items-center gap-2 bg-orange-600/10 text-orange-500 px-4 py-2 rounded-xl text-xs font-black hover:bg-orange-600/20 transition-all border border-orange-500/20">
                        <Calendar className="w-4 h-4" />
                        RESERVAS
                    </Link>
                    <Link href="/stats" className="bg-gradient-to-br from-purple-600 to-indigo-700 p-4 rounded-2xl flex items-center gap-4 transition-all hover:scale-105 shadow-lg group">
                        <div className="bg-white/20 p-2 rounded-lg group-hover:bg-white/30 transition-all">
                            <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-xs text-white/70 uppercase font-black">Métricas</p>
                            <p className="text-xs font-bold text-white uppercase italic">Ver BI</p>
                        </div>
                    </Link>
                </div>
            </header>

            {/* ======= ALERTAS DE CAMARERO ======= */}
            {waiterCalls.length > 0 && (
                <div className="mb-10 flex flex-wrap gap-4">
                    {waiterCalls.map((call) => (
                        <div
                            key={call.id}
                            className="bg-red-600 animate-pulse-fast p-3 rounded-2xl flex items-center gap-3 shadow-xl border border-white/20"
                        >
                            <span className="text-xl">🖐️</span>
                            <div className="leading-none">
                                <p className="font-black text-white text-sm uppercase">Mesa {call.table_number}</p>
                                <p className="text-white/70 text-[8px] font-bold uppercase mt-1">Llamada de cliente</p>
                            </div>
                            <button
                                onClick={() => dismissCall(call.id)}
                                className="ml-2 bg-white text-red-600 px-3 py-1 rounded-lg font-black text-[9px] uppercase hover:bg-zinc-100 transition-all"
                            >
                                OK
                            </button>
                        </div>
                    ))}
                </div>
            )}

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

    const liberateTable = async (tableNumber: number) => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const { error } = await supabase
                .from('reservations')
                .update({ status: 'completed' })
                .eq('table_number', tableNumber)
                .gte('reservation_date', `${today}T00:00:00`)
                .lte('reservation_date', `${today}T23:59:59`)
                .neq('status', 'cancelled');

            if (error) throw error;

            setReservations(prev => prev.filter(r => r.table_number !== tableNumber));
            notify.success(`Mesa ${tableNumber} Liberada`, 'Disponible para nuevas reservas online');
        } catch (error) {
            console.error('Error liberating table:', error);
            notify.error('Error', 'No se pudo liberar la mesa');
        }
    };

    function renderTableCard(num: number, type: string, displayNum?: number) {
        // Obtenemos todos los pedidos activos para esta mesa
        const tableOrders = orders.filter(o => o.table_number === num);
        const tableReservations = reservations.filter(r => r.table_number === num);
        const display = displayNum || num;

        let statusColor = "border-gray-800 bg-gray-900/30 opacity-40";
        let label = "VACÍA";
        let pulse = false;

        // 1. Lógica de Reservas (Prioridad si está vacía)
        const hasReservation = tableReservations.length > 0;
        if (hasReservation && tableOrders.length === 0) {
            statusColor = "border-orange-500/50 bg-orange-950/20 text-orange-400";
            label = "RESERVADA";
        }

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

        // 2. Lógica de Liberación (45 min)
        const oldestOrder = tableOrders.length > 0 ? tableOrders.reduce((prev, curr) => (new Date(prev.created_at!) < new Date(curr.created_at!) ? prev : curr)) : null;
        const needsLiberation = oldestOrder && (new Date().getTime() - new Date(oldestOrder.created_at!).getTime()) > 45 * 60 * 1000;

        const allItems = tableOrders.flatMap(o => o.items.map(item => ({ ...item, drinks_served: o.drinks_served, orderId: o.id })));
        const beverages = allItems.filter((item: any) => item.category?.toLowerCase() === 'bebida');
        const foodItems = allItems.filter((item: any) => item.category?.toLowerCase() !== 'bebida');

        // Estado de bebidas: se considera servido solo si TODOS los pedidos con bebida han sido marcados
        const allDrinksServed = beverages.length > 0 && tableOrders.every(o =>
            o.items.some(i => i.category?.toLowerCase() === 'bebida') ? o.drinks_served : true
        );

        return (
            <div key={num} className="relative group">
                {/* Burbuja de Sugerencia de Liberación (45 min) */}
                {needsLiberation && (
                    <div className="absolute -top-3 -right-3 z-30 animate-bounce">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                liberateTable(num);
                            }}
                            className="bg-red-500 text-white text-[8px] font-black px-3 py-2 rounded-2xl shadow-xl shadow-red-500/40 border border-white/20 whitespace-nowrap hover:scale-110 transition-transform"
                        >
                            ¿LIBERAR MESA?
                        </button>
                    </div>
                )}
                <Link
                    href={`/dashboard/table/${num}`}
                    className={`min-h-[180px] rounded-3xl flex flex-col items-center p-4 border-2 transition-all duration-300 relative overflow-hidden ${statusColor} ${pulse ? 'animate-pulse' : ''} ${tableOrders.length > 0 || hasReservation ? 'scale-[1.02] shadow-xl shadow-black/50 opacity-100 cursor-pointer' : 'opacity-40 hover:opacity-100 cursor-pointer'}`}
                >
                    <div className="absolute top-3 right-4 text-[9px] font-black opacity-30 tracking-widest">{type.toUpperCase()}</div>

                    <span className="text-[10px] uppercase font-black tracking-[0.2em] opacity-50 mb-1">
                        {type}
                    </span>
                    <span className={`text-4xl font-black italic ${tableOrders.length > 0 ? 'scale-110 mb-1' : ''}`}>{display}</span>

                    {/* Indicador de RESERVADA (Marco iluminado) */}
                    {hasReservation && (
                        <div className="absolute inset-0 border-4 border-orange-500/30 rounded-3xl pointer-events-none">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[7px] font-black px-2 py-0.5 rounded-b-lg tracking-tighter shadow-lg">
                                RESERVADA
                            </div>
                        </div>
                    )}

                    {/* Indicador de Llamada de Camarero en la Mesa */}
                    {waiterCalls.some(c => c.table_number == num) && (
                        <div className="absolute inset-0 bg-red-600/20 animate-pulse flex items-center justify-center">
                            <div className="bg-red-600 p-3 rounded-full shadow-2xl animate-bounce">
                                <Hand className="w-8 h-8 text-white" />
                            </div>
                        </div>
                    )}

                    {(tableOrders.length > 0 || hasReservation) && (
                        <>
                            <div className={`mt-2 text-[10px] font-black px-2 py-0.5 rounded-full border mb-3 ${hasReservation && tableOrders.length === 0 ? 'bg-orange-500/20 border-orange-500/30' : tableOrders.some(o => o.is_paid) ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-yellow-500/20 border-yellow-500/30'}`}>
                                {label}
                            </div>

                            <div className="w-full space-y-3 mt-auto">
                                {/* Listado de Comida */}
                                {foodItems.length > 0 && (
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[8px] font-black uppercase opacity-60">Cocina</span>
                                            {tableOrders.some(o => o.status === 'ready') && (
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        tableOrders.filter(o => o.status === 'ready').forEach(o => markAsDelivering(o.id));
                                                    }}
                                                    className="bg-orange-500 hover:bg-orange-400 text-white text-[7px] font-black px-1.5 py-0.5 rounded-md transition-all animate-pulse"
                                                >
                                                    EN CAMINO
                                                </button>
                                            )}
                                            {foodItems.every((item: any) => item.is_ready) && !tableOrders.some(o => o.status === 'ready') && (
                                                <ChefHat className="w-3 h-3 text-orange-400" />
                                            )}
                                        </div>
                                        <div className="max-h-20 overflow-y-auto no-scrollbar space-y-0.5">
                                            {foodItems.map((item: any, i) => (
                                                <div key={i} className={`flex justify-between items-center text-[9px] font-bold ${(item.is_ready || item.is_served) ? 'text-emerald-400' : (tableOrders.some(o => o.id === item.orderId && o.status === 'delivering')) ? 'text-blue-400' : 'text-gray-300'}`}>
                                                    <div className="flex items-center gap-1 truncate">
                                                        {(item.is_served || tableOrders.some(o => o.id === item.orderId && o.status === 'delivering')) && <CheckCircle className="w-2.5 h-2.5 flex-shrink-0" />}
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
            </div>
        );
    }
}
