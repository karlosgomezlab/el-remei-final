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
        const { type, orderId, tableNumber, items, totalAmount, customerId, amount } = body;

        // --- PAGO POR DEUDA ---
        if (type === 'debt') {
            console.log(`Processing debt payment for customer ${customerId}: ${amount}€`);

            // Actualizar deuda del cliente
            const { error: customerError } = await supabase
                .from('customers')
                .update({ current_debt: 0 })
                .eq('id', customerId);

            if (customerError) throw customerError;

            // Marcar todos los pedidos a crédito como pagados
            const { error: ordersError } = await supabase
                .from('orders')
                .update({ is_paid: true })
                .eq('customer_id', customerId)
                .eq('payment_method', 'credit')
                .eq('is_paid', false);

            if (ordersError) {
                console.error("Error updating related orders:", ordersError);
            }

            const successUrl = `${req.headers.get('origin')}/mesa/${tableNumber}/success?type=debt`;
            return new Response(
                JSON.stringify({ url: successUrl }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
        }

        // --- PAGO POR PEDIDO (EXISTENTE) ---
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

        // Simulación de éxito para pedidos
        const { error: updateError } = await supabase
            .from('orders')
            .update({
                is_paid: true,
                status: 'cooking'
            })
            .eq('id', orderId);

        if (updateError) throw updateError;

        const successUrl = `${req.headers.get('origin')}/mesa/${tableNumber}/success`;
        return new Response(
            JSON.stringify({ url: successUrl }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error) {
        console.error("FUNCTION ERROR:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
});
