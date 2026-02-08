'use client';

import { use, useEffect, useState } from 'react';
import { CheckCircle2, Home, Utensils, ArrowRight, Timer, Users } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SuccessPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: tableId } = use(params);
    const [queuePosition, setQueuePosition] = useState<number | null>(null);
    const [totalActive, setTotalActive] = useState(0);

    useEffect(() => {
        fetchQueuePosition();

        // Suscribirse a cambios en pedidos para actualizar la posición en tiempo real
        const channel = supabase
            .channel('queue-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                fetchQueuePosition();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [tableId]);

    const fetchQueuePosition = async () => {
        // 1. Obtener mi pedido más reciente
        const { data: myOrder } = await supabase
            .from('orders')
            .select('id, created_at')
            .eq('table_number', parseInt(tableId))
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (myOrder) {
            // 2. Contar cuántos pedidos activos hay antes que el mío
            const { count } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .in('status', ['pending', 'cooking'])
                .lt('created_at', myOrder.created_at);

            setQueuePosition(count || 0);

            // 3. Contar total activos para ver saturación
            const { count: total } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .in('status', ['pending', 'cooking']);

            setTotalActive(total || 0);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFCFB] flex flex-col items-center justify-center p-6 text-center">
            <div className="w-full max-w-sm space-y-8">
                {/* Success Icon */}
                <div className="relative mx-auto w-24 h-24 bg-green-500 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-green-200">
                    <CheckCircle2 className="w-12 h-12 text-white" />
                    <div className="absolute -inset-4 bg-green-500 rounded-[2.5rem] opacity-20 blur-xl animate-pulse"></div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter">¡PEDIDO RECIBIDO!</h1>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs italic">Mesa {tableId} • El Remei Restaurant</p>
                </div>

                <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 space-y-6">
                    {/* Información de Cola */}
                    <div className="space-y-4">
                        {totalActive > 10 && (
                            <div className="bg-orange-50 p-4 rounded-2xl flex items-center gap-3 border border-orange-100">
                                <Timer className="w-5 h-5 text-orange-600" />
                                <div className="text-left">
                                    <p className="text-[10px] font-black uppercase text-orange-400">Cocina Saturada</p>
                                    <p className="text-sm font-bold text-orange-700 leading-tight">Espera: ~25-30 min</p>
                                </div>
                            </div>
                        )}

                        {queuePosition !== null && (
                            <div className={`p-5 rounded-2xl flex items-center gap-4 border ${queuePosition <= 5 ? 'bg-green-50 border-green-100' : 'bg-blue-50 border-blue-100'}`}>
                                <Users className={`w-6 h-6 ${queuePosition <= 5 ? 'text-green-600 animate-pulse' : 'text-blue-600'}`} />
                                <div className="text-left">
                                    <p className="text-[10px] font-black uppercase text-gray-400">Estado de Cola</p>
                                    <p className="text-lg font-black text-gray-900 leading-tight">
                                        {queuePosition === 0
                                            ? "¡Cocinando el tuyo!"
                                            : queuePosition <= 5
                                                ? `¡Solo faltan ${queuePosition}!`
                                                : `Tienes ${queuePosition} por delante`
                                        }
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-center gap-3 text-emerald-600">
                        <Utensils className="w-5 h-5" />
                        <span className="font-black text-sm uppercase tracking-widest">En preparación</span>
                    </div>

                    <p className="text-gray-600 font-medium leading-relaxed italic text-sm">
                        Tu pago se ha procesado correctamente. El personal de cocina ya tiene tu comanda.
                    </p>
                </div>

                <div className="flex flex-col gap-4">
                    <Link
                        href={`/mesa/${tableId}`}
                        className="w-full bg-gray-900 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-95 shadow-xl"
                    >
                        Volver a la Carta
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </div>

            <p className="fixed bottom-8 text-gray-200 text-[10px] tracking-widest font-black uppercase">SGI-POLÍGONO SYSTEM</p>
        </div>
    );
}
