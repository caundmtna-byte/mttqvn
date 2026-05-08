-- ============================================================================
-- Mặt trận Tổ quốc: điểm danh ủy viên theo kỳ họp
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mttq_diem_danh_uy_vien (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ky_hop_id       BIGINT NOT NULL
                  CONSTRAINT mttq_diem_danh_uy_vien_ky_hop_id_fkey
                  REFERENCES public.mttq_ky_hop (id)
                  ON UPDATE CASCADE ON DELETE RESTRICT,
  uy_vien_id      BIGINT NOT NULL
                  CONSTRAINT mttq_diem_danh_uy_vien_uy_vien_id_fkey
                  REFERENCES public.mttq_uy_vien_uy_ban (id)
                  ON UPDATE CASCADE ON DELETE RESTRICT,
  trang_thai      TEXT NOT NULL
                  CONSTRAINT mttq_diem_danh_uy_vien_trang_thai_check
                  CHECK (trang_thai IN ('Có mặt', 'Vắng mặt')),
  ghi_chu         TEXT,
  id_nguoi_tao    BIGINT NOT NULL
                  CONSTRAINT mttq_diem_danh_uy_vien_id_nguoi_tao_fkey
                  REFERENCES public.var_nhan_vien (id)
                  ON UPDATE CASCADE ON DELETE RESTRICT,
  tg_tao          TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mỗi ủy viên chỉ có 1 bản ghi điểm danh cho mỗi kỳ họp
CREATE UNIQUE INDEX IF NOT EXISTS uq_mttq_diem_danh_ky_hop_uy_vien
  ON public.mttq_diem_danh_uy_vien (ky_hop_id, uy_vien_id);

CREATE INDEX IF NOT EXISTS idx_mttq_diem_danh_ky_hop    ON public.mttq_diem_danh_uy_vien (ky_hop_id);
CREATE INDEX IF NOT EXISTS idx_mttq_diem_danh_uy_vien   ON public.mttq_diem_danh_uy_vien (uy_vien_id);
CREATE INDEX IF NOT EXISTS idx_mttq_diem_danh_trang_thai ON public.mttq_diem_danh_uy_vien (trang_thai);
CREATE INDEX IF NOT EXISTS idx_mttq_diem_danh_nguoi_tao  ON public.mttq_diem_danh_uy_vien (id_nguoi_tao);

DROP TRIGGER IF EXISTS trg_mttq_diem_danh_uy_vien_updated ON public.mttq_diem_danh_uy_vien;
CREATE TRIGGER trg_mttq_diem_danh_uy_vien_updated
  BEFORE UPDATE ON public.mttq_diem_danh_uy_vien
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

ALTER TABLE public.mttq_diem_danh_uy_vien ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mttq_diem_danh_uy_vien_select ON public.mttq_diem_danh_uy_vien;
CREATE POLICY mttq_diem_danh_uy_vien_select ON public.mttq_diem_danh_uy_vien
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS mttq_diem_danh_uy_vien_modify ON public.mttq_diem_danh_uy_vien;
CREATE POLICY mttq_diem_danh_uy_vien_modify ON public.mttq_diem_danh_uy_vien
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- View tóm tắt điểm danh theo kỳ họp
-- ============================================================================

CREATE OR REPLACE VIEW public.v_diem_danh_ky_hop_summary AS
SELECT
  kh.id                                                    AS ky_hop_id,
  kh.nhiem_ky_id,
  kh.ky_thu,
  kh.ngay_hop,
  COUNT(dd.id)                                             AS tong_diem_danh,
  COUNT(dd.id) FILTER (WHERE dd.trang_thai = 'Có mặt')    AS co_mat,
  COUNT(dd.id) FILTER (WHERE dd.trang_thai = 'Vắng mặt')  AS vang_mat
FROM public.mttq_ky_hop kh
LEFT JOIN public.mttq_diem_danh_uy_vien dd ON dd.ky_hop_id = kh.id
GROUP BY kh.id, kh.nhiem_ky_id, kh.ky_thu, kh.ngay_hop;
