'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
    ArrowLeft,
    Package,
    Search,
    Power,
    PowerOff,
    Loader2,
    Plus,
    Edit2,
    Save,
    X,
    Image as ImageIcon,
    Trash2,
    CheckCircle,
    Utensils,
    Coffee,
    Pizza,
    CakeSlice
} from 'lucide-react';
import Link from 'next/link';
import { Product } from '@/types';
import { getProductImage } from '@/utils/productImages';
import { toast, Toaster } from 'sonner';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CATEGORIES = ['entrante', 'primero', 'segundo', 'postre', 'bebida', 'cafe', 'otro'];

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('category', { ascending: true });

        if (error) {
            toast.error('Error al cargar productos');
        } else {
            setProducts(data || []);
        }
        setLoading(false);
    };

    const handleEdit = (product: Product | null) => {
        setEditingProduct(product || {
            name: '',
            price: 0,
            category: 'primero',
            is_available: true,
            description: '',
            image_url: '',
            image_url_2: '',
            is_vegan: false,
            is_gluten_free: false,
            is_favorite: false
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProduct?.name || !editingProduct?.price) {
            toast.error('Nombre y precio son obligatorios');
            return;
        }

        setSaving(true);
        try {
            // Create a clean payload with only the fields we want to save
            const { id, created_at, ...rest } = editingProduct as any; // Exclude id and created_at

            const payload = {
                name: rest.name,
                price: Number(rest.price),
                category: String(rest.category),
                description: rest.description,
                image_url: rest.image_url,    // Ensure this matches DB column
                image_url_2: rest.image_url_2,// Ensure this matches DB column
                is_available: rest.is_available,
                is_vegan: rest.is_vegan,
                is_gluten_free: rest.is_gluten_free,
                is_favorite: rest.is_favorite
            };

            let error;
            if (editingProduct.id) {
                const { error: updateError } = await supabase
                    .from('products')
                    .update(payload)
                    .eq('id', editingProduct.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('products')
                    .insert([payload]);
                error = insertError;
            }

            if (error) throw error;

            toast.success(editingProduct.id ? 'Producto actualizado' : 'Producto creado');
            setIsModalOpen(false);
            fetchProducts();
        } catch (error: any) {
            console.error("Error saving product:", error);
            toast.error(`Error: ${error.message || 'Al guardar plato'}`);
        } finally {
            setSaving(false);
        }
    };

    const toggleAvailability = async (productId: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('products')
            .update({ is_available: !currentStatus })
            .eq('id', productId);

        if (error) {
            toast.error('Error al cambiar disponibilidad');
        } else {
            setProducts(prev => prev.map(p => p.id === productId ? { ...p, is_available: !currentStatus } : p));
            toast.success('Disponibilidad actualizada');
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
            <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Sincronizando Inventario...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-950 text-white p-6 md:p-12 font-sans overflow-x-hidden">
            <Toaster position="top-right" richColors />

            {/* Edit/Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
                    <div className="bg-zinc-900 border border-white/10 rounded-[3rem] max-w-4xl w-full max-h-[90vh] overflow-y-auto no-scrollbar shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200">
                        <form onSubmit={handleSave} className="p-8 md:p-12">
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h2 className="text-3xl font-black italic uppercase tracking-tighter">
                                        {editingProduct?.id ? 'Editar Producto' : 'Nuevo Producto'}
                                    </h2>
                                    <p className="text-gray-500 text-[10px] font-bold uppercase mt-1 tracking-widest">Catálogo de El Remei</p>
                                </div>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block ml-2">Nombre del plato</label>
                                        <input
                                            type="text"
                                            value={editingProduct?.name || ''}
                                            onChange={e => setEditingProduct({ ...editingProduct!, name: e.target.value })}
                                            className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                            placeholder="Ej: Chuletón de Buey"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block ml-2">Precio (€)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={editingProduct?.price || ''}
                                                onChange={e => setEditingProduct({ ...editingProduct!, price: parseFloat(e.target.value) })}
                                                className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block ml-2">Categoría</label>
                                            <select
                                                value={editingProduct?.category || 'primero'}
                                                onChange={e => setEditingProduct({ ...editingProduct!, category: e.target.value })}
                                                className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all appearance-none uppercase text-xs"
                                            >
                                                {CATEGORIES.map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block ml-2">Descripción corta</label>
                                        <textarea
                                            value={editingProduct?.description || ''}
                                            onChange={e => setEditingProduct({ ...editingProduct!, description: e.target.value })}
                                            className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all h-32 no-scrollbar"
                                            placeholder="Detalles sobre el plato, ingredientes..."
                                        />
                                    </div>

                                    <div className="flex flex-wrap gap-4 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setEditingProduct({ ...editingProduct!, is_vegan: !editingProduct?.is_vegan })}
                                            className={`px-6 py-3 rounded-full text-[10px] font-black uppercase border transition-all ${editingProduct?.is_vegan ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-white/5 border-white/5 text-gray-600'}`}
                                        >
                                            Vegano
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditingProduct({ ...editingProduct!, is_gluten_free: !editingProduct?.is_gluten_free })}
                                            className={`px-6 py-3 rounded-full text-[10px] font-black uppercase border transition-all ${editingProduct?.is_gluten_free ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-white/5 border-white/5 text-gray-600'}`}
                                        >
                                            Sin Gluten
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditingProduct({ ...editingProduct!, is_favorite: !editingProduct?.is_favorite })}
                                            className={`px-6 py-3 rounded-full text-[10px] font-black uppercase border transition-all ${editingProduct?.is_favorite ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-white/5 border-white/5 text-gray-600'}`}
                                        >
                                            Favorito/Recomendado
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block ml-2">Imagen Principal</label>
                                        <div className="flex gap-4">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    setUploading(true);
                                                    const fileExt = file.name.split('.').pop();
                                                    const fileName = `${Math.random()}.${fileExt}`;
                                                    const { error: uploadError } = await supabase.storage.from('menu-images').upload(fileName, file);
                                                    if (uploadError) {
                                                        toast.error('Error subiendo imagen');
                                                    } else {
                                                        const { data } = supabase.storage.from('menu-images').getPublicUrl(fileName);
                                                        setEditingProduct({ ...editingProduct!, image_url: data.publicUrl });
                                                    }
                                                    setUploading(false);
                                                }}
                                                className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-orange-600 file:text-white hover:file:bg-orange-500"
                                            />
                                        </div>
                                        {uploading && <p className="text-xs text-orange-500 mt-2 animate-pulse">Subiendo imagen...</p>}
                                        {editingProduct?.image_url && (
                                            <div className="mt-4 aspect-video rounded-3xl overflow-hidden border border-white/10">
                                                <img src={editingProduct.image_url} alt="Preview" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block ml-2">Segunda Imagen (Detalle)</label>
                                        <div className="flex gap-4">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    setUploading(true);
                                                    const fileExt = file.name.split('.').pop();
                                                    const fileName = `${Math.random()}.${fileExt}`;
                                                    const { error: uploadError } = await supabase.storage.from('menu-images').upload(fileName, file);
                                                    if (uploadError) {
                                                        toast.error('Error subiendo imagen');
                                                    } else {
                                                        const { data } = supabase.storage.from('menu-images').getPublicUrl(fileName);
                                                        setEditingProduct({ ...editingProduct!, image_url_2: data.publicUrl });
                                                    }
                                                    setUploading(false);
                                                }}
                                                className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-orange-600 file:text-white hover:file:bg-orange-500"
                                            />
                                        </div>
                                        {editingProduct?.image_url_2 && (
                                            <div className="mt-4 aspect-video rounded-3xl overflow-hidden border border-white/10">
                                                <img src={editingProduct.image_url_2} alt="Preview" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block ml-2">URL de imagen principal (Alternativa)</label>
                                        <input
                                            type="text"
                                            value={editingProduct?.image_url || ''}
                                            onChange={e => setEditingProduct({ ...editingProduct!, image_url: e.target.value })}
                                            className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all text-sm text-gray-300 placeholder-gray-600"
                                            placeholder="https://ejemplo.com/imagen.jpg"
                                        />
                                        <p className="text-[9px] text-gray-500 mt-2 ml-2 italic">
                                            Si no subes una imagen, se usará esta URL.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-12 flex gap-4">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-6 bg-orange-600 hover:bg-orange-500 rounded-3xl font-black italic uppercase tracking-widest transition-all shadow-xl shadow-orange-950/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4"
                                >
                                    {saving ? <Loader2 className="animate-spin" /> : <Save className="w-6 h-6" />}
                                    {editingProduct?.id ? 'Guardar Cambios' : 'Crear Producto'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8">
                <div className="flex items-center gap-6">
                    <Link href="/dashboard" className="bg-gray-900 p-4 rounded-3xl hover:bg-gray-800 transition-all border border-white/5 shadow-xl">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className="text-4xl font-black italic bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-red-600">
                            INVENTARIO GASTRONÓMICO
                        </h1>
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-1">Gestión del Menú de Autor • El Remei</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-initial">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Buscar plato o categoría..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:w-80 bg-gray-900/50 border border-white/5 rounded-3xl pl-16 pr-8 py-5 font-bold focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
                        />
                    </div>
                    <button
                        onClick={() => handleEdit(null)}
                        className="bg-orange-600 text-white p-5 rounded-3xl flex items-center gap-4 hover:bg-orange-500 transition-all shadow-xl shadow-orange-950/20 active:scale-95"
                    >
                        <Plus className="w-6 h-6" />
                        <span className="font-black italic uppercase text-sm">Nuevo Plato</span>
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {CATEGORIES.map(category => {
                    const categoryProducts = filteredProducts.filter(p => p.category === category);
                    if (categoryProducts.length === 0) return null;

                    return (
                        <div key={category} className="space-y-6 col-span-full">
                            <div className="flex items-center gap-4">
                                <span className="h-px bg-white/5 flex-1"></span>
                                <h2 className="text-sm font-black italic uppercase text-orange-500 tracking-[0.3em]">{category}S</h2>
                                <span className="h-px bg-white/5 flex-1"></span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                {categoryProducts.map(product => (
                                    <div key={product.id} className="group bg-gray-900/40 border border-white/5 rounded-[3rem] overflow-hidden flex flex-col hover:bg-gray-900 transition-all duration-500">
                                        <div className="relative aspect-square overflow-hidden">
                                            {getProductImage(product.name, product.image_url) ? (
                                                <img
                                                    src={getProductImage(product.name, product.image_url)!}
                                                    alt={product.name}
                                                    className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ${!product.is_available ? 'grayscale opacity-30' : ''}`}
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                                    <ImageIcon className="w-12 h-12 text-zinc-700" />
                                                </div>
                                            )}

                                            <div className="absolute top-6 right-6 flex flex-col gap-2 z-20">
                                                <button
                                                    onClick={() => handleEdit(product)}
                                                    className="p-3 bg-black/60 backdrop-blur-md rounded-2xl hover:bg-orange-600 transition-all group/btn"
                                                >
                                                    <Edit2 className="w-5 h-5 text-white" />
                                                </button>
                                                <button
                                                    onClick={() => toggleAvailability(product.id, product.is_available)}
                                                    className={`p-3 backdrop-blur-md rounded-2xl transition-all ${product.is_available ? 'bg-black/60 hover:bg-red-600' : 'bg-red-600 hover:bg-emerald-600'}`}
                                                >
                                                    {product.is_available ? <PowerOff className="w-5 h-5" /> : <Power className="w-5 h-5" />}
                                                </button>
                                            </div>

                                            {!product.is_available && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="bg-red-600 text-white px-8 py-3 rounded-full text-xs font-black uppercase italic -rotate-12 shadow-2xl">Agotado</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-8 flex flex-col flex-1">
                                            <div className="flex justify-between items-start mb-4">
                                                <h3 className="text-2xl font-black italic tracking-tighter uppercase leading-none truncate max-w-[180px]">{product.name}</h3>
                                                <p className="text-2xl font-black text-orange-500 italic leading-none">{Number(product.price).toFixed(2)}€</p>
                                            </div>

                                            <p className="text-gray-500 text-xs font-bold leading-relaxed mb-6 line-clamp-2 min-h-[3rem]">
                                                {product.description || 'Sin descripción detallada.'}
                                            </p>

                                            <div className="flex gap-2 mb-8">
                                                {product.is_favorite && <span className="bg-red-500/10 text-red-500 px-3 py-1 rounded-lg text-[8px] font-black uppercase border border-red-500/20 italic">Recomendado</span>}
                                                {product.is_vegan && <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-lg text-[8px] font-black uppercase border border-emerald-500/20 italic">Vegano</span>}
                                                {product.is_gluten_free && <span className="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-lg text-[8px] font-black uppercase border border-amber-500/20 italic">Sin Gluten</span>}
                                            </div>

                                            <div className="mt-auto pt-6 border-t border-white/5 flex gap-4">
                                                <div className="flex-1">
                                                    <p className="text-[8px] font-black text-gray-600 uppercase mb-2">Imágenes Disponibles</p>
                                                    <div className="flex gap-2">
                                                        <div className={`w-8 h-8 rounded-lg border-2 ${product.image_url ? 'border-orange-500/50 bg-orange-500/10' : 'border-dashed border-white/10'}`}></div>
                                                        <div className={`w-8 h-8 rounded-lg border-2 ${product.image_url_2 ? 'border-orange-500/50 bg-orange-500/10' : 'border-dashed border-white/10'}`}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredProducts.length === 0 && (
                <div className="py-40 flex flex-col items-center opacity-20">
                    <Package className="w-20 h-20 mb-6" />
                    <p className="text-2xl font-black uppercase italic">Tu inventario está vacío</p>
                </div>
            )}
        </div>
    );
}
