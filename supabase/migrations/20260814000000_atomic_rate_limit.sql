-- Atomic rate limiter — mengganti read-modify-write di app/lib/rateLimit.ts
-- yang punya race: dua request bersamaan bisa baca count yang sama, keduanya
-- update ke N+1 (bukan N+2), sehingga limit bisa dilewati di bawah beban tinggi.
--
-- Function ini melakukan upsert atomik. Karena row-level lock di UPDATE portion
-- dari INSERT..ON CONFLICT, dua request paralel diserialisasi oleh Postgres.

create or replace function check_rate_limit(
  p_ip text,
  p_max_attempts int,
  p_window_ms int
) returns boolean
language plpgsql
as $$
declare
  v_now      timestamptz := now();
  v_reset_at timestamptz := v_now + make_interval(secs => p_window_ms / 1000.0);
  v_count    int;
begin
  insert into login_attempts (ip, count, reset_at)
  values (p_ip, 1, v_reset_at)
  on conflict (ip) do update
    set count    = case
                     when login_attempts.reset_at <= v_now then 1
                     else login_attempts.count + 1
                   end,
        reset_at = case
                     when login_attempts.reset_at <= v_now then v_reset_at
                     else login_attempts.reset_at
                   end
  returning count into v_count;

  return v_count <= p_max_attempts;
end;
$$;
