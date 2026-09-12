-- ============================================================================
-- Lịch chạy hằng ngày cho hàm sinh thông báo (pg_cron)
--
-- Đã kiểm tra trên chính database sản xuất: `pg_cron` có trong
-- `pg_available_extensions` và `CREATE EXTENSION` chạy được, nên đây là job nền
-- THẬT ở phía Postgres — ứng dụng không phải tự gọi khi người dùng đăng nhập.
--
-- Giờ chạy: 01:00 UTC = 08:00 giờ Việt Nam, tức là ngay đầu giờ làm việc, thông
-- báo đã nằm sẵn trong chuông. pg_cron dùng giờ UTC nên KHÔNG viết 08:00 ở đây.
--
-- Idempotent: gỡ lịch cũ trùng tên rồi đặt lại.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
DECLARE
  v_jobid bigint;
BEGIN
  -- Gỡ mọi lịch cũ cùng tên (kể cả khi đổi giờ/đổi câu lệnh) trước khi đặt lại.
  FOR v_jobid IN
    SELECT jobid FROM cron.job WHERE jobname = 'thong_bao_sinh_nhac_viec'
  LOOP
    PERFORM cron.unschedule(v_jobid);
  END LOOP;

  PERFORM cron.schedule(
    'thong_bao_sinh_nhac_viec',
    '0 1 * * *',
    $cmd$SELECT public.fn_thong_bao_sinh_nhac_viec();$cmd$
  );
END;
$$;

-- Dọn thông báo đã đọc quá 60 ngày — hộp thông báo không phải kho lưu trữ, và
-- bảng này chỉ có thể phình theo thời gian nếu không ai dọn.
DO $$
DECLARE
  v_jobid bigint;
BEGIN
  FOR v_jobid IN
    SELECT jobid FROM cron.job WHERE jobname = 'thong_bao_don_cu'
  LOOP
    PERFORM cron.unschedule(v_jobid);
  END LOOP;

  PERFORM cron.schedule(
    'thong_bao_don_cu',
    '30 1 * * *',
    $cmd$DELETE FROM public.thong_bao WHERE da_doc AND tg_tao < now() - INTERVAL '60 days';$cmd$
  );
END;
$$;
