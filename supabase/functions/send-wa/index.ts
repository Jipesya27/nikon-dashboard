import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const WHATSAPP_ACCESS_TOKEN   = Deno.env.get("WHATSAPP_ACCESS_TOKEN")   || "";
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function toE164(nomor: string): string {
  if (nomor.startsWith('+')) return nomor.slice(1);
  if (nomor.startsWith('0')) return '62' + nomor.slice(1);
  return nomor;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { target, message, templateName, params } = await req.json();

    if (!target) {
      return new Response(
        JSON.stringify({ error: "target wajib diisi" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const to = toE164(target);

    let body: unknown;

    if (templateName) {
      // Template message — bekerja di luar 24-jam window
      const paramsArr: string[] = Array.isArray(params) ? params : [];
      body = {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'id' },
          components: paramsArr.length > 0
            ? [{ type: 'body', parameters: paramsArr.map((p: string) => ({ type: 'text', text: p })) }]
            : [],
        },
      };
    } else {
      // Free-form message — hanya dalam 24-jam customer service window
      if (!message) {
        return new Response(
          JSON.stringify({ error: "message atau templateName wajib diisi" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      body = {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message },
      };
    }

    const response = await fetch(
      `https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.ok ? 200 : 500,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
