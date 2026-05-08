-- ============================================================================
-- Công việc ↔ Chương trình năm (FK tùy chọn) + ghi chú trên chương trình
-- ============================================================================

ALTER TABLE public.cong_viec_danh_sach
  ADD COLUMN IF NOT EXISTS id_chuong_trinh BIGINT
  REFERENCES public.chuong_trinh_nam (id)
  ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cong_viec_danh_sach_chuong_trinh
  ON public.cong_viec_danh_sach (id_chuong_trinh)
  WHERE id_chuong_trinh IS NOT NULL;

ALTER TABLE public.chuong_trinh_nam
  ADD COLUMN IF NOT EXISTS ghi_chu TEXT;
