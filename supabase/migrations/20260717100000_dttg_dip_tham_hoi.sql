-- ============================================================================
-- Dân tộc, tôn giáo — Dịp thăm hỏi (bảng cha)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.dttg_dip_tham_hoi (
  id                        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ten_dip                   TEXT NOT NULL,
  mo_ta                     TEXT,
  thoi_gian_du_kien         TEXT,
  thoi_gian_thuc_te         DATE,
  don_vi_to_chuc_id         BIGINT
                            CONSTRAINT dttg_dip_tham_hoi_don_vi_to_chuc_id_fkey
                            REFERENCES public.var_ssn_xa_phuong (id)
                            ON UPDATE CASCADE ON DELETE SET NULL,
  phong_ban_tham_muu_id     BIGINT
                            CONSTRAINT dttg_dip_tham_hoi_phong_ban_tham_muu_id_fkey
                            REFERENCES public.var_phong_ban (id)
                            ON UPDATE CASCADE ON DELETE SET NULL,
  so_luong_to_chuc_du_kien  INT NOT NULL DEFAULT 0
                            CHECK (so_luong_to_chuc_du_kien >= 0),
  so_luong_ca_nhan_du_kien  INT NOT NULL DEFAULT 0
                            CHECK (so_luong_ca_nhan_du_kien >= 0),
  trang_thai                TEXT NOT NULL DEFAULT 'Chưa thực hiện'
                            CHECK (trang_thai IN ('Chưa thực hiện', 'Đang thực hiện', 'Đã hoàn thành')),
  ghi_chu                   TEXT,
  id_nguoi_tao              BIGINT NOT NULL
                            CONSTRAINT dttg_dip_tham_hoi_id_nguoi_tao_fkey
                            REFERENCES public.var_nhan_vien (id)
                            ON UPDATE CASCADE ON DELETE RESTRICT,
  tg_tao                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dttg_dip_tham_hoi_ten_lower
  ON public.dttg_dip_tham_hoi (lower(trim(ten_dip)));
CREATE INDEX IF NOT EXISTS idx_dttg_dip_tham_hoi_trang_thai
  ON public.dttg_dip_tham_hoi (trang_thai);
CREATE INDEX IF NOT EXISTS idx_dttg_dip_tham_hoi_don_vi
  ON public.dttg_dip_tham_hoi (don_vi_to_chuc_id);
CREATE INDEX IF NOT EXISTS idx_dttg_dip_tham_hoi_phong_ban
  ON public.dttg_dip_tham_hoi (phong_ban_tham_muu_id);

DROP TRIGGER IF EXISTS trg_dttg_dip_tham_hoi_updated ON public.dttg_dip_tham_hoi;
CREATE TRIGGER trg_dttg_dip_tham_hoi_updated
  BEFORE UPDATE ON public.dttg_dip_tham_hoi
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

ALTER TABLE public.dttg_dip_tham_hoi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dttg_dip_tham_hoi_select ON public.dttg_dip_tham_hoi;
CREATE POLICY dttg_dip_tham_hoi_select
  ON public.dttg_dip_tham_hoi
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS dttg_dip_tham_hoi_modify ON public.dttg_dip_tham_hoi;
CREATE POLICY dttg_dip_tham_hoi_modify
  ON public.dttg_dip_tham_hoi
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Backfill từ DISTINCT dip_tham_hoi TEXT ở 2 bảng con
INSERT INTO public.dttg_dip_tham_hoi (ten_dip, id_nguoi_tao)
SELECT DISTINCT trim(src.dip_tham_hoi), nv.id
FROM (
  SELECT dip_tham_hoi FROM public.dttg_tham_hoi_to_chuc
  WHERE dip_tham_hoi IS NOT NULL AND trim(dip_tham_hoi) <> ''
  UNION
  SELECT dip_tham_hoi FROM public.dttg_tham_hoi_ca_nhan
  WHERE dip_tham_hoi IS NOT NULL AND trim(dip_tham_hoi) <> ''
) src
CROSS JOIN LATERAL (
  SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1
) nv
WHERE NOT EXISTS (
  SELECT 1 FROM public.dttg_dip_tham_hoi d
  WHERE lower(trim(d.ten_dip)) = lower(trim(src.dip_tham_hoi))
);
