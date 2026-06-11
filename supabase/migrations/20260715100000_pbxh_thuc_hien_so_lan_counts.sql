-- ============================================================================
-- PBXH — Thêm số lần hoàn thành / khảo sát, tự tính % hoàn thành
-- ============================================================================

ALTER TABLE public.pbxh_thuc_hien_phan_bien_xa_hoi
  ADD COLUMN IF NOT EXISTS so_lan_hoan_thanh INTEGER NOT NULL DEFAULT 0
    CHECK (so_lan_hoan_thanh >= 0),
  ADD COLUMN IF NOT EXISTS so_lan_khao_sat INTEGER NOT NULL DEFAULT 0
    CHECK (so_lan_khao_sat >= 0);

-- Giữ tỷ lệ cũ (nếu có): coi mẫu khảo sát = 100
UPDATE public.pbxh_thuc_hien_phan_bien_xa_hoi
SET
  so_lan_khao_sat = CASE WHEN phan_tram_hoan_thanh > 0 THEN 100 ELSE 0 END,
  so_lan_hoan_thanh = CASE WHEN phan_tram_hoan_thanh > 0 THEN phan_tram_hoan_thanh ELSE 0 END
WHERE so_lan_khao_sat = 0 AND so_lan_hoan_thanh = 0;

CREATE OR REPLACE FUNCTION public.pbxh_thuc_hien_sync_phan_tram_hoan_thanh()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.so_lan_khao_sat > 0 THEN
    NEW.phan_tram_hoan_thanh := LEAST(
      100,
      GREATEST(0, ROUND(NEW.so_lan_hoan_thanh::numeric / NEW.so_lan_khao_sat * 100))
    )::smallint;
  ELSE
    NEW.phan_tram_hoan_thanh := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pbxh_thuc_hien_sync_phan_tram
  ON public.pbxh_thuc_hien_phan_bien_xa_hoi;

CREATE TRIGGER trg_pbxh_thuc_hien_sync_phan_tram
  BEFORE INSERT OR UPDATE OF so_lan_hoan_thanh, so_lan_khao_sat
  ON public.pbxh_thuc_hien_phan_bien_xa_hoi
  FOR EACH ROW
  EXECUTE FUNCTION public.pbxh_thuc_hien_sync_phan_tram_hoan_thanh();

-- Đồng bộ % cho dữ liệu đã backfill
UPDATE public.pbxh_thuc_hien_phan_bien_xa_hoi
SET so_lan_hoan_thanh = so_lan_hoan_thanh
WHERE so_lan_khao_sat > 0 OR so_lan_hoan_thanh > 0;
