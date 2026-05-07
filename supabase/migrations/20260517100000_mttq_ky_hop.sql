-- ============================================================================
-- Mặt trận Tổ quốc: kỳ họp (FK nhiệm kỳ + đơn vị xã/phường + người tạo)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mttq_ky_hop (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nhiem_ky_id         BIGINT NOT NULL
                      CONSTRAINT mttq_ky_hop_nhiem_ky_id_fkey
                      REFERENCES public.mttq_nhiem_ky (id)
                      ON UPDATE CASCADE ON DELETE RESTRICT,
  don_vi_id           BIGINT
                      CONSTRAINT mttq_ky_hop_don_vi_id_fkey
                      REFERENCES public.var_ssn_xa_phuong (id)
                      ON UPDATE CASCADE ON DELETE RESTRICT,
  ky_thu              TEXT NOT NULL,
  ngay_hop            DATE,
  noi_dung_ky_hop     TEXT,
  tai_lieu_hop        TEXT,
  ghi_chu             TEXT,
  id_nguoi_tao        BIGINT NOT NULL
                      CONSTRAINT mttq_ky_hop_id_nguoi_tao_fkey
                      REFERENCES public.var_nhan_vien (id)
                      ON UPDATE CASCADE ON DELETE RESTRICT,
  tg_tao              TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mttq_ky_hop_nhiem_ky   ON public.mttq_ky_hop (nhiem_ky_id);
CREATE INDEX IF NOT EXISTS idx_mttq_ky_hop_don_vi    ON public.mttq_ky_hop (don_vi_id);
CREATE INDEX IF NOT EXISTS idx_mttq_ky_hop_ngay_hop  ON public.mttq_ky_hop (ngay_hop DESC);
CREATE INDEX IF NOT EXISTS idx_mttq_ky_hop_nguoi_tao ON public.mttq_ky_hop (id_nguoi_tao);

DROP TRIGGER IF EXISTS trg_mttq_ky_hop_updated ON public.mttq_ky_hop;
CREATE TRIGGER trg_mttq_ky_hop_updated
  BEFORE UPDATE ON public.mttq_ky_hop
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

ALTER TABLE public.mttq_ky_hop ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mttq_ky_hop_select ON public.mttq_ky_hop;
CREATE POLICY mttq_ky_hop_select ON public.mttq_ky_hop
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS mttq_ky_hop_modify ON public.mttq_ky_hop;
CREATE POLICY mttq_ky_hop_modify ON public.mttq_ky_hop
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
