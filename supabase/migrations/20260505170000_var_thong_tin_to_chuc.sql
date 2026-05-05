-- ============================================================================
-- Bảng singleton: thông tin tổ chức + thương hiệu ứng dụng (một dòng id = 1).
-- Không có mã số thuế. RLS + trigger tg_cap_nhat.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.var_thong_tin_to_chuc (
  id            BIGINT NOT NULL PRIMARY KEY DEFAULT 1,
  CONSTRAINT var_thong_tin_to_chuc_singleton CHECK (id = 1),
  ten_ung_dung  TEXT NOT NULL DEFAULT 'MTTQVN',
  mo_ta_ngan    TEXT,
  url_logo      TEXT,
  ten_to_chuc   TEXT NOT NULL,
  dia_chi       TEXT,
  dien_thoai    TEXT,
  email         TEXT,
  website       TEXT,
  tg_tao        TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.var_thong_tin_to_chuc ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS var_thong_tin_to_chuc_select ON public.var_thong_tin_to_chuc;
CREATE POLICY var_thong_tin_to_chuc_select ON public.var_thong_tin_to_chuc
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS var_thong_tin_to_chuc_modify ON public.var_thong_tin_to_chuc;
CREATE POLICY var_thong_tin_to_chuc_modify ON public.var_thong_tin_to_chuc
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_var_thong_tin_to_chuc_updated ON public.var_thong_tin_to_chuc;
CREATE TRIGGER trg_var_thong_tin_to_chuc_updated
  BEFORE UPDATE ON public.var_thong_tin_to_chuc
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

INSERT INTO public.var_thong_tin_to_chuc (
  id,
  ten_ung_dung,
  mo_ta_ngan,
  url_logo,
  ten_to_chuc,
  dia_chi,
  dien_thoai,
  email,
  website
)
VALUES (
  1,
  'MTTQVN',
  'Trang thông tin điện tử',
  'https://datafiles.nghean.gov.vn/nan-ubnd/6556/Album/quochuy%20(1).png',
  'Mặt trận Tổ quốc Việt Nam',
  'Khối 7, đường Hùng Vương, TP. Vinh, tỉnh Nghệ An',
  '',
  '',
  'https://mttq.org.vn'
)
ON CONFLICT (id) DO NOTHING;
