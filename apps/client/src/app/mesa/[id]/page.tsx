'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ShoppingCart, Plus, Loader2, Search, ArrowLeft, Utensils, CheckCircle, Trash2, Minus, X, Wallet, UserCircle, ShieldCheck, CreditCard, Smartphone, History as HistoryIcon, AlertCircle } from 'lucide-react';
import { Product, Customer } from '@/types/shared';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = [
    { id: 'entrante', name: 'Entrantes', icon: '🥗' },
    { id: 'primero', name: 'Primeros', icon: '🍜' },
    { id: 'segundo', name: 'Segundos', icon: '🥩' },
    { id: 'postre', name: 'Postres', icon: '🍰' },
    { id: 'bebida', name: 'Bebidas', icon: '🍷' },
];

const RESTAURANT_COORDS = { lat: 41.612207412731145, lng: 2.1421191183831474 };
const MAX_DISTANCE_METERS = 150; // Radio de seguridad generoso

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // Radio de la Tierra en metros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export default function MenuCliente({ params }: { params: { id: string } }) {
    const tableId = params.id;

    // Inicializar Supabase
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const [menu, setMenu] = useState<Product[]>([]);
    const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('primero');
    const [totalOrders, setTotalOrders] = useState(0);
    const [activeOrders, setActiveOrders] = useState<any[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Estados para "Te pago mañana"
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
    const [regForm, setRegForm] = useState({ name: '', email: '', phone: '', dni: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
    const [verificationInput, setVerificationInput] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [customerHistory, setCustomerHistory] = useState<any[]>([]);

    // Estados para "Ya tengo cuenta" (Login)
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [loginPhone, setLoginPhone] = useState('');

    // Estado para edición de perfil
    const [dniInput, setDniInput] = useState('');
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

    useEffect(() => {
        const savedCustomerId = localStorage.getItem('remei_customer_id');
        if (savedCustomerId) {
            fetchCustomer(savedCustomerId);
        }

        fetchMenu();
        fetchActiveOrders();

        // Suscripción a mis pedidos
        const channel = supabase
            .channel(`table-${tableId}-orders`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders', filter: `table_number=eq.${tableId}` },
                () => {
                    fetchActiveOrders();
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchCustomer = async (id: string) => {
        const { data } = await supabase.from('customers').select('*').eq('id', id).single();
        if (data) {
            setCustomer(data);
            fetchCustomerHistory(id);
        }
    };

    const fetchCustomerHistory = async (id: string) => {
        const { data } = await supabase
            .from('orders')
            .select('*')
            .eq('customer_id', id)
            .order('created_at', { ascending: false });
        if (data) setCustomerHistory(data);
    };

    const fetchActiveOrders = async () => {
        const { data } = await supabase
            .from('orders')
            .select('*')
            .eq('table_number', parseInt(tableId))
            .neq('status', 'served')
            .order('created_at', { ascending: false });
        if (data) setActiveOrders(data);
    };

    const fetchMenu = async () => {
        const { data } = await supabase
            .from('products')
            .select('*')
            .eq('is_available', true);
        if (data) setMenu(data);

        // Obtener total de pedidos activos
        const { count } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .in('status', ['pending', 'cooking']);

        setTotalOrders(count || 0);
        setLoading(false);
    };

    const handleUpdateDni = async () => {
        if (!customer || !dniInput) return;
        setIsUpdatingProfile(true);
        try {
            const { error } = await supabase
                .from('customers')
                .update({ dni: dniInput.toUpperCase() })
                .eq('id', customer.id);

            if (error) throw error;

            await fetchCustomer(customer.id);
            alert("✅ DNI actualizado correctamente. Ya puedes usar el crédito.");
        } catch (error: any) {
            alert(`Error al actualizar DNI: ${error.message}`);
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
                );
            }
            return [...prev, { product, qty: 1 }];
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    };

    const updateQty = (productId: string, delta: number) => {
        setCart(prev => {
            return prev.map(item => {
                if (item.product.id === productId) {
                    const newQty = Math.max(1, item.qty + delta);
                    return { ...item, qty: newQty };
                }
                return item;
            });
        });
    };

    const checkUserLocation = (): Promise<boolean> => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                alert("⚠️ Tu navegador no soporta geolocalización. Por seguridad, avisa al personal para completar tu pedido.");
                resolve(false);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const dist = calculateDistance(
                        position.coords.latitude,
                        position.coords.longitude,
                        RESTAURANT_COORDS.lat,
                        RESTAURANT_COORDS.lng
                    );

                    if (dist > MAX_DISTANCE_METERS) {
                        alert(`⚠️ SEGURIDAD: Estás a ${Math.round(dist)} metros. Debes estar en el restaurante para pedir o pagar. Si estás en la terraza y falla, asegúrate de tener el GPS activado.`);
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                },
                (error) => {
                    console.error("Geo Error:", error);
                    alert("⚠️ Por seguridad técnica de El Remei, activa tu ubicación (GPS) para validar que estás en el local.");
                    resolve(false);
                },
                { enableHighAccuracy: true, timeout: 8000 }
            );
        });
    };

    const handlePayDebt = async () => {
        if (!customer || Number(customer.current_debt) <= 0) return;

        setIsSubmitting(true);
        try {
            // Validar ubicación antes de pagar
            const isNear = await checkUserLocation();
            if (!isNear) {
                setIsSubmitting(false);
                return;
            }

            // --- SIMULACIÓN DE PASARELA (FICTICIO) ---
            // En producción aquí llamaríamos a la Edge Function
            console.log("Simulando pago de deuda...");

            // 1. Poner deuda a cero
            const { error: customerError } = await supabase
                .from('customers')
                .update({ current_debt: 0 })
                .eq('id', customer.id);

            if (customerError) throw customerError;

            // 2. Marcar pedidos a crédito como pagados
            await supabase
                .from('orders')
                .update({ is_paid: true })
                .eq('customer_id', customer.id)
                .eq('payment_method', 'credit');

            // 3. Redirigir a éxito
            window.location.href = `/mesa/${tableId}/success?type=debt`;

        } catch (error: any) {
            console.error("Error al pagar deuda:", error);
            alert(`Error al procesar el pago: ${error.message || "Avisa al personal"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCheckout = async (paymentMethod: 'cash' | 'card' | 'online' | 'credit' = 'cash') => {
        if (cart.length === 0) return;

        setIsSubmitting(true);

        // Validar ubicación antes de cualquier pedido
        const isNear = await checkUserLocation();
        if (!isNear) {
            setIsSubmitting(false);
            return;
        }

        const totalToPay = cart.reduce((acc, item) => acc + (Number(item.product.price) * item.qty), 0);

        if (paymentMethod === 'credit') {
            if (!customer) {
                setIsRegistrationOpen(true);
                return;
            }
            if (!customer.is_verified) {
                setIsVerifyModalOpen(true);
                return;
            }
            if (!customer.dni) {
                alert("⚠️ Para utilizar el crédito 'TE PAGO MAÑANA' es obligatorio completar tu DNI en tu perfil por normativa fiscal.");
                setIsProfileOpen(true);
                return;
            }
            if ((Number(customer.current_debt) + totalToPay) > Number(customer.credit_limit)) {
                alert(`⚠️ Has superado tu límite de crédito (${customer.credit_limit}€). Por favor, liquida algo de tu deuda antes de seguir.`);
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const flattenedItems = cart.flatMap(item =>
                Array(item.qty).fill(null).map(() => ({
                    ...item.product,
                    qty: 1
                }))
            );

            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    table_number: parseInt(tableId),
                    items: flattenedItems,
                    total_amount: totalToPay,
                    status: paymentMethod === 'online' ? 'cooking' : 'pending',
                    payment_method: paymentMethod,
                    customer_id: customer?.id || null,
                    is_paid: paymentMethod === 'online' || paymentMethod === 'credit' ? false : false // Lógica por defecto
                }])
                .select()
                .single();

            if (orderError) throw orderError;

            // Si es pago online, simulamos éxito y marcamos como pagado
            if (paymentMethod === 'online') {
                await supabase.from('orders').update({ is_paid: true }).eq('id', order.id);
                window.location.href = `/mesa/${tableId}/success`;
                return;
            }

            // Si es crédito, refrescar los datos del cliente para ver la nueva deuda
            if (paymentMethod === 'credit' && customer) {
                await fetchCustomer(customer.id);
            }

            setCart([]);
            setIsCartOpen(false);
            alert(paymentMethod === 'credit' ? "✅ ¡Pedido anotado en tu cuenta! Buen provecho." : "✅ ¡Pedido enviado a cocina!");
        } catch (error: any) {
            console.error("Error en checkout:", error);
            alert(`Error al procesar el pedido: ${error.message || "Avisa al personal"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRegisterCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const vCode = Math.floor(10000 + Math.random() * 90000).toString();

            const { data, error } = await supabase
                .from('customers')
                .insert([{
                    ...regForm,
                    verification_code: vCode,
                    is_verified: false
                }])
                .select()
                .single();

            if (error) throw error;

            // Enviar SMS a la cola para el puente Android
            await supabase.from('sms_outbox').insert([{
                phone_number: regForm.phone,
                message: `EL REMEI: Tu codigo de verificacion es ${vCode}. Introduce este codigo en la App para activar tu credito.`
            }]);

            localStorage.setItem('remei_customer_id', data.id);
            setCustomer(data);
            setIsRegistrationOpen(false);
            setIsVerifyModalOpen(true);
        } catch (error: any) {
            alert(`Error al registrar: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customer) return;
        setIsVerifying(true);
        try {
            if (verificationInput === customer.verification_code) {
                const { error } = await supabase
                    .from('customers')
                    .update({ is_verified: true })
                    .eq('id', customer.id);

                if (error) throw error;

                await fetchCustomer(customer.id);
                setIsVerifyModalOpen(false);
                setVerificationInput('');
                alert("✅ ¡Bienvenido de nuevo! Sesión activada.");
            } else {
                alert("❌ Código incorrecto. Revisa el SMS enviado a tu móvil.");
            }
        } catch (error: any) {
            alert(`Error de verificación: ${error.message}`);
        } finally {
            setIsVerifying(false);
        }
    };

    const handleLoginRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .eq('phone', loginPhone.trim())
                .single();

            if (error || !data) {
                alert("❌ No encontramos ninguna cuenta con ese teléfono. ¿Te has registrado antes?");
                return;
            }

            const vCode = Math.floor(10000 + Math.random() * 90000).toString();

            // Actualizar el código en el cliente existente
            await supabase
                .from('customers')
                .update({ verification_code: vCode })
                .eq('id', data.id);

            // Enviar SMS
            await supabase.from('sms_outbox').insert([{
                phone_number: data.phone,
                message: `EL REMEI: Tu codigo de acceso es ${vCode}. Introdúcelo para recuperar tu cuenta y crédito.`
            }]);

            localStorage.setItem('remei_customer_id', data.id);
            setCustomer(data);
            setIsLoginOpen(false);
            setIsVerifyModalOpen(true);
        } catch (error: any) {
            alert(`Error al acceder: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const total = cart.reduce((acc, item) => acc + (Number(item.product.price) * item.qty), 0);
    const cartCount = cart.reduce((acc, item) => acc + item.qty, 0);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Cargando Carta El Remei...</p>
        </div>
    );

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-[#FDFCFB] font-sans text-gray-900">
            {/* Modal de Registro para Crédito */}
            <AnimatePresence>
                {isRegistrationOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200]" onClick={() => setIsRegistrationOpen(false)} />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white rounded-[3rem] p-8 z-[201] shadow-2xl"
                        >
                            <div className="text-center mb-8">
                                <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                    <ShieldCheck className="w-10 h-10" />
                                </div>
                                <h2 className="text-2xl font-black italic">Únete al Club El Remei</h2>
                                <p className="text-sm text-gray-500 mt-2 font-medium">Regístrate una sola vez para usar la opción <br /><span className="text-orange-600 font-black italic">"TE PAGO MAÑANA"</span></p>
                            </div>

                            <form onSubmit={handleRegisterCustomer} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-4 mb-2 block">Nombre Completo</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Ej. Juan Pérez"
                                        className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-2 focus:ring-orange-500/20"
                                        value={regForm.name}
                                        onChange={e => setRegForm({ ...regForm, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-4 mb-2 block">Teléfono (Obligatorio)</label>
                                    <input
                                        required
                                        type="tel"
                                        placeholder="600 000 000"
                                        className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-2 focus:ring-orange-500/20"
                                        value={regForm.phone}
                                        onChange={e => setRegForm({ ...regForm, phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-4 mb-2 block">DNI / NIE (Obligatorio para crédito)</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="12345678X"
                                        className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-2 focus:ring-orange-500/20"
                                        value={regForm.dni}
                                        onChange={e => setRegForm({ ...regForm, dni: e.target.value.toUpperCase() })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-4 mb-2 block">Email</label>
                                    <input
                                        required
                                        type="email"
                                        placeholder="tu@email.com"
                                        className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-2 focus:ring-orange-500/20"
                                        value={regForm.email}
                                        onChange={e => setRegForm({ ...regForm, email: e.target.value })}
                                    />
                                </div>
                                <button
                                    disabled={isSubmitting}
                                    className="w-full bg-zinc-900 text-white py-5 rounded-2xl font-black italic text-lg shadow-xl active:scale-95 transition-all mt-4 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'REGISTRANDO...' : 'REGISTRARME Y SEGUIR'}
                                </button>

                                <div className="text-center mt-6">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsRegistrationOpen(false);
                                            setIsLoginOpen(true);
                                        }}
                                        className="text-[10px] font-black uppercase text-orange-600 hover:text-orange-700 tracking-widest"
                                    >
                                        ¿YA TIENES CUENTA? ENTRAR AQUÍ
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </>
                )}

                {isLoginOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200]" onClick={() => setIsLoginOpen(false)} />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white rounded-[3rem] p-8 z-[201] shadow-2xl"
                        >
                            <div className="text-center mb-8">
                                <div className="w-20 h-20 bg-zinc-100 text-zinc-900 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                    <UserCircle className="w-10 h-10" />
                                </div>
                                <h2 className="text-2xl font-black italic">Recuperar Cuenta</h2>
                                <p className="text-sm text-gray-500 mt-2 font-medium">Introduce tu teléfono para recibir un <br /><span className="text-zinc-900 font-bold">código de acceso gratuito</span></p>
                            </div>

                            <form onSubmit={handleLoginRequest} className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-4 mb-2 block">Teléfono Registrado</label>
                                    <input
                                        required
                                        type="tel"
                                        placeholder="600 000 000"
                                        className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-2 focus:ring-zinc-500/20"
                                        value={loginPhone}
                                        onChange={e => setLoginPhone(e.target.value)}
                                    />
                                </div>
                                <button
                                    disabled={isSubmitting}
                                    className="w-full bg-orange-600 text-white py-5 rounded-2xl font-black italic text-lg shadow-xl shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? 'BUSCANDO...' : 'RECIBIR CÓDIGO SMS'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsLoginOpen(false);
                                        setIsRegistrationOpen(true);
                                    }}
                                    className="w-full text-[10px] font-black uppercase text-gray-400 hover:text-zinc-900 tracking-widest text-center"
                                >
                                    NO TENGO CUENTA, IR A REGISTRO
                                </button>
                            </form>
                        </motion.div>
                    </>
                )}

                {isVerifyModalOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200]" onClick={() => setIsVerifyModalOpen(false)} />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white rounded-[3rem] p-8 z-[201] shadow-2xl"
                        >
                            <div className="text-center mb-8">
                                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                    <Smartphone className="w-10 h-10" />
                                </div>
                                <h2 className="text-2xl font-black italic">Verifica tu Móvil</h2>
                                <p className="text-sm text-gray-500 mt-2 font-medium">Hemos enviado un código de 5 cifras al <br /><span className="text-zinc-900 font-bold">{customer?.phone}</span></p>
                            </div>

                            <form onSubmit={handleVerifyCode} className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest text-center block mb-4">Código de Seguridad</label>
                                    <input
                                        required
                                        type="text"
                                        maxLength={5}
                                        placeholder="00000"
                                        className="w-full bg-gray-50 border-none rounded-2xl px-6 py-6 font-black text-4xl text-center tracking-[1rem] focus:ring-2 focus:ring-emerald-500/20"
                                        value={verificationInput}
                                        onChange={e => setVerificationInput(e.target.value.replace(/\D/g, ''))}
                                    />
                                </div>
                                <button
                                    disabled={isVerifying || verificationInput.length < 5}
                                    className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black italic text-lg shadow-xl shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {isVerifying ? 'VERIFICANDO...' : 'ACTIVAR MI CUENTA'}
                                </button>
                                <p className="text-[9px] text-gray-400 text-center font-bold uppercase tracking-widest">
                                    Si no recibes el SMS, avisa al personal de sala.
                                </p>
                            </form>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Modal de Carrito / Revisión */}
            <AnimatePresence>
                {isCartOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCartOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white rounded-t-[3rem] z-[101] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl"
                        >
                            <div className="p-8 pb-4 flex justify-between items-center border-b border-gray-50">
                                <div>
                                    <h2 className="text-2xl font-black italic">Mi Pedido</h2>
                                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Revisa antes de marchar</p>
                                </div>
                                <button onClick={() => setIsCartOpen(false)} className="bg-gray-100 p-3 rounded-2xl hover:bg-gray-200 transition-all">
                                    <X className="w-6 h-6 text-gray-400" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-4 no-scrollbar">
                                {cart.map((item) => (
                                    <div key={item.product.id} className="bg-gray-50 p-4 rounded-3xl border border-gray-100 flex items-center gap-4">
                                        <div className="w-16 h-16 bg-gray-200 rounded-2xl flex-shrink-0 overflow-hidden">
                                            {item.product.image_url && <img src={item.product.image_url} className="w-full h-full object-cover" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-black text-sm truncate uppercase">{item.product.name}</h3>
                                            <p className="text-orange-600 font-black text-xs">{(Number(item.product.price) * item.qty).toFixed(2)}€</p>
                                        </div>
                                        <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
                                            <button onClick={() => updateQty(item.product.id, -1)} className="w-8 h-8 flex items-center justify-center hover:text-orange-500 transition-colors">
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <span className="w-4 text-center text-sm font-black italic">{item.qty}</span>
                                            <button onClick={() => updateQty(item.product.id, 1)} className="w-8 h-8 flex items-center justify-center hover:text-orange-500 transition-colors">
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <button onClick={() => removeFromCart(item.product.id)} className="bg-red-50 p-3 rounded-2xl text-red-500 hover:bg-red-100 transition-all">
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                                {cart.length === 0 && (
                                    <div className="py-20 flex flex-col items-center opacity-20">
                                        <ShoppingCart className="w-16 h-16 mb-4" />
                                        <p className="font-black uppercase italic">¡Carrito vacío!</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-8 bg-white border-t border-gray-50 space-y-3">
                                <div className="flex justify-between items-center mb-4 px-2">
                                    <span className="text-gray-400 font-black uppercase text-xs">Total del pedido</span>
                                    <span className="text-3xl font-black text-orange-600 italic">
                                        {total.toFixed(2)}€
                                    </span>
                                </div>
                                <div className="space-y-4">
                                    {/* Botón Principal Destacado */}
                                    <button
                                        onClick={() => handleCheckout('online')}
                                        disabled={cart.length === 0 || isSubmitting}
                                        className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-200 disabled:text-gray-400 text-white py-5 rounded-3xl font-black text-lg italic transition-all active:scale-95 shadow-[0_10px_30px_rgba(234,88,12,0.3)] flex items-center justify-center gap-3 relative overflow-hidden"
                                    >
                                        <Smartphone className="w-6 h-6" />
                                        PAGAR DESDE LA APP
                                    </button>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => handleCheckout('cash')}
                                            disabled={cart.length === 0 || isSubmitting}
                                            className="bg-white border-2 border-emerald-500/20 text-emerald-700 py-4 rounded-3xl font-black text-xs italic transition-all active:scale-95 flex items-center justify-center gap-2 hover:bg-emerald-50"
                                        >
                                            <Utensils className="w-4 h-4 text-emerald-500" />
                                            EFECTIVO
                                        </button>
                                        <button
                                            onClick={() => handleCheckout('card')}
                                            disabled={cart.length === 0 || isSubmitting}
                                            className="bg-white border-2 border-blue-500/20 text-blue-700 py-4 rounded-3xl font-black text-xs italic transition-all active:scale-95 flex items-center justify-center gap-2 hover:bg-blue-50"
                                        >
                                            <CreditCard className="w-4 h-4 text-blue-500" />
                                            DATÁFONO
                                        </button>
                                    </div>

                                    <div className="pt-2 flex justify-center">
                                        <button
                                            onClick={() => handleCheckout('credit')}
                                            disabled={cart.length === 0 || isSubmitting}
                                            className="text-gray-400 hover:text-zinc-900 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors py-2"
                                        >
                                            <Wallet className="w-3 h-3" />
                                            Usar "Te pago mañana" (solo clientes autorizados)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}

                {/* Modal de Perfil de Usuario e Historial */}
                {isProfileOpen && customer && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200]" onClick={() => setIsProfileOpen(false)} />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-lg bg-gray-50 rounded-[3rem] p-0 z-[201] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                        >
                            {/* Header del Perfil */}
                            <div className="bg-zinc-900 p-8 text-white relative">
                                <button onClick={() => setIsProfileOpen(false)} className="absolute top-6 right-6 p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                                <div className="flex items-center gap-6 mb-8 mt-4">
                                    <div className="w-20 h-20 bg-orange-600 rounded-3xl flex items-center justify-center shadow-2xl">
                                        <UserCircle className="w-12 h-12" />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black italic">{customer.name}</h2>
                                        <div className="flex flex-col gap-2 mt-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`px-3 py-1 rounded-full text-[8px] font-black flex items-center gap-1 ${customer.is_verified ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-orange-500/20 text-orange-400 border border-orange-500/20'}`}>
                                                    {customer.is_verified ? <ShieldCheck className="w-2 h-2" /> : <AlertCircle className="w-2 h-2" />}
                                                    {customer.is_verified ? 'CLIENTE VERIFICADO' : 'PENDIENTE VERIFICACIÓN'}
                                                </div>
                                                <span className="text-gray-500 text-[9px] font-black uppercase">ID: {customer.id.slice(0, 8)}</span>
                                            </div>
                                            {customer.dni ? (
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">DNI: {customer.dni}</p>
                                            ) : (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <input
                                                        type="text"
                                                        placeholder="Añade tu DNI"
                                                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-[10px] font-bold text-white focus:ring-1 focus:ring-orange-500/50 w-32"
                                                        value={dniInput}
                                                        onChange={(e) => setDniInput(e.target.value.toUpperCase())}
                                                    />
                                                    <button
                                                        onClick={handleUpdateDni}
                                                        disabled={isUpdatingProfile}
                                                        className="bg-orange-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase hover:bg-orange-700 disabled:opacity-50"
                                                    >
                                                        GUARDAR
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
                                        <p className="text-[9px] font-black text-gray-500 uppercase mb-1 tracking-widest">Crédito Disponible</p>
                                        <p className="text-2xl font-black italic text-emerald-400">{Math.max(0, Number(customer.credit_limit) - Number(customer.current_debt)).toFixed(2)}€</p>
                                    </div>
                                    <div className="bg-white/10 p-4 rounded-3xl border border-white/10 shadow-inner">
                                        <p className="text-[9px] font-black text-orange-500 uppercase mb-1 tracking-widest text-right">Deuda Pendiente</p>
                                        <p className="text-2xl font-black italic text-white text-right">{Number(customer.current_debt).toFixed(2)}€</p>
                                    </div>
                                </div>

                                {/* Botón de Pago de Deuda */}
                                {Number(customer.current_debt) > 0 && (
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handlePayDebt}
                                        disabled={isSubmitting}
                                        className="w-full mt-6 bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-2xl font-black italic text-sm shadow-xl shadow-orange-900/20 flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <CreditCard className="w-5 h-5" />
                                        )}
                                        {isSubmitting ? 'PROCESANDO...' : `PAGAR MI DEUDA (${Number(customer.current_debt).toFixed(2)}€)`}
                                    </motion.button>
                                )}
                            </div>

                            {/* Historial de Gastos */}
                            <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
                                <h3 className="text-xs font-black text-zinc-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <HistoryIcon className="w-4 h-4 text-orange-600" />
                                    Historial de Gastos
                                </h3>

                                <div className="space-y-4">
                                    {customerHistory.length > 0 ? (
                                        customerHistory.map((order, idx) => (
                                            <div key={idx} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase">Mesa {order.table_number} • {new Date(order.created_at).toLocaleDateString()}</p>
                                                        <p className="text-xs font-black text-zinc-900 uppercase italic mt-1">{order.items.length} productos</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-black italic text-zinc-900">{Number(order.total_amount).toFixed(2)}€</p>
                                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${order.is_paid ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                                                            {order.is_paid ? 'Pagado' : 'A la libreta'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {order.items.slice(0, 3).map((item: any, i: number) => (
                                                        <span key={i} className="text-[9px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                                                            {item.name}
                                                        </span>
                                                    ))}
                                                    {order.items.length > 3 && (
                                                        <span className="text-[9px] font-bold text-gray-400 px-2 py-1 italic">+{order.items.length - 3} más</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-12 text-center opacity-40">
                                            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <HistoryIcon className="w-8 h-8" />
                                            </div>
                                            <p className="text-xs font-bold uppercase tracking-widest italic">Aún no hay historial registrado</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Mobile Header */}
            <header className="md:hidden bg-white px-6 py-4 flex flex-col sticky top-0 z-20 shadow-sm border-b border-gray-100 italic">
                {totalOrders > 10 && (
                    <div className="mb-3 bg-orange-50 border border-orange-100 p-2 rounded-lg flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-ping"></div>
                        <p className="text-[9px] font-black text-orange-700 uppercase">
                            Cocina Saturada: Espera ~25 min
                        </p>
                    </div>
                )}
                <div className="flex justify-between items-center w-full">
                    <Link href="/" className="p-2 -ml-2"><ArrowLeft className="w-6 h-6" /></Link>
                    <div className="flex flex-col items-center">
                        <h1 className="text-xl font-black text-orange-600">EL REMEI</h1>
                        <p className="text-[10px] uppercase font-black text-gray-400">MESA {tableId}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => customer ? setIsProfileOpen(true) : setIsLoginOpen(true)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${customer ? 'bg-zinc-900 text-white border-orange-500/30' : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200'}`}
                        >
                            <UserCircle className="w-6 h-6" />
                        </button>
                        <button onClick={() => setIsCartOpen(true)} className="relative">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                <ShoppingCart className="w-5 h-5 text-gray-700" />
                                {cartCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                                        {cartCount}
                                    </span>
                                )}
                            </div>
                        </button>
                    </div>
                </div>
            </header>

            {/* Sidebar Navigation */}
            <aside className="hidden md:flex w-72 bg-white flex-col sticky top-0 h-screen border-r border-gray-100 p-8 overflow-y-auto no-scrollbar">
                {totalOrders > 10 && (
                    <div className="mb-6 bg-orange-50 border border-orange-100 p-3 rounded-xl flex items-center gap-3 animate-pulse">
                        <div className="bg-orange-500 p-1.5 rounded-lg flex-shrink-0">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <p className="text-[10px] font-black text-orange-700 uppercase leading-tight">
                            Cocina Saturada: +10 en cola
                        </p>
                    </div>
                )}
                <div className="mb-12 flex flex-col gap-6 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white">
                            <Utensils className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tighter">EL REMEI</h1>
                            <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Restaurante Polígono</p>
                        </div>
                    </div>

                    <button
                        onClick={() => customer ? setIsProfileOpen(true) : setIsLoginOpen(true)}
                        className={`${customer ? 'bg-zinc-900 hover:bg-black' : 'bg-gray-50 hover:bg-gray-100'} p-4 rounded-3xl flex items-center gap-4 transition-all border border-black/5 shadow-sm group`}
                    >
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${customer ? 'bg-orange-600/20 text-orange-500' : 'bg-gray-200 text-gray-400'}`}>
                            <UserCircle className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <p className={`text-[8px] font-black uppercase tracking-widest ${customer ? 'text-gray-500' : 'text-gray-400'}`}>
                                {customer ? 'Panel de Usuario' : 'Mi Cuenta'}
                            </p>
                            <p className={`text-xs font-black italic truncate max-w-[120px] ${customer ? 'text-white' : 'text-gray-500'}`}>
                                {customer ? customer.name.split(' ')[0].toUpperCase() : 'ENTRAR / REGISTRO'}
                            </p>
                        </div>
                    </button>
                </div>

                <div className="space-y-4 flex-shrink-0">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Categorías</p>
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all duration-300 ${activeCategory === cat.id ? 'bg-orange-50 text-orange-600 shadow-sm shadow-orange-100' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <span className="text-xl">{cat.icon}</span>
                            {cat.name}
                        </button>
                    ))}
                </div>

                <div className="mt-8 flex-shrink-0">
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-4 tracking-widest">Estado de mi Mesa</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                        {activeOrders.length > 0 ? (
                            activeOrders.flatMap(o => o.items.map((item: any, i: number) => {
                                const isDrink = item.category?.toLowerCase() === 'bebida';
                                const isReady = isDrink ? o.drinks_served : item.is_served;

                                return (
                                    <div key={i} className={`flex items-center justify-between text-[11px] p-2 rounded-lg border ${isReady ? 'bg-emerald-50/50 border-emerald-100' : 'bg-gray-50 border-gray-100'}`}>
                                        <span className={`font-bold transition-all ${isReady ? 'text-emerald-700 opacity-60' : 'text-gray-600'}`}>{item.name}</span>
                                        {isReady ? (
                                            <span className="text-emerald-600 font-black flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" />
                                                SERVIDO
                                            </span>
                                        ) : (
                                            <span className="text-orange-500 font-black animate-pulse">
                                                {isDrink ? 'BARRA' : 'COCINANDO'}
                                            </span>
                                        )}
                                    </div>
                                );
                            }))
                        ) : (
                            <p className="text-[10px] text-gray-400 italic">No hay platos marchando</p>
                        )}
                    </div>
                </div>
                <div className="mt-8 p-6 bg-zinc-900 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group flex-shrink-0 min-h-[180px]">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                        <Wallet className="w-12 h-12" />
                    </div>
                    <p className="text-[10px] font-black uppercase text-orange-500 mb-4 tracking-[0.2em]">Mi Crédito El Remei</p>
                    {customer ? (
                        <div className="space-y-4">
                            <div>
                                <p className="text-2xl font-black italic">{Number(customer.current_debt).toFixed(2)}€</p>
                                <p className="text-[9px] text-gray-400 font-black uppercase">Deuda acumulada</p>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-orange-500 transition-all duration-1000"
                                    style={{ width: `${Math.min(100, (Number(customer.current_debt) / Number(customer.credit_limit)) * 100)}%` }}
                                />
                            </div>
                            <div className="flex justify-between items-center text-[9px] font-black uppercase text-gray-400">
                                <span>Límite: {customer.credit_limit}€</span>
                                <span className={Number(customer.current_debt) > Number(customer.credit_limit) * 0.8 ? 'text-red-400' : 'text-emerald-400'}>
                                    {Math.max(0, Number(customer.credit_limit) - Number(customer.current_debt)).toFixed(2)}€ disp.
                                </span>
                            </div>
                            {Number(customer.current_debt) > 0 && (
                                <button
                                    disabled={isSubmitting}
                                    onClick={handlePayDebt}
                                    className="w-full mt-2 bg-emerald-600/20 text-emerald-400 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-emerald-600/30 transition-all border border-emerald-500/20 disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'PAGAR DEUDA ONLINE'}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-[11px] font-medium text-gray-300 leading-relaxed italic">"Paga mañana tus consumos y lleva el control de tu cuenta."</p>
                            <button
                                onClick={() => setIsRegistrationOpen(true)}
                                className="w-full bg-orange-600 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-orange-500 transition-all shadow-lg shadow-orange-950"
                            >
                                ACTIVAR CRÉDITO
                            </button>
                        </div>
                    )}
                </div>

                <div className="mt-12 p-6 bg-gray-50 rounded-3xl border border-gray-100 mb-12">
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">Ubicación</p>
                    <p className="text-sm font-bold text-gray-700">Mesa {tableId}</p>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col">
                {/* Top Search Bar (Desktop) */}
                <div className="hidden md:flex px-12 py-8 justify-between items-center">
                    <div className="relative w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                        <input
                            type="text"
                            placeholder="Buscar plato..."
                            className="w-full pl-12 pr-4 py-3 bg-gray-100/50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 text-sm font-medium"
                        />
                    </div>
                </div>

                {/* Mobile Category Scroll */}
                <div className="md:hidden flex overflow-x-auto px-4 py-4 gap-2 no-scrollbar bg-white shadow-sm sticky top-[72px] z-10 transition-all">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`whitespace-nowrap px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeCategory === cat.id ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'bg-gray-100 text-gray-500'}`}
                        >
                            {cat.icon} {cat.name}
                        </button>
                    ))}
                </div>

                {/* Mobile Active Orders Section */}
                {activeOrders.length > 0 && (
                    <div className="md:hidden px-4 mt-4">
                        <div className="bg-zinc-900 rounded-[2rem] p-5 shadow-xl border border-white/5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-white font-black italic uppercase text-xs tracking-widest flex items-center gap-2">
                                    <div className="w-1.5 h-4 bg-orange-500 rounded-full"></div>
                                    Mis Pedidos Actuales
                                </h3>
                                <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-black uppercase">En curso</span>
                            </div>
                            <div className="space-y-3 max-h-48 overflow-y-auto no-scrollbar">
                                {activeOrders.flatMap((o, oi) => o.items.map((item: any, ii: number) => {
                                    const isDrink = item.category?.toLowerCase() === 'bebida';
                                    const isReady = isDrink ? o.drinks_served : item.is_served;

                                    return (
                                        <div key={`${oi}-${ii}`} className={`flex justify-between items-center p-3 rounded-2xl border ${isReady ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/5 border-white/5'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-orange-500 animate-pulse'}`}></div>
                                                <span className={`text-[11px] font-bold ${isReady ? 'text-emerald-400' : 'text-gray-300'}`}>{item.name}</span>
                                            </div>
                                            <span className={`text-[9px] font-black uppercase tracking-tighter ${isReady ? 'text-emerald-500' : 'text-orange-500/60'}`}>
                                                {isReady ? 'Servido' : (isDrink ? 'Barra' : 'Cocina')}
                                            </span>
                                        </div>
                                    );
                                }))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Grid of Dishes */}
                <div className="flex-1 px-4 md:px-12 py-6 pb-40">
                    <div className="flex justify-between items-end mb-8">
                        <h2 className="text-3xl md:text-4xl font-black text-gray-900 capitalize">
                            {CATEGORIES.find(c => c.id === activeCategory)?.name}
                        </h2>
                        <p className="text-sm text-gray-400 font-bold">
                            {menu.filter(p => p.category === activeCategory).length} especialidades
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {menu.filter(p => p.category === activeCategory).length > 0 ? (
                            menu.filter(p => p.category === activeCategory).map(product => (
                                <div
                                    key={product.id}
                                    className="group bg-white rounded-[2.5rem] p-4 shadow-sm hover:shadow-2xl hover:shadow-orange-100 transition-all duration-500 border border-gray-100/50 flex flex-col cursor-pointer active:scale-95"
                                    onClick={() => addToCart(product)}
                                >
                                    <div className="aspect-[4/3] w-full bg-gray-100 rounded-[2rem] mb-6 overflow-hidden relative">
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center opacity-10">
                                                <Utensils className="w-20 h-20" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md w-12 h-12 rounded-2xl flex items-center justify-center text-orange-500 shadow-xl group-hover:bg-orange-500 group-hover:text-white transition-all duration-300">
                                            <Plus className="w-6 h-6" />
                                        </div>
                                    </div>
                                    <div className="px-2 pb-2">
                                        <div className="flex justify-between items-start mb-2 gap-2">
                                            <h3 className="font-black text-lg text-gray-800 leading-tight">{product.name}</h3>
                                            <span className="text-orange-600 font-black text-lg">{Number(product.price).toFixed(2)}€</span>
                                        </div>
                                        <p className="text-xs text-gray-400 font-medium leading-relaxed">{product.description || "Deliciosa especialidad de El Remei preparada con ingredientes frescos del día."}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-20 flex flex-col items-center opacity-20">
                                <Utensils className="w-20 h-20 mb-4" />
                                <p className="text-2xl font-black uppercase italic text-center px-4">Esta categoría está vacía por ahora</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Floating Action Button / Cart */}
            {cart.length > 0 && (
                <div id="checkout-action" className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-lg z-30">
                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white p-2 rounded-[2rem] shadow-2xl flex items-center justify-between group transition-all transform hover:scale-[1.02] active:scale-95 border-b-4 border-orange-800"
                    >
                        <div className="flex items-center gap-4 ml-4">
                            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                <ShoppingCart className="w-7 h-7" />
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] font-black opacity-80 uppercase tracking-widest">Revisar Pedido</p>
                                <p className="text-xl font-black italic">({cartCount} items)</p>
                            </div>
                        </div>
                        <div className="bg-orange-500 px-8 py-5 rounded-[1.8rem] text-2xl font-black shadow-lg">
                            {total.toFixed(2)}€
                        </div>
                    </button>
                    <button onClick={() => setCart([])} className="absolute -top-3 -right-3 w-8 h-8 bg-zinc-900 text-white rounded-full flex items-center justify-center shadow-xl border border-white/10 text-xs font-black">X</button>
                </div>
            )}
        </div>
    );
}
