import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@11.1.0"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    apiVersion: '2022-11-15',
    httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

serve(async (req) => {
    const signature = req.headers.get("stripe-signature");

    try {
        const body = await req.text();
        const event = stripe.webhooks.constructEvent(
            body,
            signature!,
            Deno.env.get('STRIPE_WEBHOOK_SECRET')!
        );

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const orderId = session.metadata.orderId;

            // ACTUALIZAR ESTADO EN BASE DE DATOS
            const { error } = await supabase
                .from('orders')
                .update({
                    is_paid: true,
                    status: 'cooking' // Se envía a cocina automáticamente al pagar
                })
                .eq('id', orderId);

            if (error) throw error;
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 });
    } catch (err) {
        return new Response(`Error: ${err.message}`, { status: 400 });
    }
});
