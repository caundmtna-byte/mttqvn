-- ============================================================================
-- DTTG Dịp thăm hỏi — thêm phòng ban tham mưu trên bảng cha (nếu đã tạo trước đó)
-- ============================================================================

ALTER TABLE public.dttg_dip_tham_hoi
  ADD COLUMN IF NOT EXISTS phong_ban_tham_muu_id BIGINT
    CONSTRAINT dttg_dip_tham_hoi_phong_ban_tham_muu_id_fkey
    REFERENCES public.var_phong_ban (id)
    ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_dttg_dip_tham_hoi_phong_ban
  ON public.dttg_dip_tham_hoi (phong_ban_tham_muu_id);
