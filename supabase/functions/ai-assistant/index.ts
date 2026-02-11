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
        let messages = [];
        try {
            const body = await req.json();
            messages = body.messages || [];
        } catch (e) {
            console.error("Error parsing request body:", e);
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
                .select('name, price, category, description')
                .eq('is_available', true);

            if (products && products.length > 0) {
                menuContext = products.map(p =>
                    `${p.name} (${p.category}): ${p.price}€. ${p.description || ''}`
                ).join('\n');
            }
        } catch (dbErr) {
            console.error("DB Fetch Error:", dbErr.message);
        }

        // Usamos llama-3.3-70b-versatile o llama-3.1-8b-instant ya que llama3-8b-8192 está obsoleta
        const MODEL = 'llama-3.1-8b-instant';

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: `Eres el asistente de El Remei. Menú:\n${menuContext}\nResponde de forma hospitalaria, corta y en el idioma del usuario.` },
                    ...messages
                ],
                temperature: 0.7,
                max_tokens: 300,
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
