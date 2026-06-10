$TOKEN   = "EAAUF7kW7tjABRgVJ3tjZAzoZCxF5ZAZBTtEYx3ozPiIGmOvhG6AQDZBZBpeXiNqENk1TW8h27QJddLW1HOUKwbe946wrVmYkZAetlvTSz7QyTcMUZAcbF3VgZAvS9XfTEw0DWmZAQO0tK8PuHNZCPZAwXjiM7tC0BuZB0Tz45aQEGKRUADodDZBaOzt12jEp54xNa2XRmoRQZDZD"
$WABA_ID = "27367113462975131"
$BASE    = "https://graph.facebook.com/v25.0/$WABA_ID/message_templates"
$HEADERS = @{ Authorization = "Bearer $TOKEN"; "Content-Type" = "application/json" }

# ── Template 1: notif_lending_init ───────────────────────────────────────────
$t1 = @{
  name     = "notif_lending_init"
  language = "id"
  category = "UTILITY"
  components = @(
    @{
      type   = "HEADER"
      format = "DOCUMENT"
    },
    @{
      type = "BODY"
      text = "Halo {{1}}, terima kasih telah meminjam peralatan dari kami.`n`nBerikut dokumen rincian peminjaman Anda. Mohon disimpan sebagai referensi dan pastikan peralatan dijaga dengan baik.`n`nEstimasi pengembalian: {{2}}.`n`nKami siap membantu jika ada pertanyaan."
    },
    @{
      type = "FOOTER"
      text = "Alta Nikindo"
    }
  )
} | ConvertTo-Json -Depth 10

Write-Host "`n=== Membuat template: notif_lending_init ===" -ForegroundColor Cyan
$r1 = Invoke-RestMethod -Uri $BASE -Method POST -Headers $HEADERS -Body $t1 -ErrorAction SilentlyContinue
if ($r1.id) {
  Write-Host "BERHASIL - ID: $($r1.id)" -ForegroundColor Green
} else {
  Write-Host "GAGAL: $($r1 | ConvertTo-Json)" -ForegroundColor Red
}

# ── Template 2: notif_lending_return ─────────────────────────────────────────
$t2 = @{
  name     = "notif_lending_return"
  language = "id"
  category = "UTILITY"
  components = @(
    @{
      type   = "HEADER"
      format = "DOCUMENT"
    },
    @{
      type = "BODY"
      text = "Halo {{1}}, peralatan yang Anda pinjam telah berhasil kami terima kembali pada {{2}}.`n`nTerlampir dokumen rincian pengembalian untuk arsip Anda.`n`nTerima kasih atas kepercayaan dan kerja samanya. Sampai jumpa kembali!"
    },
    @{
      type = "FOOTER"
      text = "Alta Nikindo"
    }
  )
} | ConvertTo-Json -Depth 10

Write-Host "`n=== Membuat template: notif_lending_return ===" -ForegroundColor Cyan
$r2 = Invoke-RestMethod -Uri $BASE -Method POST -Headers $HEADERS -Body $t2 -ErrorAction SilentlyContinue
if ($r2.id) {
  Write-Host "BERHASIL - ID: $($r2.id)" -ForegroundColor Green
} else {
  Write-Host "GAGAL: $($r2 | ConvertTo-Json)" -ForegroundColor Red
}

Write-Host "`nSelesai. Cek status approval di tab WA Templates dashboard." -ForegroundColor Yellow
