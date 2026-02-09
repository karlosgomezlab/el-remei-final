'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
    ArrowLeft,
    TrendingUp,
    Calendar,
    DollarSign,
    ShoppingBag,
    Users,
    Award,
    ChevronRight,
    Loader2
} from 'lucide-react';
import Link from 'next/link';
import { Toaster } from 'sonner';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface DailyStats {
    totalSales: number;
    totalOrders: number;
    averageOrder: number;
    topProducts: { name: string; qty: number; revenue: number }[];
    salesByCategory: { category: string; revenue: number; qty: number }[];
    hourlySales: { hour: string; revenue: number }[];
}

export default function MobileStatsPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DailyStats | null>(null);
    const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');

    useEffect(() => {
        fetchStats();
    }, [dateRange]);

    const fetchStats = async () => {
        setLoading(true);
        const now = new Date();
        let startDate = new Date();

        if (dateRange === 'today') {
            startDate.setHours(0, 0, 0, 0);
        } else if (dateRange === 'week') {
            startDate.setDate(now.getDate() - 7);
        } else {
            startDate.setMonth(now.getMonth() - 1);
        }

        // Fetch orders
        const { data: orders, error } = await supabase
            .from('orders')
            .select('*, items:order_items(*)')
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: true });

        if (error || !orders) {
            console.error("Error fetching stats:", error);
            setLoading(false);
            return;
        }

        // Process data
        let totalSales = 0;
        let totalOrders = orders.length;
        const productsMap = new Map<string, { qty: number, revenue: number }>();
        const categoryMap = new Map<string, { qty: number, revenue: number }>();
        const hoursMap = new Map<string, number>();

        orders.forEach(order => {
            // Calculate total based on items if order total is not present (or simple heuristic)
            // Assuming order.total_amount exists or we sum items
            let orderTotal = 0;
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach((item: any) => {
                    const price = Number(item.price);
                    const qty = Number(item.quantity || 1);
                    const itemTotal = price * qty;
                    orderTotal += itemTotal;

                    // Top Products
                    const currentProd = productsMap.get(item.name) || { qty: 0, revenue: 0 };
                    productsMap.set(item.name, {
                        qty: currentProd.qty + qty,
                        revenue: currentProd.revenue + itemTotal
                    });

                    // Sales by Category
                    const cat = item.category || 'Otros';
                    const currentCat = categoryMap.get(cat) || { qty: 0, revenue: 0 };
                    categoryMap.set(cat, {
                        qty: currentCat.qty + qty,
                        revenue: currentCat.revenue + itemTotal
                    });
                });
            }
            totalSales += orderTotal;

            // Hourly Sales (only relevant for 'today' view really, but useful generally)
            const date = new Date(order.created_at);
            const hourKey = `${date.getHours()}:00`;
            hoursMap.set(hourKey, (hoursMap.get(hourKey) || 0) + orderTotal);
        });

        // Format for display
        const topProducts = Array.from(productsMap.entries())
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        const salesByCategory = Array.from(categoryMap.entries())
            .map(([category, data]) => ({ category, ...data }))
            .sort((a, b) => b.revenue - a.revenue);

        // Fill in hours for chart
        const hourlySales = [];
        if (dateRange === 'today') {
            for (let i = 9; i <= 23; i++) {
                const hour = `${i}:00`;
                hourlySales.push({ hour, revenue: hoursMap.get(hour) || 0 });
            }
        } else {
            // For week/month, maybe categorize by date? Keeping it simple for now.
            // Just flat list of non-zero hours or days could be better but let's stick to hourly distribution
        }

        setStats({
            totalSales,
            totalOrders,
            averageOrder: totalOrders > 0 ? totalSales / totalOrders : 0,
            topProducts,
            salesByCategory,
            hourlySales
        });
        setLoading(false);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black gap-4 text-white">
            <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Calculando Métricas...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans overflow-x-hidden pb-32">
            <Toaster position="top-right" richColors />

            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div className="flex items-center gap-6">
                    <Link href="/dashboard" className="bg-zinc-900 p-4 rounded-3xl hover:bg-zinc-800 transition-all border border-white/5 shadow-xl">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className="text-4xl font-black italic bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-red-600">
                            BUSINESS INTELLIGENCE
                        </h1>
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-1">Métricas de Rendimiento • El Remei</p>
                    </div>
                </div>

                <div className="flex bg-zinc-900 p-1 rounded-2xl border border-white/5">
                    <button
                        onClick={() => setDateRange('today')}
                        className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${dateRange === 'today' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        Hoy
                    </button>
                    <button
                        onClick={() => setDateRange('week')}
                        className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${dateRange === 'week' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        7 Días
                    </button>
                    <button
                        onClick={() => setDateRange('month')}
                        className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${dateRange === 'month' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        Mes
                    </button>
                </div>
            </header>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-500">
                        <DollarSign className="w-32 h-32" />
                    </div>
                    <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-2">Ventas Totales</p>
                    <h3 className="text-5xl font-black italic text-emerald-400 mb-1">{stats?.totalSales.toFixed(2)}€</h3>
                    <p className="text-emerald-500/50 text-[10px] uppercase font-bold tracking-widest">+12% vs ayer</p>
                </div>

                <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-500">
                        <ShoppingBag className="w-32 h-32" />
                    </div>
                    <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-2">Total Pedidos</p>
                    <h3 className="text-5xl font-black italic text-blue-400 mb-1">{stats?.totalOrders}</h3>
                    <p className="text-blue-500/50 text-[10px] uppercase font-bold tracking-widest">Actividad en sala</p>
                </div>

                <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-500">
                        <Award className="w-32 h-32" />
                    </div>
                    <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-2">Ticket Medio</p>
                    <h3 className="text-5xl font-black italic text-orange-400 mb-1">{stats?.averageOrder.toFixed(2)}€</h3>
                    <p className="text-orange-500/50 text-[10px] uppercase font-bold tracking-widest">Gasto por mesa</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* TOP PRODUCTS */}
                <div className="bg-zinc-900/30 border border-white/5 p-8 rounded-[2.5rem]">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-yellow-500/10 rounded-2xl text-yellow-500">
                            <Award className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-black italic uppercase tracking-wider">Productos Estrella</h3>
                    </div>
                    <div className="space-y-6">
                        {stats?.topProducts.map((prod, i) => (
                            <div key={i} className="flex items-center gap-4 group cursor-default">
                                <span className={`text-2xl font-black italic w-8 text-center ${i === 0 ? 'text-yellow-500' : 'text-gray-700'}`}>#{i + 1}</span>
                                <div className="flex-1">
                                    <div className="flex justify-between items-end mb-2">
                                        <p className="font-bold text-gray-200 group-hover:text-orange-500 transition-colors">{prod.name}</p>
                                        <p className="font-black text-gray-500 text-xs tracking-widest">{prod.qty} VENTAS</p>
                                    </div>
                                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-orange-600 to-yellow-500 rounded-full"
                                            style={{ width: `${(prod.revenue / (stats.topProducts[0].revenue || 1)) * 100}%` }}
                                        />
                                    </div>
                                </div>
                                <p className="font-black italic text-emerald-400 w-20 text-right">{prod.revenue.toFixed(0)}€</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* SALES BY CATEGORY */}
                <div className="bg-zinc-900/30 border border-white/5 p-8 rounded-[2.5rem]">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-500">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-black italic uppercase tracking-wider">Ventas por Categoría</h3>
                    </div>
                    <div className="space-y-4">
                        {stats?.salesByCategory.map((cat, i) => (
                            <div key={i} className="bg-black/40 p-4 rounded-3xl border border-white/5 flex items-center justify-between group hover:border-purple-500/30 transition-all">
                                <div>
                                    <p className="font-black uppercase text-xs tracking-widest text-gray-500 mb-1">{cat.category}</p>
                                    <p className="text-xl font-black italic text-gray-200">{cat.qty} <span className="text-xs text-gray-600 not-italic font-medium">unid.</span></p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-black italic text-purple-400">{cat.revenue.toFixed(2)}€</p>
                                    <div className="h-1 w-24 bg-gray-800 rounded-full mt-2 ml-auto overflow-hidden">
                                        <div
                                            className="h-full bg-purple-500"
                                            style={{ width: `${(cat.revenue / (stats.salesByCategory[0].revenue || 1)) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* HOURLY SALES CHART (Simple CSS Bar Chart) */}
            {dateRange === 'today' && (
                <div className="mt-8 bg-zinc-900/30 border border-white/5 p-8 rounded-[2.5rem] overflow-x-auto">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-black italic uppercase tracking-wider">Actividad por Hora (Hoy)</h3>
                    </div>
                    <div className="flex items-end gap-2 h-48 min-w-[600px]">
                        {stats?.hourlySales.map((hour, i) => {
                            const maxRev = Math.max(...stats.hourlySales.map(h => h.revenue));
                            const heightPercent = maxRev > 0 ? (hour.revenue / maxRev) * 100 : 0;
                            return (
                                <div key={i} className="flex-1 flex flex-col justify-end items-center gap-2 group">
                                    <div className="w-full bg-gray-800/50 rounded-t-xl relative overflow-hidden transition-all duration-500 group-hover:bg-blue-900/30" style={{ height: `${Math.max(heightPercent, 5)}%` }}>
                                        <div className="absolute inset-0 bg-blue-500/20 group-hover:bg-blue-500/40 transition-all"></div>
                                        {hour.revenue > 0 && (
                                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-black text-blue-400 opacity-0 group-hover:opacity-100 transition-all">{hour.revenue.toFixed(0)}€</span>
                                        )}
                                    </div>
                                    <span className="text-[9px] font-bold text-gray-600 uppercase group-hover:text-gray-300">{hour.hour}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
