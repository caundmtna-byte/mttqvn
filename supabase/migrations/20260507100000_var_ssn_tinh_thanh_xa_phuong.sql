-- ============================================================================
-- Danh mục 2 cấp: var_ssn_tinh_thanh, var_ssn_xa_phuong (chỉ id, tên, thứ tự, timestamp).
-- Nếu đã tạo bản cũ (có ma/loai/trang_thai): DROP và tạo lại.
--
-- ⚠️ Idempotent: DROP TABLE chỉ chạy khi bảng còn SCHEMA CŨ (còn cột ma/loai/
--    trang_thai). Bản gốc DROP vô điều kiện — chạy lại lần hai là xoá sạch
--    131 xã/phường thật cùng mọi bản ghi tham chiếu qua CASCADE.
--    Lần chạy ĐẦU không đổi: DB trống ⇒ không có gì để drop; DB có schema cũ
--    ⇒ vẫn drop và tạo lại đúng như trước.
-- ============================================================================

DO $ssn_drop_legacy$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'var_ssn_tinh_thanh'
      AND column_name IN ('ma', 'loai', 'trang_thai')
  ) OR EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'var_ssn_xa_phuong'
      AND column_name IN ('ma', 'loai', 'trang_thai')
  ) THEN
    DROP TABLE IF EXISTS public.var_ssn_xa_phuong CASCADE;
    DROP TABLE IF EXISTS public.var_ssn_tinh_thanh CASCADE;
  END IF;
END $ssn_drop_legacy$;

CREATE TABLE IF NOT EXISTS public.var_ssn_tinh_thanh (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ten             TEXT NOT NULL,
  thu_tu          INTEGER NOT NULL DEFAULT 0,
  tg_tao          TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_var_ssn_tinh_thanh_ten_lower
  ON public.var_ssn_tinh_thanh (lower(trim(ten)));

CREATE INDEX IF NOT EXISTS idx_var_ssn_tinh_thanh_thu_tu ON public.var_ssn_tinh_thanh (thu_tu);

ALTER TABLE public.var_ssn_tinh_thanh ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS var_ssn_tinh_thanh_select ON public.var_ssn_tinh_thanh;
CREATE POLICY var_ssn_tinh_thanh_select ON public.var_ssn_tinh_thanh
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS var_ssn_tinh_thanh_modify ON public.var_ssn_tinh_thanh;
CREATE POLICY var_ssn_tinh_thanh_modify ON public.var_ssn_tinh_thanh
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_var_ssn_tinh_thanh_updated ON public.var_ssn_tinh_thanh;
CREATE TRIGGER trg_var_ssn_tinh_thanh_updated
  BEFORE UPDATE ON public.var_ssn_tinh_thanh
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.var_ssn_xa_phuong (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_tinh_thanh   BIGINT NOT NULL REFERENCES public.var_ssn_tinh_thanh (id) ON DELETE CASCADE,
  ten             TEXT NOT NULL,
  thu_tu          INTEGER NOT NULL DEFAULT 0,
  tg_tao          TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_var_ssn_xa_phuong_ten_lower_per_tinh
  ON public.var_ssn_xa_phuong (id_tinh_thanh, lower(trim(ten)));

CREATE INDEX IF NOT EXISTS idx_var_ssn_xa_phuong_id_tinh ON public.var_ssn_xa_phuong (id_tinh_thanh);
CREATE INDEX IF NOT EXISTS idx_var_ssn_xa_phuong_order ON public.var_ssn_xa_phuong (id_tinh_thanh, thu_tu);

ALTER TABLE public.var_ssn_xa_phuong ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS var_ssn_xa_phuong_select ON public.var_ssn_xa_phuong;
CREATE POLICY var_ssn_xa_phuong_select ON public.var_ssn_xa_phuong
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS var_ssn_xa_phuong_modify ON public.var_ssn_xa_phuong;
CREATE POLICY var_ssn_xa_phuong_modify ON public.var_ssn_xa_phuong
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_var_ssn_xa_phuong_updated ON public.var_ssn_xa_phuong;
CREATE TRIGGER trg_var_ssn_xa_phuong_updated
  BEFORE UPDATE ON public.var_ssn_xa_phuong
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

-- --------------------------------------------------------------------------
-- Seed 34 tỉnh (chỉ ten, thu_tu) + vài xã mẫu cho An Giang
-- --------------------------------------------------------------------------
INSERT INTO public.var_ssn_tinh_thanh (ten, thu_tu) VALUES
  ('An Giang', 1),
  ('Bắc Ninh', 2),
  ('Cà Mau', 3),
  ('Thành phố Cần Thơ', 4),
  ('Cao Bằng', 5),
  ('Thành phố Đà Nẵng', 6),
  ('Đắk Lắk', 7),
  ('Điện Biên', 8),
  ('Đồng Nai', 9),
  ('Đồng Tháp', 10),
  ('Gia Lai', 11),
  ('Thành phố Hà Nội', 12),
  ('Hà Tĩnh', 13),
  ('Thành phố Hải Phòng', 14),
  ('Thành phố Huế', 15),
  ('Hưng Yên', 16),
  ('Khánh Hòa', 17),
  ('Lai Châu', 18),
  ('Lâm Đồng', 19),
  ('Lạng Sơn', 20),
  ('Lào Cai', 21),
  ('Nghệ An', 22),
  ('Ninh Bình', 23),
  ('Phú Thọ', 24),
  ('Quảng Ngãi', 25),
  ('Quảng Ninh', 26),
  ('Quảng Trị', 27),
  ('Sơn La', 28),
  ('Tây Ninh', 29),
  ('Thái Nguyên', 30),
  ('Thanh Hóa', 31),
  ('Thành phố Hồ Chí Minh', 32),
  ('Tuyên Quang', 33),
  ('Vĩnh Long', 34)
ON CONFLICT (lower(trim(ten))) DO NOTHING;

INSERT INTO public.var_ssn_xa_phuong (id_tinh_thanh, ten, thu_tu)
SELECT t.id, v.ten, v.thu_tu
FROM public.var_ssn_tinh_thanh t
CROSS JOIN (VALUES
  ('Phường Long Xuyên', 1),
  ('Phường Mỹ Bình', 2),
  ('Xã Mỹ Hòa Hưng', 3)
) AS v(ten, thu_tu)
WHERE lower(trim(t.ten)) = lower(trim('An Giang'))
ON CONFLICT (id_tinh_thanh, lower(trim(ten))) DO NOTHING;
