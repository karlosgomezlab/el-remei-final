'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User,
    CreditCard,
    History,
    TrendingUp,
    LogOut,
    ChevronRight,
    ArrowLeft,
    ShieldCheck,
    Phone,
    Plus,
    Clock,
    DollarSign,
    Award
} from 'lucide-react';
import { Customer, Order } from '@/types/shared';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function MiCuenta() {
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [phone, setPhone] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    useEffect(() => {
        const savedPhone = localStorage.getItem('remei_customer_phone');
        if (savedPhone) {
            login(savedPhone);
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (phoneToUse: string) => {
        setIsLoggingIn(true);
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('phone', phoneToUse)
            .single();

        if (error || !data) {
            toast.error("No se encontró ningún cliente con ese teléfono");
            localStorage.removeItem('remei_customer_phone');
            setLoading(false);
            setIsLoggingIn(false);
            return;
        }

        setCustomer(data);
        localStorage.setItem('remei_customer_phone', phoneToUse);

        // Cargar historial de pedidos
        const { data: ordersData } = await supabase
            .from('orders')
            .select('*')
            .eq('customer_id', data.id)
            .order('created_at', { ascending: false });

        setOrders(ordersData || []);
        setLoading(false);
        setIsLoggingIn(false);
    };

    const handleLogout = () => {
        localStorage.removeItem('remei_customer_phone');
        setCustomer(null);
        setOrders([]);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-orange-500"></div>
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="min-h-screen bg-white font-sans selection:bg-orange-500 selection:text-white flex flex-col items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full bg-gray-50 p-10 rounded-[3rem] border border-gray-100 shadow-2xl text-center"
                >
                    <div className="w-20 h-20 bg-orange-100 rounded-3xl flex items-center justify-center text-orange-500 mx-auto mb-8 transform rotate-6 border-4 border-white shadow-xl">
                        <User className="w-10 h-10" />
                    </div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-gray-900 mb-2">Mi Cuenta</h1>
                    <p className="text-gray-500 font-medium mb-10 text-sm">Gestiona tus pedidos y consulta tu saldo de crédito en El Remei.</p>

                    <div className="space-y-4">
                        <div className="relative group">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                            <input
                                type="tel"
                                placeholder="Teléfono"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-12 pr-4 font-bold focus:outline-none focus:border-orange-500 transition-all text-sm"
                            />
                        </div>
                        <button
                            onClick={() => login(phone)}
                            disabled={isLoggingIn}
                            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-2 group"
                        >
                            {isLoggingIn ? 'Verificando...' : 'Entrar en mi cuenta'}
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>

                    <Link href="/" className="inline-block mt-8 text-xs font-black uppercase text-gray-400 hover:text-gray-900 transition-colors">
                        Volver al inicio
                    </Link>
                </motion.div>
            </div>
        );
    }

    const loyaltyColors = {
        'ORO': 'from-yellow-400 to-amber-600 shadow-amber-500/20',
        'PLATA': 'from-gray-300 to-gray-500 shadow-gray-400/20',
        'BRONCE': 'from-orange-400 to-orange-700 shadow-orange-500/20'
    };

    const level = (customer.loyalty_level || 'BRONCE') as keyof typeof loyaltyColors;

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-sm">
                <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">El Remei</span>
                </Link>
                <button onClick={handleLogout} className="text-[10px] font-black uppercase tracking-widest text-red-500 flex items-center gap-1.5 hover:opacity-70">
                    Salir <LogOut className="w-3 h-3" />
                </button>
            </div>

            <div className="max-w-4xl mx-auto px-6 pt-10">
                {/* Profile Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="md:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-xl border border-white flex flex-col md:flex-row items-center md:items-start gap-8 relative overflow-hidden">
                        {/* Background Decor */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-bl-[5rem] -mr-10 -mt-10 opacity-50"></div>

                        <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${loyaltyColors[level]} flex items-center justify-center text-white shadow-2xl border-4 border-white relative`}>
                            <User className="w-12 h-12" />
                            <div className="absolute -bottom-2 -right-2 bg-white text-gray-900 p-1.5 rounded-xl shadow-lg border border-gray-50">
                                <Award className="w-4 h-4 text-orange-500" />
                            </div>
                        </div>

                        <div className="text-center md:text-left flex-1">
                            <h2 className="text-3xl font-black uppercase tracking-tighter mb-1">{customer.name}</h2>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2">
                                <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold uppercase">
                                    <Phone className="w-3 h-3" /> {customer.phone}
                                </div>
                                <div className={`px-3 py-1 bg-gradient-to-r ${loyaltyColors[level]} text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg`}>
                                    Nivel {level}
                                </div>
                            </div>

                            <div className="mt-8 grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                    <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Gasto Total</p>
                                    <p className="text-xl font-black">{customer.total_spent || '0.00'}€</p>
                                </div>
                                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                                    <p className="text-[9px] font-black uppercase text-orange-500 tracking-widest mb-1">Puntos Remei</p>
                                    <p className="text-xl font-black text-orange-600">{customer.points || 0}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Credit Card */}
                    <div className="bg-gray-900 rounded-[2.5rem] p-8 shadow-2xl border border-gray-800 text-white flex flex-col justify-between relative overflow-hidden group">
                        {/* Chip & Logo */}
                        <div className="flex justify-between items-start">
                            <div className="w-10 h-8 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-lg shadow-inner"></div>
                            <div className="italic font-black text-xs text-white/50 group-hover:text-orange-500 transition-colors">CONTADO</div>
                        </div>

                        <div>
                            <p className="text-[10px] font-black uppercase text-white/40 tracking-widest mb-4">Límite de Crédito</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black tracking-tighter">{customer.credit_limit}</span>
                                <span className="text-xl font-bold opacity-50">€</span>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-end">
                            <div>
                                <p className="text-[8px] font-black uppercase text-white/30 tracking-widest mb-1">Saldo Adeudado</p>
                                <p className={`font-black text-xl ${parseFloat(customer.current_debt as unknown as string) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {customer.current_debt}€
                                </p>
                            </div>
                            <CreditCard className="w-8 h-8 opacity-20 group-hover:opacity-100 group-hover:text-orange-500 transition-all duration-500 transform group-hover:scale-110" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Activity Feed */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                                <History className="w-5 h-5 text-orange-500" /> Historial de Visitas
                            </h3>
                            <span className="text-[10px] font-black uppercase text-gray-400 px-3 py-1 bg-white rounded-full border border-gray-100">
                                {orders.length} Pedidos
                            </span>
                        </div>

                        {orders.length === 0 ? (
                            <div className="bg-white border-2 border-dashed border-gray-200 rounded-[2.5rem] p-20 text-center">
                                <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Aún no tienes pedidos registrados</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {orders.map(order => (
                                    <motion.div
                                        key={order.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl hover:border-orange-500/20 transition-all group"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 group-hover:bg-orange-50 group-hover:border-orange-100 transition-colors">
                                                    <Clock className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black uppercase tracking-tight">Mesa {order.table_number}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold">{format(new Date(order.created_at!), "d MMM yyyy 'a las' HH:mm", { locale: es })}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-black">{order.total_amount}€</p>
                                                <p className="text-[9px] font-black uppercase text-gray-400 opacity-60">{order.payment_method === 'credit' ? 'Pago a Crédito' : 'Pago online'}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-50">
                                            {order.items.slice(0, 3).map((item, idx) => (
                                                <span key={idx} className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-gray-50 text-gray-500 rounded-lg border border-gray-100">
                                                    {item.qty}x {item.name}
                                                </span>
                                            ))}
                                            {order.items.length > 3 && (
                                                <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-gray-50 text-gray-400 rounded-lg">
                                                    +{order.items.length - 3} más
                                                </span>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Sidebar Stats & Promotions */}
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-orange-500/20 relative overflow-hidden group">
                            <Plus className="absolute top-4 right-4 w-12 h-12 opacity-10 group-hover:rotate-90 transition-transform duration-700" />
                            <h4 className="text-xl font-black uppercase tracking-tight mb-4 leading-tight">Gasto Promedio</h4>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black tracking-tighter">
                                    {(orders.reduce((acc, o) => acc + parseFloat(o.total_amount as unknown as string), 0) / (orders.length || 1)).toFixed(2)}
                                </span>
                                <span className="text-xl font-bold opacity-50">€</span>
                            </div>
                            <p className="text-[10px] mt-4 font-black uppercase text-white/60 tracking-widest">Por cada visita</p>
                        </div>

                        <div className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-xl space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Estado de Cuenta
                            </h4>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-gray-500">Documento</span>
                                    <span className="font-black uppercase">{customer.dni || 'No registrado'}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-gray-500">Email</span>
                                    <span className="font-black truncate max-w-[150px]">{customer.email}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-gray-500">Socio desde</span>
                                    <span className="font-black">{format(new Date(customer.created_at!), "MMM yyyy", { locale: es }).toUpperCase()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Promotion Banner */}
                        <div className="bg-blue-600 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden group border-4 border-white">
                            <TrendingUp className="absolute bottom-4 right-4 w-16 h-16 opacity-10" />
                            <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-70">Próxima Recompensa</p>
                            <h5 className="font-black text-sm uppercase leading-tight mb-4">Crea tu reserva hoy y obtén 50 puntos extra</h5>
                            <Link href="/#booking" className="inline-block px-4 py-2 bg-white text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform">
                                Reservar Ahora
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
