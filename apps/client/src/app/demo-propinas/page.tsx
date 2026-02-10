'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Beer, Pizza, Star, Heart, ArrowLeft, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import Link from 'next/link';

export default function TipsDemoPage() {
    const [selectedTip, setSelectedTip] = useState<number | null>(null);
    const [hasTipped, setHasTipped] = useState(false);

    const handleTip = (amount: number) => {
        setSelectedTip(amount);
    };

    const confirmTip = () => {
        if (!selectedTip) return;

        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate([100, 50, 200]);

        // Celebration!
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#f97316', '#10b981', '#000000']
        });

        setHasTipped(true);
    };

    return (
        <div className="min-h-screen bg-[#FDFCFB] flex flex-col items-center justify-center p-6 font-sans">
            <Link href="/" className="fixed top-6 left-6 text-gray-400 hover:text-black transition-colors">
                <ArrowLeft className="w-6 h-6" />
            </Link>

            <div className="w-full max-w-sm space-y-8">
                {/* Header Simulado de Éxito */}
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-emerald-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-100">
                        <CheckCircle2 className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-black italic tracking-tighter">¡PEDIDO COMPLETADO!</h1>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Mesa 5 • Demo Propinas</p>
                </div>

                {/* Card de Valoración (Fase 1) */}
                <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 text-center relative overflow-hidden">
                    <div className="space-y-4">
                        <div className="flex justify-center gap-1 text-orange-500">
                            {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-5 h-5 fill-current" />)}
                        </div>
                        <p className="text-sm font-bold text-gray-800 italic">"¡Excelente comida y servicio!"</p>
                    </div>

                    <div className="mt-8 pt-8 border-t border-gray-50">
                        <h2 className="text-xl font-black italic tracking-tight mb-2">¿QUIERES TENER UN DETALLE CON EL EQUIPO?</h2>
                        <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-8">Tu gesto marca la diferencia</p>

                        <div className="grid grid-cols-3 gap-4 mb-8">
                            {[
                                { id: 2, icon: <Coffee className="w-6 h-6" />, label: 'Café', amount: '2€' },
                                { id: 5, icon: <Beer className="w-6 h-6" />, label: 'Caña', amount: '5€' },
                                { id: 10, icon: <Pizza className="w-6 h-6" />, label: 'Cena', amount: '10€' },
                            ].map((option) => (
                                <button
                                    key={option.id}
                                    onClick={() => handleTip(option.id)}
                                    className={`flex flex-col items-center gap-2 p-4 rounded-[2rem] transition-all duration-300 ${selectedTip === option.id ? 'bg-orange-500 text-white scale-110 shadow-xl shadow-orange-200' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                                >
                                    <div className="mb-1">{option.icon}</div>
                                    <span className="text-[8px] font-black uppercase tracking-tighter">{option.label}</span>
                                    <span className="text-sm font-black">{option.amount}</span>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={confirmTip}
                            disabled={!selectedTip || hasTipped}
                            className={`w-full py-5 rounded-3xl font-black italic text-lg shadow-xl transition-all active:scale-95 ${hasTipped ? 'bg-emerald-500 text-white' : 'bg-zinc-900 text-white disabled:opacity-20'}`}
                        >
                            {hasTipped ? '¡DETALLE ENVIADO!' : 'INVITAR AL EQUIPO'}
                        </button>
                    </div>

                    {/* Overlay de Gracias */}
                    <AnimatePresence>
                        {hasTipped && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="absolute inset-0 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-8 z-10"
                            >
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-center"
                                >
                                    <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
                                        <Heart className="w-10 h-10 fill-current" />
                                    </div>
                                    <h3 className="text-3xl font-black italic tracking-tighter leading-tight mb-2">¡GRACIAS!</h3>
                                    <p className="text-gray-600 font-bold italic text-sm">Has hecho feliz al equipo.</p>

                                    <button
                                        onClick={() => setHasTipped(false)}
                                        className="mt-10 text-[10px] font-black uppercase text-gray-300 tracking-[0.2em]"
                                    >
                                        Cerrar
                                    </button>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <p className="text-center text-[9px] font-bold text-gray-300 uppercase tracking-[0.3em]">
                    SGI-POLÍGONO • EXPERIENCIA PREMIUM
                </p>
            </div>
        </div>
    );
}
