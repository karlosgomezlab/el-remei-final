import { toast } from 'sonner';
import { CheckCircle, AlertCircle, Info, ChefHat } from 'lucide-react';

export const notify = {
    success: (title: string, message?: string) => {
        toast.custom((t) => (
            <div
                className="bg-zinc-900 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-4 shadow-xl shadow-black/50 w-full max-w-sm cursor-pointer animate-in fade-in slide-in-from-top-5 duration-300"
                onClick={() => toast.dismiss(t)}
            >
                <div className="bg-emerald-500/10 p-2 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                    <p className="text-xs font-black text-emerald-500 uppercase tracking-wider mb-0.5">{title}</p>
                    {message && <p className="text-sm font-bold text-zinc-300">{message}</p>}
                </div>
            </div>
        ));
    },
    error: (title: string, message?: string) => {
        toast.custom((t) => (
            <div
                className="bg-zinc-900 border border-red-500/20 rounded-2xl p-4 flex items-center gap-4 shadow-xl shadow-black/50 w-full max-w-sm cursor-pointer animate-in fade-in slide-in-from-top-5 duration-300"
                onClick={() => toast.dismiss(t)}
            >
                <div className="bg-red-500/10 p-2 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                    <p className="text-xs font-black text-red-500 uppercase tracking-wider mb-0.5">{title}</p>
                    {message && <p className="text-sm font-bold text-zinc-300">{message}</p>}
                </div>
            </div>
        ));
    },
    kitchen: (title: string, message: string, subtext?: string) => {
        toast.custom((t) => (
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 flex items-center gap-4 shadow-2xl shadow-emerald-900/20 w-full max-w-sm cursor-pointer" onClick={() => toast.dismiss(t)}>
                <div className="bg-emerald-500/10 p-3 rounded-2xl animate-pulse">
                    <ChefHat className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                    <p className="text-[10px] uppercase font-black text-emerald-500 tracking-wider mb-0.5">{title}</p>
                    <p className="text-sm font-bold text-white leading-tight">
                        {message}
                    </p>
                    {subtext && <p className="text-[10px] font-bold text-zinc-500 mt-0.5">{subtext}</p>}
                </div>
            </div>
        ), { duration: 8000 });
    },
    newOrder: (tableNumber: number | string, onClick?: () => void) => {
        toast.custom((t) => (
            <div
                className="bg-zinc-900 border border-blue-500/30 rounded-3xl p-4 flex items-center gap-4 shadow-2xl shadow-blue-900/20 w-full max-w-sm cursor-pointer animate-bounce-in"
                onClick={() => {
                    toast.dismiss(t);
                    if (onClick) onClick();
                }}
            >
                <div className="bg-blue-500/20 p-3 rounded-2xl animate-pulse">
                    <div className="w-6 h-6 flex items-center justify-center font-black text-blue-400">
                        🔔
                    </div>
                </div>
                <div>
                    <p className="text-[10px] uppercase font-black text-blue-400 tracking-wider mb-0.5">¡NUEVO PEDIDO!</p>
                    <p className="text-xl font-black text-white leading-tight italic">
                        MESA {tableNumber}
                    </p>
                    <p className="text-[10px] font-bold text-zinc-500 mt-1">Pulsa para ver detalles</p>
                </div>
            </div>
        ), { duration: 10000 });
    }
};
