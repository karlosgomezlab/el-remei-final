'use client';

import { createClient } from '@supabase/supabase-js';
import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Ingredient {
    id: string;
    name: string;
    stock: number;
    min_stock_alert: number;
    unit: string;
}

export function LowStockAlerts() {
    const [lowStockItems, setLowStockItems] = useState<Ingredient[]>([]);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        fetchLowStock();

        const channel = supabase
            .channel('stock-alerts')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'ingredients' },
                (payload) => {
                    const newItem = payload.new as Ingredient;
                    if (newItem.min_stock_alert && newItem.stock <= newItem.min_stock_alert) {
                        setLowStockItems(prev => {
                            if (prev.some(i => i.id === newItem.id)) return prev.map(i => i.id === newItem.id ? newItem : i);
                            return [...prev, newItem];
                        });
                        setIsVisible(true);
                    } else {
                        setLowStockItems(prev => prev.filter(i => i.id !== newItem.id));
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchLowStock = async () => {
        const { data } = await supabase
            .from('ingredients')
            .select('*')
            .not('min_stock_alert', 'is', null);

        if (data) {
            const low = data.filter(i => i.stock <= i.min_stock_alert);
            setLowStockItems(low);
        }
    };

    if (lowStockItems.length === 0 || !isVisible) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-500">
            <div className="bg-zinc-900 border border-red-500/30 rounded-2xl shadow-2xl p-4 w-80 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500 animate-pulse"></div>
                <div className="flex justify-between items-start mb-3 pl-3">
                    <div className="flex items-center gap-2 text-red-500 font-bold uppercase text-xs tracking-widest">
                        <AlertTriangle className="w-4 h-4" />
                        Alerta de Stock Bajo
                    </div>
                    <button onClick={() => setIsVisible(false)} className="text-zinc-600 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-2 pl-3 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                    {lowStockItems.map(item => (
                        <div key={item.id} className="flex justify-between items-center text-sm">
                            <span className="font-bold text-zinc-300">{item.name}</span>
                            <span className="font-black text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md text-xs">
                                {item.stock} {item.unit}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
