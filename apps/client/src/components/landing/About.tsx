'use client';

import { Clock, Users, ChefHat } from 'lucide-react';
import { motion } from 'framer-motion';

export const About = () => {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
    };

    return (
        <section id="about" className="py-20 md:py-32 bg-white relative overflow-hidden">
            {/* Decorative Background */}
            <div className="absolute top-0 right-0 w-1/3 h-full bg-orange-50/50 -skew-x-12 translate-x-32 -z-10"></div>

            <div className="container mx-auto px-4 md:px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">

                    {/* Text Content */}
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        className="space-y-8"
                    >
                        <motion.div variants={itemVariants} className="inline-block">
                            <span className="py-2 px-4 rounded-full bg-orange-100 text-orange-600 text-xs font-black uppercase tracking-widest">
                                Nuestra Historia
                            </span>
                        </motion.div>

                        <motion.h2 variants={itemVariants} className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
                            Más de 30 años sirviendo <span className="text-orange-500">calidad y tradición</span>
                        </motion.h2>

                        <motion.p variants={itemVariants} className="text-lg text-gray-600 leading-relaxed">
                            Desde 1989, El Remei ha sido el punto de encuentro para quienes buscan la auténtica cocina casera en el corazón del polígono. Lo que comenzó como un pequeño proyecto familiar se ha convertido en un referente gastronómico, manteniendo siempre intacta nuestra esencia: ingredientes frescos, recetas de la abuela y un trato cercano.
                        </motion.p>

                        <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
                            <motion.div variants={itemVariants} className="flex flex-col gap-2">
                                <ChefHat className="w-8 h-8 text-orange-500" />
                                <span className="font-bold text-gray-900">Cocina 100% Casera</span>
                                <span className="text-sm text-gray-500">Sin atajos, todo hecho aquí.</span>
                            </motion.div>
                            <motion.div variants={itemVariants} className="flex flex-col gap-2">
                                <Users className="w-8 h-8 text-orange-500" />
                                <span className="font-bold text-gray-900">Ambiente Familiar</span>
                                <span className="text-sm text-gray-500">Siéntete como en casa.</span>
                            </motion.div>
                            <motion.div variants={itemVariants} className="flex flex-col gap-2">
                                <Clock className="w-8 h-8 text-orange-500" />
                                <span className="font-bold text-gray-900">Servicio Rápido</span>
                                <span className="text-sm text-gray-500">Ideal para tu descanso.</span>
                            </motion.div>
                        </motion.div>
                    </motion.div>

                    {/* Image Grid */}
                    <div className="relative">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-4 translate-y-8">
                                <motion.div
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.8 }}
                                    className="w-full aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl"
                                >
                                    <img
                                        src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1000&auto=format&fit=crop"
                                        alt="Restaurante Interior"
                                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
                                    />
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6, delay: 0.2 }}
                                    className="w-full aspect-square rounded-3xl overflow-hidden shadow-xl bg-orange-500 flex items-center justify-center text-white p-6 text-center"
                                >
                                    <div>
                                        <span className="block text-5xl font-black">35+</span>
                                        <span className="text-sm font-bold uppercase tracking-widest">Años de historia</span>
                                    </div>
                                </motion.div>
                            </div>
                            <div className="space-y-4">
                                <motion.div
                                    initial={{ opacity: 0, y: -50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.8, delay: 0.2 }}
                                    className="w-full aspect-square rounded-3xl overflow-hidden shadow-xl"
                                >
                                    <img
                                        src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1000&auto=format&fit=crop"
                                        alt="Plato Estrella"
                                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
                                    />
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.8, delay: 0.4 }}
                                    className="w-full aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl"
                                >
                                    <img
                                        src="https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1000&auto=format&fit=crop"
                                        alt="Chef cocinando"
                                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
                                    />
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
