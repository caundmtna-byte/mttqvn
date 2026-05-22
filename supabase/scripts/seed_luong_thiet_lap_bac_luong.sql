-- ============================================================================
-- Seed mẫu: cập nhật hệ số bậc lương cho ngạch SEED-LUONG-NGACH|
-- ============================================================================
-- Điều kiện: `seed_luong_thiet_lap_ngach_luong.sql` đã chạy (có ngạch + 9 bậc/he_so=1).
--
-- Gán hệ số demo tăng dần theo bậc (B1 nhỏ → B9 lớn), mỗi ngạch cùng thang mẫu.
-- Idempotent: chỉ UPDATE các dòng thuộc ngạch seed; có thể chạy lại an toàn.
-- ============================================================================

-- B1=1.00, B2=1.15, …, B9=2.20

DO $$
DECLARE
  n INTEGER;
BEGIN
  UPDATE public.luong_thiet_lap_bac_luong b
  SET he_so = (1.0 + (substring(b.ma_bac FROM 2)::integer - 1) * 0.15)::numeric(10, 4)
  FROM public.luong_thiet_lap_ngach_luong n
  WHERE b.ngach_id = n.id
    AND n.ten LIKE 'SEED-LUONG-NGACH|%';

  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN
    RAISE NOTICE 'seed_luong_thiet_lap_bac_luong: đã cập nhật % hệ số (bậc ngạch seed).', n;
  ELSE
    RAISE NOTICE 'seed_luong_thiet_lap_bac_luong: không có dòng seed để cập nhật (chạy seed ngạch trước).';
  END IF;
END $$;
