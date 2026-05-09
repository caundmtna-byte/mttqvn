-- ============================================================================
-- var_chuc_vu.cap_quan_ly — Cấp quản lý (Tỉnh | Xã phường), tùy chọn.
-- ============================================================================

ALTER TABLE public.var_chuc_vu
  ADD COLUMN IF NOT EXISTS cap_quan_ly TEXT;

ALTER TABLE public.var_chuc_vu
  DROP CONSTRAINT IF EXISTS var_chuc_vu_cap_quan_ly_check;

ALTER TABLE public.var_chuc_vu
  ADD CONSTRAINT var_chuc_vu_cap_quan_ly_check
  CHECK (cap_quan_ly IS NULL OR cap_quan_ly IN ('Tỉnh', 'Xã phường'));

CREATE INDEX IF NOT EXISTS idx_var_chuc_vu_cap_quan_ly
  ON public.var_chuc_vu (cap_quan_ly);

COMMENT ON COLUMN public.var_chuc_vu.cap_quan_ly IS
  'Cấp quản lý: Tỉnh hoặc Xã phường; NULL = chưa xác định.';
