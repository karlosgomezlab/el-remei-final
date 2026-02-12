'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
    Calendar as CalendarIcon,
    Clock,
    Users,
    Phone,
    Mail,
    MessageSquare,
    CheckCircle,
    XCircle,
    MoreHorizontal,
    Search,
    Filter,
    ArrowLeft
} from 'lucide-react';
import { Reservation } from '@/types';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function BookingsPage() {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'seated'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchReservations();

        const channel = supabase
            .channel('reservations-sync')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'reservations' },
                () => fetchReservations()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchReservations = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('reservations')
            .select('*')
            .order('reservation_date', { ascending: true });

        if (error) {
            console.error("Error fetching reservations:", error);
            toast.error("Error al cargar las reservas");
        } else {
            setReservations(data || []);
        }
        setLoading(false);
    };

    const updateStatus = async (id: string, newStatus: Reservation['status']) => {
        const { error } = await supabase
            .from('reservations')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) {
            toast.error("Error al actualizar estado");
        } else {
            toast.success("Reserva actualizada");
            fetchReservations();
        }
    };

    const filteredReservations = reservations.filter(res => {
        const matchesFilter = filter === 'all' || res.status === filter;
        const matchesSearch =
            res.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            res.customer_phone.includes(searchTerm);
        return matchesFilter && matchesSearch;
    });

    const getStatusColor = (status: Reservation['status']) => {
        switch (status) {
            case 'confirmed': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'seated': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    return (
        <div className="p-6 bg-gray-950 min-h-screen text-white font-sans">
            <Toaster position="top-right" richColors />

            <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4 group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-xs font-bold uppercase tracking-widest">Volver al Panel</span>
                    </Link>
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600 flex items-center gap-3 italic">
                        <CalendarIcon className="w-8 h-8 text-orange-500" />
                        GESTIÓN DE RESERVAS
                    </h1>
                    <p className="text-gray-500 font-medium uppercase tracking-tighter mt-1">
                        Organiza tu salón • Confirma asistencia
                    </p>
                </div>

                <div className="flex bg-gray-900/50 p-1 rounded-2xl border border-white/5">
                    {(['all', 'pending', 'confirmed', 'seated'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : f === 'confirmed' ? 'Confirmadas' : 'En Mesa'}
                        </button>
                    ))}
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Stats / Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o tel..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-900/50 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                        />
                    </div>

                    <div className="bg-gray-900/50 border border-white/5 rounded-3xl p-6 space-y-4">
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Resumen Hoy</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-950 p-4 rounded-2xl border border-white/5 text-center">
                                <p className="text-[10px] font-black text-gray-500 uppercase">Total</p>
                                <p className="text-2xl font-black text-white">{reservations.length}</p>
                            </div>
                            <div className="bg-gray-950 p-4 rounded-2xl border border-white/5 text-center">
                                <p className="text-[10px] font-black text-orange-500 uppercase">Pendientes</p>
                                <p className="text-2xl font-black text-orange-500">{reservations.filter(r => r.status === 'pending').length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main List */}
                <div className="lg:col-span-3">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                        </div>
                    ) : filteredReservations.length === 0 ? (
                        <div className="bg-gray-900/30 border-2 border-dashed border-white/5 rounded-[3rem] p-20 text-center">
                            <CalendarIcon className="w-16 h-16 text-gray-800 mx-auto mb-4" />
                            <p className="text-gray-500 font-bold uppercase tracking-widest">No hay reservas que coincidan</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredReservations.map((res) => (
                                <div
                                    key={res.id}
                                    className="group bg-gray-900/50 border border-white/5 p-6 rounded-[2rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:bg-gray-900 hover:border-orange-500/30 transition-all"
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="bg-gray-950 w-16 h-16 rounded-2xl flex flex-col items-center justify-center border border-white/5">
                                            <span className="text-lg font-black leading-none">{format(new Date(res.reservation_date), 'dd')}</span>
                                            <span className="text-[9px] font-black uppercase text-gray-500 mt-1">{format(new Date(res.reservation_date), 'MMM', { locale: es })}</span>
                                        </div>

                                        <div>
                                            <h4 className="text-xl font-black uppercase tracking-tight">{res.customer_name}</h4>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold">
                                                    <Clock className="w-3 h-3 text-orange-500" />
                                                    {format(new Date(res.reservation_date), 'HH:mm')}h
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold">
                                                    <Users className="w-3 h-3 text-orange-500" />
                                                    {res.party_size} pers.
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold">
                                                    <Phone className="w-3 h-3 text-orange-500" />
                                                    {res.customer_phone}
                                                </div>
                                                {res.table_number && (
                                                    <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-black uppercase">
                                                        Mesa {res.table_number}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${getStatusColor(res.status)}`}>
                                            {res.status === 'pending' ? 'Pendiente' :
                                                res.status === 'confirmed' ? 'Confirmada' :
                                                    res.status === 'seated' ? 'En Mesa' : 'Cancelada'}
                                        </div>

                                        <div className="flex gap-2 ml-auto">
                                            {res.status === 'pending' && (
                                                <button
                                                    onClick={() => updateStatus(res.id, 'confirmed')}
                                                    className="p-2 bg-emerald-500/20 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all"
                                                    title="Confirmar"
                                                >
                                                    <CheckCircle className="w-5 h-5" />
                                                </button>
                                            )}
                                            {res.status === 'confirmed' && (
                                                <button
                                                    onClick={() => updateStatus(res.id, 'seated')}
                                                    className="p-2 bg-blue-500/20 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all"
                                                    title="Sentar en Mesa"
                                                >
                                                    <Users className="w-5 h-5" />
                                                </button>
                                            )}
                                            {res.status !== 'cancelled' && (
                                                <button
                                                    onClick={() => updateStatus(res.id, 'cancelled')}
                                                    className="p-2 bg-red-500/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                                                    title="Cancelar"
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
