-- ============================================================================
-- Seed / đồng bộ: public.luong_thiet_lap_cau_hinh (mức lương cơ sở — singleton)
-- ============================================================================
-- Điều kiện: migration `20260611180000_luong_thiet_lap.sql`.
--
-- Idempotent: chỉ INSERT khi chưa có dòng id = 1 (ON CONFLICT DO NOTHING — không ghi đè MLCS đã chỉnh trên UI).
-- ============================================================================

INSERT INTO public.luong_thiet_lap_cau_hinh (id, muc_luong_co_so)
VALUES (1, 2340000.00)
ON CONFLICT (id) DO NOTHING;
