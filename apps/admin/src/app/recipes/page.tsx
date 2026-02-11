'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ArrowLeft, Search, Save, X, ChefHat, AlertCircle, Plus, Trash2, Calculator, Info } from 'lucide-react';
import Link from 'next/link';
import { Product, Recipe, Ingredient, RecipeIngredient } from '@/types';
import { toast, Toaster } from 'sonner';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function RecipesPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Editor State
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [currentRecipe, setCurrentRecipe] = useState<Partial<Recipe>>({});
    const [recipeIngredients, setRecipeIngredients] = useState<Partial<RecipeIngredient>[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchData();
        return () => { supabase.removeAllChannels(); };
    }, []);

    const fetchData = async () => {
        setLoading(true);
        // 1. Fetch Products
        const { data: productsData } = await supabase.from('products').select('*').order('name');

        // 2. Fetch Recipes with Ingredients join
        const { data: recipesData } = await supabase
            .from('recipes')
            .select('*, recipe_ingredients(*, ingredient:ingredients(*))');

        // 3. Fetch Ingredients (for the dropdown)
        const { data: ingredientsData } = await supabase.from('ingredients').select('*').order('name');

        if (productsData) setProducts(productsData);
        if (recipesData) setRecipes(recipesData);
        if (ingredientsData) setIngredients(ingredientsData);
        setLoading(false);
    };

    const openRecipeEditor = (product: Product) => {
        setSelectedProduct(product);
        const existingRecipe = recipes.find(r => r.product_id === product.id);

        if (existingRecipe) {
            setCurrentRecipe(existingRecipe);
            // Transform to editable format
            setRecipeIngredients(existingRecipe.ingredients || []);
        } else {
            // New Draft
            setCurrentRecipe({
                product_id: product.id,
                yield_quantity: 1,
                status: 'draft',
                version: 1
            });
            setRecipeIngredients([]);
        }
        setIsEditorOpen(true);
    };

    const handleAddIngredientLine = () => {
        setRecipeIngredients([...recipeIngredients, { quantity: 1, wastage_percent: 0 }]);
    };

    const handleRemoveIngredientLine = (index: number) => {
        const newLines = [...recipeIngredients];
        newLines.splice(index, 1);
        setRecipeIngredients(newLines);
    };

    const updateIngredientLine = (index: number, field: keyof RecipeIngredient, value: any) => {
        const newLines = [...recipeIngredients];
        newLines[index] = { ...newLines[index], [field]: value };

        // If updating ingredient_id, also attach real ingredient object for UI calculations
        if (field === 'ingredient_id') {
            const ing = ingredients.find(i => i.id === value);
            if (ing) {
                newLines[index].ingredient = ing;
                // Default unit from ingredient
                newLines[index].unit = ing.unit;
            }
        }

        setRecipeIngredients(newLines);
    };

    const calculateTotalCost = () => {
        return recipeIngredients.reduce((total, line) => {
            if (!line.ingredient) return total;
            const baseCost = line.ingredient.cost_per_unit || 0;
            const qty = line.quantity || 0;
            const wastage = (line.wastage_percent || 0) / 100;

            // Cost logic: Quantity * Cost * (1 + Wastage)
            // Example: 1kg tomato at 2€/kg with 10% waste = 1 * 2 * 1.1 = 2.2€
            return total + (qty * baseCost * (1 + wastage));
        }, 0);
    };

    const handleSaveRecipe = async () => {
        if (!selectedProduct) return;
        setIsSaving(true);
        try {
            // 1. Upsert Recipe Header
            const recipePayload = {
                product_id: selectedProduct.id,
                name: selectedProduct.name, // Sync name
                yield_quantity: currentRecipe.yield_quantity || 1,
                prep_time_minutes: currentRecipe.prep_time_minutes || 0,
                status: currentRecipe.status || 'draft',
                version: (currentRecipe.version || 0) + 1,
                updated_at: new Date().toISOString()
            };

            // If ID exists it's update, otherwise insert
            // We use upsert on product_id if possible, or just standard insert logic
            let recipeId = currentRecipe.id;

            if (!recipeId) {
                const { data, error } = await supabase.from('recipes').insert([recipePayload]).select().single();
                if (error) throw error;
                recipeId = data.id;
            } else {
                const { error } = await supabase.from('recipes').update(recipePayload).eq('id', recipeId);
                if (error) throw error;
            }

            // 2. Manage Ingredients
            // Fastest way: Delete all old recipe_ingredients and insert new ones. 
            // Better way for history: Diff check (skip for MVP)

            if (recipeId) {
                // Delete old
                await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId);

                // Insert new
                if (recipeIngredients.length > 0) {
                    const linesPayload = recipeIngredients
                        .filter(l => l.ingredient_id && l.quantity)
                        .map(l => ({
                            recipe_id: recipeId,
                            ingredient_id: l.ingredient_id,
                            quantity: l.quantity,
                            unit: l.unit || l.ingredient?.unit || 'u',
                            wastage_percent: l.wastage_percent || 0
                        }));

                    if (linesPayload.length > 0) {
                        const { error: linesError } = await supabase.from('recipe_ingredients').insert(linesPayload);
                        if (linesError) throw linesError;
                    }
                }
            }

            toast.success('Escandallo guardado correctamente');
            setIsEditorOpen(false);
            fetchData(); // Refresh list

        } catch (error) {
            console.error('Error saving recipe:', error);
            toast.error('Error al guardar escandallo');
        } finally {
            setIsSaving(false);
        }
    };

    // Filter Logic
    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="p-6 bg-zinc-950 min-h-screen text-white font-sans">
            <Toaster position="top-right" richColors />

            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <Link href="/dashboard" className="p-2 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-all">
                            <ArrowLeft className="w-5 h-5 text-zinc-400" />
                        </Link>
                        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600 flex items-center gap-3 italic">
                            ESCANDALLOS
                        </h1>
                    </div>
                    <p className="text-zinc-500 font-medium uppercase tracking-tighter ml-14">Fichas técnicas y cálculo de costes</p>
                </div>

                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Buscar plato..."
                        className="w-full bg-zinc-900 border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-orange-500/20 transition-all border outline-none font-bold"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredProducts.map(product => {
                        const recipe = recipes.find(r => r.product_id === product.id);
                        const hasRecipe = !!recipe;
                        let cost = 0;
                        let margin = 0;

                        if (recipe && recipe.recipe_ingredients) {
                            // Re-calculate cost for list view relying on DB joins
                            cost = recipe.recipe_ingredients.reduce((acc, line: any) => {
                                const base = line.ingredient?.cost_per_unit || 0;
                                return acc + (line.quantity * base * (1 + (line.wastage_percent / 100)));
                            }, 0);

                            // Adjust for Yield (Cost per serving = Total Cost / Yield)
                            const yieldQty = recipe.yield_quantity || 1;
                            cost = cost / yieldQty;

                            if (product.price > 0) {
                                margin = ((product.price - cost) / product.price) * 100;
                            }
                        }

                        return (
                            <div key={product.id} className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 hover:bg-zinc-900 transition-all flex flex-col group">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex gap-4">
                                        <div className="w-16 h-16 bg-zinc-800 rounded-2xl bg-cover bg-center border border-zinc-700"
                                            style={{ backgroundImage: `url(${product.image_url || '/placeholder.png'})` }} />
                                        <div>
                                            <h3 className="font-bold text-lg leading-tight">{product.name}</h3>
                                            <p className="text-zinc-500 text-xs font-bold uppercase mt-1">{product.category}</p>
                                        </div>
                                    </div>
                                    <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${hasRecipe ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>
                                        {hasRecipe ? `v${recipe.version}` : 'SIN FICHA'}
                                    </div>
                                </div>

                                {hasRecipe ? (
                                    <div className="grid grid-cols-3 gap-2 mb-4 bg-zinc-950/50 rounded-2xl p-3 border border-zinc-800/50">
                                        <div>
                                            <p className="text-[9px] text-zinc-500 uppercase font-black">PVP</p>
                                            <p className="text-sm font-bold text-white">{product.price.toFixed(2)}€</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-zinc-500 uppercase font-black">Coste</p>
                                            <p className="text-sm font-bold text-orange-400">{cost.toFixed(2)}€</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-zinc-500 uppercase font-black">Rentabilidad</p>
                                            <p className={`text-sm font-bold ${margin > 70 ? 'text-emerald-400' : 'text-yellow-400'}`}>{margin.toFixed(0)}%</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mb-4 bg-zinc-950/30 rounded-2xl p-3 border border-zinc-800/30 flex items-center justify-center gap-2 text-zinc-500">
                                        <AlertCircle className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase">Falta definir receta</span>
                                    </div>
                                )}

                                <button
                                    onClick={() => openRecipeEditor(product)}
                                    className="mt-auto w-full py-3 bg-zinc-800 hover:bg-orange-600 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                                >
                                    <ChefHat className="w-4 h-4" />
                                    {hasRecipe ? 'Editar Escandallo' : 'Crear Escandallo'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* RECIPE EDITOR MODAL */}
            {isEditorOpen && selectedProduct && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        {/* Header Modal */}
                        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50 rounded-t-3xl">
                            <div>
                                <h2 className="text-2xl font-black italic flex items-center gap-3">
                                    <span className="text-orange-500"><ChefHat /></span>
                                    {selectedProduct.name}
                                </h2>
                                <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mt-1">Editor de Ficha Técnica</p>
                            </div>
                            <button onClick={() => setIsEditorOpen(false)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Body Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">

                            {/* General Info */}
                            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2">Raciones (Yield)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500/50 outline-none font-bold text-lg"
                                            value={currentRecipe.yield_quantity || 1}
                                            onChange={e => setCurrentRecipe({ ...currentRecipe, yield_quantity: parseFloat(e.target.value) })}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-600 uppercase">Pax</span>
                                    </div>
                                    <p className="text-[10px] text-zinc-600 mt-1 italic">¿Para cuántas raciones es esta receta?</p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2">Tiempo Prep.</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500/50 outline-none font-bold text-lg"
                                            value={currentRecipe.prep_time_minutes || 0}
                                            onChange={e => setCurrentRecipe({ ...currentRecipe, prep_time_minutes: parseFloat(e.target.value) })}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-600 uppercase">Min</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2">Estado</label>
                                    <select
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500/50 outline-none font-bold text-sm uppercase"
                                        value={currentRecipe.status || 'draft'}
                                        onChange={e => setCurrentRecipe({ ...currentRecipe, status: e.target.value as any })}
                                    >
                                        <option value="draft">Borrador</option>
                                        <option value="active">Activo</option>
                                        <option value="archived">Archivado</option>
                                    </select>
                                </div>
                            </section>

                            {/* Ingredients Table */}
                            <section>
                                <div className="flex justify-between items-end mb-3">
                                    <h3 className="text-sm font-black uppercase text-zinc-400 flex items-center gap-2">
                                        <Calculator className="w-4 h-4" /> Ingredientes y Costes
                                    </h3>
                                    <button
                                        onClick={handleAddIngredientLine}
                                        className="bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" /> Añadir Ingrediente
                                    </button>
                                </div>

                                <div className="bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-zinc-900 border-b border-zinc-800">
                                                <th className="p-3 text-[9px] font-black uppercase text-zinc-500">Ingrediente</th>
                                                <th className="p-3 text-[9px] font-black uppercase text-zinc-500 w-24">Cantidad</th>
                                                <th className="p-3 text-[9px] font-black uppercase text-zinc-500 w-20">Unidad</th>
                                                <th className="p-3 text-[9px] font-black uppercase text-zinc-500 w-24">Merma %</th>
                                                <th className="p-3 text-[9px] font-black uppercase text-zinc-500 w-24 text-right">Coste</th>
                                                <th className="p-3 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800">
                                            {recipeIngredients.map((line, idx) => {
                                                const lineCost = line.ingredient
                                                    ? (line.quantity || 0) * (line.ingredient.cost_per_unit) * (1 + ((line.wastage_percent || 0) / 100))
                                                    : 0;

                                                return (
                                                    <tr key={idx} className="group hover:bg-zinc-900/50">
                                                        <td className="p-2">
                                                            <select
                                                                className="w-full bg-transparent text-sm font-bold focus:outline-none text-white appearance-none"
                                                                value={line.ingredient_id || ''}
                                                                onChange={e => updateIngredientLine(idx, 'ingredient_id', e.target.value)}
                                                            >
                                                                <option value="" disabled>Seleccionar...</option>
                                                                {ingredients.map(ing => (
                                                                    <option key={ing.id} value={ing.id}>{ing.name} ({ing.cost_per_unit}€/{ing.unit})</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="p-2">
                                                            <input
                                                                type="number"
                                                                step="0.001"
                                                                className="w-full bg-zinc-900 rounded-lg px-2 py-1 text-sm font-bold text-center focus:ring-1 ring-blue-500 outline-none"
                                                                value={line.quantity || 0}
                                                                onChange={e => updateIngredientLine(idx, 'quantity', parseFloat(e.target.value))}
                                                            />
                                                        </td>
                                                        <td className="p-3 text-xs font-bold text-zinc-500 uppercase">
                                                            {line.unit || '-'}
                                                        </td>
                                                        <td className="p-2">
                                                            <input
                                                                type="number"
                                                                className="w-full bg-zinc-900 rounded-lg px-2 py-1 text-sm font-bold text-center text-red-400 focus:ring-1 ring-red-500 outline-none"
                                                                value={line.wastage_percent || 0}
                                                                onChange={e => updateIngredientLine(idx, 'wastage_percent', parseFloat(e.target.value))}
                                                            />
                                                        </td>
                                                        <td className="p-3 text-sm font-bold text-right text-orange-400">
                                                            {lineCost.toFixed(3)}€
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <button onClick={() => handleRemoveIngredientLine(idx)} className="text-zinc-600 hover:text-red-500 transition-colors">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {recipeIngredients.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="p-8 text-center text-zinc-600 text-xs font-bold uppercase italic">
                                                        No hay ingredientes añadidos a esta receta
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                        {recipeIngredients.length > 0 && (
                                            <tfoot className="bg-zinc-900/50">
                                                <tr>
                                                    <td colSpan={4} className="p-3 text-right text-[10px] font-black uppercase text-zinc-400">
                                                        Coste Total Ingredientes
                                                    </td>
                                                    <td className="p-3 text-right text-base font-black text-orange-400 border-t border-zinc-800">
                                                        {calculateTotalCost().toFixed(2)}€
                                                    </td>
                                                    <td></td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </section>

                            {/* Summary Card */}
                            <section className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
                                <h3 className="text-sm font-black uppercase text-zinc-400 mb-4 flex items-center gap-2">
                                    <Info className="w-4 h-4" /> Resumen de Rentabilidad
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div>
                                        <p className="text-[9px] font-black uppercase text-zinc-600">Coste Total Receta</p>
                                        <p className="text-2xl font-black text-white">{calculateTotalCost().toFixed(2)}€</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase text-zinc-600">Raciones</p>
                                        <p className="text-2xl font-black text-white">{currentRecipe.yield_quantity || 1}</p>
                                    </div>
                                    <div className="bg-blue-900/10 p-2 rounded-xl border border-blue-900/20">
                                        <p className="text-[9px] font-black uppercase text-blue-400">Coste por Ración</p>
                                        <p className="text-2xl font-black text-blue-400">
                                            {(calculateTotalCost() / (currentRecipe.yield_quantity || 1)).toFixed(2)}€
                                        </p>
                                    </div>
                                    <div className="bg-emerald-900/10 p-2 rounded-xl border border-emerald-900/20">
                                        <p className="text-[9px] font-black uppercase text-emerald-400">Margen Beneficio</p>
                                        <p className="text-xl font-bold flex items-end gap-1">
                                            <span className="text-3xl font-black text-emerald-400">
                                                {selectedProduct.price > 0
                                                    ? (((selectedProduct.price - (calculateTotalCost() / (currentRecipe.yield_quantity || 1))) / selectedProduct.price) * 100).toFixed(0)
                                                    : 0
                                                }
                                            </span>
                                            <span className="text-xs mb-1">%</span>
                                        </p>
                                    </div>
                                </div>
                            </section>

                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-zinc-800 bg-zinc-950 rounded-b-3xl flex justify-end gap-3">
                            <button
                                onClick={() => setIsEditorOpen(false)}
                                className="px-6 py-3 rounded-xl font-bold bg-zinc-800 hover:bg-zinc-700 transition-colors uppercase text-xs tracking-wider"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveRecipe}
                                disabled={isSaving}
                                className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white transition-all shadow-lg shadow-orange-900/20 uppercase text-xs tracking-wider flex items-center gap-2"
                            >
                                {isSaving ? <span className="animate-spin">⏳</span> : <Save className="w-4 h-4" />}
                                Guardar Escandallo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
