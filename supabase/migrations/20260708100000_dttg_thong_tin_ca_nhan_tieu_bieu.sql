-- ============================================================================
-- Dân tộc, tôn giáo — Thông tin cá nhân tiêu biểu
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.dttg_thong_tin_ca_nhan_tieu_bieu (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ho_va_ten        TEXT NOT NULL,
  ngay_sinh        DATE,
  doi_tuong        TEXT NOT NULL
                   CHECK (doi_tuong IN ('Chức sắc', 'Người uy tín', 'Người có công')),
  chuc_vu_vi_tri   TEXT,
  ton_giao_dan_toc TEXT,
  dia_chi          TEXT,
  don_vi_id        BIGINT
                   CONSTRAINT dttg_thong_tin_ca_nhan_tieu_bieu_don_vi_id_fkey
                   REFERENCES public.var_ssn_xa_phuong (id)
                   ON UPDATE CASCADE ON DELETE SET NULL,
  so_dien_thoai    TEXT,
  dong_gop_noi_bat TEXT,
  trang_thai       TEXT NOT NULL DEFAULT 'Đang hoạt động'
                   CHECK (trang_thai IN ('Đang hoạt động', 'Ngừng hoạt động')),
  id_nguoi_tao     BIGINT NOT NULL
                   CONSTRAINT dttg_thong_tin_ca_nhan_tieu_bieu_id_nguoi_tao_fkey
                   REFERENCES public.var_nhan_vien (id)
                   ON UPDATE CASCADE ON DELETE RESTRICT,
  tg_tao           TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dttg_tt_cntb_don_vi
  ON public.dttg_thong_tin_ca_nhan_tieu_bieu (don_vi_id);
CREATE INDEX IF NOT EXISTS idx_dttg_tt_cntb_doi_tuong
  ON public.dttg_thong_tin_ca_nhan_tieu_bieu (doi_tuong);
CREATE INDEX IF NOT EXISTS idx_dttg_tt_cntb_trang_thai
  ON public.dttg_thong_tin_ca_nhan_tieu_bieu (trang_thai);
CREATE INDEX IF NOT EXISTS idx_dttg_tt_cntb_ho_ten_lower
  ON public.dttg_thong_tin_ca_nhan_tieu_bieu (lower(trim(ho_va_ten)));

DROP TRIGGER IF EXISTS trg_dttg_thong_tin_ca_nhan_tieu_bieu_updated
  ON public.dttg_thong_tin_ca_nhan_tieu_bieu;
CREATE TRIGGER trg_dttg_thong_tin_ca_nhan_tieu_bieu_updated
  BEFORE UPDATE ON public.dttg_thong_tin_ca_nhan_tieu_bieu
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

ALTER TABLE public.dttg_thong_tin_ca_nhan_tieu_bieu ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dttg_thong_tin_ca_nhan_tieu_bieu_select
  ON public.dttg_thong_tin_ca_nhan_tieu_bieu;
CREATE POLICY dttg_thong_tin_ca_nhan_tieu_bieu_select
  ON public.dttg_thong_tin_ca_nhan_tieu_bieu
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS dttg_thong_tin_ca_nhan_tieu_bieu_modify
  ON public.dttg_thong_tin_ca_nhan_tieu_bieu;
CREATE POLICY dttg_thong_tin_ca_nhan_tieu_bieu_modify
  ON public.dttg_thong_tin_ca_nhan_tieu_bieu
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
