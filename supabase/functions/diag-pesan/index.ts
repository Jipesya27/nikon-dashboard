import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://hfqnlttxxrqarmpvtnhu.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const diagResults: Record<string, any> = {};

  // Test 1: Cek env keys
  diagResults.env_keys = Object.keys(Deno.env.toObject());
  diagResults.service_role_key_preview = SUPABASE_SERVICE_ROLE_KEY.substring(0, 10) + "..." + SUPABASE_SERVICE_ROLE_KEY.substring(SUPABASE_SERVICE_ROLE_KEY.length - 10);

  // Test 2: Insert Konsumen
  const testNomorWa = '6280000DIAG';
  const { data: konsData, error: konsErr } = await supabase
    .from('konsumen')
    .insert({ nomor_wa: testNomorWa, id_konsumen: 'ANDIAG', status_langkah: 'START' })
    .select();
  diagResults.konsumen_insert = { data: konsData, error: konsErr };

  // Test 3: Insert riwayat_pesan
  const waktuSekarang = new Date().toISOString();
  const { data: insertData, error: insertError } = await supabase
    .from('riwayat_pesan')
    .insert({
      nomor_wa: testNomorWa,
      nama_profil_wa: 'Diagnostik',
      arah_pesan: 'IN',
      isi_pesan: 'Test diagnostik',
      waktu_pesan: waktuSekarang
    })
    .select();

  diagResults.insert_with_waktu = {
    data: insertData,
    error: insertError ? {
      message: insertError.message,
      code: (insertError as any).code,
      details: (insertError as any).details,
      hint: (insertError as any).hint
    } : null
  };

  // Test 3: Insert TANPA waktu_pesan
  const { data: insertData2, error: insertError2 } = await supabase
    .from('riwayat_pesan')
    .insert({
      nomor_wa: '6280000DIAG2',
      nama_profil_wa: 'Diagnostik2',
      arah_pesan: 'IN',
      isi_pesan: 'Test tanpa waktu_pesan'
    })
    .select();

  diagResults.insert_without_waktu = {
    data: insertData2,
    error: insertError2 ? {
      message: insertError2.message,
      code: (insertError2 as any).code,
      details: (insertError2 as any).details,
      hint: (insertError2 as any).hint
    } : null
  };

  return new Response(JSON.stringify(diagResults, null, 2), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
