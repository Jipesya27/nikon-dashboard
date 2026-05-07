import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Token akan otomatis diambil dari Supabase Secrets
const FONNTE_TOKEN = Deno.env.get("FONNTE_TOKEN") || "";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS Preflight untuk Vercel
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { target, message } = await req.json();

    if (!target || !message) {
        return new Response(JSON.stringify({ error: "Target dan message wajib diisi" }), { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
    }

    const params = new URLSearchParams();
    params.append('target', target);
    params.append('message', message);

    // Hit ke API Fonnte dari Server Supabase
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': FONNTE_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});