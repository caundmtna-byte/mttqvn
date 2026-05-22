-- ============================================================================
-- kho_danh_sach_kho: don_vi_id tùy chọn (nullable)
-- ============================================================================

ALTER TABLE public.kho_danh_sach_kho
  DROP CONSTRAINT IF EXISTS kho_danh_sach_kho_don_vi_id_fkey;

ALTER TABLE public.kho_danh_sach_kho
  ALTER COLUMN don_vi_id DROP NOT NULL;

ALTER TABLE public.kho_danh_sach_kho
  ADD CONSTRAINT kho_danh_sach_kho_don_vi_id_fkey
  FOREIGN KEY (don_vi_id) REFERENCES public.var_ssn_xa_phuong (id)
  ON UPDATE CASCADE ON DELETE SET NULL;
