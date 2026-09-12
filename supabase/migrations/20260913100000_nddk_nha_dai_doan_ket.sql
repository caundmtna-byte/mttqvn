-- ============================================================================
-- An sinh xã hội — Nhà đại đoàn kết
--
-- Một dòng = một căn nhà được hỗ trợ (xây mới hoặc sửa chữa). Bảng GIAO DỊCH:
-- tăng theo từng năm, không có trần tự nhiên ⇒ phân trang phía máy chủ bằng
-- RPC `get_nddk_page` (migration kế tiếp), không phải phân trang client.
--
-- Năm danh mục của nghiệp vụ (Nguồn, Nguồn hỗ trợ, Đối tượng, Loại hình hỗ trợ,
-- Trạng thái) cố ý là ENUM CỨNG bằng CHECK chứ không phải bảng `*_thiet_lap`:
-- module này không có màn hình thiết lập danh mục, nên nguồn sự thật là hằng số
-- trong `features/nha-dai-doan-ket/danh-sach/core/constants.ts` + CHECK ở đây.
-- Sửa một bên phải sửa cả bên kia.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.nddk_nha_dai_doan_ket (
  id                        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  noi_dung_ho_tro           TEXT NOT NULL,
  nam                       INTEGER NOT NULL
                            CHECK (nam BETWEEN 2000 AND 2100),
  nguon                     TEXT NOT NULL
                            CHECK (nguon IN ('Vì người nghèo', 'Cứu trợ', 'Ngân sách', 'Giới thiệu')),
  nguon_ho_tro              TEXT NOT NULL
                            CHECK (nguon_ho_tro IN ('Cấp tỉnh', 'Cấp xã', 'Ủng hộ trực tiếp', 'Trung ương')),
  ho_ten_chu_ho             TEXT NOT NULL,
  xa_phuong_id              BIGINT
                            CONSTRAINT nddk_nha_dai_doan_ket_xa_phuong_id_fkey
                            REFERENCES public.var_ssn_xa_phuong (id)
                            ON UPDATE CASCADE ON DELETE SET NULL,
  khoi_xom                  TEXT,
  doi_tuong                 TEXT
                            CHECK (doi_tuong IS NULL OR doi_tuong IN ('Hộ nghèo', 'Cận nghèo', 'Khó khăn')),
  loai_hinh_ho_tro          TEXT NOT NULL
                            CHECK (loai_hinh_ho_tro IN ('Xây mới', 'Sửa chữa')),
  so_tien                   NUMERIC(15, 0)
                            CHECK (so_tien IS NULL OR so_tien >= 0),
  trang_thai                TEXT NOT NULL DEFAULT 'Đang khảo sát'
                            CHECK (trang_thai IN (
                              'Đang khảo sát', 'Đã phê duyệt', 'Đang thực hiện',
                              'Đã bàn giao', 'Tạm dừng'
                            )),
  -- Máy chủ gán, KHÔNG nhận từ client — xem trigger fn_nddk_set_ngay_trang_thai.
  ngay_cap_nhat_trang_thai  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Cũng là "lý do đổi trạng thái": fn_ghi_lich_su_trang_thai() chụp cột này.
  ghi_chu                   TEXT,
  id_nguoi_tao              BIGINT NOT NULL
                            CONSTRAINT nddk_nha_dai_doan_ket_id_nguoi_tao_fkey
                            REFERENCES public.var_nhan_vien (id)
                            ON UPDATE CASCADE ON DELETE RESTRICT,
  tg_tao                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat               TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.nddk_nha_dai_doan_ket IS
  'Nhà đại đoàn kết — mỗi dòng một căn nhà được hỗ trợ xây mới hoặc sửa chữa.';

CREATE INDEX IF NOT EXISTS idx_nddk_nam              ON public.nddk_nha_dai_doan_ket (nam DESC);
CREATE INDEX IF NOT EXISTS idx_nddk_trang_thai       ON public.nddk_nha_dai_doan_ket (trang_thai);
CREATE INDEX IF NOT EXISTS idx_nddk_xa_phuong        ON public.nddk_nha_dai_doan_ket (xa_phuong_id);
CREATE INDEX IF NOT EXISTS idx_nddk_nguon            ON public.nddk_nha_dai_doan_ket (nguon);
CREATE INDEX IF NOT EXISTS idx_nddk_loai_hinh        ON public.nddk_nha_dai_doan_ket (loai_hinh_ho_tro);
CREATE INDEX IF NOT EXISTS idx_nddk_nguoi_tao        ON public.nddk_nha_dai_doan_ket (id_nguoi_tao);
CREATE INDEX IF NOT EXISTS idx_nddk_chu_ho_lower
  ON public.nddk_nha_dai_doan_ket (lower(btrim(ho_ten_chu_ho)));

-- ---------------------------------------------------------------------------
-- Trigger
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_nddk_updated ON public.nddk_nha_dai_doan_ket;
CREATE TRIGGER trg_nddk_updated
  BEFORE UPDATE ON public.nddk_nha_dai_doan_ket
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

-- "Ngày cập nhật trạng thái" do máy chủ gán. Người nhập liệu không có ô này
-- trên form: để họ tự gõ là mở đường cho ngày không khớp với trạng thái thật.
CREATE OR REPLACE FUNCTION public.fn_nddk_set_ngay_trang_thai()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.ngay_cap_nhat_trang_thai := now();
  ELSIF NEW.trang_thai IS DISTINCT FROM OLD.trang_thai THEN
    NEW.ngay_cap_nhat_trang_thai := now();
  ELSE
    NEW.ngay_cap_nhat_trang_thai := OLD.ngay_cap_nhat_trang_thai;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_nddk_ngay_trang_thai ON public.nddk_nha_dai_doan_ket;
CREATE TRIGGER trg_nddk_ngay_trang_thai
  BEFORE INSERT OR UPDATE ON public.nddk_nha_dai_doan_ket
  FOR EACH ROW EXECUTE FUNCTION public.fn_nddk_set_ngay_trang_thai();

-- Vết đổi trạng thái — dùng lại hàm chung đã có ở 20260729120000_lich_su_trang_thai.sql.
-- KHÔNG gắn fn_kiem_luat_trang_thai: nghiệp vụ này chưa có luật chuyển cứng
-- (một căn đang tạm dừng vẫn có thể quay lại thực hiện, đó là chuyện bình thường).
DROP TRIGGER IF EXISTS tg_lich_su_trang_thai_nddk_nha_dai_doan_ket
  ON public.nddk_nha_dai_doan_ket;
CREATE TRIGGER tg_lich_su_trang_thai_nddk_nha_dai_doan_ket
  AFTER UPDATE OF trang_thai ON public.nddk_nha_dai_doan_ket
  FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_lich_su_trang_thai();

-- ---------------------------------------------------------------------------
-- RLS — đọc mở, GHI siết theo ma trận var_phan_quyen (module_key 'nha-dai-doan-ket')
-- ---------------------------------------------------------------------------

ALTER TABLE public.nddk_nha_dai_doan_ket ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nddk_nha_dai_doan_ket_doc ON public.nddk_nha_dai_doan_ket;
CREATE POLICY nddk_nha_dai_doan_ket_doc ON public.nddk_nha_dai_doan_ket
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS nddk_nha_dai_doan_ket_them ON public.nddk_nha_dai_doan_ket;
CREATE POLICY nddk_nha_dai_doan_ket_them ON public.nddk_nha_dai_doan_ket
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_co_quyen('nha-dai-doan-ket', 'them'));

DROP POLICY IF EXISTS nddk_nha_dai_doan_ket_sua ON public.nddk_nha_dai_doan_ket;
CREATE POLICY nddk_nha_dai_doan_ket_sua ON public.nddk_nha_dai_doan_ket
  FOR UPDATE TO authenticated
  USING (public.fn_co_quyen('nha-dai-doan-ket', 'sua'))
  WITH CHECK (public.fn_co_quyen('nha-dai-doan-ket', 'sua'));

DROP POLICY IF EXISTS nddk_nha_dai_doan_ket_xoa ON public.nddk_nha_dai_doan_ket;
CREATE POLICY nddk_nha_dai_doan_ket_xoa ON public.nddk_nha_dai_doan_ket
  FOR DELETE TO authenticated
  USING (public.fn_co_quyen('nha-dai-doan-ket', 'xoa'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nddk_nha_dai_doan_ket TO authenticated;

-- ---------------------------------------------------------------------------
-- Seed dữ liệu mẫu (chỉ chạy khi bảng còn rỗng)
--
-- `xa_phuong_id` tra theo tên; danh mục xã/phường thật nạp ngoài migration nên
-- có COALESCE quay vòng theo `stt` để dữ liệu mẫu vẫn trải đều các xã dù tên
-- không khớp môi trường nào đó.
-- ---------------------------------------------------------------------------

INSERT INTO public.nddk_nha_dai_doan_ket (
  noi_dung_ho_tro, nam, nguon, nguon_ho_tro, ho_ten_chu_ho, xa_phuong_id, khoi_xom,
  doi_tuong, loai_hinh_ho_tro, so_tien, trang_thai, ghi_chu, id_nguoi_tao
)
SELECT
  s.noi_dung_ho_tro, s.nam, s.nguon, s.nguon_ho_tro, s.ho_ten_chu_ho,
  COALESCE(
    (SELECT x.id FROM public.var_ssn_xa_phuong x
      WHERE lower(btrim(x.ten)) = lower(s.ten_xa) LIMIT 1),
    (SELECT x.id FROM public.var_ssn_xa_phuong x ORDER BY x.id
      OFFSET (s.stt % GREATEST((SELECT count(*) FROM public.var_ssn_xa_phuong), 1)) LIMIT 1)
  ),
  s.khoi_xom, s.doi_tuong, s.loai_hinh_ho_tro, s.so_tien, s.trang_thai, s.ghi_chu,
  (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
FROM (VALUES
  (0,  'Hỗ trợ xây mới nhà đại đoàn kết cho hộ nghèo'::text,        2024, 'Vì người nghèo'::text, 'Cấp tỉnh'::text,          'Nguyễn Văn Thân'::text,  'Xã Đại Huệ'::text,       'Xóm 3'::text,       'Hộ nghèo'::text,  'Xây mới'::text,  60000000::numeric, 'Đã bàn giao'::text,     'Bàn giao đúng dịp Ngày hội Đại đoàn kết'::text),
  (1,  'Hỗ trợ sửa chữa nhà dột nát',                               2024, 'Cứu trợ',              'Cấp xã',                  'Lê Thị Hòa',             'Xã Nghi Lộc',            'Xóm Trung Hậu',     'Cận nghèo',       'Sửa chữa',       30000000,          'Đã bàn giao',           'Lợp lại mái, chống thấm tường'),
  (2,  'Xây mới nhà cho hộ bị sập sau bão',                         2024, 'Cứu trợ',              'Ủng hộ trực tiếp',        'Vi Văn Thành',           'Xã Châu Tiến',           'Bản Na Hang',       'Hộ nghèo',        'Xây mới',        75000000,          'Đã bàn giao',           'Nhà cũ sập hoàn toàn trong bão số 4'),
  (3,  'Hỗ trợ xây nhà cho gia đình chính sách',                    2024, 'Ngân sách',            'Trung ương',              'Nguyễn Thị Lan',         'Phường Thành Vinh',      'Khối 7',            'Khó khăn',        'Xây mới',        80000000,          'Đã bàn giao',           'Thân nhân liệt sĩ'),
  (4,  'Sửa chữa nhà cho hộ cận nghèo vùng cao',                    2024, 'Vì người nghèo',       'Cấp xã',                  'Lương Văn Pó',           'Xã Huồi Tụ',             'Bản Huồi Đun',      'Cận nghèo',       'Sửa chữa',       25000000,          'Đã bàn giao',           NULL),
  (5,  'Xây mới nhà đại đoàn kết từ nguồn vận động',                2025, 'Vì người nghèo',       'Cấp tỉnh',                'Trần Văn Bảy',           'Xã Đại Huệ',             'Xóm 5',             'Hộ nghèo',        'Xây mới',        70000000,          'Đã bàn giao',           NULL),
  (6,  'Hỗ trợ sửa nhà sau lũ quét',                                2025, 'Cứu trợ',              'Cấp tỉnh',                'Vừ Bá Xồng',            'Xã Huồi Tụ',             'Bản Trung Tâm',     'Hộ nghèo',        'Sửa chữa',       35000000,          'Đã bàn giao',           'Sạt lở nền móng sau lũ quét tháng 9'),
  (7,  'Xây mới nhà cho hộ neo đơn',                                2025, 'Ngân sách',            'Cấp xã',                  'Hoàng Thị Tứ',           'Phường Trường Vinh',     'Khối 2',            'Khó khăn',        'Xây mới',        65000000,          'Đã bàn giao',           'Hộ neo đơn, không nơi nương tựa'),
  (8,  'Hỗ trợ xây nhà cho hộ nghèo dân tộc thiểu số',              2025, 'Vì người nghèo',       'Trung ương',              'Lô Văn Quyết',           'Xã Châu Tiến',           'Bản Hoa Tiến',      'Hộ nghèo',        'Xây mới',        90000000,          'Đang thực hiện',        'Đang đổ mái, dự kiến bàn giao quý IV'),
  (9,  'Sửa chữa, nâng nền chống ngập',                             2025, 'Cứu trợ',              'Ủng hộ trực tiếp',        'Nguyễn Thị Sáu',         'Xã Nghi Lộc',            'Xóm Đông Hải',      'Cận nghèo',       'Sửa chữa',       28000000,          'Đang thực hiện',        NULL),
  (10, 'Xây mới nhà đại đoàn kết — doanh nghiệp tài trợ',           2025, 'Giới thiệu',           'Ủng hộ trực tiếp',        'Phạm Văn Đức',           'Phường Thành Vinh',      'Khối 12',           'Hộ nghèo',        'Xây mới',        100000000,         'Đã bàn giao',           'Do một doanh nghiệp trên địa bàn tài trợ trọn gói'),
  (11, 'Hỗ trợ sửa nhà cho hộ có người khuyết tật',                 2025, 'Vì người nghèo',       'Cấp xã',                  'Đặng Thị Bảy',           'Xã Đại Huệ',             'Xóm 9',             'Khó khăn',        'Sửa chữa',       32000000,          'Đã bàn giao',           NULL),
  (12, 'Xây mới nhà cho hộ nghèo vùng biên',                        2026, 'Ngân sách',            'Trung ương',              'Xồng Bá Dềnh',           'Xã Huồi Tụ',             'Bản Phà Xắc',       'Hộ nghèo',        'Xây mới',        120000000,         'Đang thực hiện',        'Địa bàn xa, chi phí vận chuyển vật liệu cao'),
  (13, 'Hỗ trợ xây nhà cho hộ mới thoát nghèo',                     2026, 'Vì người nghèo',       'Cấp tỉnh',                'Nguyễn Văn Hải',         'Xã Nghi Lộc',            'Xóm Tân Thành',     'Cận nghèo',       'Xây mới',        60000000,          'Đang thực hiện',        NULL),
  (14, 'Sửa chữa nhà hư hỏng nặng',                                 2026, 'Cứu trợ',              'Cấp xã',                  'Trần Thị Minh',          'Phường Trường Vinh',     'Khối 5',            'Hộ nghèo',        'Sửa chữa',       40000000,          'Đang thực hiện',        NULL),
  (15, 'Xây mới nhà đại đoàn kết đợt 1/2026',                       2026, 'Vì người nghèo',       'Cấp tỉnh',                'Cao Văn Lợi',            'Xã Châu Tiến',           'Bản Cống',          'Hộ nghèo',        'Xây mới',        70000000,          'Đã phê duyệt',          'Đã có quyết định phân bổ, chờ khởi công'),
  (16, 'Hỗ trợ sửa nhà cho hộ già yếu',                             2026, 'Vì người nghèo',       'Cấp xã',                  'Lê Thị Tám',             'Xã Đại Huệ',             'Xóm 1',             'Khó khăn',        'Sửa chữa',       27000000,          'Đã phê duyệt',          NULL),
  (17, 'Xây mới nhà cho hộ nghèo có con nhỏ',                       2026, 'Ngân sách',            'Cấp tỉnh',                'Nguyễn Văn Cường',       'Phường Thành Vinh',      'Khối 9',            'Hộ nghèo',        'Xây mới',        85000000,          'Đã phê duyệt',          NULL),
  (18, 'Khảo sát hỗ trợ xây nhà cho hộ nghèo',                      2026, 'Vì người nghèo',       'Cấp xã',                  'Hồ Văn Thu',             'Xã Huồi Tụ',             'Bản Huồi Mới',      'Hộ nghèo',        'Xây mới',        NULL,              'Đang khảo sát',         'Đang xác minh hiện trạng đất ở'),
  (19, 'Khảo sát sửa chữa nhà xuống cấp',                           2026, 'Cứu trợ',              'Cấp xã',                  'Nguyễn Thị Chín',        'Xã Nghi Lộc',            'Xóm Phú Thọ',       'Cận nghèo',       'Sửa chữa',       NULL,              'Đang khảo sát',         NULL),
  (20, 'Khảo sát hỗ trợ hộ bị hỏa hoạn',                            2026, 'Cứu trợ',              'Ủng hộ trực tiếp',        'Trần Văn Mười',          'Phường Trường Vinh',     'Khối 3',            'Khó khăn',        'Xây mới',        NULL,              'Đang khảo sát',         'Nhà cháy hoàn toàn, đang thống kê thiệt hại'),
  (21, 'Xây mới nhà — tạm dừng do vướng đất',                       2026, 'Vì người nghèo',       'Cấp tỉnh',                'Vi Thị Hường',           'Xã Châu Tiến',           'Bản Xiềng',         'Hộ nghèo',        'Xây mới',        70000000,          'Tạm dừng',              'Vướng tranh chấp ranh giới thửa đất'),
  (22, 'Sửa chữa nhà — tạm dừng chờ bổ sung hồ sơ',                 2026, 'Ngân sách',            'Cấp xã',                  'Nguyễn Văn Tấn',         'Xã Đại Huệ',             'Xóm 7',             'Cận nghèo',       'Sửa chữa',       30000000,          'Tạm dừng',              'Thiếu giấy chứng nhận quyền sử dụng đất'),
  (23, 'Xây mới nhà do tổ chức tôn giáo giới thiệu',                2026, 'Giới thiệu',           'Trung ương',              'Nguyễn Thị Yến',         'Phường Thành Vinh',      'Khối 15',           'Hộ nghèo',        'Xây mới',        95000000,          'Đang thực hiện',        'Do một cơ sở tôn giáo giới thiệu và cùng đóng góp')
) AS s (
  stt, noi_dung_ho_tro, nam, nguon, nguon_ho_tro, ho_ten_chu_ho, ten_xa, khoi_xom,
  doi_tuong, loai_hinh_ho_tro, so_tien, trang_thai, ghi_chu
)
WHERE NOT EXISTS (SELECT 1 FROM public.nddk_nha_dai_doan_ket LIMIT 1)
  AND EXISTS (SELECT 1 FROM public.var_nhan_vien LIMIT 1);
