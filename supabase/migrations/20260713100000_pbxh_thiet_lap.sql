-- ============================================================================
-- Phản biện xã hội — Danh mục thiết lập (đối tượng, đơn vị chủ trì, hình thức)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pbxh_thiet_lap (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  loai        TEXT NOT NULL
              CHECK (loai IN ('doi_tuong', 'don_vi_chu_tri', 'hinh_thuc')),
  ten         TEXT NOT NULL,
  mo_ta       TEXT,
  thu_tu      INTEGER NOT NULL DEFAULT 0,
  tg_tao      TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pbxh_thiet_lap_loai_thu_tu
  ON public.pbxh_thiet_lap (loai, thu_tu);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pbxh_thiet_lap_loai_ten_lower
  ON public.pbxh_thiet_lap (loai, lower(trim(ten)));

DROP TRIGGER IF EXISTS trg_pbxh_thiet_lap_updated ON public.pbxh_thiet_lap;
CREATE TRIGGER trg_pbxh_thiet_lap_updated
  BEFORE UPDATE ON public.pbxh_thiet_lap
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

ALTER TABLE public.pbxh_thiet_lap ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pbxh_thiet_lap_select ON public.pbxh_thiet_lap;
CREATE POLICY pbxh_thiet_lap_select ON public.pbxh_thiet_lap
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS pbxh_thiet_lap_modify ON public.pbxh_thiet_lap;
CREATE POLICY pbxh_thiet_lap_modify ON public.pbxh_thiet_lap
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed danh mục mẫu
INSERT INTO public.pbxh_thiet_lap (loai, ten, mo_ta, thu_tu)
SELECT * FROM (VALUES
  ('doi_tuong'::text, 'Sở Lao động - Thương binh và Xã hội', NULL::text, 1),
  ('doi_tuong', 'UBND cấp xã', NULL, 2),
  ('doi_tuong', 'UBND tỉnh (Cơ quan soạn thảo)', NULL, 3),
  ('doi_tuong', 'Ban Thanh tra nhân dân', NULL, 4),
  ('doi_tuong', 'Ban quản lý quỹ, các tổ dân phố', NULL, 5),
  ('doi_tuong', 'UBND cấp xã, cơ quan chuyên môn', NULL, 6),
  ('doi_tuong', 'UBND xã', NULL, 7),
  ('doi_tuong', 'Sở Tài nguyên và Môi trường', NULL, 8),
  ('doi_tuong', 'Ban công tác Mặt trận khu dân cư', NULL, 9),
  ('doi_tuong', 'Đơn vị thi công, Ban quản lý dự án', NULL, 10),
  ('doi_tuong', 'MTTQ cấp huyện và các đơn vị liên quan', NULL, 11),
  ('doi_tuong', 'Ban công tác Mặt trận các khu dân cư', NULL, 12),
  ('don_vi_chu_tri', 'Ban Thường trực MTTQ tỉnh', NULL, 1),
  ('don_vi_chu_tri', 'Ban Thường vụ Tỉnh Đoàn', NULL, 2),
  ('don_vi_chu_tri', 'Ban Thường trực MTTQ xã', NULL, 3),
  ('don_vi_chu_tri', 'Ban Giám sát đầu tư cộng đồng', NULL, 4),
  ('don_vi_chu_tri', 'Ban Thường vụ Cựu chiến binh tỉnh', NULL, 5),
  ('don_vi_chu_tri', 'Ban Thường vụ Hội phụ nữ xã', NULL, 6),
  ('don_vi_chu_tri', 'Ban Thường vụ Hội Nông dân xã', NULL, 7),
  ('hinh_thuc', 'Thành lập đoàn giám sát liên ngành', NULL, 1),
  ('hinh_thuc', 'Tổ chức hội nghị phản biện xã hội', NULL, 2),
  ('hinh_thuc', 'Giám sát thông qua báo cáo và thực tế', NULL, 3),
  ('hinh_thuc', 'Giám sát trực tiếp tại các tổ dân phố', NULL, 4),
  ('hinh_thuc', 'Nghiên cứu hồ sơ và làm việc trực tiếp', NULL, 5),
  ('hinh_thuc', 'Lấy ý kiến nhân dân tại địa bàn dân cư', NULL, 6),
  ('hinh_thuc', 'Gửi văn bản lấy ý kiến chuyên gia', NULL, 7),
  ('hinh_thuc', 'Tham gia các cuộc họp bình xét', NULL, 8),
  ('hinh_thuc', 'Ban Giám sát đầu tư của cộng đồng giám sát trực tiếp', NULL, 9),
  ('hinh_thuc', 'Kiểm tra hồ sơ và thực tế tại các đơn vị thành viên', NULL, 10),
  ('hinh_thuc', 'Đối chiếu báo cáo và khảo sát thực tế', NULL, 11)
) AS seed (loai, ten, mo_ta, thu_tu)
WHERE NOT EXISTS (SELECT 1 FROM public.pbxh_thiet_lap LIMIT 1);
