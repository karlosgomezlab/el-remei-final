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
    CakeSlice,
    Star
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
            is_favorite: false,
            is_chef_suggestion: false,
            is_top_suggestion: false
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
                is_favorite: rest.is_favorite,
                is_chef_suggestion: rest.is_chef_suggestion,
                is_top_suggestion: rest.is_top_suggestion
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
                                            Favorito
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditingProduct({ ...editingProduct!, is_chef_suggestion: !editingProduct?.is_chef_suggestion })}
                                            className={`px-6 py-3 rounded-full text-[10px] font-black uppercase border transition-all ${editingProduct?.is_chef_suggestion ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-white/5 border-white/5 text-gray-600'}`}
                                        >
                                            Sugerencia Chef
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const isTop = !editingProduct?.is_top_suggestion;
                                                setEditingProduct({
                                                    ...editingProduct!,
                                                    is_top_suggestion: isTop,
                                                    is_chef_suggestion: isTop ? true : editingProduct?.is_chef_suggestion
                                                });
                                            }}
                                            className={`px-6 py-3 rounded-full text-[10px] font-black uppercase border transition-all ${editingProduct?.is_top_suggestion ? 'bg-purple-500/20 border-purple-500/50 text-purple-400' : 'bg-white/5 border-white/5 text-gray-600'}`}
                                        >
                                            TOP Sugerencia
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
                                                        console.error('Error uploading image:', uploadError);
                                                        toast.error(`Error subiendo imagen: ${uploadError.message}`);
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

            <div className="flex flex-col gap-12">
                {CATEGORIES.map(category => {
                    const categoryProducts = filteredProducts.filter(p => p.category === category);
                    if (categoryProducts.length === 0) return null;

                    return (
                        <div key={category} className="space-y-6">
                            <div className="flex items-center gap-4 sticky top-0 bg-black/95 py-4 z-10 backdrop-blur-xl border-b border-white/5">
                                <span className="w-2 h-2 rounded-full bg-orange-600"></span>
                                <h2 className="text-xl font-black italic uppercase text-white tracking-tighter">{category}S</h2>
                                <span className="text-xs font-bold text-gray-600 uppercase tracking-widest bg-gray-900 px-3 py-1 rounded-full border border-white/5">
                                    {categoryProducts.length} Platos
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {categoryProducts.map(product => (
                                    <div key={product.id} className="group bg-gray-900/30 border border-white/5 rounded-3xl overflow-hidden flex flex-col md:flex-row items-center hover:bg-zinc-900 transition-all duration-300 hover:border-orange-500/30 hover:shadow-2xl hover:shadow-orange-900/10">
                                        <div className="relative w-full md:w-32 md:h-32 aspect-square md:aspect-auto shrink-0 overflow-hidden">
                                            {getProductImage(product.name, product.image_url) ? (
                                                <img
                                                    src={getProductImage(product.name, product.image_url)!}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                                    <Utensils className="w-8 h-8 text-zinc-600" />
                                                </div>
                                            )}
                                            {!product.is_available && (
                                                <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm">
                                                    <span className="text-[10px] font-black uppercase text-white tracking-widest border border-white/20 px-3 py-1 rounded-full">Desactivado</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-6 flex-1 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 w-full">
                                            <div className="space-y-2 flex-1 min-w-0">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 group-hover:from-orange-400 group-hover:to-orange-200 transition-all truncate">
                                                        {product.name}
                                                    </h3>
                                                    {product.is_favorite && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                                                    {product.is_vegan && <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider border border-green-500/20">Vegano</span>}
                                                    {product.is_gluten_free && <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-500/20">Gluten Free</span>}
                                                    {product.is_chef_suggestion && <span className="text-[10px] font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider border border-indigo-500/20">👨‍🍳 Chef</span>}
                                                    {product.is_top_suggestion && <span className="text-[10px] font-bold text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider border border-purple-500/20">🔥 TOP</span>}
                                                </div>
                                                <p className="text-sm font-medium text-gray-500 line-clamp-1">{product.description || 'Sin descripción'}</p>
                                                <div className="text-2xl font-black italic text-gray-300">
                                                    {product.price.toFixed(2)}€
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 w-full md:w-auto self-end md:self-center">
                                                <button
                                                    onClick={() => toggleAvailability(product.id, product.is_available)}
                                                    className={`p-3 rounded-2xl border transition-all ${product.is_available
                                                        ? 'bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20'
                                                        : 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20'}`}
                                                    title={product.is_available ? 'Desactivar' : 'Activar'}
                                                >
                                                    <Power className="w-5 h-5" />
                                                </button>

                                                <button
                                                    onClick={() => handleEdit(product)}
                                                    className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl border border-white/5 transition-all hover:scale-105 active:scale-95"
                                                >
                                                    <Edit2 className="w-5 h-5" />
                                                </button>

                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    className="p-3 bg-zinc-800 hover:bg-red-900/30 text-zinc-500 hover:text-red-500 rounded-2xl border border-white/5 transition-all hover:scale-105 active:scale-95 hover:border-red-500/30"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
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
                <div className="py-20 flex flex-col items-center opacity-30 italic text-zinc-500">
                    <Package className="w-16 h-16 mb-4" />
                    <p className="text-xl font-black uppercase tracking-widest text-center">Tu inventario está vacío</p>
                </div>
            )}
        </div>
    );

    async function handleDelete(productId: string) {
        if (!confirm('¿Seguro que quieres eliminar este plato?')) return;
        const { error } = await supabase.from('products').delete().eq('id', productId);
        if (error) {
            toast.error('Error al eliminar');
        } else {
            toast.success('Producto eliminado');
            fetchProducts();
        }
    }
}
