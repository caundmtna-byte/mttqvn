-- ============================================================================
-- Dân tộc, tôn giáo — Thăm hỏi cá nhân (lịch sử thăm hỏi cá nhân tiêu biểu)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.dttg_tham_hoi_ca_nhan (
  id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ca_nhan_id              BIGINT NOT NULL
                          CONSTRAINT dttg_tham_hoi_ca_nhan_ca_nhan_id_fkey
                          REFERENCES public.dttg_thong_tin_ca_nhan_tieu_bieu (id)
                          ON UPDATE CASCADE ON DELETE RESTRICT,
  phong_ban_tham_muu_id   BIGINT
                          CONSTRAINT dttg_tham_hoi_ca_nhan_phong_ban_tham_muu_id_fkey
                          REFERENCES public.var_phong_ban (id)
                          ON UPDATE CASCADE ON DELETE SET NULL,
  doi_tuong               TEXT,
  chuc_vu_vi_tri          TEXT,
  dip_tham_hoi            TEXT NOT NULL,
  thoi_gian_du_kien       TEXT,
  don_vi_tham_hoi         TEXT,
  qua_tang                TEXT,
  don_vi_xa_phuong        TEXT,
  trang_thai              TEXT NOT NULL DEFAULT 'Chưa thực hiện'
                          CHECK (trang_thai IN ('Chưa thực hiện', 'Đang thực hiện', 'Đã hoàn thành')),
  ket_qua_ghi_chu         TEXT,
  link_ket_qua            TEXT,
  id_nguoi_tao            BIGINT NOT NULL
                          CONSTRAINT dttg_tham_hoi_ca_nhan_id_nguoi_tao_fkey
                          REFERENCES public.var_nhan_vien (id)
                          ON UPDATE CASCADE ON DELETE RESTRICT,
  tg_tao                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dttg_tham_hoi_ca_nhan_ca_nhan
  ON public.dttg_tham_hoi_ca_nhan (ca_nhan_id);
CREATE INDEX IF NOT EXISTS idx_dttg_tham_hoi_ca_nhan_phong_ban
  ON public.dttg_tham_hoi_ca_nhan (phong_ban_tham_muu_id);
CREATE INDEX IF NOT EXISTS idx_dttg_tham_hoi_ca_nhan_trang_thai
  ON public.dttg_tham_hoi_ca_nhan (trang_thai);
CREATE INDEX IF NOT EXISTS idx_dttg_tham_hoi_ca_nhan_dip_lower
  ON public.dttg_tham_hoi_ca_nhan (lower(trim(dip_tham_hoi)));

DROP TRIGGER IF EXISTS trg_dttg_tham_hoi_ca_nhan_updated
  ON public.dttg_tham_hoi_ca_nhan;
CREATE TRIGGER trg_dttg_tham_hoi_ca_nhan_updated
  BEFORE UPDATE ON public.dttg_tham_hoi_ca_nhan
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

ALTER TABLE public.dttg_tham_hoi_ca_nhan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dttg_tham_hoi_ca_nhan_select
  ON public.dttg_tham_hoi_ca_nhan;
CREATE POLICY dttg_tham_hoi_ca_nhan_select
  ON public.dttg_tham_hoi_ca_nhan
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS dttg_tham_hoi_ca_nhan_modify
  ON public.dttg_tham_hoi_ca_nhan;
CREATE POLICY dttg_tham_hoi_ca_nhan_modify
  ON public.dttg_tham_hoi_ca_nhan
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed cá nhân tiêu biểu (prerequisite nếu chưa có dữ liệu)
INSERT INTO public.dttg_thong_tin_ca_nhan_tieu_bieu (
  ho_va_ten, doi_tuong, chuc_vu_vi_tri, id_nguoi_tao
)
SELECT * FROM (VALUES
  ('Hòa thượng Thích Thọ Lạc'::text, 'Chức sắc'::text, 'Trụ trì Chùa Cần Linh'::text, (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)),
  ('Linh mục Nguyễn Văn Vinh', 'Chức sắc', 'Linh mục GX Cửa Nam', (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)),
  ('Cao Đăng Vĩnh', 'Người uy tín', 'Chủ tịch Hội Người cao tuổi', (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)),
  ('Vừ Chông Pao', 'Người uy tín', 'Già làng', (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)),
  ('Lữ Văn Thắng', 'Người uy tín', 'Trưởng bản', (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)),
  ('Nguyễn Văn Hùng', 'Người có công', 'Thương binh 1/4', (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)),
  ('Nguyễn Thị Liên', 'Người có công', 'Mẹ Việt Nam Anh hùng', (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1))
) AS seed (ho_va_ten, doi_tuong, chuc_vu_vi_tri, id_nguoi_tao)
WHERE NOT EXISTS (SELECT 1 FROM public.dttg_thong_tin_ca_nhan_tieu_bieu LIMIT 1);

-- Seed mẫu thăm hỏi cá nhân
INSERT INTO public.dttg_tham_hoi_ca_nhan (
  ca_nhan_id, phong_ban_tham_muu_id, doi_tuong, chuc_vu_vi_tri,
  dip_tham_hoi, thoi_gian_du_kien, don_vi_tham_hoi, qua_tang, don_vi_xa_phuong,
  trang_thai, ket_qua_ghi_chu, link_ket_qua, id_nguoi_tao
)
SELECT * FROM (VALUES
  (
    (SELECT id FROM public.dttg_thong_tin_ca_nhan_tieu_bieu WHERE lower(trim(ho_va_ten)) = lower('Hòa thượng Thích Thọ Lạc') LIMIT 1),
    (SELECT id FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) = lower('Ban Dân tộc, Tôn giáo và Hội quần chúng') LIMIT 1),
    'Chức sắc'::text, 'Trụ trì Chùa Cần Linh'::text,
    'Đại lễ Phật đản'::text, 'Tháng 5/2026'::text, 'Phường Thành Vinh'::text, 'Quà & Lẵng hoa'::text, 'Phường Thành Vinh'::text,
    'Chưa thực hiện'::text, 'Lãnh đạo tôn giáo tiêu biểu'::text, NULL::text,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    (SELECT id FROM public.dttg_thong_tin_ca_nhan_tieu_bieu WHERE lower(trim(ho_va_ten)) = lower('Linh mục Nguyễn Văn Vinh') LIMIT 1),
    (SELECT id FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) = lower('Ban Dân tộc, Tôn giáo và Hội quần chúng') LIMIT 1),
    'Chức sắc', 'Linh mục GX Cửa Nam',
    'Lễ Giáng sinh', 'Tháng 12/2026', 'Phường Thành Vinh', 'Quà & Tiền mặt', 'Phường Thành Vinh',
    'Chưa thực hiện', 'Chức sắc Công giáo uy tín', NULL,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    (SELECT id FROM public.dttg_thong_tin_ca_nhan_tieu_bieu WHERE lower(trim(ho_va_ten)) = lower('Cao Đăng Vĩnh') LIMIT 1),
    (SELECT id FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) = lower('Ban Dân tộc, Tôn giáo và Hội quần chúng') LIMIT 1),
    'Người uy tín', 'Chủ tịch Hội Người cao tuổi',
    'Ngày hội Đại đoàn kết', 'Tháng 11/2026', 'CQMTTQ Tỉnh', 'Quà tặng', 'Phường Trường Vinh',
    'Chưa thực hiện', 'Gương sáng tại khối phố', NULL,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    (SELECT id FROM public.dttg_thong_tin_ca_nhan_tieu_bieu WHERE lower(trim(ho_va_ten)) = lower('Vừ Chông Pao') LIMIT 1),
    (SELECT id FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) = lower('Ban Dân tộc, Tôn giáo và Hội quần chúng') LIMIT 1),
    'Người uy tín', 'Già làng',
    'Tết Nguyên Đán', 'Tháng 1/2026', 'CQMTTQ Tỉnh', 'Quà Tết', 'Xã Huồi Tụ',
    'Đã hoàn thành', 'Vận động đồng bào định canh', NULL,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    (SELECT id FROM public.dttg_thong_tin_ca_nhan_tieu_bieu WHERE lower(trim(ho_va_ten)) = lower('Lữ Văn Thắng') LIMIT 1),
    (SELECT id FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) = lower('Ban Dân tộc, Tôn giáo và Hội quần chúng') LIMIT 1),
    'Người uy tín', 'Trưởng bản',
    'Tết Độc lập (2/9)', 'Tháng 9/2026', 'Xã Châu Tiến', 'Quà tặng', 'Xã Châu Tiến',
    'Chưa thực hiện', 'Gìn giữ bản sắc dân tộc Thái', NULL,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    (SELECT id FROM public.dttg_thong_tin_ca_nhan_tieu_bieu WHERE lower(trim(ho_va_ten)) = lower('Nguyễn Văn Hùng') LIMIT 1),
    (SELECT id FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) = lower('Ban Tuyên giáo, Công tác xã hội') LIMIT 1),
    'Người có công', 'Thương binh 1/4',
    'Ngày Thương binh Liệt sĩ', 'Tháng 7/2026', 'Xã Đại Huệ', 'Quà tặng', 'Xã Đại Huệ',
    'Chưa thực hiện', 'Thương binh vượt khó tiêu biểu', NULL,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    (SELECT id FROM public.dttg_thong_tin_ca_nhan_tieu_bieu WHERE lower(trim(ho_va_ten)) = lower('Nguyễn Thị Liên') LIMIT 1),
    (SELECT id FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) = lower('Ban Tuyên giáo, Công tác xã hội') LIMIT 1),
    'Người có công', 'Mẹ Việt Nam Anh hùng',
    'Ngày Thương binh Liệt sĩ', 'Tháng 7/2026', 'Xã Nghi Lộc', 'Quà & Tiền mặt', 'Xã Nghi Lộc',
    'Chưa thực hiện', 'Cống hiến cho sự nghiệp CM', NULL,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  )
) AS seed (
  ca_nhan_id, phong_ban_tham_muu_id, doi_tuong, chuc_vu_vi_tri,
  dip_tham_hoi, thoi_gian_du_kien, don_vi_tham_hoi, qua_tang, don_vi_xa_phuong,
  trang_thai, ket_qua_ghi_chu, link_ket_qua, id_nguoi_tao
)
WHERE NOT EXISTS (SELECT 1 FROM public.dttg_tham_hoi_ca_nhan LIMIT 1);
