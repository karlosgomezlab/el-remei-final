import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        let messages: any[] = [];
        let cartContext = "El carrito está vacío.";
        try {
            const body = await req.json();
            messages = body.messages || [];
            const cartItems = body.cart || [];
            if (cartItems.length > 0) {
                cartContext = "PEDIDO ACTUAL DEL CLIENTE (Ya está en el carrito):\n" +
                    cartItems.map((item: any) => `- ${item.name} (ID: ${item.id}) x${item.qty}`).join('\n');
            }
        } catch (e) {
            console.error("Error parsing request body or cart:", e);
        }

        const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
        const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!GROQ_API_KEY) throw new Error("ERROR_CONFIG: GROQ_API_KEY missing");
        if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("ERROR_CONFIG: Supabase env missing");

        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

        let menuContext = "No hay platos disponibles ahora mismo.";
        try {
            const { data: products } = await supabase
                .from('products')
                .select('id, name, price, category, description')
                .eq('is_available', true);

            if (products && products.length > 0) {
                menuContext = products.map(p =>
                    `- ${p.name}: ${p.price}€. (ID_INTERNO: ${p.id}). ${p.description || ''}`
                ).join('\n');
            }
        } catch (dbErr: any) {
            console.error("DB Fetch Error:", dbErr.message);
        }

        const MODEL = 'llama-3.1-8b-instant';

        const systemPrompt = `Eres el asistente experto de El Remei. Eres amable, eficiente y conoces nuestra carta a la perfección.

INFORMACIÓN DEL MENÚ:
${menuContext}

ESTADO ACTUAL DEL PEDIDO DEL CLIENTE:
${cartContext}

REGLAS CRÍTICAS DE ACTUACIÓN (IA OPERATIVA):
1. Si el usuario te pide añadir platos, DEBES responder confirmando la acción y añadir la etiqueta [ACTION_ADD_TO_CART:ID_INTERNO] al final.
2. NUNCA menciones el "ID_INTERNO" ni el "ID" en tu respuesta de texto al usuario. El usuario no debe ver códigos técnicos.
3. Si el usuario pide algo que ya está en el pedido, pregúntale si quiere una unidad adicional. 
4. Si el usuario pide varios platos a la vez, añade una etiqueta por cada plato.
5. NO inventes platos. Si no está en la lista de arriba, dile que no lo tenemos.
6. Tu tono debe ser servicial y profesional.

EJEMPLO DE RESPUESTA CORRECTA:
"¡Excelente elección! Te añado la Ensalada Mediterránea y la Mirinda ahora mismo. ¿Te apetece algo más? [ACTION_ADD_TO_CART:id-ensalada] [ACTION_ADD_TO_CART:id-mirinda]"`;

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages
                ],
                temperature: 0.7,
                max_tokens: 500,
            }),
        });

        const data = await groqRes.json();

        if (!groqRes.ok || data.error) {
            throw new Error(`GROQ_ERROR: ${data.error?.message || groqRes.statusText}`);
        }

        const reply = data.choices?.[0]?.message?.content || "No he podido generar una respuesta.";

        return new Response(JSON.stringify({ content: reply }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error("EDGE FUNCTION ERROR:", error.message);
        return new Response(JSON.stringify({
            content: null,
            error: error.message
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }
})
