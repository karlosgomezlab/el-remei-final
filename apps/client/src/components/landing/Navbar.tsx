'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Utensils, QrCode } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: 'Inicio', href: '/' },
        { name: 'Ubicación', href: '#location' },
        { name: 'Sobre Nosotros', href: '#about' },
        { name: 'Mi Cuenta', href: '/cuenta' },
    ];

    if (pathname === '/scan') return null;

    return (
        <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-lg py-3' : 'bg-transparent py-5'}`}>
            <div className="container mx-auto px-4 md:px-6 flex justify-between items-center">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className={`p-2 rounded-xl transition-colors ${scrolled ? 'bg-orange-500 text-white' : 'bg-white/10 text-white border border-white/20'}`}>
                        <Utensils className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col">
                        <span className={`text-xl font-black uppercase tracking-tighter leading-none ${scrolled ? 'text-gray-900' : 'text-white'}`}>
                            El Remei
                        </span>
                        <span className={`text-[10px] font-bold tracking-widest ${scrolled ? 'text-orange-500' : 'text-orange-300'}`}>
                            RESTAURANTE
                        </span>
                    </div>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-8">
                    <div className="flex gap-6">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={`text-sm font-bold uppercase tracking-wide hover:text-orange-500 transition-colors ${scrolled ? 'text-gray-600' : 'text-white/90'}`}
                            >
                                {link.name}
                            </Link>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/scan"
                            className={`p-2 rounded-full transition-colors ${scrolled ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                            title="Escanear QR"
                        >
                            <QrCode className="w-5 h-5" />
                        </Link>
                        <Link
                            href="#booking"
                            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full font-bold text-xs uppercase tracking-wide transition-all transform hover:scale-105 shadow-md shadow-orange-500/20 text-center"
                        >
                            Reservar Mesa
                        </Link>
                        <button className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-full font-bold text-xs uppercase tracking-wide transition-all transform hover:scale-105 shadow-md">
                            Pedir a Domicilio
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Button */}
                <button
                    className={`md:hidden p-2 rounded-lg ${scrolled ? 'text-gray-900' : 'text-white'}`}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-full left-0 w-full bg-white shadow-xl border-t border-gray-100 md:hidden flex flex-col p-6 gap-4"
                    >
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2"
                                onClick={() => setIsOpen(false)}
                            >
                                {link.name}
                            </Link>
                        ))}
                        <div className="flex flex-col gap-2 mt-2">
                            <Link
                                href="/scan"
                                className="flex items-center justify-center gap-2 w-full py-2 bg-gray-100 text-gray-900 rounded-lg font-bold uppercase text-xs"
                                onClick={() => setIsOpen(false)}
                            >
                                <QrCode className="w-4 h-4" /> Escanear QR
                            </Link>
                            <Link
                                href="#booking"
                                className="w-full py-2 bg-orange-500 text-white rounded-lg font-bold uppercase text-xs shadow-md shadow-orange-500/20 text-center"
                                onClick={() => setIsOpen(false)}
                            >
                                Reservar Mesa
                            </Link>
                            <button className="w-full py-2 bg-gray-900 text-white rounded-lg font-bold uppercase text-xs shadow-md" onClick={() => setIsOpen(false)}>
                                Pedir a Domicilio
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};
