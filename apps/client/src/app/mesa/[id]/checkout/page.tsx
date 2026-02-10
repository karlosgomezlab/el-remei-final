'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CreditCard, ArrowLeft, ShieldCheck, Lock, CheckCircle2, Loader2, Wallet } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import confetti from 'canvas-confetti';
import { toast, Toaster } from 'sonner';
import Link from 'next/link';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function CheckoutContent({ params }: { params: { id: string } }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tableId = params.id;

    // Obtenemos el monto y el concepto de la URL
    // ?amount=2.50&concept=Propina%20Equipo
    const amount = parseFloat(searchParams.get('amount') || '0');
    const concept = searchParams.get('concept') || 'Pago El Remei';
    const isTip = searchParams.get('is_tip') === 'true';

    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple'>('card');

    if (amount <= 0) {
        return (
            <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
                <div className="text-center">
                    <h1 className="text-2xl font-black italic text-zinc-400 mb-4">ERROR DE PAGO</h1>
                    <p className="text-zinc-500 mb-8">No se ha especificado un monto válido.</p>
                    <Link href={`/mesa/${tableId}`} className="bg-zinc-900 text-white px-8 py-3 rounded-xl font-bold">Volver al Restaurante</Link>
                </div>
            </div>
        );
    }

    const handlePayment = async () => {
        setIsProcessing(true);

        // AQUÍ ES DONDE INTEGRARÍAMOS STRIPE REALMENTE
        // Por ahora simulamos una llamada a la API que tarda 2 segundos
        console.log(`Procesando pago simulado de ${amount}€ por ${concept}`);

        try {
            // Simulamos delay de red bancaria
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Si es propina, guardamos el registro en una tabla de 'tips' o 'transactions' en Supabase
            // (Para este MVP, simplemente asumimos éxito y redirigimos)

            if (isTip) {
                // Podríamos guardar esto en una tabla 'tips' real
                /* await supabase.from('tips').insert({ 
                    amount: amount, 
                    table_number: tableId,
                    waiter_id: ...,
                    status: 'paid' 
                }); */
            }

            // ÉXITO
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                zIndex: 2000,
                colors: ['#22c55e', '#ffffff'] // Verde y blanco
            });

            toast.success('¡Pago completado con éxito!');

            // Redirigimos a la pantalla de éxito final
            // Añadimos ?tip_paid=true para que la pantalla final sepa qué mostrar
            setTimeout(() => {
                router.push(`/mesa/${tableId}/success?type=${isTip ? 'tip' : 'order'}&amount=${amount}`);
            }, 1000);

        } catch (error) {
            console.error('Error en pago:', error);
            toast.error('Error al procesar el pago. Inténtalo de nuevo.');
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFCFB] flex flex-col">
            <Toaster position="top-center" richColors />

            {/* Header Seguro */}
            <div className="p-6 flex items-center justify-between border-b border-gray-100 bg-white/50 backdrop-blur-md sticky top-0 z-10">
                <button onClick={() => router.back()} className="p-2 -ml-2 text-zinc-400 hover:text-zinc-900 transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                    <Lock className="w-3 h-3" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Pago Seguro 256-bit</span>
                </div>
                <div className="w-8"></div> {/* Spacer */}
            </div>

            <main className="flex-1 p-6 flex flex-col max-w-lg mx-auto w-full">

                <div className="text-center mb-10 mt-4">
                    <div className="w-20 h-20 bg-zinc-900 text-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-zinc-200">
                        {isTip ? <Wallet className="w-8 h-8" /> : <CreditCard className="w-8 h-8" />}
                    </div>
                    <p className="text-zinc-400 font-bold uppercase tracking-widest text-[10px] mb-2">CONFIRMAR PAGO</p>
                    <h1 className="text-4xl font-black italic tracking-tighter text-zinc-900 mb-2">{amount.toFixed(2)}€</h1>
                    <p className="text-zinc-500 font-medium text-sm">{concept}</p>
                </div>

                {/* Selección de Método (Simulada) */}
                <div className="space-y-4 mb-8">
                    <button
                        onClick={() => setPaymentMethod('card')}
                        className={`w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${paymentMethod === 'card' ? 'border-zinc-900 bg-zinc-50' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                        <div className="w-10 h-6 bg-zinc-900 rounded flex items-center justify-center">
                            <div className="w-6 h-4 border border-white/30 rounded-sm"></div>
                        </div>
                        <div className="flex-1 text-left">
                            <p className="font-bold text-sm text-zinc-900">Tarjeta de Crédito / Débito</p>
                            <p className="text-[10px] text-zinc-400 font-medium">Visa, Mastercard, Amex</p>
                        </div>
                        {paymentMethod === 'card' && <div className="w-5 h-5 bg-zinc-900 rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-white rounded-full"></div></div>}
                    </button>

                    <button
                        onClick={() => setPaymentMethod('apple')}
                        className={`w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${paymentMethod === 'apple' ? 'border-zinc-900 bg-zinc-50' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                        <div className="w-10 h-6 bg-black text-white rounded flex items-center justify-center text-[10px] font-black tracking-tight">
                            PAY
                        </div>
                        <div className="flex-1 text-left">
                            <p className="font-bold text-sm text-zinc-900">Apple Pay / Google Pay</p>
                            <p className="text-[10px] text-zinc-400 font-medium">Rápido y seguro</p>
                        </div>
                        {paymentMethod === 'apple' && <div className="w-5 h-5 bg-zinc-900 rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-white rounded-full"></div></div>}
                    </button>
                </div>

                {/* Botón de Pago */}
                <div className="mt-auto">
                    <button
                        onClick={handlePayment}
                        disabled={isProcessing}
                        className="w-full bg-zinc-900 text-white h-16 rounded-[2rem] font-black text-lg shadow-2xl shadow-zinc-300 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:grayscale"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                PROCESANDO...
                            </>
                        ) : (
                            <>
                                PAGAR {amount.toFixed(2)}€
                                <ShieldCheck className="w-5 h-5 opacity-50" />
                            </>
                        )}
                    </button>
                    <p className="text-center mt-4 text-[9px] text-zinc-300 font-medium uppercase tracking-widest flex items-center justify-center gap-1">
                        <Lock className="w-3 h-3" />
                        Transacción Encriptada SSL
                    </p>
                </div>

            </main>
        </div>
    );
}

export default function CheckoutPage({ params }: { params: { id: string } }) {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
            </div>
        }>
            <CheckoutContent params={params} />
        </Suspense>
    );
}
