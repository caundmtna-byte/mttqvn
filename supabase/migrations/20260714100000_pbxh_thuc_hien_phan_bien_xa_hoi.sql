-- ============================================================================
-- Phản biện xã hội — Thực hiện phản biện xã hội
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pbxh_thuc_hien_phan_bien_xa_hoi (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cap_thuc_hien         TEXT NOT NULL
                        CHECK (cap_thuc_hien IN ('Cấp tỉnh', 'Cấp xã')),
  loai_hinh             TEXT NOT NULL
                        CHECK (loai_hinh IN ('Giám sát', 'Phản biện', 'Kiểm tra', 'Giám sát cộng đồng')),
  noi_dung              TEXT NOT NULL,
  doi_tuong_id          BIGINT
                        CONSTRAINT pbxh_thuc_hien_doi_tuong_id_fkey
                        REFERENCES public.pbxh_thiet_lap (id)
                        ON UPDATE CASCADE ON DELETE SET NULL,
  hinh_thuc_id          BIGINT
                        CONSTRAINT pbxh_thuc_hien_hinh_thuc_id_fkey
                        REFERENCES public.pbxh_thiet_lap (id)
                        ON UPDATE CASCADE ON DELETE SET NULL,
  ngay_bat_dau          DATE,
  ngay_ket_thuc         DATE,
  mo_ta_thoi_gian       TEXT,
  tinh_trang            TEXT NOT NULL DEFAULT 'Đã lập kế hoạch'
                        CHECK (tinh_trang IN (
                          'Đang thực hiện',
                          'Đã lập kế hoạch',
                          'Đã hoàn thành',
                          'Dự kiến',
                          'Tạm dừng'
                        )),
  don_vi_chu_tri_id     BIGINT
                        CONSTRAINT pbxh_thuc_hien_don_vi_chu_tri_id_fkey
                        REFERENCES public.pbxh_thiet_lap (id)
                        ON UPDATE CASCADE ON DELETE SET NULL,
  phong_ban_tham_muu_id BIGINT
                        CONSTRAINT pbxh_thuc_hien_phong_ban_tham_muu_id_fkey
                        REFERENCES public.var_phong_ban (id)
                        ON UPDATE CASCADE ON DELETE SET NULL,
  don_vi_thuc_hien_id   BIGINT
                        CONSTRAINT pbxh_thuc_hien_don_vi_thuc_hien_id_fkey
                        REFERENCES public.var_ssn_xa_phuong (id)
                        ON UPDATE CASCADE ON DELETE SET NULL,
  ket_qua_kien_nghi     TEXT,
  phan_tram_hoan_thanh  SMALLINT NOT NULL DEFAULT 0
                        CHECK (phan_tram_hoan_thanh BETWEEN 0 AND 100),
  link_ket_qua          TEXT,
  id_nguoi_tao          BIGINT NOT NULL
                        CONSTRAINT pbxh_thuc_hien_id_nguoi_tao_fkey
                        REFERENCES public.var_nhan_vien (id)
                        ON UPDATE CASCADE ON DELETE RESTRICT,
  tg_tao                TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pbxh_thuc_hien_cap
  ON public.pbxh_thuc_hien_phan_bien_xa_hoi (cap_thuc_hien);
CREATE INDEX IF NOT EXISTS idx_pbxh_thuc_hien_loai_hinh
  ON public.pbxh_thuc_hien_phan_bien_xa_hoi (loai_hinh);
CREATE INDEX IF NOT EXISTS idx_pbxh_thuc_hien_tinh_trang
  ON public.pbxh_thuc_hien_phan_bien_xa_hoi (tinh_trang);
CREATE INDEX IF NOT EXISTS idx_pbxh_thuc_hien_ngay_ket_thuc
  ON public.pbxh_thuc_hien_phan_bien_xa_hoi (ngay_ket_thuc);
CREATE INDEX IF NOT EXISTS idx_pbxh_thuc_hien_don_vi_chu_tri
  ON public.pbxh_thuc_hien_phan_bien_xa_hoi (don_vi_chu_tri_id);

DROP TRIGGER IF EXISTS trg_pbxh_thuc_hien_updated
  ON public.pbxh_thuc_hien_phan_bien_xa_hoi;
CREATE TRIGGER trg_pbxh_thuc_hien_updated
  BEFORE UPDATE ON public.pbxh_thuc_hien_phan_bien_xa_hoi
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

ALTER TABLE public.pbxh_thuc_hien_phan_bien_xa_hoi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pbxh_thuc_hien_select
  ON public.pbxh_thuc_hien_phan_bien_xa_hoi;
CREATE POLICY pbxh_thuc_hien_select
  ON public.pbxh_thuc_hien_phan_bien_xa_hoi
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS pbxh_thuc_hien_modify
  ON public.pbxh_thuc_hien_phan_bien_xa_hoi;
CREATE POLICY pbxh_thuc_hien_modify
  ON public.pbxh_thuc_hien_phan_bien_xa_hoi
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed 11 dòng mẫu
INSERT INTO public.pbxh_thuc_hien_phan_bien_xa_hoi (
  cap_thuc_hien, loai_hinh, noi_dung,
  doi_tuong_id, hinh_thuc_id,
  ngay_bat_dau, ngay_ket_thuc, mo_ta_thoi_gian,
  tinh_trang, don_vi_chu_tri_id, phong_ban_tham_muu_id,
  don_vi_thuc_hien_id, ket_qua_kien_nghi, phan_tram_hoan_thanh,
  id_nguoi_tao
)
SELECT * FROM (VALUES
  (
    'Cấp tỉnh'::text, 'Giám sát'::text,
    'Giám sát việc thực hiện chính sách hỗ trợ người nghèo'::text,
    (SELECT id FROM public.pbxh_thiet_lap WHERE loai = 'doi_tuong' AND lower(trim(ten)) = lower('Sở Lao động - Thương binh và Xã hội') LIMIT 1),
    (SELECT id FROM public.pbxh_thiet_lap WHERE loai = 'hinh_thuc' AND lower(trim(ten)) = lower('Thành lập đoàn giám sát liên ngành') LIMIT 1),
    '2026-03-01'::date, '2026-06-30'::date, NULL::text,
    'Đang thực hiện'::text,
    (SELECT id FROM public.pbxh_thiet_lap WHERE loai = 'don_vi_chu_tri' AND lower(trim(ten)) = lower('Ban Thường trực MTTQ tỉnh') LIMIT 1),
    (SELECT id FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) LIKE lower('%Dân chủ%') LIMIT 1),
    NULL::bigint,
    'Đang tổng hợp báo cáo'::text, 0::smallint,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    'Cấp tỉnh', 'Phản biện',
    'Phản biện dự thảo Nghị quyết về phát triển kinh tế - xã hội địa phương',
    (SELECT id FROM public.pbxh_thiet_lap WHERE loai = 'doi_tuong' AND lower(trim(ten)) = lower('UBND tỉnh (Cơ quan soạn thảo)') LIMIT 1),
    (SELECT id FROM public.pbxh_thiet_lap WHERE loai = 'hinh_thuc' AND lower(trim(ten)) = lower('Tổ chức hội nghị phản biện xã hội') LIMIT 1),
    NULL, '2026-09-30', 'Quý III/2026',
    'Đã lập kế hoạch',
    (SELECT id FROM public.pbxh_thiet_lap WHERE loai = 'don_vi_chu_tri' AND lower(trim(ten)) = lower('Ban Thường vụ Tỉnh Đoàn') LIMIT 1),
    (SELECT id FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) LIKE lower('%Tổ chức kiểm tra%') LIMIT 1),
    NULL,
    'Chưa thực hiện', 0,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    'Cấp xã', 'Giám sát',
    'Giám sát hoạt động của Ban Thanh tra nhân dân tại địa phương',
    (SELECT id FROM public.pbxh_thiet_lap WHERE loai = 'doi_tuong' AND lower(trim(ten)) = lower('Ban Thanh tra nhân dân') LIMIT 1),
    (SELECT id FROM public.pbxh_thiet_lap WHERE loai = 'hinh_thuc' AND lower(trim(ten)) = lower('Giám sát thông qua báo cáo và thực tế') LIMIT 1),
    NULL, '2026-12-31', 'Quý IV/2026',
    'Đang thực hiện',
    (SELECT id FROM public.pbxh_thiet_lap WHERE loai = 'don_vi_chu_tri' AND lower(trim(ten)) = lower('Ban Thường trực MTTQ xã') LIMIT 1),
    NULL,
    (SELECT id FROM public.var_ssn_xa_phuong WHERE lower(trim(ten)) LIKE lower('%Yên Hòa%') LIMIT 1),
    NULL, 0,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    'Cấp xã', 'Giám sát',
    'Giám sát việc công khai, minh bạch trong thu chi quỹ đóng góp tại cộng đồng',
    (SELECT id FROM public.pbxh_thiet_lap WHERE loai = 'doi_tuong' AND lower(trim(ten)) = lower('Ban quản lý quỹ, các tổ dân phố') LIMIT 1),
    (SELECT id FROM public.pbxh_thiet_lap WHERE loai = 'hinh_thuc' AND lower(trim(ten)) = lower('Giám sát trực tiếp tại các tổ dân phố') LIMIT 1),
    NULL, '2026-09-30', 'Quý III/2026',
    'Dự kiến',
    (SELECT id FROM public.pbxh_thiet_lap WHERE loai = 'don_vi_chu_tri' AND lower(trim(ten)) = lower('Ban Giám sát đầu tư cộng đồng') LIMIT 1),
    NULL,
    (SELECT id FROM public.var_ssn_xa_phuong WHERE lower(trim(ten)) LIKE lower('%Trường Vinh%') LIMIT 1),
    NULL, 0,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    'Cấp tỉnh', 'Giám sát',
    'Giám sát việc giải quyết khiếu nại, tố cáo của công dân',
    (SELECT id FROM public.pbxh_thiet_lap WHERE loai = 'doi_tuong' AND lower(trim(ten)) = lower('UBND cấp xã, cơ quan chuyên môn') LIMIT 1),
    (SELECT id FROM public.pbxh_thiet_lap WHERE loai = 'hinh_thuc' AND lower(trim(ten)) = lower('Nghiên cứu hồ sơ và làm việc trực tiếp') LIMIT 1),
    NULL, '2026-12-31', 'Quý IV/2026',
    'Đã hoàn thành',
    (SELECT id FROM public.pbxh_thiet_lap WHERE loai = 'don_vi_chu_tri' AND lower(trim(ten)) = lower('Ban Thường vụ Cựu chiến binh tỉnh') LIMIT 1),
    NULL,
    NULL,
    NULL, 100,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    'Cấp xã', 'Phản biện',
    'Phản biện dự thảo kế hoạch tu bổ di tích văn hóa cấp cơ sở',
    (SELECT id FROM public.pbxh_thiet_lap WHERE loai = 'doi_tuong' AND lower(trim(ten)) = lower('UBND xã') LIMIT 1),
    (SELECT id FROM public.pbxh_thiet_lap WHERE loai = 'hinh_thuc' AND lower(trim(ten)) = lower('Lấy ý kiến nhân dân tại địa bàn dân cư') LIMIT 1),
    NULL, '2026-06-30', 'Quý II/2026',
    'Tạm dừng',
    (SELECT id FROM public.pbxh_thiet_lap WHERE loai = 'don_vi_chu_tri' AND lower(trim(ten)) = lower('Ban Thường vụ Hội phụ nữ xã') LIMIT 1),
    NULL,
    (SELECT id FROM public.var_ssn_xa_phuong WHERE lower(trim(ten)) LIKE lower('%Nga My%') LIMIT 1),
    NULL, 0,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    'Cấp tỉnh', 'Phản biện',
    'Phản biện đề án quy hoạch sử dụng đất giai đoạn 2026-2030',
    (SELECT id FROM public.pbxh_thiet_lap WHERE loai = 'doi_tuong' AND lower(trim(ten)) = lower('Sở Tài nguyên và Môi trường') LIMIT 1),
    (SELECT id FROM public.pbxh_thiet_lap WHERE loai = 'hinh_thuc' AND lower(trim(ten)) = lower('Gửi văn bản lấy ý kiến chuyên gia') LIMIT 1),
    NULL, '2026-09-30', 'Quý III/2026',
    'Đang thực hiện',
    (SELECT id FROM public.pbxh_thiet_lap WHERE loai = 'don_vi_chu_tri' AND lower(trim(ten)) = lower('Ban Thường trực MTTQ tỉnh') LIMIT 1),
    NULL,
    NULL,
    NULL, 30,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    'Cấp xã', 'Giám sát',
    'Giám sát việc bình xét gia đình văn hóa tại khu dân cư',
    (SELECT id FROM public.pbxh_thiet_lap WHERE loai = 'doi_tuong' AND lower(trim(ten)) = lower('Ban công tác Mặt trận khu dân cư') LIMIT 1),
    (SELECT id FROM public.pbxh_thiet_lap WHERE loai = 'hinh_thuc' AND lower(trim(ten)) = lower('Tham gia các cuộc họp bình xét') LIMIT 1),
    NULL, '2026-12-31', 'Quý IV/2026',
    'Dự kiến',
    (SELECT id FROM public.pbxh_thiet_lap WHERE loai = 'don_vi_chu_tri' AND lower(trim(ten)) = lower('Ban Thường vụ Hội Nông dân xã') LIMIT 1),
    NULL,
    (SELECT id FROM public.var_ssn_xa_phuong WHERE lower(trim(ten)) LIKE lower('%Vinh Phú%') LIMIT 1),
    NULL, 0,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    'Cấp xã', 'Giám sát cộng đồng',
    'Giám sát dự án xây dựng Nhà văn hóa thôn / tổ dân phố',
    (SELECT id FROM public.pbxh_thiet_lap WHERE loai = 'doi_tuong' AND lower(trim(ten)) = lower('Đơn vị thi công, Ban quản lý dự án') LIMIT 1),
    (SELECT id FROM public.pbxh_thiet_lap WHERE loai = 'hinh_thuc' AND lower(trim(ten)) = lower('Ban Giám sát đầu tư của cộng đồng giám sát trực tiếp') LIMIT 1),
    NULL, '2026-09-30', 'Quý III/2026',
    'Đã hoàn thành',
    (SELECT id FROM public.pbxh_thiet_lap WHERE loai = 'don_vi_chu_tri' AND lower(trim(ten)) = lower('Ban Giám sát đầu tư cộng đồng') LIMIT 1),
    NULL,
    (SELECT id FROM public.var_ssn_xa_phuong WHERE lower(trim(ten)) LIKE lower('%Tân Kỳ%') LIMIT 1),
    NULL, 100,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    'Cấp tỉnh', 'Kiểm tra',
    'Kiểm tra việc quản lý và sử dụng các nguồn quỹ do MTTQ phát động',
    (SELECT id FROM public.pbxh_thiet_lap WHERE loai = 'doi_tuong' AND lower(trim(ten)) = lower('MTTQ cấp huyện và các đơn vị liên quan') LIMIT 1),
    (SELECT id FROM public.pbxh_thiet_lap WHERE loai = 'hinh_thuc' AND lower(trim(ten)) = lower('Kiểm tra hồ sơ và thực tế tại các đơn vị thành viên') LIMIT 1),
    NULL, '2026-12-31', 'Quý IV/2026',
    'Tạm dừng',
    (SELECT id FROM public.pbxh_thiet_lap WHERE loai = 'don_vi_chu_tri' AND lower(trim(ten)) = lower('Ban Thường trực MTTQ tỉnh') LIMIT 1),
    (SELECT id FROM public.var_phong_ban WHERE lower(trim(ten_phong_ban)) LIKE lower('%Tổ chức kiểm tra%') LIMIT 1),
    NULL,
    NULL, 0,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  ),
  (
    'Cấp xã', 'Kiểm tra',
    'Kiểm tra công tác thi đua, khen thưởng tại các khu dân cư',
    (SELECT id FROM public.pbxh_thiet_lap WHERE loai = 'doi_tuong' AND lower(trim(ten)) = lower('Ban công tác Mặt trận các khu dân cư') LIMIT 1),
    (SELECT id FROM public.pbxh_thiet_lap WHERE loai = 'hinh_thuc' AND lower(trim(ten)) = lower('Đối chiếu báo cáo và khảo sát thực tế') LIMIT 1),
    NULL, '2026-12-31', 'Tháng 12/2026',
    'Đã lập kế hoạch',
    (SELECT id FROM public.pbxh_thiet_lap WHERE loai = 'don_vi_chu_tri' AND lower(trim(ten)) = lower('Ban Thường trực MTTQ xã') LIMIT 1),
    NULL,
    (SELECT id FROM public.var_ssn_xa_phuong WHERE lower(trim(ten)) LIKE lower('%Bình Chuẩn%') LIMIT 1),
    NULL, 0,
    (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1)
  )
) AS seed (
  cap_thuc_hien, loai_hinh, noi_dung,
  doi_tuong_id, hinh_thuc_id,
  ngay_bat_dau, ngay_ket_thuc, mo_ta_thoi_gian,
  tinh_trang, don_vi_chu_tri_id, phong_ban_tham_muu_id,
  don_vi_thuc_hien_id, ket_qua_kien_nghi, phan_tram_hoan_thanh,
  id_nguoi_tao
)
WHERE NOT EXISTS (SELECT 1 FROM public.pbxh_thuc_hien_phan_bien_xa_hoi LIMIT 1);
