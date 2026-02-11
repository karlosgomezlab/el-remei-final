'use client';

import { MapPin, Phone, Clock, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

export const Location = () => {
    return (
        <section id="location" className="py-20 bg-gray-50 border-t border-gray-200">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center mb-16 space-y-4">
                    <motion.span
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-orange-500 font-bold tracking-widest uppercase text-sm"
                    >
                        Visítanos
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-5xl font-black text-gray-900 uppercase"
                    >
                        Dónde y Cuándo
                    </motion.h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
                    {/* Card 1: Dirección */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 flex flex-col items-center text-center gap-4 hover:-translate-y-2 transition-transform duration-300"
                    >
                        <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-500 mb-2">
                            <MapPin className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900">Ubicación</h3>
                        <p className="text-gray-600 font-medium">
                            Carrer del Remei, 45<br />
                            Polígono Industrial SGI<br />
                            08000 Barcelona
                        </p>
                        <button className="text-orange-500 font-bold uppercase text-xs tracking-widest border-b-2 border-orange-500 pb-1 mt-2 hover:text-orange-600 hover:border-orange-600">
                            Ver en Mapa
                        </button>
                    </motion.div>

                    {/* Card 2: Horarios */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                        className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 flex flex-col items-center text-center gap-4 hover:-translate-y-2 transition-transform duration-300 relative overflow-hidden"
                    >
                        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-orange-500 via-red-500 to-orange-500"></div>
                        <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-500 mb-2">
                            <Clock className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900">Horarios</h3>
                        <ul className="text-gray-600 font-medium space-y-2 w-full">
                            <li className="flex justify-between w-full max-w-[200px] mx-auto border-b border-gray-100 pb-1">
                                <span>Lun - Vie</span>
                                <span className="font-bold text-gray-900">07:00 - 23:00</span>
                            </li>
                            <li className="flex justify-between w-full max-w-[200px] mx-auto border-b border-gray-100 pb-1">
                                <span>Sábados</span>
                                <span className="font-bold text-gray-900">08:00 - 17:00</span>
                            </li>
                            <li className="flex justify-between w-full max-w-[200px] mx-auto opacity-60">
                                <span>Domingos</span>
                                <span>Cerrado</span>
                            </li>
                        </ul>
                    </motion.div>

                    {/* Card 3: Contacto */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4 }}
                        className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 flex flex-col items-center text-center gap-4 hover:-translate-y-2 transition-transform duration-300"
                    >
                        <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-500 mb-2">
                            <Phone className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900">Contacto</h3>
                        <p className="text-gray-600 font-medium">
                            ¿Quieres reservar para un grupo?<br />
                            Llámanos directamente.
                        </p>
                        <a href="tel:+34931234567" className="text-2xl font-black text-orange-500 hover:scale-105 transition-transform">
                            93 123 45 67
                        </a>
                        <div className="flex items-center gap-2 text-sm text-gray-400 font-bold uppercase tracking-wide">
                            <Mail className="w-4 h-4" />
                            hola@elremei.com
                        </div>
                    </motion.div>
                </div>

                {/* Map Placeholder */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="w-full h-[400px] bg-gray-200 rounded-[3rem] overflow-hidden shadow-inner grayscale hover:grayscale-0 transition-all duration-500 relative group"
                >
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                        <div className="bg-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-3">
                            <MapPin className="w-6 h-6 text-orange-500" />
                            <span className="font-bold text-gray-800">Mapa Interactivo (Google Maps)</span>
                        </div>
                    </div>
                    <iframe
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2993.687483755331!2d2.173403499999999!3d41.3850639!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x12a4a2f8d2b8c381%3A0x1d5d1c2d3b4e5f6!2sBarcelona!5e0!3m2!1sen!2ses!4v1634567890123!5m2!1sen!2ses"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        className="w-full h-full opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                    ></iframe>
                </motion.div>
            </div>
        </section>
    );
};
