'use client';

import { ArrowRight, Star } from 'lucide-react';
import { motion } from 'framer-motion';

export const Hero = () => {
    return (
        <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
            {/* Background Image / Overlay */}
            <div className="absolute inset-0 bg-gray-900 z-0">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1544025162-d76690b6d012?q=80&w=1920&auto=format&fit=crop')] bg-cover bg-center opacity-60 mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80"></div>
            </div>

            <div className="relative z-10 container mx-auto px-4 text-center text-white flex flex-col items-center gap-6 md:gap-8 max-w-4xl">

                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20"
                >
                    <Star className="w-4 h-4 text-orange-400 fill-orange-400" />
                    <span className="text-xs md:text-sm font-bold tracking-widest uppercase text-orange-100">La mejor opción del Polígono</span>
                </motion.div>

                {/* Main Title */}
                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.9] text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400"
                >
                    Comida Casera <br />
                    <span className="text-orange-500">Desde 1989</span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="text-lg md:text-2xl text-gray-300 font-medium max-w-2xl mx-auto leading-relaxed"
                >
                    Sabor tradicional, ingredientes frescos y el ambiente familiar que te hace sentir como en casa.
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.8 }}
                    className="flex flex-col sm:flex-row gap-4 mt-8 w-full justify-center"
                >
                    <button className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-full font-black text-lg uppercase tracking-wide transition-all transform hover:scale-105 shadow-[0_20px_50px_rgba(249,115,22,0.3)] flex items-center justify-center gap-2 group">
                        Reservar Ahora
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button className="px-8 py-4 bg-white hover:bg-gray-100 text-gray-900 rounded-full font-black text-lg uppercase tracking-wide transition-all transform hover:scale-105 shadow-xl flex items-center justify-center">
                        Pedir a Domicilio
                    </button>
                </motion.div>
            </div>

            {/* Scroll Indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5, y: [0, 10, 0] }}
                transition={{ delay: 1.5, duration: 2, repeat: Infinity }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
            >
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-white">Descubre más</span>
                <div className="w-px h-12 bg-gradient-to-b from-orange-500 to-transparent"></div>
            </motion.div>
        </section>
    );
};
