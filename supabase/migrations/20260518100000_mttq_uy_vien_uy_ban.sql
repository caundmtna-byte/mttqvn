-- ============================================================================
-- Mặt trận Tổ quốc: ủy viên ủy ban (FK nhiệm kỳ + đơn vị xã/phường + người tạo)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mttq_uy_vien_uy_ban (
  id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ma_uv                  TEXT,
  nhiem_ky_id            BIGINT NOT NULL
                         CONSTRAINT mttq_uy_vien_uy_ban_nhiem_ky_id_fkey
                         REFERENCES public.mttq_nhiem_ky (id)
                         ON UPDATE CASCADE ON DELETE RESTRICT,
  don_vi_id              BIGINT
                         CONSTRAINT mttq_uy_vien_uy_ban_don_vi_id_fkey
                         REFERENCES public.var_ssn_xa_phuong (id)
                         ON UPDATE CASCADE ON DELETE RESTRICT,
  ho_va_ten              TEXT NOT NULL,
  chuc_vu_don_vi         TEXT,
  ngay_sinh              DATE,
  gioi_tinh              TEXT,
  trang_thai_tham_gia    TEXT,
  ngay_nhap_trang_thai   DATE,
  van_hoa                TEXT,
  trinh_do_cm            TEXT,
  trinh_do_llct          TEXT,
  dan_toc                TEXT,
  ton_giao               TEXT,
  dang_vien              BOOLEAN NOT NULL DEFAULT false,
  ngay_vao_dang          DATE,
  que_quan               TEXT,
  noi_o_hien_nay         TEXT,
  so_dien_thoai          TEXT,
  ghi_chu                TEXT,
  id_nguoi_tao           BIGINT NOT NULL
                         CONSTRAINT mttq_uy_vien_uy_ban_id_nguoi_tao_fkey
                         REFERENCES public.var_nhan_vien (id)
                         ON UPDATE CASCADE ON DELETE RESTRICT,
  tg_tao                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mttq_uy_vien_uy_ban_nhiem_ky ON public.mttq_uy_vien_uy_ban (nhiem_ky_id);
CREATE INDEX IF NOT EXISTS idx_mttq_uy_vien_uy_ban_don_vi    ON public.mttq_uy_vien_uy_ban (don_vi_id);
CREATE INDEX IF NOT EXISTS idx_mttq_uy_vien_uy_ban_ho_ten    ON public.mttq_uy_vien_uy_ban (lower(trim(ho_va_ten)));
CREATE INDEX IF NOT EXISTS idx_mttq_uy_vien_uy_ban_nguoi_t ON public.mttq_uy_vien_uy_ban (id_nguoi_tao);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mttq_uy_vien_uy_ban_nhiem_ky_ma_uv
  ON public.mttq_uy_vien_uy_ban (nhiem_ky_id, lower(trim(ma_uv)))
  WHERE ma_uv IS NOT NULL AND btrim(ma_uv) <> '';

DROP TRIGGER IF EXISTS trg_mttq_uy_vien_uy_ban_updated ON public.mttq_uy_vien_uy_ban;
CREATE TRIGGER trg_mttq_uy_vien_uy_ban_updated
  BEFORE UPDATE ON public.mttq_uy_vien_uy_ban
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

-- Cập nhật tg_cap_nhat bảng nhiệm kỳ khi thêm/sửa/xóa ủy viên
CREATE OR REPLACE FUNCTION public.mttq_uy_vien_uy_ban_touch_nhiem_ky()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  pid bigint;
BEGIN
  pid := COALESCE(NEW.nhiem_ky_id, OLD.nhiem_ky_id);
  IF pid IS NOT NULL THEN
    UPDATE public.mttq_nhiem_ky SET tg_cap_nhat = now() WHERE id = pid;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_mttq_uy_vien_uy_ban_touch_nhiem_ky ON public.mttq_uy_vien_uy_ban;
CREATE TRIGGER trg_mttq_uy_vien_uy_ban_touch_nhiem_ky
  AFTER INSERT OR UPDATE OR DELETE ON public.mttq_uy_vien_uy_ban
  FOR EACH ROW EXECUTE FUNCTION public.mttq_uy_vien_uy_ban_touch_nhiem_ky();

ALTER TABLE public.mttq_uy_vien_uy_ban ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mttq_uy_vien_uy_ban_select ON public.mttq_uy_vien_uy_ban;
CREATE POLICY mttq_uy_vien_uy_ban_select ON public.mttq_uy_vien_uy_ban
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS mttq_uy_vien_uy_ban_modify ON public.mttq_uy_vien_uy_ban;
CREATE POLICY mttq_uy_vien_uy_ban_modify ON public.mttq_uy_vien_uy_ban
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
