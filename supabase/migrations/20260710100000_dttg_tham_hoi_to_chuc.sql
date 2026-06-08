-- ============================================================================
-- Dân tộc, tôn giáo — Thăm hỏi tổ chức (lịch sử thăm hỏi cơ sở tôn giáo)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.dttg_tham_hoi_to_chuc (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  to_chuc_id          BIGINT NOT NULL
                      CONSTRAINT dttg_tham_hoi_to_chuc_to_chuc_id_fkey
                      REFERENCES public.dttg_thong_tin_to_chuc_quan_trong (id)
                      ON UPDATE CASCADE ON DELETE RESTRICT,
  dip_tham_hoi        TEXT NOT NULL,
  thoi_gian_du_kien   TEXT,
  don_vi_tham_hoi     TEXT,
  noi_dung_tham_hoi   TEXT,
  thanh_phan_doan     TEXT,
  qua_tang            TEXT,
  tien_do             TEXT NOT NULL DEFAULT 'Chưa thực hiện'
                      CHECK (tien_do IN ('Chưa thực hiện', 'Đang thực hiện', 'Đã hoàn thành')),
  ket_qua_thuc_hien   TEXT,
  link_ket_qua        TEXT,
  id_nguoi_tao        BIGINT NOT NULL
                      CONSTRAINT dttg_tham_hoi_to_chuc_id_nguoi_tao_fkey
                      REFERENCES public.var_nhan_vien (id)
                      ON UPDATE CASCADE ON DELETE RESTRICT,
  tg_tao              TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dttg_tham_hoi_to_chuc_to_chuc
  ON public.dttg_tham_hoi_to_chuc (to_chuc_id);
CREATE INDEX IF NOT EXISTS idx_dttg_tham_hoi_to_chuc_tien_do
  ON public.dttg_tham_hoi_to_chuc (tien_do);
CREATE INDEX IF NOT EXISTS idx_dttg_tham_hoi_to_chuc_dip_lower
  ON public.dttg_tham_hoi_to_chuc (lower(trim(dip_tham_hoi)));

DROP TRIGGER IF EXISTS trg_dttg_tham_hoi_to_chuc_updated
  ON public.dttg_tham_hoi_to_chuc;
CREATE TRIGGER trg_dttg_tham_hoi_to_chuc_updated
  BEFORE UPDATE ON public.dttg_tham_hoi_to_chuc
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

ALTER TABLE public.dttg_tham_hoi_to_chuc ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dttg_tham_hoi_to_chuc_select
  ON public.dttg_tham_hoi_to_chuc;
CREATE POLICY dttg_tham_hoi_to_chuc_select
  ON public.dttg_tham_hoi_to_chuc
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS dttg_tham_hoi_to_chuc_modify
  ON public.dttg_tham_hoi_to_chuc;
CREATE POLICY dttg_tham_hoi_to_chuc_modify
  ON public.dttg_tham_hoi_to_chuc
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed mẫu (to_chuc_id resolve theo ten_co_so; id_nguoi_tao = nhân viên đầu tiên)
INSERT INTO public.dttg_tham_hoi_to_chuc (
  to_chuc_id, dip_tham_hoi, thoi_gian_du_kien, don_vi_tham_hoi,
  noi_dung_tham_hoi, thanh_phan_doan, qua_tang, tien_do, ket_qua_thuc_hien, link_ket_qua,
  id_nguoi_tao
)
SELECT * FROM (VALUES
  (
    (SELECT id FROM public.dttg_thong_tin_to_chuc_quan_trong WHERE lower(trim(ten_co_so)) = lower('Chùa Cần Linh') LIMIT 1),
    'Đại lễ Phật đản'::text, 'Tháng 5/2026'::text, 'Phường Thành Vinh'::text,
    'Chúc mừng Ban trị sự, tăng ni, Phật tử'::text,
    'Lãnh đạo MTTQ tỉnh, Ban Tôn giáo'::text, 'Lẵng hoa và quà tặng'::text,
    'Chưa thực hiện'::text, NULL::text, NULL::text,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    (SELECT id FROM public.dttg_thong_tin_to_chuc_quan_trong WHERE lower(trim(ten_co_so)) = lower('Giáo xứ Cửa Nam') LIMIT 1),
    'Lễ Giáng sinh', 'Tháng 12/2026', 'Phường Thành Vinh',
    'Chúc mừng Linh mục và giáo dân',
    'Lãnh đạo MTTQ tỉnh, đại diện ban ngành', 'Quà tặng và tiền mặt',
    'Chưa thực hiện', NULL, NULL,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    (SELECT id FROM public.dttg_thong_tin_to_chuc_quan_trong WHERE lower(trim(ten_co_so)) = lower('Chùa Đại Tuệ') LIMIT 1),
    'Tết Nguyên Đán', 'Tháng 1/2026', 'Xã Đại Huệ',
    'Thăm hỏi, chúc Tết',
    'Thường trực MTTQ huyện Nam Đàn', 'Quà Tết',
    'Đã hoàn thành', 'Diễn ra trang trọng', NULL,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    (SELECT id FROM public.dttg_thong_tin_to_chuc_quan_trong WHERE lower(trim(ten_co_so)) = lower('Tòa Giám mục Xã Đoài') LIMIT 1),
    'Lễ bổn mạng của Giám mục', 'Tháng 8/2026', 'Xã Nghi Lộc',
    'Thăm hỏi cá nhân Đức Giám mục',
    'Ban Thường trực MTTQ tỉnh', 'Lẵng hoa chúc mừng',
    'Đang thực hiện', NULL, NULL,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    (SELECT id FROM public.dttg_thong_tin_to_chuc_quan_trong WHERE lower(trim(ten_co_so)) = lower('Chùa Cổ Am') LIMIT 1),
    'Lễ Vu Lan', 'Tháng 8/2026', 'Xã Diễn Châu',
    'Động viên hoạt động thiện nguyện',
    'MTTQ huyện Diễn Châu', 'Quà tặng',
    'Chưa thực hiện', NULL, NULL,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    (SELECT id FROM public.dttg_thong_tin_to_chuc_quan_trong WHERE lower(trim(ten_co_so)) = lower('Giáo xứ Quỳnh Lâm') LIMIT 1),
    'Tết Độc lập (2/9)', 'Tháng 9/2026', 'MTTQ tỉnh',
    'Gặp mặt chức sắc, người uy tín',
    'MTTQ huyện Quỳnh Lưu', 'Quà tặng',
    'Chưa thực hiện', NULL, NULL,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    (SELECT id FROM public.dttg_thong_tin_to_chuc_quan_trong WHERE lower(trim(ten_co_so)) = lower('Nghĩa trang liệt sĩ Quốc tế Việt - Lào') LIMIT 1),
    'Ngày Thương binh - Liệt sĩ (27/7)', 'Tháng 7/2026', 'MTTQ tỉnh',
    'Dâng hoa, dâng hương tri ân các anh hùng liệt sĩ',
    'Lãnh đạo Tỉnh ủy, HĐND, UBND, MTTQ tỉnh', 'Vòng hoa và lễ vật',
    'Chưa thực hiện', NULL, NULL,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    (SELECT id FROM public.dttg_thong_tin_to_chuc_quan_trong WHERE lower(trim(ten_co_so)) = lower('Khu di tích lịch sử Truông Bồn') LIMIT 1),
    'Ngày Thương binh - Liệt sĩ (27/7)', 'Tháng 7/2026', 'MTTQ tỉnh',
    'Thăm viếng, tưởng niệm các thanh niên xung phong',
    'Đoàn đại biểu MTTQ tỉnh và các đoàn thể', 'Vòng hoa và lễ vật',
    'Chưa thực hiện', NULL, NULL,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    (SELECT id FROM public.dttg_thong_tin_to_chuc_quan_trong WHERE lower(trim(ten_co_so)) = lower('Nghĩa trang liệt sĩ TP. Vinh') LIMIT 1),
    'Ngày Thương binh - Liệt sĩ (27/7)', 'Tháng 1/2026', 'MTTQ tỉnh',
    'Dâng hương tưởng niệm đầu xuân',
    'Lãnh đạo Tỉnh ủy, HĐND, UBND, MTTQ tỉnh', 'Vòng hoa và lễ vật',
    'Đã hoàn thành', NULL, NULL,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    (SELECT id FROM public.dttg_thong_tin_to_chuc_quan_trong WHERE lower(trim(ten_co_so)) = lower('Nghĩa trang liệt sĩ huyện Nghi Lộc') LIMIT 1),
    'Ngày Thương binh - Liệt sĩ (27/7)', 'Tháng 7/2026', 'MTTQ tỉnh',
    'Thăm hỏi, tri ân và tặng quà các gia đình chính sách',
    'Đoàn đại biểu MTTQ tỉnh và các đoàn thể', 'Quà tặng và lễ vật',
    'Chưa thực hiện', NULL, NULL,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  )
) AS seed (
  to_chuc_id, dip_tham_hoi, thoi_gian_du_kien, don_vi_tham_hoi,
  noi_dung_tham_hoi, thanh_phan_doan, qua_tang, tien_do, ket_qua_thuc_hien, link_ket_qua,
  id_nguoi_tao
)
WHERE NOT EXISTS (SELECT 1 FROM public.dttg_tham_hoi_to_chuc LIMIT 1);
