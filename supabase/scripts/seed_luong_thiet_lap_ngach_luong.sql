-- ============================================================================
-- Seed mẫu: public.luong_thiet_lap_ngach_luong
-- ============================================================================
-- Điều kiện: migration `20260611180000_luong_thiet_lap.sql` (trigger tạo B1–B9).
--
-- Idempotent: bỏ qua nếu đã có `ten` bắt đầu `SEED-LUONG-NGACH|`.
-- Xóa seed: `DELETE FROM public.luong_thiet_lap_ngach_luong WHERE ten LIKE 'SEED-LUONG-NGACH|%';`
--   (CASCADE xóa luôn bậc con).
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.luong_thiet_lap_ngach_luong WHERE ten LIKE 'SEED-LUONG-NGACH|%') THEN
    RAISE NOTICE 'seed_luong_thiet_lap_ngach_luong: đã có bản ghi seed (bỏ qua).';
    RETURN;
  END IF;

  INSERT INTO public.luong_thiet_lap_ngach_luong (ma, ten, mo_ta, thu_tu) VALUES
    ('CV01', 'SEED-LUONG-NGACH|Chuyên viên cao cấp', 'Ngạch mẫu (seed).', 10),
    ('CV02', 'SEED-LUONG-NGACH|Chuyên viên chính', 'Ngạch mẫu (seed).', 20),
    ('CV03', 'SEED-LUONG-NGACH|Chuyên viên', 'Ngạch mẫu (seed).', 30);

  RAISE NOTICE 'seed_luong_thiet_lap_ngach_luong: đã tạo 3 ngạch (mỗi ngạch có B1–B9 do trigger).';
END $$;
