'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ArrowLeft, Package, Search, Power, PowerOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Product } from '@/types';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        const { data } = await supabase
            .from('products')
            .select('*')
            .order('category', { ascending: true });
        if (data) setProducts(data);
        setLoading(false);
    };

    const toggleAvailability = async (productId: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('products')
            .update({ is_available: !currentStatus })
            .eq('id', productId);

        if (!error) {
            setProducts(prev => prev.map(p => p.id === productId ? { ...p, is_available: !currentStatus } : p));
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
            <p className="text-gray-400 font-mono uppercase tracking-widest">Cargando Inventario...</p>
        </div>
    );

    return (
        <div className="p-6 bg-zinc-950 min-h-screen text-white font-sans">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <Link href="/dashboard" className="p-2 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-all">
                            <ArrowLeft className="w-5 h-5 text-zinc-400" />
                        </Link>
                        <h1 className="text-4xl font-black italic tracking-tighter uppercase flex items-center gap-3">
                            <Package className="w-8 h-8 text-orange-500" />
                            GESTIÓN DE STOCK
                        </h1>
                    </div>
                </div>

                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Buscar producto o categoría..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-orange-500/50 text-sm font-bold uppercase transition-all outline-none"
                    />
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                    <div
                        key={product.id}
                        className={`p-6 rounded-[2rem] border-2 transition-all duration-500 flex flex-col justify-between gap-6 ${product.is_available ? 'bg-zinc-900/50 border-zinc-800' : 'bg-red-950/10 border-red-900/30'}`}
                    >
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-3 py-1 bg-zinc-800 rounded-full">
                                    {product.category}
                                </span>
                                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${product.is_available ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                    {product.is_available ? 'ACTIVO' : 'AGOTADO'}
                                </span>
                            </div>
                            <h3 className="text-xl font-black uppercase italic leading-tight">{product.name}</h3>
                            <p className="text-2xl font-black text-orange-500 mt-2">{Number(product.price).toFixed(2)}€</p>
                        </div>

                        <button
                            onClick={() => toggleAvailability(product.id, product.is_available)}
                            className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg ${product.is_available ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/20'}`}
                        >
                            {product.is_available ? (
                                <>
                                    <PowerOff className="w-5 h-5" />
                                    MARCAR COMO AGOTADO
                                </>
                            ) : (
                                <>
                                    <Power className="w-5 h-5" />
                                    ACTIVAR PRODUCTO
                                </>
                            )}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
