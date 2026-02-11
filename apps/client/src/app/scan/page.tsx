'use client';

import { useState, useEffect, useRef } from 'react';
import { QrCode, Camera, Utensils, CreditCard, ChevronRight, X, Loader2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useRouter } from 'next/navigation';

export default function ScanPage() {
    const [showScanner, setShowScanner] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const router = useRouter();

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
            } catch (err) {
                console.error("Error stopping scanner:", err);
            }
            scannerRef.current = null;
        }
    };

    const handleClose = async () => {
        await stopScanner();
        setShowScanner(false);
        setError(null);
    };

    useEffect(() => {
        if (!showScanner) return;

        setIsLoading(true);
        setError(null);

        const startScanner = async () => {
            try {
                // Pequeño retardo para asegurar que el DOM está listo
                await new Promise(resolve => setTimeout(resolve, 150));

                const html5QrCode = new Html5Qrcode("reader");
                scannerRef.current = html5QrCode;

                await html5QrCode.start(
                    { facingMode: "environment" }, // Solo cámara trasera
                    {
                        fps: 15,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0
                    },
                    (decodedText) => {
                        console.log(`QR escaneado: ${decodedText}`);

                        // Detener el escáner antes de navegar
                        stopScanner();

                        // Intentar extraer el ID de la mesa
                        if (decodedText.includes('/mesa/')) {
                            const parts = decodedText.split('/mesa/')[1].split('/');
                            const mesaId = parts[0];
                            router.push(`/mesa/${mesaId}`);
                        } else if (!isNaN(Number(decodedText))) {
                            router.push(`/mesa/${decodedText}`);
                        } else {
                            alert("QR no reconocido. Asegúrate de escanear un código de mesa de El Remei.");
                            setShowScanner(false);
                        }
                    },
                    () => {
                        // Ignorar errores de escaneo (cuando no detecta QR)
                    }
                );

                setIsLoading(false);
            } catch (err: any) {
                console.error("Error iniciando cámara:", err);
                setIsLoading(false);
                if (err.toString().includes("Permission")) {
                    setError("Permite el acceso a la cámara para escanear");
                } else {
                    setError("No se pudo iniciar la cámara");
                }
            }
        };

        startScanner();

        return () => {
            stopScanner();
        };
    }, [showScanner, router]);

    return (
        <div className="fixed inset-0 bg-white flex flex-col items-center justify-between overflow-hidden italic">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full bg-orange-500 rounded-b-[3rem] -z-10 shadow-2xl transition-all duration-500"
                style={{ height: showScanner ? '15%' : '50%' }}></div>

            {/* Header Section */}
            <div className={`pt-12 flex flex-col items-center gap-4 text-white transition-all duration-300 ${showScanner ? 'scale-75 opacity-0 h-0 hidden' : 'opacity-100'}`}>
                <div className="w-20 h-20 bg-white/20 rounded-[2rem] flex items-center justify-center backdrop-blur-xl border border-white/30 shadow-xl">
                    <Utensils className="w-10 h-10 text-white" />
                </div>
                <div className="text-center">
                    <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">PEDIR Y PAGAR</h1>
                    <p className="text-orange-100 text-sm font-bold opacity-90 mt-2 tracking-widest">EL REMEI • SGI POLÍGONO</p>
                </div>
            </div>

            {/* Main Interaction Area */}
            <div className="flex-1 flex flex-col items-center justify-center w-full px-8 gap-12">
                {!showScanner ? (
                    <div
                        onClick={() => setShowScanner(true)}
                        className="relative w-full max-w-[280px] aspect-square bg-white rounded-[3rem] shadow-[0_20px_50px_rgba(249,115,22,0.2)] border-2 border-orange-500 flex flex-col items-center justify-center gap-6 cursor-pointer active:scale-95 transition-all duration-300 group"
                    >
                        <div className="relative">
                            <div className="absolute -inset-4 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all opacity-0 group-hover:opacity-100"></div>
                            <QrCode className="w-32 h-32 text-orange-500 relative z-10" />
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-lg font-black text-gray-900 uppercase tracking-tight">Escanear Mesa</span>
                            <div className="flex items-center gap-1 text-orange-500">
                                <span className="text-[10px] font-black uppercase tracking-widest animate-pulse font-sans">Pulsa para empezar</span>
                                <ChevronRight className="w-3 h-3" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-full max-w-[400px] flex flex-col gap-4 animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-2 px-2">
                            <h2 className="text-xl font-black text-orange-600 uppercase">
                                {isLoading ? 'Iniciando cámara...' : 'Escaneando...'}
                            </h2>
                            <button
                                onClick={handleClose}
                                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                            >
                                <X className="w-6 h-6 text-gray-600" />
                            </button>
                        </div>

                        {/* Contenedor de video limpio - sin widgets */}
                        <div className="relative overflow-hidden rounded-3xl border-4 border-orange-500 shadow-2xl bg-black min-h-[300px]">
                            {isLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                                    <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
                                </div>
                            )}
                            {error && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-10 p-6 text-center">
                                    <Camera className="w-16 h-16 text-orange-500 mb-4" />
                                    <p className="text-white font-bold text-lg">{error}</p>
                                    <button
                                        onClick={() => setShowScanner(true)}
                                        className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-full font-bold text-sm"
                                    >
                                        Reintentar
                                    </button>
                                </div>
                            )}
                            <div id="reader" className="w-full"></div>
                        </div>

                        <p className="text-center text-[10px] text-gray-400 font-bold uppercase mt-2 tracking-widest">
                            Enfoca el código QR de la mesa
                        </p>
                    </div>
                )}

                {/* Informational Steps */}
                <div className={`w-full flex justify-around items-center px-4 transition-all duration-500 ${showScanner ? 'opacity-30 scale-90' : 'opacity-100'}`}>
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center border border-orange-100">
                            <Camera className="w-6 h-6 text-orange-500" />
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase">Escanea</span>
                    </div>
                    <div className="w-8 h-[2px] bg-orange-100 rounded-full"></div>
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center border border-orange-100">
                            <Utensils className="w-6 h-6 text-orange-500" />
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase">Pide</span>
                    </div>
                    <div className="w-8 h-[2px] bg-orange-100 rounded-full"></div>
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center border border-orange-100">
                            <CreditCard className="w-6 h-6 text-orange-500" />
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase">Paga</span>
                    </div>
                </div>
            </div>

            {/* Bottom Branding */}
            <div className="pb-10 flex flex-col items-center gap-2">
                <p className="text-gray-300 text-[10px] tracking-[0.3em] font-black uppercase font-sans">Restaurante El Remei</p>
                <div className="h-1 w-12 bg-gray-100 rounded-full"></div>
            </div>
        </div>
    );
}
