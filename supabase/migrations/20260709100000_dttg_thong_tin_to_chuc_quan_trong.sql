-- ============================================================================
-- Dân tộc, tôn giáo — Thông tin tổ chức quan trọng
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.dttg_thong_tin_to_chuc_quan_trong (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  loai_hinh           TEXT NOT NULL
                      CHECK (loai_hinh IN ('Chùa', 'Giáo xứ', 'Nghĩa trang', 'Khác')),
  ten_co_so           TEXT NOT NULL,
  chu_tri             TEXT,
  lich_su_hinh_thanh  TEXT,
  cong_tac_an_sinh    TEXT,
  don_vi_id           BIGINT
                      CONSTRAINT dttg_thong_tin_to_chuc_quan_trong_don_vi_id_fkey
                      REFERENCES public.var_ssn_xa_phuong (id)
                      ON UPDATE CASCADE ON DELETE SET NULL,
  dia_chi             TEXT,
  so_dien_thoai       TEXT,
  trang_thai          TEXT NOT NULL DEFAULT 'Đang hoạt động'
                      CHECK (trang_thai IN ('Đang hoạt động', 'Ngừng hoạt động')),
  id_nguoi_tao        BIGINT NOT NULL
                      CONSTRAINT dttg_thong_tin_to_chuc_quan_trong_id_nguoi_tao_fkey
                      REFERENCES public.var_nhan_vien (id)
                      ON UPDATE CASCADE ON DELETE RESTRICT,
  tg_tao              TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dttg_tt_tcqt_don_vi
  ON public.dttg_thong_tin_to_chuc_quan_trong (don_vi_id);
CREATE INDEX IF NOT EXISTS idx_dttg_tt_tcqt_loai_hinh
  ON public.dttg_thong_tin_to_chuc_quan_trong (loai_hinh);
CREATE INDEX IF NOT EXISTS idx_dttg_tt_tcqt_trang_thai
  ON public.dttg_thong_tin_to_chuc_quan_trong (trang_thai);
CREATE INDEX IF NOT EXISTS idx_dttg_tt_tcqt_ten_co_so_lower
  ON public.dttg_thong_tin_to_chuc_quan_trong (lower(trim(ten_co_so)));

DROP TRIGGER IF EXISTS trg_dttg_thong_tin_to_chuc_quan_trong_updated
  ON public.dttg_thong_tin_to_chuc_quan_trong;
CREATE TRIGGER trg_dttg_thong_tin_to_chuc_quan_trong_updated
  BEFORE UPDATE ON public.dttg_thong_tin_to_chuc_quan_trong
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

ALTER TABLE public.dttg_thong_tin_to_chuc_quan_trong ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dttg_thong_tin_to_chuc_quan_trong_select
  ON public.dttg_thong_tin_to_chuc_quan_trong;
CREATE POLICY dttg_thong_tin_to_chuc_quan_trong_select
  ON public.dttg_thong_tin_to_chuc_quan_trong
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS dttg_thong_tin_to_chuc_quan_trong_modify
  ON public.dttg_thong_tin_to_chuc_quan_trong;
CREATE POLICY dttg_thong_tin_to_chuc_quan_trong_modify
  ON public.dttg_thong_tin_to_chuc_quan_trong
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed mẫu (don_vi_id resolve theo tên xã/phường; id_nguoi_tao = nhân viên đầu tiên)
INSERT INTO public.dttg_thong_tin_to_chuc_quan_trong (
  loai_hinh, ten_co_so, chu_tri, lich_su_hinh_thanh, cong_tac_an_sinh,
  don_vi_id, dia_chi, so_dien_thoai, id_nguoi_tao
)
SELECT * FROM (VALUES
  (
    'Chùa'::text, 'Chùa Cần Linh'::text, 'Hòa thượng Thích Thọ Lạc'::text,
    'Ngôi chùa cổ có từ thời Lê, là di tích lịch sử quốc gia.'::text,
    'Phát quà từ thiện hàng tháng cho các hộ nghèo tại địa phương.'::text,
    (SELECT id FROM public.var_ssn_xa_phuong WHERE lower(trim(ten)) = lower('Phường Thành Vinh') LIMIT 1),
    'TP. Vinh, Nghệ An'::text, '0238-384XXXX'::text,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    'Giáo xứ', 'Giáo xứ Cửa Nam', 'Linh mục Phêrô Nguyễn Văn Vinh',
    'Thành lập từ lâu đời, là trung tâm tôn giáo quan trọng của khu vực.',
    'Khám chữa bệnh miễn phí và hỗ trợ người già neo đơn.',
    (SELECT id FROM public.var_ssn_xa_phuong WHERE lower(trim(ten)) = lower('Phường Thành Vinh') LIMIT 1),
    'TP. Vinh, Nghệ An', '0238-383XXXX',
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    'Chùa', 'Chùa Đại Tuệ', 'Thượng tọa Thích Chân Quang',
    'Tọa lạc trên đỉnh núi cao, có lịch sử gắn liền với truyền thống yêu nước.',
    'Trồng rừng phòng hộ và hỗ trợ học bổng cho học sinh nghèo vượt khó.',
    (SELECT id FROM public.var_ssn_xa_phuong WHERE lower(trim(ten)) = lower('Xã Đại Huệ') LIMIT 1),
    'Huyện Nam Đàn, Nghệ An', '0238-378XXXX',
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    'Giáo xứ', 'Tòa Giám mục Xã Đoài', 'Đức Giám mục Anphongsô Nguyễn Hữu Long',
    'Tòa giám mục có kiến trúc độc đáo, là thủ phủ của Giáo phận Vinh.',
    'Hoạt động cứu trợ thiên tai và vận động xây dựng nhà tình thương.',
    (SELECT id FROM public.var_ssn_xa_phuong WHERE lower(trim(ten)) = lower('Xã Nghi Lộc') LIMIT 1),
    'Huyện Nghi Lộc, Nghệ An', '0238-386XXXX',
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    'Chùa', 'Chùa Cổ Am', 'Đại đức Thích Tâm Thành',
    'Ngôi chùa cổ được phục dựng, là điểm đến tâm linh nổi tiếng.',
    'Tổ chức các khóa tu mùa hè rèn luyện đạo đức cho thanh thiếu niên.',
    (SELECT id FROM public.var_ssn_xa_phuong WHERE lower(trim(ten)) = lower('Xã Diễn Châu') LIMIT 1),
    'Huyện Diễn Châu, Nghệ An', '0238-362XXXX',
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    'Giáo xứ', 'Giáo xứ Quỳnh Lâm', 'Linh mục Antôn Trần Văn Công',
    'Cộng đồng giáo dân đoàn kết, có lịch sử phát triển bền vững.',
    'Đóng góp quỹ khuyến học và hỗ trợ kinh phí sửa chữa đường nông thôn.',
    (SELECT id FROM public.var_ssn_xa_phuong WHERE lower(trim(ten)) = lower('Xã Quỳnh Lưu') LIMIT 1),
    'Huyện Quỳnh Lưu, Nghệ An', '0238-364XXXX',
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    'Nghĩa trang', 'Nghĩa trang liệt sĩ Quốc tế Việt - Lào', 'UBND Xã',
    'Được xây dựng từ những năm 1976 và chính thức nâng cấp, mở rộng vào năm 1982 trên diện tích gần 7 ha tại thị trấn Anh Sơn. Đây là nghĩa trang lớn nhất quy tập các mộ liệt sĩ là quân tình nguyện và chuyên gia Việt Nam từng hy sinh khi làm nhiệm vụ quốc tế cao cả tại Lào.',
    NULL,
    (SELECT id FROM public.var_ssn_xa_phuong WHERE lower(trim(ten)) = lower('Xã Anh Sơn') LIMIT 1),
    NULL, NULL,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    'Nghĩa trang', 'Khu di tích lịch sử Truông Bồn', 'UBND Xã',
    'Truông Bồn là một đoạn đèo dốc dài khoảng 5km trên Tuyến đường chiến lược 15A. Trong kháng chiến chống Mỹ, nơi đây là "tọa độ chết" - nút giao thông huyết mạch để miền Bắc chi viện cho chiến trường miền Nam, hứng chịu hàng nghìn quả bom cày xới.',
    NULL,
    (SELECT id FROM public.var_ssn_xa_phuong WHERE lower(trim(ten)) = lower('Xã Thuần Trung') LIMIT 1),
    NULL, NULL,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    'Nghĩa trang', 'Nghĩa trang liệt sĩ TP. Vinh', 'UBND Xã',
    'Được xây dựng tại phường Hưng Dũng, TP. Vinh, đây là nơi quy tập và an táng các liệt sĩ hy sinh qua các thời kỳ kháng chiến chống Pháp, chống Mỹ bảo vệ Tổ quốc, và các chiến sĩ hy sinh trong phong trào Xô Viết Nghệ Tĩnh (1930 - 1931) lịch sử.',
    NULL,
    (SELECT id FROM public.var_ssn_xa_phuong WHERE lower(trim(ten)) = lower('Phường Thành Vinh') LIMIT 1),
    NULL, NULL,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    'Nghĩa trang', 'Nghĩa trang liệt sĩ huyện Nghi Lộc', 'UBND Xã',
    'Nằm trên mảnh đất giàu truyền thống cách mạng Nghi Lộc (hiện tọa lạc tại xã Nghi Thịnh), nghĩa trang được xây dựng để quy tập các phần mộ liệt sĩ là người con của quê hương Nghi Lộc, cũng như các chiến sĩ thuộc các đơn vị chủ lực đã hy sinh trên địa bàn huyện qua hai cuộc kháng chiến trường kỳ của dân tộc.',
    NULL,
    (SELECT id FROM public.var_ssn_xa_phuong WHERE lower(trim(ten)) = lower('Xã Nghi Lộc') LIMIT 1),
    NULL, NULL,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    'Khác', 'Đền Ông Hoàng Mười', NULL, NULL, NULL, NULL, NULL, NULL,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  )
) AS seed (
  loai_hinh, ten_co_so, chu_tri, lich_su_hinh_thanh, cong_tac_an_sinh,
  don_vi_id, dia_chi, so_dien_thoai, id_nguoi_tao
)
WHERE NOT EXISTS (SELECT 1 FROM public.dttg_thong_tin_to_chuc_quan_trong LIMIT 1);
