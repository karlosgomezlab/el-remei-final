import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@11.1.0"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    apiVersion: '2022-11-15',
    httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const body = await req.json();
        console.log("Request Body:", JSON.stringify(body, null, 2));
        const { orderId, tableNumber, items, totalAmount } = body;

        // 0. Lógica de Saturación: Máximo 10 pedidos en cola
        const { count, error: countError } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .in('status', ['pending', 'cooking']);

        if (countError) throw countError;
        if (count && count >= 10) {
            return new Response(
                JSON.stringify({ error: 'Saturación en cocina. Por favor, espera unos minutos antes de pedir.' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
            );
        }

        // 1. Crear línea de productos para Stripe
        const line_items = items.map((item: any) => ({
            price_data: {
                currency: 'eur',
                product_data: {
                    name: item.name,
                },
                unit_amount: Math.round(item.price * 100),
            },
            quantity: item.qty || 1,
        }));

        // --- MODO SIMULACIÓN (Pago Ficticio) ---
        // En un entorno real, aquí llamaríamos a Stripe.
        // Como estamos en modo demo, actualizamos el pedido directamente.

        const { error: updateError } = await supabase
            .from('orders')
            .update({
                is_paid: true,
                status: 'cooking'
            })
            .eq('id', orderId);

        if (updateError) throw updateError;

        // Retornamos la URL de éxito directamente
        const successUrl = `${req.headers.get('origin')}/mesa/${tableNumber}/success`;

        return new Response(
            JSON.stringify({ url: successUrl }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

        /* 
        // --- CÓDIGO STRIPE (COMENTADO HASTA TENER KEYS) ---
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items,
            mode: 'payment',
            success_url: `${req.headers.get('origin')}/mesa/${tableNumber}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.get('origin')}/mesa/${tableNumber}`,
            metadata: {
                orderId: orderId,
                tableNumber: tableNumber.toString(),
            },
        });

        return new Response(
            JSON.stringify({ url: session.url }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
        */
    } catch (error) {
        console.error("FUNCTION ERROR:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
});
