'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Users, Search, CreditCard, ArrowLeft, Loader2, Wallet, Calendar, Mail, Phone, ExternalLink, ShieldCheck, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { Customer } from '@/types';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSendingReminders, setIsSendingReminders] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .order('current_debt', { ascending: false });

        if (error) {
            toast.error('Error al cargar clientes');
        } else {
            setCustomers(data || []);
        }
        setLoading(false);
    };

    const handleUpdateLimit = async (id: string, newLimit: number) => {
        const { error } = await supabase
            .from('customers')
            .update({ credit_limit: newLimit })
            .eq('id', id);

        if (error) {
            toast.error('Error al actualizar límite');
        } else {
            toast.success('Límite actualizado');
            fetchCustomers();
        }
    };

    const handleClearDebt = async (id: string) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Liquidación de Cuenta',
            message: '¿Estás seguro de que deseas marcar esta cuenta como saldada? Esta acción no se puede deshacer.',
            onConfirm: async () => {
                const { error } = await supabase
                    .from('customers')
                    .update({ current_debt: 0 })
                    .eq('id', id);

                if (error) {
                    toast.error('Error al liquidar deuda');
                } else {
                    toast.success('Cuenta liquidada correctamente');
                    fetchCustomers();
                }
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleSendAutomatedReminders = async () => {
        const debtCustomers = customers.filter(c => Number(c.current_debt) > 0);

        if (debtCustomers.length === 0) {
            toast.info('No hay clientes con deuda pendiente actualmente.');
            return;
        }

        const confirmText = `Se han detectado ${debtCustomers.length} clientes con deuda pendiente. ¿Deseas iniciar la campaña de recordatorios vía WhatsApp? Se abrirán los primeros 5 chats automáticamente.`;

        setConfirmConfig({
            isOpen: true,
            title: 'Campaña de WhatsApp',
            message: confirmText,
            onConfirm: () => {
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                setIsSendingReminders(true);
                try {
                    for (let i = 0; i < Math.min(debtCustomers.length, 5); i++) {
                        const c = debtCustomers[i];
                        const msg = `EL REMEI: Hola ${c.name}, te recordamos amablemente que tienes una cuenta pendiente de ${Number(c.current_debt).toFixed(2)}€. Puedes pasar a liquidarla cuando quieras o pagar online. ¡Gracias!`;

                        let cleanPhone = c.phone.replace(/\s/g, '').replace('+', '');
                        if (!cleanPhone.startsWith('34')) cleanPhone = '34' + cleanPhone;

                        setTimeout(() => {
                            window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                        }, i * 1500);
                    }

                    if (debtCustomers.length > 5) {
                        toast.success(`Abriendo los primeros 5 chats. Haz el resto manualmente.`);
                    } else {
                        toast.success(`Abriendo chats de WhatsApp para ${debtCustomers.length} clientes...`);
                    }
                } catch (error: any) {
                    console.error("Error en campaña WhatsApp:", error);
                    toast.error('Error al intentar abrir los chats de WhatsApp.');
                } finally {
                    setIsSendingReminders(false);
                }
            }
        });
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalDebt = customers.reduce((acc, c) => acc + Number(c.current_debt), 0);
    const criticalCustomers = customers.filter(c => Number(c.current_debt) > Number(c.credit_limit) * 0.9).length;

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Cargando Libreta de Confianza...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-950 text-white p-6 md:p-12 font-sans relative overflow-x-hidden">
            <Toaster position="top-right" richColors />

            {/* Custom Premium Modal */}
            {confirmConfig.isOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-zinc-900 border border-white/10 p-10 rounded-[3rem] max-w-md w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200">
                        <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mb-8 mx-auto border border-emerald-500/20">
                            <AlertCircle className="w-10 h-10 text-emerald-500" />
                        </div>
                        <h2 className="text-2xl font-black italic text-center mb-4 uppercase tracking-tight">{confirmConfig.title}</h2>
                        <p className="text-gray-400 text-center font-bold text-sm leading-relaxed mb-10">
                            {confirmConfig.message}
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                                className="py-5 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmConfig.onConfirm}
                                className="py-5 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/20 active:scale-95 text-white"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8">
                <div className="flex items-center gap-6">
                    <Link href="/dashboard" className="bg-gray-900 p-4 rounded-3xl hover:bg-gray-800 transition-all border border-white/5 shadow-xl">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className="text-4xl font-black italic bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-green-600">
                            LIBRETA DIGITAL
                        </h1>
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-1">Gestión de Clientes de Confianza • El Remei</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <button
                        onClick={handleSendAutomatedReminders}
                        disabled={isSendingReminders}
                        className="bg-emerald-600/10 text-emerald-500 border border-emerald-500/30 p-5 rounded-[2rem] flex items-center gap-4 hover:bg-emerald-600/20 transition-all disabled:opacity-50"
                    >
                        {isSendingReminders ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <TrendingUp className="w-6 h-6" />
                        )}
                        <div className="text-left">
                            <p className="text-[10px] font-black uppercase mb-1">Campaña Masiva</p>
                            <p className="text-lg font-black italic">AVISAR DEUDAS</p>
                        </div>
                    </button>
                    <div className="bg-gray-900 border border-emerald-500/20 p-5 rounded-[2rem] flex flex-col justify-center min-w-[160px]">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Deuda Total Pendiente</p>
                        <p className="text-3xl font-black italic text-emerald-400">{totalDebt.toFixed(2)}€</p>
                    </div>
                    <div className={`bg-gray-900 border ${criticalCustomers > 0 ? 'border-red-500/40' : 'border-white/5'} p-5 rounded-[2rem] flex flex-col justify-center min-w-[160px]`}>
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Alertas de Límite</p>
                        <p className={`text-3xl font-black italic ${criticalCustomers > 0 ? 'text-red-500' : 'text-gray-600'}`}>{criticalCustomers}</p>
                    </div>
                </div>
            </header>

            <div className="mb-12 relative max-w-2xl">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                <input
                    type="text"
                    placeholder="Buscar por nombre, teléfono o email..."
                    className="w-full bg-gray-900/50 border border-white/5 rounded-[2rem] pl-16 pr-8 py-6 font-bold text-lg focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredCustomers.map(customer => {
                    const debtRatio = (Number(customer.current_debt) / Number(customer.credit_limit)) * 100;
                    const isOverLimit = Number(customer.current_debt) >= Number(customer.credit_limit);

                    return (
                        <div key={customer.id} className="bg-gray-900/40 border border-white/5 rounded-[3rem] p-8 hover:bg-gray-900 transition-all group">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                                        <Users className="w-7 h-7 text-emerald-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black italic truncate max-w-[150px]">{customer.name}</h3>
                                        <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-tighter">
                                            <Calendar className="w-3 h-3" />
                                            Desde {new Date(customer.created_at!).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${isOverLimit ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                        {isOverLimit ? 'Límite Superado' : 'Al día'}
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-[8px] font-black flex items-center gap-1 ${customer.is_verified ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'}`}>
                                        {customer.is_verified ? <ShieldCheck className="w-2 h-2" /> : <AlertCircle className="w-2 h-2" />}
                                        {customer.is_verified ? 'VERIFICADO' : 'PENDIENTE SMS'}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3 text-gray-400">
                                        <Phone className="w-4 h-4" />
                                        <span className="text-xs font-bold">{customer.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-400">
                                        <Mail className="w-4 h-4" />
                                        <span className="text-xs font-bold truncate">{customer.email}</span>
                                    </div>
                                </div>

                                <div className="bg-black/40 rounded-3xl p-6 border border-white/5">
                                    <div className="flex justify-between items-end mb-4">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Deuda Pendiente</p>
                                            <p className={`text-4xl font-black italic ${Number(customer.current_debt) > 0 ? 'text-white' : 'text-gray-700'}`}>
                                                {Number(customer.current_debt).toFixed(2)}€
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Límite</p>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    defaultValue={customer.credit_limit}
                                                    onBlur={(e) => handleUpdateLimit(customer.id, parseFloat(e.target.value))}
                                                    className="w-16 bg-white/5 border-none rounded-lg px-2 py-1 text-xs font-black text-center focus:ring-1 focus:ring-emerald-500"
                                                />
                                                <span className="text-xs font-bold opacity-30">€</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-2">
                                        <div
                                            className={`h-full transition-all duration-1000 ${isOverLimit ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-emerald-500'}`}
                                            style={{ width: `${Math.min(100, debtRatio)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] font-black uppercase text-gray-500">
                                        <span>Utilizado: {debtRatio.toFixed(0)}%</span>
                                        <span>Disponible: {Math.max(0, Number(customer.credit_limit) - Number(customer.current_debt)).toFixed(2)}€</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <button
                                        onClick={() => handleClearDebt(customer.id)}
                                        disabled={Number(customer.current_debt) === 0}
                                        className="py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 disabled:text-gray-600 rounded-2xl text-xs font-black uppercase transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        Saldar Cuenta
                                    </button>
                                    <button
                                        onClick={() => {
                                            const msg = `Hola ${customer.name}, te recordamos que tienes una cuenta pendiente en El Remei de ${Number(customer.current_debt).toFixed(2)}€. Un saludo!`;
                                            let cleanPhone = customer.phone.replace(/\s/g, '').replace('+', '');
                                            if (!cleanPhone.startsWith('34')) cleanPhone = '34' + cleanPhone;
                                            window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`);
                                        }}
                                        className="py-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-xs font-black uppercase transition-all border border-white/5 flex items-center justify-center gap-2"
                                    >
                                        <Mail className="w-4 h-4" />
                                        Recordar
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {filteredCustomers.length === 0 && (
                    <div className="col-span-full py-40 flex flex-col items-center opacity-20">
                        <Users className="w-20 h-20 mb-6" />
                        <p className="text-2xl font-black uppercase italic">No se han encontrado clientes registrados</p>
                    </div>
                )}
            </div>
        </div>
    );
}
