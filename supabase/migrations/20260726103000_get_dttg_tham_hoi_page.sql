-- ============================================================================
-- Phân trang phía máy chủ cho hai module Thăm hỏi (Dân tộc – Tôn giáo):
--   get_dttg_tham_hoi_ca_nhan_page  — thăm hỏi cá nhân tiêu biểu
--   get_dttg_tham_hoi_to_chuc_page  — thăm hỏi tổ chức / cơ sở
--
-- Như các RPC trước, hai cột có chuỗi HIỂN THỊ được tính ra chứ không nằm
-- trong bảng, và người dùng sắp xếp / gõ tìm theo đúng chuỗi họ nhìn thấy:
--   · "Đơn vị thăm hỏi"  — để trống nghĩa là cơ quan MTTQ tỉnh;
--   · "Thời gian dự kiến" — hiển thị dạng MM/YYYY.
-- Nhãn "cơ quan MTTQ tỉnh" truyền từ client qua `p_labels` để câu chữ vẫn chỉ
-- có một nguồn là `lib/text`.
--
-- Phạm vi xem theo `dttgRowVisibleByDonVi`: cấp Xã phường chỉ thấy dòng có
-- đơn vị thăm hỏi HOẶC xã/phường trùng đơn vị mình (tổ chức: chỉ đơn vị thăm
-- hỏi). Vẫn là lớp chặn "vô tình nhìn thấy" — RLS thật làm ở đợt sau.
-- ============================================================================

-- --------------------------------------------------------------- cá nhân
DROP FUNCTION IF EXISTS public.get_dttg_tham_hoi_ca_nhan_page(
  text, integer, integer, text, boolean, bigint, text[], bigint[], bigint[], bigint[], bigint[], jsonb, jsonb
);
DROP FUNCTION IF EXISTS public.get_dttg_tham_hoi_ca_nhan_page(
  text, integer, integer, text, boolean, bigint, text[], bigint[], bigint[], bigint[], bigint[], bigint[], boolean, jsonb, jsonb
);

CREATE FUNCTION public.get_dttg_tham_hoi_ca_nhan_page(
  p_search            text     DEFAULT NULL,
  p_limit             integer  DEFAULT 100,
  p_offset            integer  DEFAULT 0,
  p_sort              text     DEFAULT NULL,
  p_view_all          boolean  DEFAULT true,
  p_viewer_don_vi_id  bigint   DEFAULT NULL,
  p_trang_thai        text[]   DEFAULT NULL,
  p_ca_nhan_ids       bigint[] DEFAULT NULL,
  p_phong_ban_ids     bigint[] DEFAULT NULL,
  p_xa_phuong_ids     bigint[] DEFAULT NULL,
  p_dip_ids           bigint[] DEFAULT NULL,
  p_don_vi_ids        bigint[] DEFAULT NULL,
  -- Chip lọc "Cơ quan MTTQ tỉnh" = các dòng KHÔNG gắn đơn vị thăm hỏi.
  p_don_vi_include_null boolean DEFAULT false,
  p_column_search     jsonb    DEFAULT NULL,
  -- { "don_vi_cqmttq": "..." } — nhãn khi không chọn đơn vị thăm hỏi.
  p_labels            jsonb    DEFAULT NULL
)
RETURNS TABLE (
  id                     bigint,
  ca_nhan_id             bigint,
  ho_va_ten              text,
  doi_tuong              text,
  chuc_vu_vi_tri         text,
  phong_ban_tham_muu_id  bigint,
  ten_phong_ban          text,
  dip_tham_hoi_id        bigint,
  dip_tham_hoi           text,
  ten_dip_tham_hoi       text,
  thoi_gian_du_kien      date,
  thoi_gian_thuc_te      date,
  don_vi_tham_hoi_id     bigint,
  ten_don_vi_tham_hoi    text,
  qua_tang               text,
  xa_phuong_id           bigint,
  ten_xa_phuong          text,
  trang_thai             text,
  ket_qua_ghi_chu        text,
  link_ket_qua           text,
  id_nguoi_tao           bigint,
  ho_va_ten_nguoi_tao    text,
  ten_tai_khoan_nguoi_tao text,
  tg_tao                 timestamptz,
  tg_cap_nhat            timestamptz,
  total_count            bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH src AS (
    SELECT
      t.*,
      cn.ho_va_ten,
      COALESCE(NULLIF(btrim(t.doi_tuong), ''), cn.doi_tuong)           AS doi_tuong_display,
      COALESCE(NULLIF(btrim(t.chuc_vu_vi_tri), ''), cn.chuc_vu_vi_tri) AS chuc_vu_display,
      pb.ten_phong_ban,
      dp.ten_dip        AS ten_dip_tham_hoi,
      dvt.ten           AS ten_don_vi_tham_hoi,
      xp.ten            AS ten_xa_phuong,
      nt.ho_va_ten      AS ho_va_ten_nguoi_tao,
      nt.ten_tai_khoan  AS ten_tai_khoan_nguoi_tao,
      -- Cột "Đơn vị thăm hỏi": trống ⇒ cơ quan MTTQ tỉnh (formatDonViThamHoiDisplay).
      CASE
        WHEN t.don_vi_tham_hoi_id IS NULL THEN COALESCE(p_labels->>'don_vi_cqmttq', '')
        ELSE COALESCE(NULLIF(btrim(dvt.ten), ''), t.don_vi_tham_hoi_id::text)
      END AS don_vi_tham_hoi_display,
      -- Cột "Thời gian dự kiến": hiển thị MM/YYYY (formatMonthYear).
      COALESCE(to_char(t.thoi_gian_du_kien, 'MM/YYYY'), '') AS thoi_gian_du_kien_display
    FROM public.dttg_tham_hoi_ca_nhan t
    LEFT JOIN public.dttg_thong_tin_ca_nhan_tieu_bieu cn  ON cn.id  = t.ca_nhan_id
    LEFT JOIN public.var_phong_ban                    pb  ON pb.id  = t.phong_ban_tham_muu_id
    LEFT JOIN public.dttg_dip_tham_hoi                dp  ON dp.id  = t.dip_tham_hoi_id
    LEFT JOIN public.var_ssn_xa_phuong                dvt ON dvt.id = t.don_vi_tham_hoi_id
    LEFT JOIN public.var_ssn_xa_phuong                xp  ON xp.id  = t.xa_phuong_id
    LEFT JOIN public.var_nhan_vien                    nt  ON nt.id  = t.id_nguoi_tao
  )
  SELECT
    s.id, s.ca_nhan_id, s.ho_va_ten, s.doi_tuong_display, s.chuc_vu_display,
    s.phong_ban_tham_muu_id, s.ten_phong_ban,
    s.dip_tham_hoi_id, s.dip_tham_hoi, s.ten_dip_tham_hoi,
    s.thoi_gian_du_kien, s.thoi_gian_thuc_te,
    s.don_vi_tham_hoi_id, s.ten_don_vi_tham_hoi,
    s.qua_tang, s.xa_phuong_id, s.ten_xa_phuong,
    s.trang_thai, s.ket_qua_ghi_chu, s.link_ket_qua,
    s.id_nguoi_tao, s.ho_va_ten_nguoi_tao, s.ten_tai_khoan_nguoi_tao,
    s.tg_tao, s.tg_cap_nhat,
    COUNT(*) OVER () AS total_count
  FROM src s
  WHERE (
      p_search IS NULL
      OR s.ho_va_ten               ILIKE '%' || p_search || '%'
      OR s.doi_tuong_display       ILIKE '%' || p_search || '%'
      OR s.chuc_vu_display         ILIKE '%' || p_search || '%'
      OR s.dip_tham_hoi            ILIKE '%' || p_search || '%'
      OR s.thoi_gian_du_kien_display ILIKE '%' || p_search || '%'
      OR s.don_vi_tham_hoi_display ILIKE '%' || p_search || '%'
      OR s.ten_phong_ban           ILIKE '%' || p_search || '%'
      OR s.qua_tang                ILIKE '%' || p_search || '%'
      OR s.ten_xa_phuong           ILIKE '%' || p_search || '%'
      OR s.ket_qua_ghi_chu         ILIKE '%' || p_search || '%'
    )
    -- KHÔNG có nhánh "p_viewer_don_vi_id IS NULL thì cho xem hết": cán bộ cấp Xã
    -- phường chưa được gán đơn vị phải thấy RỖNG, đúng như hàm gate ở client.
    -- Cấp khác (không bị giới hạn theo đơn vị) thì client gửi p_view_all = true.
    AND (
      COALESCE(p_view_all, true)
      OR s.don_vi_tham_hoi_id = p_viewer_don_vi_id
      OR s.xa_phuong_id       = p_viewer_don_vi_id
    )
    AND (p_trang_thai    IS NULL OR cardinality(p_trang_thai)    = 0 OR s.trang_thai            = ANY (p_trang_thai))
    AND (p_ca_nhan_ids   IS NULL OR cardinality(p_ca_nhan_ids)   = 0 OR s.ca_nhan_id            = ANY (p_ca_nhan_ids))
    AND (p_phong_ban_ids IS NULL OR cardinality(p_phong_ban_ids) = 0 OR s.phong_ban_tham_muu_id = ANY (p_phong_ban_ids))
    AND (p_xa_phuong_ids IS NULL OR cardinality(p_xa_phuong_ids) = 0 OR s.xa_phuong_id          = ANY (p_xa_phuong_ids))
    AND (p_dip_ids       IS NULL OR cardinality(p_dip_ids)       = 0 OR s.dip_tham_hoi_id       = ANY (p_dip_ids))
    AND (
      ((p_don_vi_ids IS NULL OR cardinality(p_don_vi_ids) = 0) AND NOT COALESCE(p_don_vi_include_null, false))
      OR (p_don_vi_ids IS NOT NULL AND cardinality(p_don_vi_ids) > 0 AND s.don_vi_tham_hoi_id = ANY (p_don_vi_ids))
      OR (COALESCE(p_don_vi_include_null, false) AND s.don_vi_tham_hoi_id IS NULL)
    )
    AND (nullif(btrim(coalesce(p_column_search->>'ho_va_ten','')),'') IS NULL
         OR s.ho_va_ten ILIKE '%'||btrim(p_column_search->>'ho_va_ten')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'doi_tuong','')),'') IS NULL
         OR s.doi_tuong_display ILIKE '%'||btrim(p_column_search->>'doi_tuong')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'chuc_vu_vi_tri','')),'') IS NULL
         OR s.chuc_vu_display ILIKE '%'||btrim(p_column_search->>'chuc_vu_vi_tri')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'dip_tham_hoi','')),'') IS NULL
         OR s.dip_tham_hoi ILIKE '%'||btrim(p_column_search->>'dip_tham_hoi')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'thoi_gian_du_kien','')),'') IS NULL
         OR s.thoi_gian_du_kien_display ILIKE '%'||btrim(p_column_search->>'thoi_gian_du_kien')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'don_vi_tham_hoi','')),'') IS NULL
         OR s.don_vi_tham_hoi_display ILIKE '%'||btrim(p_column_search->>'don_vi_tham_hoi')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_phong_ban','')),'') IS NULL
         OR s.ten_phong_ban ILIKE '%'||btrim(p_column_search->>'ten_phong_ban')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'qua_tang','')),'') IS NULL
         OR s.qua_tang ILIKE '%'||btrim(p_column_search->>'qua_tang')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_xa_phuong','')),'') IS NULL
         OR s.ten_xa_phuong ILIKE '%'||btrim(p_column_search->>'ten_xa_phuong')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'trang_thai','')),'') IS NULL
         OR s.trang_thai ILIKE '%'||btrim(p_column_search->>'trang_thai')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ket_qua_ghi_chu','')),'') IS NULL
         OR s.ket_qua_ghi_chu ILIKE '%'||btrim(p_column_search->>'ket_qua_ghi_chu')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'link_ket_qua','')),'') IS NULL
         OR s.link_ket_qua ILIKE '%'||btrim(p_column_search->>'link_ket_qua')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'tg_cap_nhat','')),'') IS NULL
         OR to_char(s.tg_cap_nhat, 'DD/MM/YYYY') ILIKE '%'||btrim(p_column_search->>'tg_cap_nhat')||'%')
  ORDER BY
    CASE WHEN p_sort = 'ho_va_ten_asc'          THEN s.ho_va_ten                 END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_desc'         THEN s.ho_va_ten                 END DESC NULLS LAST,
    CASE WHEN p_sort = 'dip_tham_hoi_asc'       THEN s.dip_tham_hoi              END ASC  NULLS LAST,
    CASE WHEN p_sort = 'dip_tham_hoi_desc'      THEN s.dip_tham_hoi              END DESC NULLS LAST,
    CASE WHEN p_sort = 'thoi_gian_du_kien_asc'  THEN s.thoi_gian_du_kien         END ASC  NULLS LAST,
    CASE WHEN p_sort = 'thoi_gian_du_kien_desc' THEN s.thoi_gian_du_kien         END DESC NULLS LAST,
    CASE WHEN p_sort = 'don_vi_tham_hoi_asc'    THEN s.don_vi_tham_hoi_display   END ASC  NULLS LAST,
    CASE WHEN p_sort = 'don_vi_tham_hoi_desc'   THEN s.don_vi_tham_hoi_display   END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_phong_ban_asc'      THEN s.ten_phong_ban             END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_phong_ban_desc'     THEN s.ten_phong_ban             END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_xa_phuong_asc'      THEN s.ten_xa_phuong             END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_xa_phuong_desc'     THEN s.ten_xa_phuong             END DESC NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_asc'         THEN s.trang_thai                END ASC  NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_desc'        THEN s.trang_thai                END DESC NULLS LAST,
    CASE WHEN p_sort = 'ket_qua_ghi_chu_asc'    THEN s.ket_qua_ghi_chu           END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ket_qua_ghi_chu_desc'   THEN s.ket_qua_ghi_chu           END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_asc'        THEN s.tg_cap_nhat               END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_desc'       THEN s.tg_cap_nhat               END DESC NULLS LAST,
    s.tg_cap_nhat DESC NULLS LAST, s.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$$;

GRANT EXECUTE ON FUNCTION public.get_dttg_tham_hoi_ca_nhan_page(
  text, integer, integer, text, boolean, bigint, text[], bigint[], bigint[], bigint[], bigint[], bigint[], boolean, jsonb, jsonb
) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

-- --------------------------------------------------------------- tổ chức
DROP FUNCTION IF EXISTS public.get_dttg_tham_hoi_to_chuc_page(
  text, integer, integer, text, boolean, bigint, text[], bigint[], bigint[], bigint[], bigint[], jsonb, jsonb
);
DROP FUNCTION IF EXISTS public.get_dttg_tham_hoi_to_chuc_page(
  text, integer, integer, text, boolean, bigint, text[], bigint[], bigint[], bigint[], boolean, bigint[], jsonb, jsonb
);

CREATE FUNCTION public.get_dttg_tham_hoi_to_chuc_page(
  p_search            text     DEFAULT NULL,
  p_limit             integer  DEFAULT 100,
  p_offset            integer  DEFAULT 0,
  p_sort              text     DEFAULT NULL,
  p_view_all          boolean  DEFAULT true,
  p_viewer_don_vi_id  bigint   DEFAULT NULL,
  p_tien_do           text[]   DEFAULT NULL,
  p_to_chuc_ids       bigint[] DEFAULT NULL,
  p_dip_ids           bigint[] DEFAULT NULL,
  p_don_vi_ids        bigint[] DEFAULT NULL,
  -- Chip lọc "MTTQ Tỉnh" = các dòng KHÔNG gắn đơn vị thăm hỏi.
  p_don_vi_include_null boolean DEFAULT false,
  p_phong_ban_ids     bigint[] DEFAULT NULL,
  p_column_search     jsonb    DEFAULT NULL,
  p_labels            jsonb    DEFAULT NULL
)
RETURNS TABLE (
  id                     bigint,
  to_chuc_id             bigint,
  ten_co_so              text,
  loai_hinh              text,
  dip_tham_hoi_id        bigint,
  dip_tham_hoi           text,
  ten_dip_tham_hoi       text,
  thoi_gian_du_kien      text,
  thoi_gian_thuc_te      date,
  don_vi_tham_hoi_id     bigint,
  ten_don_vi_tham_hoi    text,
  phong_ban_tham_muu_id  bigint,
  ten_phong_ban          text,
  noi_dung_tham_hoi      text,
  thanh_phan_doan        text,
  qua_tang               text,
  tien_do                text,
  ket_qua_thuc_hien      text,
  link_ket_qua           text,
  id_nguoi_tao           bigint,
  ho_va_ten_nguoi_tao    text,
  ten_tai_khoan_nguoi_tao text,
  tg_tao                 timestamptz,
  tg_cap_nhat            timestamptz,
  total_count            bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH src AS (
    SELECT
      t.*,
      tc.ten_co_so,
      tc.loai_hinh,
      dp.ten_dip       AS ten_dip_tham_hoi,
      dvt.ten          AS ten_don_vi_tham_hoi,
      pb.ten_phong_ban,
      nt.ho_va_ten     AS ho_va_ten_nguoi_tao,
      nt.ten_tai_khoan AS ten_tai_khoan_nguoi_tao,
      CASE
        WHEN t.don_vi_tham_hoi_id IS NULL THEN COALESCE(p_labels->>'don_vi_cqmttq', '')
        ELSE COALESCE(NULLIF(btrim(dvt.ten), ''), t.don_vi_tham_hoi_id::text)
      END AS don_vi_tham_hoi_display
    FROM public.dttg_tham_hoi_to_chuc t
    LEFT JOIN public.dttg_thong_tin_to_chuc_quan_trong tc  ON tc.id  = t.to_chuc_id
    LEFT JOIN public.dttg_dip_tham_hoi                 dp  ON dp.id  = t.dip_tham_hoi_id
    LEFT JOIN public.var_ssn_xa_phuong                 dvt ON dvt.id = t.don_vi_tham_hoi_id
    LEFT JOIN public.var_phong_ban                     pb  ON pb.id  = t.phong_ban_tham_muu_id
    LEFT JOIN public.var_nhan_vien                     nt  ON nt.id  = t.id_nguoi_tao
  )
  SELECT
    s.id, s.to_chuc_id, s.ten_co_so, s.loai_hinh,
    s.dip_tham_hoi_id, s.dip_tham_hoi, s.ten_dip_tham_hoi,
    s.thoi_gian_du_kien, s.thoi_gian_thuc_te,
    s.don_vi_tham_hoi_id, s.ten_don_vi_tham_hoi,
    s.phong_ban_tham_muu_id, s.ten_phong_ban,
    s.noi_dung_tham_hoi, s.thanh_phan_doan, s.qua_tang, s.tien_do,
    s.ket_qua_thuc_hien, s.link_ket_qua,
    s.id_nguoi_tao, s.ho_va_ten_nguoi_tao, s.ten_tai_khoan_nguoi_tao,
    s.tg_tao, s.tg_cap_nhat,
    COUNT(*) OVER () AS total_count
  FROM src s
  WHERE (
      p_search IS NULL
      OR s.ten_co_so              ILIKE '%' || p_search || '%'
      OR s.loai_hinh              ILIKE '%' || p_search || '%'
      OR s.dip_tham_hoi           ILIKE '%' || p_search || '%'
      OR s.thoi_gian_du_kien      ILIKE '%' || p_search || '%'
      OR s.don_vi_tham_hoi_display ILIKE '%' || p_search || '%'
      OR s.ten_phong_ban          ILIKE '%' || p_search || '%'
      OR s.noi_dung_tham_hoi      ILIKE '%' || p_search || '%'
      OR s.thanh_phan_doan        ILIKE '%' || p_search || '%'
      OR s.qua_tang               ILIKE '%' || p_search || '%'
      OR s.ket_qua_thuc_hien      ILIKE '%' || p_search || '%'
    )
    -- Xem ghi chú ở RPC cá nhân: không nới lỏng khi thiếu đơn vị.
    AND (
      COALESCE(p_view_all, true)
      OR s.don_vi_tham_hoi_id = p_viewer_don_vi_id
    )
    AND (p_tien_do       IS NULL OR cardinality(p_tien_do)       = 0 OR s.tien_do               = ANY (p_tien_do))
    AND (p_to_chuc_ids   IS NULL OR cardinality(p_to_chuc_ids)   = 0 OR s.to_chuc_id            = ANY (p_to_chuc_ids))
    AND (p_dip_ids       IS NULL OR cardinality(p_dip_ids)       = 0 OR s.dip_tham_hoi_id       = ANY (p_dip_ids))
    AND (
      ((p_don_vi_ids IS NULL OR cardinality(p_don_vi_ids) = 0) AND NOT COALESCE(p_don_vi_include_null, false))
      OR (p_don_vi_ids IS NOT NULL AND cardinality(p_don_vi_ids) > 0 AND s.don_vi_tham_hoi_id = ANY (p_don_vi_ids))
      OR (COALESCE(p_don_vi_include_null, false) AND s.don_vi_tham_hoi_id IS NULL)
    )
    AND (p_phong_ban_ids IS NULL OR cardinality(p_phong_ban_ids) = 0 OR s.phong_ban_tham_muu_id = ANY (p_phong_ban_ids))
    AND (nullif(btrim(coalesce(p_column_search->>'ten_co_so','')),'') IS NULL
         OR s.ten_co_so ILIKE '%'||btrim(p_column_search->>'ten_co_so')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'dip_tham_hoi','')),'') IS NULL
         OR s.dip_tham_hoi ILIKE '%'||btrim(p_column_search->>'dip_tham_hoi')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'thoi_gian_du_kien','')),'') IS NULL
         OR s.thoi_gian_du_kien ILIKE '%'||btrim(p_column_search->>'thoi_gian_du_kien')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'don_vi_tham_hoi','')),'') IS NULL
         OR s.don_vi_tham_hoi_display ILIKE '%'||btrim(p_column_search->>'don_vi_tham_hoi')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'noi_dung_tham_hoi','')),'') IS NULL
         OR s.noi_dung_tham_hoi ILIKE '%'||btrim(p_column_search->>'noi_dung_tham_hoi')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'thanh_phan_doan','')),'') IS NULL
         OR s.thanh_phan_doan ILIKE '%'||btrim(p_column_search->>'thanh_phan_doan')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'qua_tang','')),'') IS NULL
         OR s.qua_tang ILIKE '%'||btrim(p_column_search->>'qua_tang')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'tien_do','')),'') IS NULL
         OR s.tien_do ILIKE '%'||btrim(p_column_search->>'tien_do')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ket_qua_thuc_hien','')),'') IS NULL
         OR s.ket_qua_thuc_hien ILIKE '%'||btrim(p_column_search->>'ket_qua_thuc_hien')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'link_ket_qua','')),'') IS NULL
         OR s.link_ket_qua ILIKE '%'||btrim(p_column_search->>'link_ket_qua')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'tg_cap_nhat','')),'') IS NULL
         OR to_char(s.tg_cap_nhat, 'DD/MM/YYYY') ILIKE '%'||btrim(p_column_search->>'tg_cap_nhat')||'%')
  ORDER BY
    CASE WHEN p_sort = 'ten_co_so_asc'          THEN s.ten_co_so               END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_co_so_desc'         THEN s.ten_co_so               END DESC NULLS LAST,
    CASE WHEN p_sort = 'dip_tham_hoi_asc'       THEN s.dip_tham_hoi            END ASC  NULLS LAST,
    CASE WHEN p_sort = 'dip_tham_hoi_desc'      THEN s.dip_tham_hoi            END DESC NULLS LAST,
    CASE WHEN p_sort = 'thoi_gian_du_kien_asc'  THEN s.thoi_gian_du_kien       END ASC  NULLS LAST,
    CASE WHEN p_sort = 'thoi_gian_du_kien_desc' THEN s.thoi_gian_du_kien       END DESC NULLS LAST,
    CASE WHEN p_sort = 'don_vi_tham_hoi_asc'    THEN s.don_vi_tham_hoi_display END ASC  NULLS LAST,
    CASE WHEN p_sort = 'don_vi_tham_hoi_desc'   THEN s.don_vi_tham_hoi_display END DESC NULLS LAST,
    CASE WHEN p_sort = 'tien_do_asc'            THEN s.tien_do                 END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tien_do_desc'           THEN s.tien_do                 END DESC NULLS LAST,
    CASE WHEN p_sort = 'ket_qua_thuc_hien_asc'  THEN s.ket_qua_thuc_hien       END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ket_qua_thuc_hien_desc' THEN s.ket_qua_thuc_hien       END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_asc'        THEN s.tg_cap_nhat             END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_desc'       THEN s.tg_cap_nhat             END DESC NULLS LAST,
    s.tg_cap_nhat DESC NULLS LAST, s.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$$;

GRANT EXECUTE ON FUNCTION public.get_dttg_tham_hoi_to_chuc_page(
  text, integer, integer, text, boolean, bigint, text[], bigint[], bigint[], bigint[], boolean, bigint[], jsonb, jsonb
) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
