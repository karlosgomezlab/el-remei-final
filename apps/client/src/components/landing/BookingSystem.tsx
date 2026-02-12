'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar as CalendarIcon,
    Users,
    Clock,
    ChevronRight,
    ChevronLeft,
    CheckCircle2,
    Info,
    Phone,
    User,
    ArrowRight,
    MessageSquare
} from 'lucide-react';
import { format, addDays, startOfDay, isAfter, isBefore, setHours, setMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface RestaurantTable {
    id: number;
    x: number;
    y: number;
    party_size: number;
    type: string;
}

export const BookingSystem = () => {
    const [step, setStep] = useState(1);
    const [date, setDate] = useState(new Date());
    const [time, setTime] = useState('14:00');
    const [people, setPeople] = useState(2);
    const [selectedTable, setSelectedTable] = useState<number | null>(null);
    const [tables, setTables] = useState<RestaurantTable[]>([]);
    const [occupiedTables, setOccupiedTables] = useState<number[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        notes: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Cargar mesas configuradas
    useEffect(() => {
        const fetchTables = async () => {
            const { data } = await supabase
                .from('restaurant_tables')
                .select('*')
                .eq('is_active', true);
            if (data) setTables(data);
        };
        fetchTables();
    }, []);

    // Cargar mesas ocupadas para la fecha/hora seleccionada
    useEffect(() => {
        if (step === 2) {
            checkAvailability();
        }
    }, [step, date, time]);

    const checkAvailability = async () => {
        // En un caso real, buscaríamos reservas que coincidan con la franja horaria
        // Para el demo, buscamos reservas existentes con cualquier estado activo
        const { data } = await supabase
            .from('reservations')
            .select('table_number')
            .not('status', 'eq', 'cancelled');

        if (data) {
            const occupied = data
                .map(r => r.table_number)
                .filter((n): n is number => n !== null);
            setOccupiedTables(occupied);
        }
    };

    const handleBooking = async () => {
        if (!formData.name || !formData.phone) {
            toast.error("Por favor, completa tus datos");
            return;
        }

        setIsSubmitting(true);

        // Combinar fecha y hora
        const [hours, minutes] = time.split(':');
        const reservationDate = setMinutes(setHours(date, parseInt(hours)), parseInt(minutes));

        const { error } = await supabase
            .from('reservations')
            .insert({
                customer_name: formData.name,
                customer_phone: formData.phone,
                reservation_date: reservationDate.toISOString(),
                party_size: people,
                table_number: selectedTable,
                notes: formData.notes,
                status: 'pending'
            });

        if (error) {
            toast.error("Error al crear la reserva. Inténtalo de nuevo.");
            console.error(error);
        } else {
            setStep(4); // Pantalla de éxito
        }
        setIsSubmitting(false);
    };

    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);

    const timeSlots = [
        '13:00', '13:30', '14:00', '14:30', '15:00',
        '20:00', '20:30', '21:00', '21:30', '22:00'
    ];

    return (
        <section id="booking" className="py-24 bg-white relative overflow-hidden">
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="flex flex-col items-center mb-16 text-center">
                    <motion.span
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        className="text-orange-500 font-black uppercase tracking-[0.3em] text-sm mb-4"
                    >
                        Reserva tu experiencia
                    </motion.span>
                    <h2 className="text-4xl md:text-5xl font-black text-gray-900 uppercase tracking-tighter leading-none">
                        Plano del Salón <span className="text-orange-500 italic">&</span> Reservas
                    </h2>
                </div>

                <div className="bg-gray-50 rounded-[3rem] border border-gray-100 shadow-2xl overflow-hidden min-h-[600px] flex flex-col md:flex-row">

                    {/* Sidebar de Progreso */}
                    <div className="md:w-1/3 bg-gray-900 p-10 text-white flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-10">
                                <CheckCircle2 className={`w-6 h-6 ${step >= 1 ? 'text-orange-500' : 'text-gray-700'}`} />
                                <div className={`h-1 w-8 rounded-full ${step > 1 ? 'bg-orange-500' : 'bg-gray-700'}`}></div>
                                <CheckCircle2 className={`w-6 h-6 ${step >= 2 ? 'text-orange-500' : 'text-gray-700'}`} />
                                <div className={`h-1 w-8 rounded-full ${step > 2 ? 'bg-orange-500' : 'bg-gray-700'}`}></div>
                                <CheckCircle2 className={`w-6 h-6 ${step >= 3 ? 'text-orange-500' : 'text-gray-700'}`} />
                            </div>

                            <h3 className="text-3xl font-black uppercase italic text-orange-500 mb-2">Paso {step === 4 ? 3 : step}</h3>
                            <p className="text-gray-400 font-medium uppercase tracking-widest text-xs">
                                {step === 1 && 'Selecciona fecha y hora'}
                                {step === 2 && 'Elige tu mesa en el plano'}
                                {step === 3 && 'Confirma tus datos'}
                                {step === 4 && '¡Todo listo!'}
                            </p>
                        </div>

                        {step < 4 && (
                            <div className="space-y-4 pt-10 border-t border-white/10 mt-10">
                                <div className="flex items-center gap-3">
                                    <CalendarIcon className="w-5 h-5 text-orange-400" />
                                    <span className="text-sm font-bold">{format(date, 'PPPP', { locale: es })}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Clock className="w-5 h-5 text-orange-400" />
                                    <span className="text-sm font-bold">{time}h</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Users className="w-5 h-5 text-orange-400" />
                                    <span className="text-sm font-bold">{people} personas</span>
                                </div>
                                {selectedTable && (
                                    <div className="flex items-center gap-3 text-orange-400">
                                        <div className="w-5 h-5 rounded-full border-2 border-orange-400 flex items-center justify-center text-[10px] font-black">
                                            {selectedTable}
                                        </div>
                                        <span className="text-sm font-bold uppercase">Mesa Seleccionada</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Contenido Principal */}
                    <div className="flex-1 p-8 md:p-12 bg-white relative min-w-0">
                        <AnimatePresence mode="wait">
                            {/* PASO 1: CUANDO / CUANTOS */}
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-8"
                                >
                                    <div>
                                        <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 block">1. ¿Cuántos seréis?</label>
                                        <div className="flex flex-wrap gap-2">
                                            {[1, 2, 3, 4, 5, 6, 8, 10].map(n => (
                                                <button
                                                    key={n}
                                                    onClick={() => setPeople(n)}
                                                    className={`w-12 h-12 rounded-xl font-black transition-all ${people === n ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/30' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                                >
                                                    {n}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="w-full overflow-hidden">
                                        <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 block">2. ¿Qué día quieres venir?</label>
                                        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2">
                                            {Array.from({ length: 14 }).map((_, i) => {
                                                const d = addDays(new Date(), i);
                                                const isToday = i === 0;
                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => setDate(d)}
                                                        className={`flex-shrink-0 w-20 h-24 rounded-2xl flex flex-col items-center justify-center transition-all border-2 ${format(date, 'yyyy-MM-dd') === format(d, 'yyyy-MM-dd') ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-100 hover:border-orange-200 bg-white'}`}
                                                    >
                                                        <span className="text-[10px] font-black uppercase tracking-tighter opacity-60">
                                                            {format(d, 'EEE', { locale: es })}
                                                        </span>
                                                        <span className="text-2xl font-black">
                                                            {format(d, 'dd')}
                                                        </span>
                                                        {isToday && <span className="text-[8px] font-black uppercase text-orange-500">Hoy</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 block">3. ¿A qué hora?</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                                            {timeSlots.map(t => (
                                                <button
                                                    key={t}
                                                    onClick={() => setTime(t)}
                                                    className={`py-3 rounded-xl font-black text-sm transition-all ${time === t ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                                >
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={nextStep}
                                        className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-black transition-all group"
                                    >
                                        Ver mesas disponibles
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </motion.div>
                            )}

                            {/* PASO 2: MAPA DEL SALON */}
                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="h-full flex flex-col"
                                >
                                    <div className="flex justify-between items-center mb-6">
                                        <button onClick={prevStep} className="text-xs font-black uppercase flex items-center gap-1 text-gray-400 hover:text-gray-900">
                                            <ChevronLeft className="w-4 h-4" /> Atrás
                                        </button>
                                        <div className="flex gap-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                                <span className="text-[10px] font-black opacity-50 uppercase">Libre</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                                <span className="text-[10px] font-black opacity-50 uppercase">Ocupada</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contenedor del Plano SVG */}
                                    <div className="flex-1 bg-gray-50 rounded-[2rem] border-2 border-gray-100 overflow-hidden relative shadow-inner">
                                        {/* Dibujamos las mesas como componentes interactivos */}
                                        <div className="absolute inset-0 p-8">
                                            {tables.map((table: RestaurantTable) => {
                                                const isOccupied = occupiedTables.includes(table.id);
                                                const isSelected = selectedTable === table.id;

                                                return (
                                                    <motion.button
                                                        key={table.id}
                                                        onClick={() => !isOccupied && setSelectedTable(table.id)}
                                                        disabled={isOccupied}
                                                        style={{
                                                            left: `${table.x}%`,
                                                            top: `${table.y}%`,
                                                            width: table.type === 'stool' ? '25px' : '50px',
                                                            height: table.type === 'stool' ? '25px' : '50px',
                                                        }}
                                                        className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-xl flex items-center justify-center text-[10px] font-black transition-all border-2
                                                            ${isOccupied ? 'bg-red-500/10 border-red-500 text-red-500 opacity-40 cursor-not-allowed' :
                                                                isSelected ? 'bg-orange-500 border-white text-white scale-125 shadow-2xl z-20' :
                                                                    'bg-white border-emerald-500 text-emerald-600 hover:scale-110 hover:shadow-lg'}`}
                                                    >
                                                        {table.id}
                                                    </motion.button>
                                                );
                                            })}

                                            {/* Decoraciones del plano */}
                                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase text-gray-300 tracking-[0.5em] pointer-events-none">
                                                ENTRADA PRINCIPAL
                                            </div>
                                            <div className="absolute top-1/2 right-4 -rotate-90 text-[10px] font-black uppercase text-gray-300 tracking-[0.5em] pointer-events-none">
                                                ZONA BARRA
                                            </div>
                                            <div className="absolute top-4 left-10 flex items-center gap-2 pointer-events-none">
                                                <div className="w-8 h-1 bg-blue-100 rounded-full"></div>
                                                <span className="text-[10px] font-black text-blue-200">VENTANALES</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        disabled={!selectedTable}
                                        onClick={nextStep}
                                        className={`mt-8 w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] transition-all
                                            ${selectedTable ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/30' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
                                    >
                                        Continuar reserva
                                    </button>
                                </motion.div>
                            )}

                            {/* PASO 3: FORMULARIO FINAL */}
                            {step === 3 && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-6"
                                >
                                    <button onClick={prevStep} className="text-xs font-black uppercase flex items-center gap-1 text-gray-400 hover:text-gray-900">
                                        <ChevronLeft className="w-4 h-4" /> Plano del salón
                                    </button>

                                    <h4 className="text-2xl font-black uppercase tracking-tight">Casi lo tenemos</h4>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block tracking-widest">Nombre completo</label>
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Juan Pérez"
                                                    value={formData.name}
                                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-orange-500 transition-all font-bold"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block tracking-widest">Teléfono móvil</label>
                                            <div className="relative">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="tel"
                                                    placeholder="600 000 000"
                                                    value={formData.phone}
                                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-orange-500 transition-all font-bold"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block tracking-widest">Notas o peticiones (Opcional)</label>
                                            <div className="relative">
                                                <MessageSquare className="absolute left-4 top-4 w-4 h-4 text-gray-400" />
                                                <textarea
                                                    placeholder="Alergias, trona para bebé, celebración..."
                                                    value={formData.notes}
                                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 h-32 focus:outline-none focus:border-orange-500 transition-all font-bold resize-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-orange-50 p-4 rounded-2xl flex gap-3 border border-orange-100">
                                        <Info className="w-5 h-5 text-orange-500 flex-shrink-0" />
                                        <p className="text-[10px] text-orange-800 font-bold leading-relaxed uppercase">
                                            Recibirás un SMS de confirmación una vez que el restaurante verifique tu reserva.
                                        </p>
                                    </div>

                                    <button
                                        disabled={isSubmitting}
                                        onClick={handleBooking}
                                        className="w-full py-5 bg-orange-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-orange-500/30 hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? 'Procesando...' : 'Confirmar Reserva'}
                                    </button>
                                </motion.div>
                            )}

                            {/* PASO 4: EXITO */}
                            {step === 4 && (
                                <motion.div
                                    key="step4"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="h-full flex flex-col items-center justify-center text-center py-10"
                                >
                                    <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-500 mb-8 border-4 border-white shadow-xl">
                                        <CheckCircle2 className="w-12 h-12" />
                                    </div>
                                    <h3 className="text-4xl font-black uppercase tracking-tighter mb-4">¡Reserva Enviada!</h3>
                                    <p className="text-gray-500 font-medium max-w-sm mx-auto leading-relaxed mb-10">
                                        Hemos recibido tu solicitud para el <span className="text-gray-900 font-black">{format(date, 'dd MMMM', { locale: es })}</span> a las <span className="text-gray-900 font-black">{time}h</span>.
                                    </p>

                                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 w-full mb-10">
                                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">Número de Referencia</p>
                                        <p className="font-black text-2xl tracking-tighter">REMEI-{Math.random().toString(36).substring(7).toUpperCase()}</p>
                                    </div>

                                    <button
                                        onClick={() => window.location.reload()}
                                        className="text-orange-500 font-black uppercase tracking-widest text-xs border-b-2 border-orange-500 pb-1"
                                    >
                                        Volver al inicio
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </section>
    );
};
