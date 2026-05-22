-- ============================================================================
-- Nhập xuất kho — phiếu nhập/xuất/chuyển kho cứu trợ + chi tiết hàng hóa.
--
-- - `kho_nhap_xuat_kho`        : phiếu (master)
-- - `kho_nhap_xuat_kho_ct`     : dòng chi tiết hàng hóa
-- - `kho_ton_kho_view`         : tồn kho hiện tại (computed view)
-- - `fn_kho_kiem_tra_ton_kho`  : trigger BEFORE INS/UPD chặn xuất quá tồn
-- - `fn_kho_sinh_so_phieu`     : trigger BEFORE INSERT auto-generate so_phieu
-- - `rpc_kho_tao_phieu_nhap_xuat` / `rpc_kho_cap_nhat_phieu_nhap_xuat`
--
-- Quy tắc loại phiếu:
--   nhap_ngoai : don_vi_cuu_tro_id + kho_nhap_id   (nguồn ngoài → kho)
--   xuat_ngoai : kho_xuat_id      + dot_cuu_tro_id (kho → đợt cứu trợ)
--   chuyen_kho : kho_xuat_id      + kho_nhap_id    (kho A → kho B)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Master table
-- ----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.kho_nhap_xuat_kho_tt_seq;
CREATE SEQUENCE IF NOT EXISTS public.kho_nhap_xuat_kho_pn_seq;
CREATE SEQUENCE IF NOT EXISTS public.kho_nhap_xuat_kho_px_seq;
CREATE SEQUENCE IF NOT EXISTS public.kho_nhap_xuat_kho_pc_seq;

CREATE TABLE IF NOT EXISTS public.kho_nhap_xuat_kho (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tt                INTEGER NOT NULL DEFAULT nextval('public.kho_nhap_xuat_kho_tt_seq'::regclass),
  so_phieu          TEXT NOT NULL,
  loai_phieu        TEXT NOT NULL
                    CHECK (loai_phieu IN ('nhap_ngoai','xuat_ngoai','chuyen_kho')),
  ngay_phieu        DATE NOT NULL DEFAULT CURRENT_DATE,
  kho_xuat_id       BIGINT REFERENCES public.kho_danh_sach_kho (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  kho_nhap_id       BIGINT REFERENCES public.kho_danh_sach_kho (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  don_vi_cuu_tro_id BIGINT REFERENCES public.kho_don_vi_cuu_tro (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  dot_cuu_tro_id    BIGINT REFERENCES public.kho_dot_cuu_tro    (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  ghi_chu           TEXT,
  tg_tao            TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_kho_nxk_consistency CHECK (
    (loai_phieu = 'nhap_ngoai'
       AND don_vi_cuu_tro_id IS NOT NULL AND kho_nhap_id IS NOT NULL
       AND kho_xuat_id IS NULL AND dot_cuu_tro_id IS NULL)
    OR (loai_phieu = 'xuat_ngoai'
       AND kho_xuat_id IS NOT NULL AND dot_cuu_tro_id IS NOT NULL
       AND kho_nhap_id IS NULL AND don_vi_cuu_tro_id IS NULL)
    OR (loai_phieu = 'chuyen_kho'
       AND kho_xuat_id IS NOT NULL AND kho_nhap_id IS NOT NULL
       AND kho_xuat_id <> kho_nhap_id
       AND don_vi_cuu_tro_id IS NULL AND dot_cuu_tro_id IS NULL)
  )
);

ALTER SEQUENCE public.kho_nhap_xuat_kho_tt_seq OWNED BY public.kho_nhap_xuat_kho.tt;

CREATE UNIQUE INDEX IF NOT EXISTS uq_kho_nhap_xuat_kho_so_phieu ON public.kho_nhap_xuat_kho (so_phieu);
CREATE INDEX IF NOT EXISTS idx_kho_nhap_xuat_kho_tt          ON public.kho_nhap_xuat_kho (tt);
CREATE INDEX IF NOT EXISTS idx_kho_nhap_xuat_kho_loai        ON public.kho_nhap_xuat_kho (loai_phieu);
CREATE INDEX IF NOT EXISTS idx_kho_nhap_xuat_kho_ngay        ON public.kho_nhap_xuat_kho (ngay_phieu);
CREATE INDEX IF NOT EXISTS idx_kho_nhap_xuat_kho_kho_xuat    ON public.kho_nhap_xuat_kho (kho_xuat_id);
CREATE INDEX IF NOT EXISTS idx_kho_nhap_xuat_kho_kho_nhap    ON public.kho_nhap_xuat_kho (kho_nhap_id);
CREATE INDEX IF NOT EXISTS idx_kho_nhap_xuat_kho_don_vi      ON public.kho_nhap_xuat_kho (don_vi_cuu_tro_id);
CREATE INDEX IF NOT EXISTS idx_kho_nhap_xuat_kho_dot         ON public.kho_nhap_xuat_kho (dot_cuu_tro_id);

DROP TRIGGER IF EXISTS trg_kho_nhap_xuat_kho_updated ON public.kho_nhap_xuat_kho;
CREATE TRIGGER trg_kho_nhap_xuat_kho_updated
  BEFORE UPDATE ON public.kho_nhap_xuat_kho
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

-- ----------------------------------------------------------------------------
-- 2. Detail table (chi tiết hàng hóa của phiếu)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kho_nhap_xuat_kho_ct (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  phieu_id      BIGINT NOT NULL
                CONSTRAINT kho_nhap_xuat_kho_ct_phieu_fkey
                REFERENCES public.kho_nhap_xuat_kho (id) ON UPDATE CASCADE ON DELETE CASCADE,
  hang_hoa_id   BIGINT NOT NULL
                CONSTRAINT kho_nhap_xuat_kho_ct_hang_hoa_fkey
                REFERENCES public.kho_danh_sach_hang_hoa (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  don_vi_tinh   TEXT NOT NULL,
  so_luong      NUMERIC(18,3) NOT NULL CHECK (so_luong > 0),
  don_gia       NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (don_gia >= 0),
  thanh_tien    NUMERIC(18,2) GENERATED ALWAYS AS (so_luong * don_gia) STORED,
  ghi_chu       TEXT,
  thu_tu        INTEGER NOT NULL DEFAULT 0,
  tg_tao        TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kho_nxk_ct_phieu     ON public.kho_nhap_xuat_kho_ct (phieu_id);
CREATE INDEX IF NOT EXISTS idx_kho_nxk_ct_hang_hoa  ON public.kho_nhap_xuat_kho_ct (hang_hoa_id);

DROP TRIGGER IF EXISTS trg_kho_nhap_xuat_kho_ct_updated ON public.kho_nhap_xuat_kho_ct;
CREATE TRIGGER trg_kho_nhap_xuat_kho_ct_updated
  BEFORE UPDATE ON public.kho_nhap_xuat_kho_ct
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

-- ----------------------------------------------------------------------------
-- 3. View tồn kho theo (kho, hàng hóa)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.kho_ton_kho_view
WITH (security_invoker = true)
AS
WITH movements AS (
  SELECT m.kho_nhap_id AS kho_id, ct.hang_hoa_id, ct.so_luong AS qty
  FROM public.kho_nhap_xuat_kho m
  JOIN public.kho_nhap_xuat_kho_ct ct ON ct.phieu_id = m.id
  WHERE m.kho_nhap_id IS NOT NULL
  UNION ALL
  SELECT m.kho_xuat_id AS kho_id, ct.hang_hoa_id, -ct.so_luong AS qty
  FROM public.kho_nhap_xuat_kho m
  JOIN public.kho_nhap_xuat_kho_ct ct ON ct.phieu_id = m.id
  WHERE m.kho_xuat_id IS NOT NULL
)
SELECT
  kho_id,
  hang_hoa_id,
  SUM(qty)::NUMERIC(18,3) AS ton_kho
FROM movements
GROUP BY kho_id, hang_hoa_id;

GRANT SELECT ON public.kho_ton_kho_view TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. Trigger chặn xuất quá tồn (BEFORE INSERT/UPDATE/DELETE)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_kho_kiem_tra_ton_kho()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_kho_xuat_id   BIGINT;
  v_ton_kho       NUMERIC(18,3);
  v_ten_hang      TEXT;
  v_ten_kho       TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  SELECT kho_xuat_id INTO v_kho_xuat_id
  FROM public.kho_nhap_xuat_kho WHERE id = NEW.phieu_id;

  IF v_kho_xuat_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Tồn kho hiện tại của (kho_xuat, hang_hoa) ĐÃ bao gồm dòng OLD nếu UPDATE.
  SELECT COALESCE(SUM(qty), 0) INTO v_ton_kho
  FROM (
    SELECT ct.so_luong AS qty
    FROM public.kho_nhap_xuat_kho m
    JOIN public.kho_nhap_xuat_kho_ct ct ON ct.phieu_id = m.id
    WHERE m.kho_nhap_id = v_kho_xuat_id
      AND ct.hang_hoa_id = NEW.hang_hoa_id
    UNION ALL
    SELECT -ct.so_luong AS qty
    FROM public.kho_nhap_xuat_kho m
    JOIN public.kho_nhap_xuat_kho_ct ct ON ct.phieu_id = m.id
    WHERE m.kho_xuat_id = v_kho_xuat_id
      AND ct.hang_hoa_id = NEW.hang_hoa_id
      AND ct.id <> COALESCE(NEW.id, -1)
  ) m;

  IF v_ton_kho - NEW.so_luong < 0 THEN
    SELECT ten_hang_hoa INTO v_ten_hang
    FROM public.kho_danh_sach_hang_hoa WHERE id = NEW.hang_hoa_id;
    SELECT ten_kho INTO v_ten_kho
    FROM public.kho_danh_sach_kho WHERE id = v_kho_xuat_id;

    RAISE EXCEPTION
      USING
        ERRCODE = 'P0001',
        MESSAGE = format(
          'TON_KHO_KHONG_DU: Hàng "%s" tại kho "%s" chỉ còn %s, không đủ để xuất %s.',
          COALESCE(v_ten_hang, '?'),
          COALESCE(v_ten_kho, '?'),
          v_ton_kho::TEXT,
          NEW.so_luong::TEXT
        );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kho_nxk_ct_kiem_tra_ton ON public.kho_nhap_xuat_kho_ct;
CREATE TRIGGER trg_kho_nxk_ct_kiem_tra_ton
  BEFORE INSERT OR UPDATE ON public.kho_nhap_xuat_kho_ct
  FOR EACH ROW EXECUTE FUNCTION public.fn_kho_kiem_tra_ton_kho();

-- ----------------------------------------------------------------------------
-- 5. Trigger auto-generate so_phieu (BEFORE INSERT, khi rỗng)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_kho_sinh_so_phieu()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_year   TEXT := to_char(COALESCE(NEW.ngay_phieu, CURRENT_DATE), 'YYYY');
  v_seq    BIGINT;
  v_prefix TEXT;
BEGIN
  IF NEW.so_phieu IS NOT NULL AND length(trim(NEW.so_phieu)) > 0 THEN
    RETURN NEW;
  END IF;

  v_prefix := CASE NEW.loai_phieu
    WHEN 'nhap_ngoai' THEN 'PN'
    WHEN 'xuat_ngoai' THEN 'PX'
    WHEN 'chuyen_kho' THEN 'PC'
    ELSE 'P?'
  END;

  v_seq := nextval(CASE NEW.loai_phieu
    WHEN 'nhap_ngoai' THEN 'public.kho_nhap_xuat_kho_pn_seq'
    WHEN 'xuat_ngoai' THEN 'public.kho_nhap_xuat_kho_px_seq'
    WHEN 'chuyen_kho' THEN 'public.kho_nhap_xuat_kho_pc_seq'
  END::regclass);

  NEW.so_phieu := format('%s-%s-%s', v_prefix, v_year, lpad(v_seq::TEXT, 4, '0'));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kho_nxk_sinh_so_phieu ON public.kho_nhap_xuat_kho;
CREATE TRIGGER trg_kho_nxk_sinh_so_phieu
  BEFORE INSERT ON public.kho_nhap_xuat_kho
  FOR EACH ROW EXECUTE FUNCTION public.fn_kho_sinh_so_phieu();

-- ----------------------------------------------------------------------------
-- 6. RPC tạo phiếu (atomic master + lines) — chỉ trả về id phiếu
--   Lines truyền dạng JSONB array: [{hang_hoa_id, don_vi_tinh, so_luong, don_gia, ghi_chu?, thu_tu?}, ...]
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_kho_tao_phieu_nhap_xuat(
  p_loai_phieu        TEXT,
  p_ngay_phieu        DATE,
  p_kho_xuat_id       BIGINT,
  p_kho_nhap_id       BIGINT,
  p_don_vi_cuu_tro_id BIGINT,
  p_dot_cuu_tro_id    BIGINT,
  p_ghi_chu           TEXT,
  p_chi_tiet          JSONB
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_phieu_id BIGINT;
BEGIN
  IF p_chi_tiet IS NULL OR jsonb_array_length(p_chi_tiet) = 0 THEN
    RAISE EXCEPTION 'CHI_TIET_RONG: Phiếu phải có ít nhất 1 dòng chi tiết.';
  END IF;

  INSERT INTO public.kho_nhap_xuat_kho
    (loai_phieu, ngay_phieu, kho_xuat_id, kho_nhap_id, don_vi_cuu_tro_id, dot_cuu_tro_id, ghi_chu)
  VALUES
    (p_loai_phieu, p_ngay_phieu, p_kho_xuat_id, p_kho_nhap_id, p_don_vi_cuu_tro_id, p_dot_cuu_tro_id, p_ghi_chu)
  RETURNING id INTO v_phieu_id;

  INSERT INTO public.kho_nhap_xuat_kho_ct
    (phieu_id, hang_hoa_id, don_vi_tinh, so_luong, don_gia, ghi_chu, thu_tu)
  SELECT
    v_phieu_id,
    (line->>'hang_hoa_id')::BIGINT,
    line->>'don_vi_tinh',
    (line->>'so_luong')::NUMERIC,
    COALESCE((line->>'don_gia')::NUMERIC, 0),
    NULLIF(line->>'ghi_chu', ''),
    COALESCE((line->>'thu_tu')::INTEGER, 0)
  FROM jsonb_array_elements(p_chi_tiet) AS line;

  RETURN v_phieu_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_kho_tao_phieu_nhap_xuat(TEXT, DATE, BIGINT, BIGINT, BIGINT, BIGINT, TEXT, JSONB) TO authenticated;

-- ----------------------------------------------------------------------------
-- 7. RPC cập nhật phiếu — replace toàn bộ lines (đơn giản, atomic)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_kho_cap_nhat_phieu_nhap_xuat(
  p_id                BIGINT,
  p_loai_phieu        TEXT,
  p_ngay_phieu        DATE,
  p_kho_xuat_id       BIGINT,
  p_kho_nhap_id       BIGINT,
  p_don_vi_cuu_tro_id BIGINT,
  p_dot_cuu_tro_id    BIGINT,
  p_ghi_chu           TEXT,
  p_chi_tiet          JSONB
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  IF p_chi_tiet IS NULL OR jsonb_array_length(p_chi_tiet) = 0 THEN
    RAISE EXCEPTION 'CHI_TIET_RONG: Phiếu phải có ít nhất 1 dòng chi tiết.';
  END IF;

  UPDATE public.kho_nhap_xuat_kho SET
    loai_phieu        = p_loai_phieu,
    ngay_phieu        = p_ngay_phieu,
    kho_xuat_id       = p_kho_xuat_id,
    kho_nhap_id       = p_kho_nhap_id,
    don_vi_cuu_tro_id = p_don_vi_cuu_tro_id,
    dot_cuu_tro_id    = p_dot_cuu_tro_id,
    ghi_chu           = p_ghi_chu
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PHIEU_KHONG_TON_TAI: Không tìm thấy phiếu %.', p_id;
  END IF;

  -- Replace toàn bộ chi tiết — trigger ton_kho sẽ chạy theo từng dòng INSERT.
  DELETE FROM public.kho_nhap_xuat_kho_ct WHERE phieu_id = p_id;

  INSERT INTO public.kho_nhap_xuat_kho_ct
    (phieu_id, hang_hoa_id, don_vi_tinh, so_luong, don_gia, ghi_chu, thu_tu)
  SELECT
    p_id,
    (line->>'hang_hoa_id')::BIGINT,
    line->>'don_vi_tinh',
    (line->>'so_luong')::NUMERIC,
    COALESCE((line->>'don_gia')::NUMERIC, 0),
    NULLIF(line->>'ghi_chu', ''),
    COALESCE((line->>'thu_tu')::INTEGER, 0)
  FROM jsonb_array_elements(p_chi_tiet) AS line;

  RETURN p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_kho_cap_nhat_phieu_nhap_xuat(BIGINT, TEXT, DATE, BIGINT, BIGINT, BIGINT, BIGINT, TEXT, JSONB) TO authenticated;

-- ----------------------------------------------------------------------------
-- 8. RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.kho_nhap_xuat_kho    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kho_nhap_xuat_kho_ct ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kho_nhap_xuat_kho_select ON public.kho_nhap_xuat_kho;
CREATE POLICY kho_nhap_xuat_kho_select ON public.kho_nhap_xuat_kho
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS kho_nhap_xuat_kho_modify ON public.kho_nhap_xuat_kho;
CREATE POLICY kho_nhap_xuat_kho_modify ON public.kho_nhap_xuat_kho
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS kho_nhap_xuat_kho_ct_select ON public.kho_nhap_xuat_kho_ct;
CREATE POLICY kho_nhap_xuat_kho_ct_select ON public.kho_nhap_xuat_kho_ct
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS kho_nhap_xuat_kho_ct_modify ON public.kho_nhap_xuat_kho_ct;
CREATE POLICY kho_nhap_xuat_kho_ct_modify ON public.kho_nhap_xuat_kho_ct
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
