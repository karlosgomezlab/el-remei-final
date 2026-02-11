import { Instagram, Facebook, Twitter } from 'lucide-react';
import Link from 'next/link';

export const Footer = () => {
    return (
        <footer className="bg-gray-900 text-white py-16">
            <div className="container mx-auto px-4 md:px-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12 border-b border-gray-800 pb-12">
                    <div className="text-center md:text-left">
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">El Remei</h2>
                        <p className="text-gray-400 max-w-sm">
                            Sabor tradicional y cocina casera en el corazón del polígono.
                            Tu casa fuera de casa.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        {[Facebook, Instagram, Twitter].map((Icon, i) => (
                            <a key={i} href="#" className="w-12 h-12 rounded-full bg-white/5 hover:bg-orange-500 flex items-center justify-center transition-all duration-300 hover:scale-110">
                                <Icon className="w-5 h-5" />
                            </a>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-500 font-medium">
                    <p>© {new Date().getFullYear()} El Remei Restaurante. Todos los derechos reservados.</p>
                    <div className="flex gap-8 mt-4 md:mt-0">
                        <Link href="#" className="hover:text-white transition-colors">Aviso Legal</Link>
                        <Link href="#" className="hover:text-white transition-colors">Política de Privacidad</Link>
                        <Link href="#" className="hover:text-white transition-colors">Cookies</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};
