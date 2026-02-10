'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ShoppingCart, Plus, Loader2, Search, ArrowLeft, Utensils, CheckCircle, Trash2, Minus, X, Wallet, UserCircle, ShieldCheck, CreditCard, Smartphone, History as HistoryIcon, AlertCircle, Star, RefreshCw, Coffee, Beer, Pizza, Heart, Flame, Truck, PartyPopper, Wine, CakeSlice } from 'lucide-react';
import { toast, ToastOptions } from 'react-toastify';
import confetti from 'canvas-confetti';
import { Product, Customer } from '@/types/shared';
import { getProductImage } from '@/utils/productImages';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = [
    { id: 'entrante', name: 'Entrantes', icon: '🥗' },
    { id: 'primero', name: 'Primeros', icon: '🍜' },
    { id: 'segundo', name: 'Segundos', icon: '🥩' },
    { id: 'postre', name: 'Postres', icon: '🍰' },
    { id: 'bebida', name: 'Bebidas', icon: '🍷' },
    { id: 'cafe', name: 'Cafés', icon: '☕' },
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

// Función para calcular el hash encadenado de VeriFactu - NEW
async function generateVeriFactuHash(currentData: any, previousHash: string = '') {
    const dataString = JSON.stringify(currentData) + previousHash;
    const msgUint8 = new TextEncoder().encode(dataString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

export default function MenuCliente({ params }: { params: { id: string } }) {
    const router = useRouter();
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
    const [recommendedPlates, setRecommendedPlates] = useState<Product[]>([]);

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
    const [isRatingOpen, setIsRatingOpen] = useState(false);
    const [rating, setRating] = useState(0);
    const [isTipPhase, setIsTipPhase] = useState(false);
    const [selectedTip, setSelectedTip] = useState<number | null>(null);
    const [customTip, setCustomTip] = useState('');
    const [hasTipped, setHasTipped] = useState(false);

    // Estados para "Ya tengo cuenta" (Login)
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [loginPhone, setLoginPhone] = useState('');

    // Estado para edición de perfil
    const [dniInput, setDniInput] = useState('');
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

    // Filtros de menú
    const [activeFilters, setActiveFilters] = useState({
        vegan: false,
        glutenFree: false,
        favorites: false
    });
    const [searchQuery, setSearchQuery] = useState('');

    // --- MULTI-IDIOMA ---
    const [language, setLanguage] = useState<'es' | 'ca' | 'en'>('es');

    const TRANSLATIONS = {
        es: {
            searchPlaceholder: "Buscar plato...",
            favorites: "Favoritos",
            vegan: "Vegano",
            glutenFree: "Sin Gluten",
            chefSuggestions: "Sugerencias del Chef",
            basedOn: "Basado en tus gustos y el día de hoy",
            add: "Añadir",
            added: "Añadido",
            viewOrder: "Ver pedido",
            pay: "Pagar",
            total: "Total",
            emptyCart: "Tu pedido está vacío",
            orderSent: "¡Pedido enviado a cocina!",
            payLater: "Te pago mañana",
            payNow: "Pagar ahora",
            login: "Entrar / Registrarse",
            myAccount: "Mi Cuenta",
            welcome: "Bienvenido",
            categories: {
                entrante: "Entrantes",
                primero: "Primeros",
                segundo: "Segundos",
                postre: "Postres",
                bebida: "Bebidas",
                cafe: "Cafés"
            },
            status: {
                pending: "Pendiente",
                cooking: "Cocinando",
                ready: "Listo",
                served: "Servido"
            },
            myCurrentOrders: "Mis Pedidos Actuales",
            inProgress: "En curso",
            emptyCategory: "Esta categoría está vacía por ahora",
            specialties: "especialidades",
            myCredit: "Mi Crédito El Remei",
            accumulatedDebt: "Deuda acumulada",
            limit: "Límite",
            available: "disp.",
            payOnline: "PAGAR DEUDA ONLINE",
            activateCredit: "ACTIVAR CRÉDITO",
            payLaterPromo: "\"Paga mañana tus consumos y lleva el control de tu cuenta.\"",
            reviewOrder: "Revisar Pedido",
            location: "Ubicación",
            table: "Mesa",
            rating: {
                title: "¿QUÉ TAL LA COMIDA?",
                subtitle: "Tu opinión nos ayuda a mejorar",
                send: "ENVIAR VALORACIÓN",
                later: "Quizás más tarde",
                thanks: "✨ ¡Gracias por tu valoración!",
                tipTitle: "¿QUIERES TENER UN DETALLE CON EL EQUIPO?",
                tipSubtitle: "Tu gesto marca la diferencia",
                options: {
                    coffee: "Café",
                    beer: "Caña",
                    dinner: "Cena",
                    custom: "Libre"
                }
            },
            cart: {
                title: "Mi Pedido",
                subtitle: "Revisa antes de marchar",
                empty: "¡Carrito vacío!",
                total: "Total del pedido",
                payApp: "PAGAR DESDE LA APP",
                cash: "EFECTIVO",
                card: "DATÁFONO",
                payLater: "Usar \"Te pago mañana\" (solo clientes autorizados)"
            },
            profile: {
                verified: "CLIENTE VERIFICADO",
                pending: "PENDIENTE VERIFICACIÓN",
                id: "ID",
                dni: "DNI",
                addDni: "Añade tu DNI",
                save: "GUARDAR",
                availableCredit: "Crédito Disponible",
                points: "Puntos El Remei",
                currentLevel: "Nivel Actual",
                nextLevel: "Próximo Nivel",
                pointsNeeded: "Te faltan {points} puntos para el nivel {level}",
                processing: "PROCESANDO...",
                payDebt: "PAGAR MI DEUDA",
                history: "Historial de Gastos",
                products: "productos",
                paid: "Pagado",
                onTab: "A la libreta",
                more: "más",
                pointsEarned: "Puntos",
                orderAgain: "Pedir de nuevo",
                orderRepeated: "¡Pedido repetido añadido al carrito!",
                noHistory: "Aún no hay historial registrado"
            },
            kitchenSaturated: "Cocina Saturada: Espera ~{min} min",
            register: {
                title: "Únete al Club El Remei",
                subtitle: "Regístrate una sola vez para usar la opción \"TE PAGO MAÑANA\"",
                name: "Nombre Completo",
                phone: "Teléfono (Obligatorio)",
                dni: "DNI / NIE (Obligatorio para crédito)",
                email: "Email",
                registering: "REGISTRANDO...",
                register: "REGISTRARME Y SEGUIR",
                alreadyAccount: "¿YA TIENES CUENTA? ENTRAR AQUÍ"
            },
            loginModal: {
                title: "Recuperar Cuenta",
                subtitle: "Introduce tu teléfono para recibir un código de acceso gratuito",
                phone: "Teléfono Registrado",
                searching: "BUSCANDO...",
                getCode: "RECIBIR CÓDIGO SMS",
                noAccount: "NO TENGO CUENTA, IR A REGISTRO"
            },
            verify: {
                title: "Verifica tu Móvil",
                subtitle: "Hemos enviado un código de 5 cifras al",
                code: "Código de Seguridad",
                verifying: "VERIFICANDO...",
                activate: "ACTIVAR MI CUENTA",
                help: "Si no recibes el SMS, avisa al personal de sala."
            },
            notifications: {
                cooking: {
                    drink: { title: "Marchando bebida", msg: "Tu {item} está en marcha." },
                    coffee: { title: "Cafetería", msg: "Barista en acción con tu {item}." },
                    grill: { title: "En el fuego 🔥", msg: "Tu {item} está en la parrilla." },
                    sweet: { title: "Momento Dulce 🍰", msg: "Preparando un momento dulce: {item}." },
                    default: { title: "Preparando...", msg: "El chef está preparando tu {item}." }
                },
                ready: { title: "¡Listo para servir! ✅", msg: "Tu {item} ya está terminado." },
                update: { title: "Actualización", msg: "Estado: {status}" },
                delivering: { title: "¡En Camino!", msg: "Tu pedido está saliendo de cocina 🚚" },
                served_msg: { title: "¡A Disfrutar!", msg: "Gracias por tu visita 👋" }
            },
            alerts: {
                dniRequired: "⚠️ Para utilizar el crédito 'TE PAGO MAÑANA' es obligatorio completar tu DNI en tu perfil por normativa fiscal.",
                creditLimitExceeded: "⚠️ Has superado tu límite de crédito ({limit}€). Por favor, liquida algo de tu deuda antes de seguir.",
                orderOnTab: "✅ ¡Pedido anotado en tu cuenta! Buen provecho.",
                orderSent: "✅ ¡Pedido enviado a cocina!",
                errorCheckout: "Error al procesar el pedido: {error}"
            }
        },
        ca: {
            searchPlaceholder: "Cercar plat...",
            favorites: "Preferits",
            vegan: "Vegà",
            glutenFree: "Sense Gluten",
            chefSuggestions: "Suggeriments del Chef",
            basedOn: "Basat en els teus gustos i el dia d'avui",
            add: "Afegir",
            added: "Afegit",
            viewOrder: "Veure comanda",
            pay: "Pagar",
            total: "Total",
            emptyCart: "La teva comanda està buida",
            orderSent: "Comanda enviada a cuina!",
            payLater: "Et pago demà",
            payNow: "Pagar ara",
            login: "Entrar / Registrar-se",
            myAccount: "El meu Compte",
            welcome: "Benvingut",
            categories: {
                entrante: "Entrants",
                primero: "Primers",
                segundo: "Segons",
                postre: "Postres",
                bebida: "Begudes",
                cafe: "Cafès"
            },
            status: {
                pending: "Pendent",
                cooking: "Cuinant",
                ready: "Llest",
                served: "Servit"
            },
            myCurrentOrders: "Les Meves Comandes",
            inProgress: "En curs",
            emptyCategory: "Aquesta categoria està buida per ara",
            specialties: "especialitats",
            myCredit: "El Meu Crèdit El Remei",
            accumulatedDebt: "Deute acumulat",
            limit: "Límit",
            available: "disp.",
            payOnline: "PAGAR DEUTE ONLINE",
            activateCredit: "ACTIVAR CRÈDIT",
            payLaterPromo: "\"Paga demà els teus consums i porta el control del teu compte.\"",
            reviewOrder: "Revisar Comanda",
            location: "Ubicació",
            table: "Taula",
            rating: {
                title: "QUÈ TAL EL MENJAR?",
                subtitle: "La teva opinió ens ajuda a millorar",
                send: "ENVIAR VALORACIÓ",
                later: "Potser més tard",
                thanks: "✨ Gràcies per la teva valoració!",
                tipTitle: "VOLS TENIR UN DETALL AMB L'EQUIP?",
                tipSubtitle: "El teu gest marca la diferència",
                options: {
                    coffee: "Cafè",
                    beer: "Canya",
                    dinner: "Sopar",
                    custom: "Lliure"
                }
            },
            cart: {
                title: "La Meva Comanda",
                subtitle: "Revisa abans de marxar",
                empty: "Carret buit!",
                total: "Total de la comanda",
                payApp: "PAGAR DES DE L'APP",
                cash: "EFECTIU",
                card: "DATÀFON",
                payLater: "Fer servir \"Et pago demà\" (només clients autoritzats)"
            },
            profile: {
                verified: "CLIENT VERIFICAT",
                pending: "PENDENT VERIFICACIÓ",
                id: "ID",
                dni: "DNI",
                addDni: "Afegeix el teu DNI",
                save: "GUARDAR",
                availableCredit: "Crèdit Disponible",
                points: "Punts El Remei",
                currentLevel: "Nivell Actual",
                nextLevel: "Pròxim Nivell",
                pointsNeeded: "Et falten {points} punts per al nivell {level}",
                processing: "PROCESSANT...",
                payDebt: "PAGAR EL MEU DEUTE",
                history: "Historial de Despeses",
                products: "productes",
                paid: "Pagat",
                onTab: "A la llibreta",
                more: "més",
                pointsEarned: "Punts",
                orderAgain: "Demanar de nou",
                orderRepeated: "Comanda repetida afegida al carret!",
                noHistory: "Encara no hi ha historial registrat"
            },
            kitchenSaturated: "Cuina Saturada: Espera ~{min} min",
            register: {
                title: "Uneix-te al Club El Remei",
                subtitle: "Registra't una sola vegada per utilitzar l'opció \"ET PAGO DEMÀ\"",
                name: "Nom Complet",
                phone: "Telèfon (Obligatori)",
                dni: "DNI / NIE (Obligatori per a crèdit)",
                email: "Email",
                registering: "REGISTRANT...",
                register: "REGISTRAR-ME I SEGUIR",
                alreadyAccount: "JA TENS COMPTE? ENTRAR AQUÍ"
            },
            loginModal: {
                title: "Recuperar Compte",
                subtitle: "Introdueix el teu telèfon per rebre un codi d'accés gratuït",
                phone: "Telèfon Registrat",
                searching: "CERCANT...",
                getCode: "REBRE CODI SMS",
                noAccount: "NO TINC COMPTE, ANAR A REGISTRE"
            },
            verify: {
                title: "Verifica el teu Mòbil",
                subtitle: "Hem enviat un codi de 5 xifres al",
                code: "Codi de Seguretat",
                verifying: "VERIFICANT...",
                activate: "ACTIVAR EL MEU COMPTE",
                help: "Si no reps l'SMS, avisa al personal de sala."
            },
            notifications: {
                cooking: {
                    drink: { title: "Marxant beguda", msg: "El teu {item} està en marxa." },
                    coffee: { title: "Cafeteria", msg: "Barista en acció amb el teu {item}." },
                    grill: { title: "Al foc 🔥", msg: "El teu {item} està a la graella." },
                    sweet: { title: "Moment Dolç 🍰", msg: "Preparant un moment dolç: {item}." },
                    default: { title: "Preparant...", msg: "El xef està preparant el teu {item}." }
                },
                ready: { title: "Llest per servir! ✅", msg: "El teu {item} ja està acabat." },
                update: { title: "Actualització", msg: "Estat: {status}" },
                delivering: { title: "En Camí!", msg: "La teva comanda està sortint de cuina 🚚" },
                served_msg: { title: "A Gaudir!", msg: "Gràcies per la teva visita 👋" }
            },
            alerts: {
                dniRequired: "⚠️ Per utilitzar el crèdit 'ET PAGO DEMÀ' és obligatori completar el teu DNI al teu perfil per normativa fiscal.",
                creditLimitExceeded: "⚠️ Has superat el teu límit de crèdit ({limit}€). Si us plau, liquida una part del teu deute abans de continuar.",
                orderOnTab: "✅ Comanda anotada al teu compte! Bon profit.",
                orderSent: "✅ Comanda enviada a cuina!",
                errorCheckout: "Error en processar la comanda: {error}"
            }
        },
        en: {
            searchPlaceholder: "Search dish...",
            favorites: "Favorites",
            vegan: "Vegan",
            glutenFree: "Gluten Free",
            chefSuggestions: "Chef's Suggestions",
            basedOn: "Based on your tastes and today",
            add: "Add",
            added: "Added",
            viewOrder: "View Order",
            pay: "Pay",
            total: "Total",
            emptyCart: "Your order is empty",
            orderSent: "Order sent to kitchen!",
            payLater: "Pay Later",
            payNow: "Pay Now",
            login: "Login / Register",
            myAccount: "My Account",
            welcome: "Welcome",
            categories: {
                entrante: "Starters",
                primero: "First Course",
                segundo: "Main Course",
                postre: "Desserts",
                bebida: "Drinks",
                cafe: "Coffee"
            },
            status: {
                pending: "Pending",
                cooking: "Cooking",
                ready: "Ready",
                served: "Served"
            },
            myCurrentOrders: "My Current Orders",
            inProgress: "In Progress",
            emptyCategory: "This category is empty for now",
            specialties: "specialties",
            myCredit: "My Credit El Remei",
            accumulatedDebt: "Accumulated Debt",
            limit: "Limit",
            available: "avail.",
            payOnline: "PAY DEBT ONLINE",
            activateCredit: "ACTIVATE CREDIT",
            payLaterPromo: "\"Pay tomorrow for your meals and keep track of your account.\"",
            reviewOrder: "Review Order",
            location: "Location",
            table: "Table",
            rating: {
                title: "HOW WAS THE FOOD?",
                subtitle: "Your opinion helps us improve",
                send: "SEND RATING",
                later: "Maybe later",
                thanks: "✨ Thanks for your rating!",
                tipTitle: "WANT TO TIP THE TEAM?",
                tipSubtitle: "Your gesture makes a difference",
                options: {
                    coffee: "Coffee",
                    beer: "Beer",
                    dinner: "Dinner",
                    custom: "Custom"
                }
            },
            cart: {
                title: "My Order",
                subtitle: "Review before ordering",
                empty: "Empty cart!",
                total: "Order Total",
                payApp: "PAY FROM APP",
                cash: "CASH",
                card: "CARD",
                payLater: "Use \"Pay Later\" (authorized customers only)"
            },
            profile: {
                verified: "VERIFIED CUSTOMER",
                pending: "PENDING VERIFICATION",
                id: "ID",
                dni: "ID/TIN",
                addDni: "Add your ID",
                save: "SAVE",
                availableCredit: "Available Credit",
                points: "Points El Remei",
                currentLevel: "Current Level",
                nextLevel: "Next Level",
                pointsNeeded: "You need {points} points for level {level}",
                processing: "PROCESSING...",
                payDebt: "PAY MY DEBT",
                history: "Expense History",
                products: "products",
                paid: "Paid",
                onTab: "On Tab",
                more: "more",
                pointsEarned: "Points",
                orderAgain: "Order Again",
                orderRepeated: "Repeated order added to cart!",
                noHistory: "No history registered yet"
            },
            kitchenSaturated: "Kitchen Saturated: Wait ~{min} min",
            register: {
                title: "Join El Remei Club",
                subtitle: "Register once to use the option \"PAY TOMORROW\"",
                name: "Full Name",
                phone: "Phone (Required)",
                dni: "ID / TIN (Required for credit)",
                email: "Email",
                registering: "REGISTERING...",
                register: "REGISTER AND CONTINUE",
                alreadyAccount: "ALREADY HAVE AN ACCOUNT? LOGIN HERE"
            },
            loginModal: {
                title: "Recover Account",
                subtitle: "Enter your phone to receive a free access code",
                phone: "Registered Phone",
                searching: "SEARCHING...",
                getCode: "GET SMS CODE",
                noAccount: "I DON'T HAVE AN ACCOUNT, GO TO REGISTER"
            },
            verify: {
                title: "Verify your Mobile",
                subtitle: "We sent a 5-digit code to",
                code: "Security Code",
                verifying: "VERIFYING...",
                activate: "ACTIVATE MY ACCOUNT",
                help: "If you don't receive the SMS, tell the staff."
            },
            notifications: {
                cooking: {
                    drink: { title: "Drink coming up", msg: "Your {item} is on the way." },
                    coffee: { title: "Coffee Shop", msg: "Barista working on your {item}." },
                    grill: { title: "On the grill 🔥", msg: "Your {item} is on the grill." },
                    sweet: { title: "Sweet Moment 🍰", msg: "Preparing a sweet treat: {item}." },
                    default: { title: "Preparing...", msg: "The chef is preparing your {item}." }
                },
                ready: { title: "Ready to serve! ✅", msg: "Your {item} is ready." },
                update: { title: "Update", msg: "Status: {status}" },
                delivering: { title: "On the Way!", msg: "Your order is leaving the kitchen 🚚" },
                served_msg: { title: "Enjoy!", msg: "Thanks for your visit 👋" }
            },
            alerts: {
                dniRequired: "⚠️ To use 'PAY TOMORROW' credit, filling your ID/TIN in your profile is mandatory for fiscal regulations.",
                creditLimitExceeded: "⚠️ You have exceeded your credit limit ({limit}€). Please settle some debt before continuing.",
                orderOnTab: "✅ Order noted on your account! Enjoy.",
                orderSent: "✅ Order sent to kitchen!",
                errorCheckout: "Error processing order: {error}"
            }
        }
    };

    const t = TRANSLATIONS[language];

    // Ref para mantener el estado anterior y poder comparar
    const prevOrdersRef = useRef<any[]>([]);
    // Ref para controlar las notificaciones ya enviadas y evitar duplicados/race conditions
    const lastNotifiedStatusRef = useRef<Record<string, string>>({});

    useEffect(() => {
        const savedCustomerId = localStorage.getItem('remei_customer_id');

        const loadInitialData = async () => {
            if (savedCustomerId) {
                await fetchCustomer(savedCustomerId);
            }
            fetchMenu();
            fetchActiveOrders();
        };

        loadInitialData();

        const channel = supabase
            .channel(`table-${tableId}-orders`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'orders', filter: `table_number=eq.${tableId}` },
                (payload: any) => {
                    fetchActiveOrders();

                    const newOrder = payload.new;
                    // Buscamos la versión anterior de ESTE pedido en nuestra ref
                    const oldOrder = prevOrdersRef.current.find(o => o.id === newOrder.id);


                    // Función auxiliar para notificaciones personalizadas con diseño "Dark Glass"
                    const showCustomNotification = (type: 'cooking' | 'ready' | 'delivering' | 'served', title: string, message: string, IconOverride?: any) => {
                        const config = {
                            cooking: {
                                icon: Flame,
                                color: 'text-amber-500',
                                bg: 'bg-amber-500/20',
                                border: 'border-amber-500/20'
                            },
                            ready: {
                                icon: CheckCircle,
                                color: 'text-green-500',
                                bg: 'bg-green-500/20',
                                border: 'border-green-500/20'
                            },
                            delivering: {
                                icon: Truck,
                                color: 'text-blue-500',
                                bg: 'bg-blue-500/20',
                                border: 'border-blue-500/20'
                            },
                            served: {
                                icon: PartyPopper,
                                color: 'text-purple-500',
                                bg: 'bg-purple-500/20',
                                border: 'border-purple-500/20'
                            }
                        };

                        const { icon: DefaultIcon, color, bg, border } = config[type];
                        const Icon = IconOverride || DefaultIcon;

                        toast(
                            <div className="flex flex-row items-center gap-4 w-full">
                                <div className={`p-3 rounded-full ${bg} ${color} shrink-0`}>
                                    <Icon size={24} strokeWidth={2.5} />
                                </div>
                                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                    <h4 className={`font-bold text-lg leading-tight text-white`}>
                                        {title}
                                    </h4>
                                    <p className="text-zinc-400 text-sm font-medium leading-tight truncate">
                                        {message}
                                    </p>
                                </div>
                            </div>,
                            {
                                position: "top-center",
                                autoClose: 5000,
                                hideProgressBar: true,
                                closeOnClick: true,
                                pauseOnHover: true,
                                draggable: true,
                                className: '!bg-zinc-900/95 !backdrop-blur-xl !border !border-white/10 !rounded-2xl !shadow-2xl !p-4 !min-h-0 !w-auto !max-w-[90vw] !mx-auto !mt-4',
                                bodyClassName: '!m-0 !p-0 !flex !items-center',
                                icon: false,
                                closeButton: false
                            } as ToastOptions
                        );
                    };

                    const getSmartMessage = (item: any, status: 'cooking' | 'ready') => {
                        // Limpieza agresiva de categoría: si es null/undefined -> 'otros'
                        const rawCat = item.category || 'otros';
                        const cat = String(rawCat).toLowerCase().trim();

                        if (status === 'cooking') {
                            // 1. BEBIDAS Y CAFÉS
                            if (['bebida', 'vinos', 'cervezas', 'refrescos'].includes(cat)) {
                                return { ...t.notifications.cooking.drink, msg: t.notifications.cooking.drink.msg.replace('{item}', item.name), icon: Wine };
                            }
                            if (['cafe', 'infusiones', 'cafes'].includes(cat)) {
                                return { ...t.notifications.cooking.coffee, msg: t.notifications.cooking.coffee.msg.replace('{item}', item.name), icon: Coffee };
                            }

                            // 2. FUEGO (Solo segundos y platos fuertes)
                            if (['segundo', 'carnes', 'pescados', 'pizza', 'hamburguesas', 'brasa'].includes(cat)) {
                                return { ...t.notifications.cooking.grill, msg: t.notifications.cooking.grill.msg.replace('{item}', item.name), icon: Flame };
                            }

                            // 3. TODO LO DEMÁS (Entrantes, Primeros, Postres, Ensaladas, Errores...) -> PREPARANDO
                            if (['postre', 'dulces'].includes(cat)) {
                                return { ...t.notifications.cooking.sweet, msg: t.notifications.cooking.sweet.msg.replace('{item}', item.name), icon: CakeSlice };
                            }

                            // DEFAULT ABSOLUTO
                            return { ...t.notifications.cooking.default, msg: t.notifications.cooking.default.msg.replace('{item}', item.name), icon: Utensils };
                        }

                        // Status READY
                        if (status === 'ready') {
                            return { ...t.notifications.ready, msg: t.notifications.ready.msg.replace('{item}', item.name), icon: CheckCircle };
                        }

                        return { ...t.notifications.update, msg: t.notifications.update.msg.replace('{status}', status), icon: CheckCircle };
                    };

                    // 1. Detectar cambios a nivel de PLATO (Granularidad)
                    if (newOrder.items && oldOrder && oldOrder.items) {
                        newOrder.items.forEach((newItem: any, index: number) => {
                            const oldItem = oldOrder.items[index];
                            if (!oldItem) return;

                            // Si el estado ha cambiado y es relevante
                            if (newItem.status !== oldItem.status) {
                                if (newItem.status === 'cooking' || newItem.status === 'ready') {
                                    if (navigator.vibrate) navigator.vibrate([100]);

                                    const smart = getSmartMessage(newItem, newItem.status);
                                    showCustomNotification(newItem.status, smart.title, smart.msg, smart.icon);
                                }
                            }
                        });
                    }

                    // 2. Cambios de estado GENERAL (Delivering/Served)
                    // Solución EXTREMADAMENTE SIMPLE: Si el estado es relevante, avisamos. Punto.
                    if (['delivering', 'served'].includes(newOrder.status)) {
                        const statusConfig = {
                            delivering: { type: 'delivering', ...t.notifications.delivering },
                            served: { type: 'served', ...t.notifications.served_msg }
                        } as const;

                        const config = statusConfig[newOrder.status as keyof typeof statusConfig];

                        if (config) {
                            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

                            showCustomNotification(config.type, config.title, config.msg);

                            if (newOrder.status === 'served') {
                                setTimeout(() => setIsRatingOpen(true), 2000);
                            }
                        }
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [language]);

    // Actualizamos la ref cada vez que activeOrders cambia, PERO esto se usa para la SIGUIENTE comparación
    useEffect(() => {
        if (activeOrders.length > 0) {
            prevOrdersRef.current = activeOrders;
            // Sincronizamos también el estado de notificaciones para no notificar lo que ya está cargado y visto
            activeOrders.forEach(order => {
                if (!lastNotifiedStatusRef.current[order.id]) {
                    lastNotifiedStatusRef.current[order.id] = order.status;
                }
            });
        }
    }, [activeOrders]);

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
        try {
            const { data } = await supabase
                .from('products')
                .select('*, image_url')
                .eq('is_available', true);
            if (data) setMenu(data);

            const { count } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .in('status', ['pending', 'cooking']);

            setTotalOrders(count || 0);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching menu:", error);
            setLoading(false);
        }
    };

    // Efecto para rotar las sugerencias del chef según la categoría activa
    useEffect(() => {
        if (menu.length > 0) {
            // Buscamos favoritos en la categoría actual
            let currentCategoryPlates = menu.filter(p => p.category === activeCategory);
            let favorites = currentCategoryPlates.filter(p => p.is_favorite);

            // Si no hay favoritos en esta categoría, cogemos los 3 primeros platos disponibles de esta categoría
            if (favorites.length === 0) {
                favorites = currentCategoryPlates.slice(0, 3);
            }

            setRecommendedPlates(favorites.slice(0, 3));
        }
    }, [activeCategory, menu]);

    // Función de Auditoría VeriFactu - NEW
    const logAuditEvent = async (type: string, description: string, payload: any = {}) => {
        try {
            const { data: lastLog } = await supabase
                .from('audit_logs')
                .select('hash_actual')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            const prevHash = lastLog?.hash_actual || 'INICIO-AUDIT';
            const logHash = await generateVeriFactuHash({ type, description, payload }, prevHash);

            await supabase.from('audit_logs').insert([{
                event_type: type,
                description,
                payload,
                hash_actual: logHash,
                hash_anterior: prevHash
            }]);
        } catch (err) {
            console.error("Audit log error:", err);
        }
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
            const existingIndex = prev.findIndex(item => item.product.id === product.id);
            if (existingIndex !== -1) {
                // Remove from current position and add to end with updated qty
                const newCart = [...prev];
                const item = newCart[existingIndex];
                newCart.splice(existingIndex, 1);
                return [...newCart, { ...item, qty: item.qty + 1 }];
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

            // 1. Poner deuda a cero y recompensar con puntos
            const pointsToGain = Math.floor(Number(customer.current_debt));
            const { error: customerError } = await supabase
                .from('customers')
                .update({
                    current_debt: 0,
                    points: (customer.points || 0) + pointsToGain
                })
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
                alert(t.alerts.dniRequired);
                setIsProfileOpen(true);
                return;
            }
            if ((Number(customer.current_debt) + totalToPay) > Number(customer.credit_limit)) {
                alert(t.alerts.creditLimitExceeded.replace('{limit}', String(customer.credit_limit)));
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

            // --- LÓGICA VERIFACTU: Encadenamiento ---
            const { data: lastOrder } = await supabase
                .from('orders')
                .select('hash_actual')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            const prevHash = lastOrder?.hash_actual || 'INICIO-EL-REMEI';
            const orderData = { table: tableId, total: totalToPay, items: flattenedItems.length };
            const currentHash = await generateVeriFactuHash(orderData, prevHash);

            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    table_number: parseInt(tableId),
                    items: flattenedItems,
                    total_amount: totalToPay,
                    status: 'pending',
                    payment_method: paymentMethod,
                    customer_id: customer?.id || null,
                    is_paid: paymentMethod === 'online' || paymentMethod === 'credit' ? false : false,
                    hash_actual: currentHash,
                    hash_anterior: prevHash,
                    fecha_registro: new Date().toISOString()
                }])
                .select()
                .single();

            if (orderError) throw orderError;

            // Si es online o crédito, recompensar puntos y actualizar histórico
            if (customer) {
                const newPoints = (customer.points || 0) + Math.floor(totalToPay);
                let newLevel = 'BRONCE';
                if (newPoints >= 1000) newLevel = 'ORO';
                else if (newPoints >= 500) newLevel = 'PLATA';

                await supabase.from('customers').update({
                    points: newPoints,
                    loyalty_level: newLevel,
                    total_spent: (Number(customer.total_spent) || 0) + totalToPay
                }).eq('id', customer.id);

                if (paymentMethod === 'credit') {
                    await supabase.from('customers').update({
                        current_debt: Number(customer.current_debt) + totalToPay
                    }).eq('id', customer.id);
                }

                await fetchCustomer(customer.id);
            }

            if (paymentMethod === 'online') {
                await supabase.from('orders').update({ is_paid: true }).eq('id', order.id);
                window.location.href = `/mesa/${tableId}/success`;
                return;
            }

            setCart([]);
            setIsCartOpen(false);
            alert(paymentMethod === 'credit' ? t.alerts.orderOnTab : t.alerts.orderSent);
        } catch (error: any) {
            console.error("Error en checkout:", error);
            alert(t.alerts.errorCheckout.replace('{error}', error.message || "Avisa al personal"));
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
                                <h2 className="text-2xl font-black italic">{t.register.title}</h2>
                                <p className="text-sm text-gray-500 mt-2 font-medium">{t.register.subtitle}</p>
                            </div>

                            <form onSubmit={handleRegisterCustomer} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-4 mb-2 block">{t.register.name}</label>
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
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-4 mb-2 block">{t.register.phone}</label>
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
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-4 mb-2 block">{t.register.dni}</label>
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
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-4 mb-2 block">{t.register.email}</label>
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
                                    {isSubmitting ? t.register.registering : t.register.register}
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
                                        {t.register.alreadyAccount}
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
                                <h2 className="text-2xl font-black italic">{t.loginModal.title}</h2>
                                <p className="text-sm text-gray-500 mt-2 font-medium">{t.loginModal.subtitle}</p>
                            </div>

                            <form onSubmit={handleLoginRequest} className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-4 mb-2 block">{t.loginModal.phone}</label>
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
                                    {isSubmitting ? t.loginModal.searching : t.loginModal.getCode}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsLoginOpen(false);
                                        setIsRegistrationOpen(true);
                                    }}
                                    className="w-full text-[10px] font-black uppercase text-gray-400 hover:text-zinc-900 tracking-widest text-center"
                                >
                                    {t.loginModal.noAccount}
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
                                <h2 className="text-2xl font-black italic">{t.verify.title}</h2>
                                <p className="text-sm text-gray-500 mt-2 font-medium">{t.verify.subtitle} <br /><span className="text-zinc-900 font-bold">{customer?.phone}</span></p>
                            </div>

                            <form onSubmit={handleVerifyCode} className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest text-center block mb-4">{t.verify.code}</label>
                                    <input
                                        required
                                        type="text"
                                        maxLength={5}
                                        placeholder="00000"
                                        className="w-full bg-gray-50 border-none rounded-2xl px-6 py-6 font-black text-4xl text-center tracking-[1rem] focus:ring-2 focus:ring-emerald-500/20"
                                        value={verificationInput}
                                        onChange={e => setVerificationInput(e.target.value.replace(/\D/, ''))}
                                    />
                                </div>
                                <button
                                    disabled={isVerifying || verificationInput.length < 5}
                                    className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black italic text-lg shadow-xl shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {isVerifying ? t.verify.verifying : t.verify.activate}
                                </button>
                                <p className="text-[9px] text-gray-400 text-center font-bold uppercase tracking-widest">
                                    {t.verify.help}
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
                                    <h2 className="text-2xl font-black italic">{t.cart.title}</h2>
                                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">{t.cart.subtitle}</p>
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
                                        <p className="font-black uppercase italic">{t.cart.empty}</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-8 bg-white border-t border-gray-50 space-y-3">
                                <div className="flex justify-between items-center mb-4 px-2">
                                    <span className="text-gray-400 font-black uppercase text-xs">{t.cart.total}</span>
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
                                        {t.cart.payApp}
                                    </button>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => handleCheckout('cash')}
                                            disabled={cart.length === 0 || isSubmitting}
                                            className="bg-white border-2 border-emerald-500/20 text-emerald-700 py-4 rounded-3xl font-black text-xs italic transition-all active:scale-95 flex items-center justify-center gap-2 hover:bg-emerald-50"
                                        >
                                            <Utensils className="w-4 h-4 text-emerald-500" />
                                            {t.cart.cash}
                                        </button>
                                        <button
                                            onClick={() => handleCheckout('card')}
                                            disabled={cart.length === 0 || isSubmitting}
                                            className="bg-white border-2 border-blue-500/20 text-blue-700 py-4 rounded-3xl font-black text-xs italic transition-all active:scale-95 flex items-center justify-center gap-2 hover:bg-blue-50"
                                        >
                                            <CreditCard className="w-4 h-4 text-blue-500" />
                                            {t.cart.card}
                                        </button>
                                    </div>

                                    <div className="pt-2 flex justify-center">
                                        <button
                                            onClick={() => handleCheckout('credit')}
                                            disabled={cart.length === 0 || isSubmitting}
                                            className="text-gray-400 hover:text-zinc-900 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors py-2"
                                        >
                                            <Wallet className="w-3 h-3" />
                                            {t.cart.payLater}
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
                                                        {t.profile.save}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
                                        <p className="text-[9px] font-black text-gray-500 uppercase mb-1 tracking-widest">{t.profile.availableCredit}</p>
                                        <p className="text-2xl font-black italic text-emerald-400">{Math.max(0, Number(customer.credit_limit) - Number(customer.current_debt)).toFixed(2)}€</p>
                                    </div>
                                    <div className="bg-white/10 p-4 rounded-3xl border border-white/10 shadow-inner">
                                        <p className="text-[9px] font-black text-orange-500 uppercase mb-1 tracking-widest text-right">{t.profile.points}</p>
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="text-xs bg-orange-600/20 text-orange-500 px-2 py-0.5 rounded-md font-black italic">{customer.loyalty_level || 'BRONCE'}</span>
                                            <p className="text-2xl font-black italic text-white text-right">{customer.points || 0}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Barra de Progreso de Nivel - NEW */}
                                <div className="mt-4 px-2">
                                    <div className="flex justify-between text-[8px] font-black uppercase text-gray-500 mb-2">
                                        <span>{t.profile.currentLevel}: {customer.loyalty_level || 'BRONCE'}</span>
                                        <span>{t.profile.nextLevel}: {customer.loyalty_level === 'ORO' ? 'MAX' : (customer.loyalty_level === 'PLATA' ? 'ORO' : 'PLATA')}</span>
                                    </div>
                                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-orange-600 to-orange-400"
                                            style={{ width: `${Math.min(100, ((customer.points || 0) / (customer.loyalty_level === 'PLATA' ? 1000 : 500)) * 100)}%` }}
                                        ></div>
                                    </div>
                                    {customer.loyalty_level !== 'ORO' && (
                                        <p className="text-[7px] text-gray-600 mt-1 uppercase font-bold italic">
                                            {t.profile.pointsNeeded
                                                .replace('{points}', Math.max(0, (customer.loyalty_level === 'PLATA' ? 1000 : 500) - (customer.points || 0)).toString())
                                                .replace('{level}', customer.loyalty_level === 'PLATA' ? 'ORO' : 'PLATA')
                                            }
                                        </p>
                                    )}
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
                                        {isSubmitting ? t.profile.processing : `${t.profile.payDebt} (${Number(customer.current_debt).toFixed(2)}€)`}
                                    </motion.button>
                                )}
                            </div>

                            {/* Historial de Gastos */}
                            <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
                                <h3 className="text-xs font-black text-zinc-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <HistoryIcon className="w-4 h-4 text-orange-600" />
                                    {t.profile.history}
                                </h3>

                                <div className="space-y-4">
                                    {customerHistory.length > 0 ? (
                                        customerHistory.map((order, idx) => (
                                            <div key={idx} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase">{t.table} {order.table_number} • {new Date(order.created_at).toLocaleDateString()}</p>
                                                        <p className="text-xs font-black text-zinc-900 uppercase italic mt-1">{order.items.length} {t.profile.products}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-black italic text-zinc-900">{Number(order.total_amount).toFixed(2)}€</p>
                                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${order.is_paid ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                                                            {order.is_paid ? t.profile.paid : t.profile.onTab}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    {order.items.slice(0, 3).map((item: any, i: number) => (
                                                        <span key={i} className="text-[9px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                                                            {item.name}
                                                        </span>
                                                    ))}
                                                    {order.items.length > 3 && (
                                                        <span className="text-[9px] font-bold text-gray-400 px-2 py-1 italic">+{order.items.length - 3} {t.profile.more}</span>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-2">
                                                    <div className="flex items-center gap-1 text-orange-500">
                                                        <Star className="w-3 h-3 fill-current" />
                                                        <span className="text-[10px] font-black uppercase tracking-wider">+{Math.floor(order.total_amount * 10)} {t.profile.pointsEarned}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            const itemsToAdd = order.items.map((item: any) => ({
                                                                product: {
                                                                    id: item.product_id,
                                                                    name: item.name,
                                                                    price: item.price,
                                                                    category: item.category || 'otro',
                                                                    is_available: true
                                                                },
                                                                quantity: item.quantity
                                                            }));
                                                            setCart([...cart, ...itemsToAdd]);
                                                            toast.success(t.profile.orderRepeated);
                                                            setIsCartOpen(true);
                                                            setIsProfileOpen(false);
                                                        }}
                                                        className="flex items-center gap-2 bg-zinc-900 text-white px-3 py-1.5 rounded-full text-[9px] font-black uppercase hover:bg-zinc-800 transition-colors"
                                                    >
                                                        <RefreshCw className="w-3 h-3" />
                                                        {t.profile.orderAgain}
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-12 text-center opacity-40">
                                            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <HistoryIcon className="w-8 h-8" />
                                            </div>
                                            <p className="text-xs font-bold uppercase tracking-widest italic">{t.profile.noHistory}</p>
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
                            {t.kitchenSaturated.replace('{min}', Math.ceil(totalOrders * 3).toString())}
                        </p>
                    </div>
                )}
                <div className="flex justify-between items-center w-full">
                    <Link href="/" className="p-2 -ml-2"><ArrowLeft className="w-6 h-6" /></Link>
                    <div className="flex flex-col items-center">
                        <h1 className="text-xl font-black text-orange-600">EL REMEI</h1>
                        <p className="text-[10px] uppercase font-black text-gray-400">{t.table} {tableId}</p>
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
                                {customer ? t.myAccount : t.login}
                            </p>
                            <p className={`text-xs font-black italic truncate max-w-[120px] ${customer ? 'text-white' : 'text-gray-500'}`}>
                                {customer ? customer.name.split(' ')[0].toUpperCase() : t.welcome.toUpperCase()}
                            </p>
                        </div>
                    </button>
                </div>

                <div className="space-y-4 flex-shrink-0">
                    <div className="flex gap-2 mb-4 px-2">
                        {(['es', 'ca', 'en'] as const).map((lang) => (
                            <button
                                key={lang}
                                onClick={() => setLanguage(lang)}
                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${language === lang ? 'bg-black text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                            >
                                {lang}
                            </button>
                        ))}
                    </div>

                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Categorías</p>
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all duration-300 ${activeCategory === cat.id ? 'bg-orange-50 text-orange-600 shadow-sm shadow-orange-100' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <span className="text-xl">{cat.icon}</span>
                            {t.categories[cat.id as keyof typeof t.categories] || cat.name}
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
                                                {isDrink ? 'BEBIDA' : 'COCINANDO'}
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
                    <p className="text-[10px] font-black uppercase text-orange-500 mb-4 tracking-[0.2em]">{t.myCredit}</p>
                    {customer ? (
                        <div className="space-y-4">
                            <div>
                                <p className="text-2xl font-black italic">{Number(customer.current_debt).toFixed(2)}€</p>
                                <p className="text-[9px] text-gray-400 font-black uppercase">{t.accumulatedDebt}</p>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-orange-500 transition-all duration-1000"
                                    style={{ width: `${Math.min(100, (Number(customer.current_debt) / Number(customer.credit_limit)) * 100)}%` }}
                                />
                            </div>
                            <div className="flex justify-between items-center text-[9px] font-black uppercase text-gray-400">
                                <span>{t.limit}: {customer.credit_limit}€</span>
                                <span className={Number(customer.current_debt) > Number(customer.credit_limit) * 0.8 ? 'text-red-400' : 'text-emerald-400'}>
                                    {Math.max(0, Number(customer.credit_limit) - Number(customer.current_debt)).toFixed(2)}€ {t.available}
                                </span>
                            </div>
                            {Number(customer.current_debt) > 0 && (
                                <button
                                    disabled={isSubmitting}
                                    onClick={handlePayDebt}
                                    className="w-full mt-2 bg-emerald-600/20 text-emerald-400 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-emerald-600/30 transition-all border border-emerald-500/20 disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : t.payOnline}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-[11px] font-medium text-gray-300 leading-relaxed italic">{t.payLaterPromo}</p>
                            <button
                                onClick={() => setIsRegistrationOpen(true)}
                                className="w-full bg-orange-600 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-orange-500 transition-all shadow-lg shadow-orange-950"
                            >
                                {t.activateCredit}
                            </button>
                        </div>
                    )}
                </div>

                <div className="mt-12 p-6 bg-gray-50 rounded-3xl border border-gray-100 mb-12">
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">{t.location}</p>
                    <p className="text-sm font-bold text-gray-700">{t.table} {tableId}</p>
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
                            placeholder={t.searchPlaceholder}
                            className="w-full pl-12 pr-4 py-3 bg-gray-100/50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 text-sm font-medium"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Mobile Search - NEW */}
                <div className="md:hidden px-4 pt-4">
                    <div className="relative w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input
                            type="text"
                            placeholder={t.searchPlaceholder}
                            className="w-full pl-10 pr-4 py-3 bg-gray-100/50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 text-xs font-bold"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Mobile Category Scroll */}
                <div className="md:hidden flex overflow-x-auto px-4 py-4 gap-2 no-scrollbar bg-white shadow-sm sticky top-[72px] z-10 transition-all border-b border-gray-50">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`whitespace-nowrap px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeCategory === cat.id ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'bg-gray-100 text-gray-500'}`}
                        >
                            {cat.icon} {t.categories[cat.id as keyof typeof t.categories] || cat.name}
                        </button>
                    ))}
                </div>

                {/* Desktop & Mobile Filters - NEW PREMIUM UI */}
                <div className="px-4 md:px-12 py-2 flex gap-2 overflow-x-auto no-scrollbar items-center">
                    <button
                        onClick={() => setActiveFilters(f => ({ ...f, favorites: !f.favorites }))}
                        className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border transition-all ${activeFilters.favorites ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}
                    >
                        <Plus className={`w-3 h-3 ${activeFilters.favorites ? 'rotate-45' : ''} transition-transform`} /> {t.favorites}
                    </button>
                    <button
                        onClick={() => setActiveFilters(f => ({ ...f, vegan: !f.vegan }))}
                        className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border transition-all ${activeFilters.vegan ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}
                    >
                        🌱 {t.vegan}
                    </button>
                    <button
                        onClick={() => setActiveFilters(f => ({ ...f, glutenFree: !f.glutenFree }))}
                        className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border transition-all ${activeFilters.glutenFree ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}
                    >
                        🌾 {t.glutenFree}
                    </button>
                </div>

                {/* Mobile Active Orders Section */}
                {activeOrders.length > 0 && (
                    <div className="md:hidden px-4 mt-4">
                        <div className="bg-zinc-900 rounded-[2rem] p-5 shadow-xl border border-white/5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-white font-black italic uppercase text-xs tracking-widest flex items-center gap-2">
                                    <div className="w-1.5 h-4 bg-orange-500 rounded-full"></div>
                                    {t.myCurrentOrders}
                                </h3>
                                <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-black uppercase">{t.inProgress}</span>
                            </div>
                            <div className="space-y-4 max-h-48 overflow-y-auto no-scrollbar">
                                {activeOrders.flatMap((o, oi) => o.items.map((item: any, ii: number) => {
                                    const isDrink = item.category?.toLowerCase() === 'bebida';
                                    const isReady = isDrink ? o.drinks_served : item.is_served;
                                    const isCooking = !isReady; // Simplification: if not ready, it's cooking/preparing

                                    return (
                                        <div key={`${oi}-${ii}`} className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <div className="flex justify-between items-start mb-3">
                                                <span className="text-white font-bold text-sm">{item.name}</span>
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${isReady ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                                    {isReady ? t.status.ready : t.status.cooking}
                                                </span>
                                            </div>

                                            {/* Progress Bar Visual */}
                                            <div className="relative">
                                                <div className="flex justify-between text-[8px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                                                    <span className="text-emerald-500">Recibido</span>
                                                    <span className={isCooking || isReady ? 'text-orange-500' : ''}>{isDrink ? 'Bebida' : 'Cocina'}</span>
                                                    <span className={isReady ? 'text-emerald-500' : ''}>Servido</span>
                                                </div>
                                                <div className="h-1 bg-white/10 rounded-full overflow-hidden flex">
                                                    <div className="h-full bg-emerald-500 w-1/3"></div>
                                                    <div className={`h-full w-1/3 transition-all duration-1000 ${isCooking || isReady ? 'bg-orange-500' : 'bg-transparent'}`}></div>
                                                    <div className={`h-full w-1/3 transition-all duration-1000 ${isReady ? 'bg-emerald-500' : 'bg-transparent'}`}></div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }))}
                            </div>
                        </div>
                    </div>
                )}

                {/* AI Recommendations - NEW PREMIUM FEATURE */}
                {recommendedPlates && recommendedPlates.length > 0 && searchQuery.trim() === '' && (
                    <div className="px-4 md:px-12 py-8 bg-orange-50/30">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-orange-600 p-2 rounded-xl shadow-lg shadow-orange-200">
                                <ShieldCheck className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black italic uppercase tracking-widest text-orange-950">{t.chefSuggestions}</h3>
                                <p className="text-[10px] font-bold text-orange-600/60 uppercase">{t.basedOn}</p>
                            </div>
                        </div>
                        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4">
                            {recommendedPlates.map(plate => (
                                <div
                                    key={`rec-${plate.id}`}
                                    onClick={() => addToCart(plate)}
                                    className="min-w-[200px] bg-white p-4 rounded-[2rem] shadow-sm border border-orange-100 flex items-center gap-4 active:scale-95 transition-transform cursor-pointer"
                                >
                                    <div className="w-16 h-16 bg-gray-100 rounded-2xl overflow-hidden flex-shrink-0">
                                        {plate.image_url ? <img src={plate.image_url} alt={plate.name} className="w-full h-full object-cover" /> : <Utensils className="w-6 h-6 m-auto opacity-10" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-black italic truncate">{plate.name}</p>
                                        <p className="text-[10px] font-bold text-orange-600">{plate.price}€</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Grid of Dishes */}
                <div className="flex-1 px-4 md:px-12 py-6 pb-40">
                    <div className="flex justify-between items-end mb-8">
                        <h2 className="text-3xl md:text-4xl font-black text-gray-900 capitalize">
                            {t.categories[activeCategory as keyof typeof t.categories] || CATEGORIES.find(c => c.id === activeCategory)?.name}
                        </h2>
                        <p className="text-sm text-gray-400 font-bold">
                            {menu.filter(p => p.category === activeCategory).length} {t.specialties}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {menu
                            .filter(p => p.category === activeCategory)
                            .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                            .filter(p => !activeFilters.vegan || p.is_vegan)
                            .filter(p => !activeFilters.glutenFree || p.is_gluten_free)
                            .filter(p => !activeFilters.favorites || p.is_favorite)
                            .length > 0 ? (
                            menu
                                .filter(p => p.category === activeCategory)
                                .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                .filter(p => !activeFilters.vegan || p.is_vegan)
                                .filter(p => !activeFilters.glutenFree || p.is_gluten_free)
                                .filter(p => !activeFilters.favorites || p.is_favorite)
                                .map(product => (
                                    <div
                                        key={product.id}
                                        className="group bg-white rounded-[2.5rem] p-4 shadow-sm hover:shadow-2xl hover:shadow-orange-100 transition-all duration-500 border border-gray-100/50 flex flex-col cursor-pointer active:scale-95"
                                        onClick={() => addToCart(product)}
                                    >
                                        <div className="aspect-[4/3] w-full bg-gray-100 rounded-[2rem] mb-6 overflow-hidden relative">
                                            {getProductImage(product.name, product.image_url) ? (
                                                <>
                                                    <img
                                                        src={getProductImage(product.name, product.image_url)!}
                                                        alt={product.name}
                                                        className={`w-full h-full object-cover transition-all duration-700 ${product.image_url_2 ? 'group-hover:opacity-0 group-hover:scale-110' : 'group-hover:scale-110'}`}
                                                    />
                                                    {product.image_url_2 && (
                                                        <img
                                                            src={product.image_url_2}
                                                            alt={`${product.name} detail`}
                                                            className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
                                                        />
                                                    )}
                                                </>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center opacity-10">
                                                    <Utensils className="w-20 h-20" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>

                                            {/* Badges Premium */}
                                            <div className="absolute top-4 left-4 flex flex-col gap-2">
                                                {product.is_favorite && (
                                                    <div className="bg-red-500 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg">{t.favorites}</div>
                                                )}
                                                {product.is_vegan && (
                                                    <div className="bg-emerald-500 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg">{t.vegan}</div>
                                                )}
                                                {product.is_gluten_free && (
                                                    <div className="bg-amber-500 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg">{t.glutenFree}</div>
                                                )}
                                            </div>

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
                                <p className="text-2xl font-black uppercase italic text-center px-4">{t.emptyCategory}</p>
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
                                <p className="text-[10px] font-black opacity-80 uppercase tracking-widest">{t.reviewOrder}</p>
                                <p className={`font-black italic ${cart.length > 0 ? 'text-sm leading-tight' : 'text-xl'}`}>
                                    {cart.length > 0
                                        ? cart[cart.length - 1].product.name
                                        : '(0 items)'
                                    }
                                </p>
                            </div>
                        </div>
                        <div className="bg-orange-500 px-8 py-5 rounded-[1.8rem] text-2xl font-black shadow-lg">
                            {total.toFixed(2)}€
                        </div>
                    </button>
                    <button onClick={() => setCart([])} className="absolute -top-3 -right-3 w-8 h-8 bg-zinc-900 text-white rounded-full flex items-center justify-center shadow-xl border border-white/10 text-xs font-black">X</button>
                </div>
            )}
            {/* Modal de Valoración y Propinas Post-Servicio */}
            <AnimatePresence>
                {isRatingOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md z-[300]" />
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0, y: 100 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.8, opacity: 0, y: 100 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white rounded-[3.5rem] p-10 z-[301] shadow-2xl text-center overflow-hidden"
                        >
                            {!isTipPhase ? (
                                <>
                                    <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                                        <Star className="w-10 h-10 fill-current" />
                                    </div>
                                    <h2 className="text-3xl font-black italic tracking-tighter leading-8 mb-2">{t.rating.title}</h2>
                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-8">{t.rating.subtitle}</p>

                                    <div className="flex justify-center gap-3 mb-10">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <button
                                                key={s}
                                                onClick={() => setRating(s)}
                                                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${rating >= s ? 'bg-orange-500 text-white scale-110 shadow-lg shadow-orange-200' : 'bg-gray-50 text-gray-300'}`}
                                            >
                                                <Star className={`w-6 h-6 ${rating >= s ? 'fill-current' : ''}`} />
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => {
                                            if (rating >= 4) {
                                                setIsTipPhase(true);
                                            } else {
                                                setIsRatingOpen(false);
                                                toast.success(t.rating.thanks, { position: "top-center" });
                                                setTimeout(() => {
                                                    setRating(0);
                                                }, 500);
                                            }
                                        }}
                                        disabled={rating === 0}
                                        className="w-full bg-zinc-900 text-white py-5 rounded-3xl font-black italic text-lg shadow-xl active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
                                    >
                                        {t.rating.send}
                                    </button>

                                    <button
                                        onClick={() => {
                                            setIsRatingOpen(false);
                                            setTimeout(() => setRating(0), 500);
                                        }}
                                        className="mt-4 text-[10px] font-black uppercase text-gray-300 tracking-[0.2em]"
                                    >
                                        {t.rating.later}
                                    </button>
                                </>
                            ) : !hasTipped ? (
                                <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
                                    <h2 className="text-2xl font-black italic tracking-tighter leading-7 mb-2">{t.rating.tipTitle}</h2>
                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px] mb-8">{t.rating.tipSubtitle}</p>

                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        {[
                                            { id: 2, icon: <Coffee className="w-5 h-5" />, label: t.rating.options.coffee, amount: '2€' },
                                            { id: 5, icon: <Beer className="w-5 h-5" />, label: t.rating.options.beer, amount: '5€' },
                                            { id: 10, icon: <Pizza className="w-5 h-5" />, label: t.rating.options.dinner, amount: '10€' },
                                            { id: -1, icon: <Wallet className="w-5 h-5" />, label: t.rating.options.custom, amount: '...' },
                                        ].map((option) => (
                                            <button
                                                key={option.id}
                                                onClick={() => setSelectedTip(option.id)}
                                                className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-300 border ${selectedTip === option.id ? 'bg-orange-500 text-white border-orange-500 scale-105 shadow-xl shadow-orange-200' : 'bg-gray-50 text-gray-400 border-gray-100'}`}
                                            >
                                                {option.icon}
                                                <div className="flex flex-col items-center leading-none">
                                                    <span className="text-[10px] font-black uppercase opacity-60 mb-1">{option.label}</span>
                                                    <span className="text-sm font-black uppercase">{option.amount}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    {selectedTip === -1 && (
                                        <div className="mb-6 relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">€</span>
                                            <input
                                                type="number"
                                                placeholder="0.00"
                                                value={customTip}
                                                onChange={(e) => setCustomTip(e.target.value)}
                                                className="w-full pl-8 pr-4 py-4 bg-gray-100 rounded-2xl font-black text-xl text-center focus:ring-2 focus:ring-orange-500/20 border-none outline-none"
                                                autoFocus
                                            />
                                        </div>
                                    )}

                                    <button
                                        onClick={() => {
                                            if (selectedTip) {
                                                const tipAmount = selectedTip === -1
                                                    ? parseFloat(customTip)
                                                    : selectedTip; // Los IDs coinciden con el monto (2, 5, 10)

                                                router.push(`/mesa/${params.id}/checkout?amount=${tipAmount}&concept=Propina%20Equipo&is_tip=true`);
                                            }
                                        }}
                                        disabled={!selectedTip || (selectedTip === -1 && (!customTip || Number(customTip) <= 0))}
                                        className="w-full bg-zinc-900 text-white py-5 rounded-3xl font-black italic text-lg shadow-xl active:scale-95 transition-all disabled:opacity-20"
                                    >
                                        INVITAR AL EQUIPO
                                    </button>

                                    <button
                                        onClick={() => {
                                            setIsRatingOpen(false);
                                            setTimeout(() => {
                                                setIsTipPhase(false);
                                                setRating(0);
                                            }, 500);
                                        }}
                                        className="mt-6 text-[10px] font-black uppercase text-gray-400 tracking-widest"
                                    >
                                        Ahora no, gracias
                                    </button>
                                </motion.div>
                            ) : (
                                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-4">
                                    <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
                                        <Heart className="w-10 h-10 fill-current" />
                                    </div>
                                    <h3 className="text-3xl font-black italic tracking-tighter leading-tight mb-2">¡GRACIAS!</h3>
                                    <p className="text-gray-600 font-bold italic text-sm">Has hecho feliz al equipo.</p>
                                    <button
                                        onClick={() => {
                                            setIsRatingOpen(false);
                                            setTimeout(() => {
                                                setIsTipPhase(false);
                                                setHasTipped(false);
                                                setSelectedTip(null);
                                                setRating(0);
                                            }, 500);
                                        }}
                                        className="mt-10 bg-zinc-900 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg"
                                    >
                                        Cerrar
                                    </button>
                                </motion.div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
