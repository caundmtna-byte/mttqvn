-- ============================================================================
-- Phân trang phía máy chủ cho hai tab của module Nhập xuất kho:
--   get_kho_nhap_xuat_kho_page     — tab "Danh sách" (mỗi dòng = 1 phiếu)
--   get_kho_nhap_xuat_kho_ct_page  — tab "Chi tiết"  (mỗi dòng = 1 dòng hàng)
--
-- Vì sao bảng này được ưu tiên: `kho_nhap_xuat_kho(_ct)` là sổ chứng từ hàng
-- cứu trợ — nó phình theo từng mùa bão lụt, không có trần tự nhiên. Trước bản
-- này, mở trang là kéo TOÀN BỘ sổ về máy rồi mới lọc/sắp/phân trang ở trình
-- duyệt, nên sắp xếp chỉ đúng trang đang xem và ô tổng không bao giờ chính xác.
--
-- Phạm vi xem được đưa xuống DB đúng như hàm client `canViewNhapXuatKhoRow`:
--   p_view_all = true                → mọi phiếu
--   p_viewer_don_vi_id IS NOT NULL   → phiếu có kho xuất HOẶC kho nhập thuộc
--                                      đơn vị đó (cấp Xã phường)
-- ⚠️ Hai tham số này vẫn do trình duyệt gửi lên (RLS còn `USING (true)`), nên
-- đây là lớp chặn "vô tình nhìn thấy", không phải lớp chặn bảo mật. Lớp thật
-- sẽ là RLS ở đợt sau.
--
-- Khuôn mẫu: xem mục "Chọn kiểu phân trang" trong CLAUDE.md.
-- ============================================================================

-- ---------------------------------------------------------------- tab Danh sách
DROP FUNCTION IF EXISTS public.get_kho_nhap_xuat_kho_page(
  text, integer, integer, text, boolean, bigint, text, bigint, bigint, bigint
);
DROP FUNCTION IF EXISTS public.get_kho_nhap_xuat_kho_page(
  text, integer, integer, text, boolean, bigint, text, bigint, bigint, bigint, jsonb
);

CREATE FUNCTION public.get_kho_nhap_xuat_kho_page(
  p_search            text    DEFAULT NULL,
  p_limit             integer DEFAULT 100,
  p_offset            integer DEFAULT 0,
  p_sort              text    DEFAULT NULL,
  p_view_all          boolean DEFAULT true,
  p_viewer_don_vi_id  bigint  DEFAULT NULL,
  p_loai_phieu        text    DEFAULT NULL,
  p_kho_id            bigint  DEFAULT NULL,
  p_don_vi_cuu_tro_id bigint  DEFAULT NULL,
  p_dot_cuu_tro_id    bigint  DEFAULT NULL,
  -- Ô tìm theo từng cột trên header bảng: {"so_phieu":"PN-2026", "ten_kho_nhap":"xã"}
  p_column_search     jsonb   DEFAULT NULL
)
RETURNS TABLE (
  id                  bigint,
  tt                  integer,
  so_phieu            text,
  loai_phieu          text,
  ngay_phieu          date,
  kho_xuat_id         bigint,
  ten_kho_xuat        text,
  kho_xuat_don_vi_id  bigint,
  kho_nhap_id         bigint,
  ten_kho_nhap        text,
  kho_nhap_don_vi_id  bigint,
  don_vi_cuu_tro_id   bigint,
  ten_don_vi_cuu_tro  text,
  dot_cuu_tro_id      bigint,
  ten_dot_cuu_tro     text,
  so_dong             bigint,
  -- Người LẬP phiếu (gán phía máy chủ từ phiên đăng nhập), khác hẳn
  -- `nguoi_giao_nhan` vốn là chuỗi gõ tay để in lên phiếu.
  id_nguoi_tao        bigint,
  ho_va_ten_nguoi_tao text,
  tg_tao              timestamptz,
  tg_cap_nhat         timestamptz,
  total_count         bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    p.id, p.tt, p.so_phieu, p.loai_phieu, p.ngay_phieu,
    p.kho_xuat_id, kx.ten_kho AS ten_kho_xuat, kx.don_vi_id AS kho_xuat_don_vi_id,
    p.kho_nhap_id, kn.ten_kho AS ten_kho_nhap, kn.don_vi_id AS kho_nhap_don_vi_id,
    p.don_vi_cuu_tro_id, dv.ten AS ten_don_vi_cuu_tro,
    p.dot_cuu_tro_id,    dt.ten AS ten_dot_cuu_tro,
    COALESCE(ct.so_dong, 0) AS so_dong,
    p.id_nguoi_tao,
    COALESCE(NULLIF(btrim(nt.ho_va_ten), ''), NULLIF(btrim(nt.ten_tai_khoan), '')) AS ho_va_ten_nguoi_tao,
    p.tg_tao, p.tg_cap_nhat,
    COUNT(*) OVER () AS total_count
  FROM public.kho_nhap_xuat_kho p
  LEFT JOIN public.kho_danh_sach_kho  kx ON kx.id = p.kho_xuat_id
  LEFT JOIN public.kho_danh_sach_kho  kn ON kn.id = p.kho_nhap_id
  LEFT JOIN public.kho_don_vi_cuu_tro dv ON dv.id = p.don_vi_cuu_tro_id
  LEFT JOIN public.kho_dot_cuu_tro    dt ON dt.id = p.dot_cuu_tro_id
  LEFT JOIN public.var_nhan_vien      nt ON nt.id = p.id_nguoi_tao
  LEFT JOIN LATERAL (
    SELECT count(*) AS so_dong
    FROM public.kho_nhap_xuat_kho_ct c
    WHERE c.phieu_id = p.id
  ) ct ON true
  WHERE (
      p_search IS NULL
      OR p.so_phieu ILIKE '%' || p_search || '%'
      OR kx.ten_kho ILIKE '%' || p_search || '%'
      OR kn.ten_kho ILIKE '%' || p_search || '%'
      OR dv.ten     ILIKE '%' || p_search || '%'
      OR dt.ten     ILIKE '%' || p_search || '%'
    )
    AND (
      -- KHÔNG nới lỏng khi thiếu đơn vị: cán bộ cấp Xã phường chưa được gán
      -- đơn vị phải thấy RỖNG, đúng như canViewNhapXuatKhoRow ở client.
      COALESCE(p_view_all, true)
      OR kx.don_vi_id = p_viewer_don_vi_id
      OR kn.don_vi_id = p_viewer_don_vi_id
    )
    AND (p_loai_phieu        IS NULL OR p.loai_phieu = p_loai_phieu)
    AND (p_kho_id            IS NULL OR p.kho_xuat_id = p_kho_id OR p.kho_nhap_id = p_kho_id)
    AND (p_don_vi_cuu_tro_id IS NULL OR p.don_vi_cuu_tro_id = p_don_vi_cuu_tro_id)
    AND (p_dot_cuu_tro_id    IS NULL OR p.dot_cuu_tro_id = p_dot_cuu_tro_id)
    -- Tìm theo từng cột. Ô trống/thiếu khoá ⇒ không lọc cột đó.
    AND (nullif(btrim(coalesce(p_column_search->>'tt','')),'') IS NULL
         OR p.tt::text ILIKE '%'||btrim(p_column_search->>'tt')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'so_phieu','')),'') IS NULL
         OR p.so_phieu ILIKE '%'||btrim(p_column_search->>'so_phieu')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'loai_phieu','')),'') IS NULL
         OR p.loai_phieu ILIKE '%'||btrim(p_column_search->>'loai_phieu')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ngay_phieu','')),'') IS NULL
         OR p.ngay_phieu::text ILIKE '%'||btrim(p_column_search->>'ngay_phieu')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_kho_xuat','')),'') IS NULL
         OR kx.ten_kho ILIKE '%'||btrim(p_column_search->>'ten_kho_xuat')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_kho_nhap','')),'') IS NULL
         OR kn.ten_kho ILIKE '%'||btrim(p_column_search->>'ten_kho_nhap')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_don_vi_cuu_tro','')),'') IS NULL
         OR dv.ten ILIKE '%'||btrim(p_column_search->>'ten_don_vi_cuu_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_dot_cuu_tro','')),'') IS NULL
         OR dt.ten ILIKE '%'||btrim(p_column_search->>'ten_dot_cuu_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ho_va_ten_nguoi_tao','')),'') IS NULL
         OR COALESCE(nt.ho_va_ten, nt.ten_tai_khoan) ILIKE '%'||btrim(p_column_search->>'ho_va_ten_nguoi_tao')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'so_dong','')),'') IS NULL
         OR COALESCE(ct.so_dong, 0)::text ILIKE '%'||btrim(p_column_search->>'so_dong')||'%')
    -- Cột thời gian: người dùng gõ ngày, nên so theo YYYY-MM-DD.
    AND (nullif(btrim(coalesce(p_column_search->>'tg_tao','')),'') IS NULL
         OR to_char(p.tg_tao, 'YYYY-MM-DD') ILIKE '%'||btrim(p_column_search->>'tg_tao')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'tg_cap_nhat','')),'') IS NULL
         OR to_char(p.tg_cap_nhat, 'YYYY-MM-DD') ILIKE '%'||btrim(p_column_search->>'tg_cap_nhat')||'%')
  ORDER BY
    CASE WHEN p_sort = 'tt_asc'                  THEN p.tt              END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tt_desc'                 THEN p.tt              END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_phieu_asc'            THEN p.so_phieu        END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_phieu_desc'           THEN p.so_phieu        END DESC NULLS LAST,
    CASE WHEN p_sort = 'loai_phieu_asc'          THEN p.loai_phieu      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'loai_phieu_desc'         THEN p.loai_phieu      END DESC NULLS LAST,
    CASE WHEN p_sort = 'ngay_phieu_asc'          THEN p.ngay_phieu      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ngay_phieu_desc'         THEN p.ngay_phieu      END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_kho_xuat_asc'        THEN kx.ten_kho        END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_kho_xuat_desc'       THEN kx.ten_kho        END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_kho_nhap_asc'        THEN kn.ten_kho        END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_kho_nhap_desc'       THEN kn.ten_kho        END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_don_vi_cuu_tro_asc'  THEN dv.ten            END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_don_vi_cuu_tro_desc' THEN dv.ten            END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_dot_cuu_tro_asc'     THEN dt.ten            END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_dot_cuu_tro_desc'    THEN dt.ten            END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_dong_asc'             THEN COALESCE(ct.so_dong, 0) END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_dong_desc'            THEN COALESCE(ct.so_dong, 0) END DESC NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_asc'  THEN nt.ho_va_ten      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_desc' THEN nt.ho_va_ten      END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_tao_asc'              THEN p.tg_tao          END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_tao_desc'             THEN p.tg_tao          END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_asc'         THEN p.tg_cap_nhat     END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_desc'        THEN p.tg_cap_nhat     END DESC NULLS LAST,
    p.ngay_phieu DESC NULLS LAST, p.so_phieu DESC NULLS LAST, p.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$$;

GRANT EXECUTE ON FUNCTION public.get_kho_nhap_xuat_kho_page(
  text, integer, integer, text, boolean, bigint, text, bigint, bigint, bigint, jsonb
) TO anon, authenticated, service_role;

-- ----------------------------------------------------------------- tab Chi tiết
DROP FUNCTION IF EXISTS public.get_kho_nhap_xuat_kho_ct_page(
  text, integer, integer, text, boolean, bigint, text, bigint, bigint
);
DROP FUNCTION IF EXISTS public.get_kho_nhap_xuat_kho_ct_page(
  text, integer, integer, text, boolean, bigint, text, bigint, bigint, jsonb
);

CREATE FUNCTION public.get_kho_nhap_xuat_kho_ct_page(
  p_search           text    DEFAULT NULL,
  p_limit            integer DEFAULT 100,
  p_offset           integer DEFAULT 0,
  p_sort             text    DEFAULT NULL,
  p_view_all         boolean DEFAULT true,
  p_viewer_don_vi_id bigint  DEFAULT NULL,
  p_loai_phieu       text    DEFAULT NULL,
  p_kho_id           bigint  DEFAULT NULL,
  p_hang_hoa_id      bigint  DEFAULT NULL,
  p_column_search    jsonb   DEFAULT NULL
)
RETURNS TABLE (
  id                 bigint,
  phieu_id           bigint,
  so_phieu           text,
  loai_phieu         text,
  ngay_phieu         date,
  kho_xuat_id        bigint,
  ten_kho_xuat       text,
  kho_xuat_don_vi_id bigint,
  kho_nhap_id        bigint,
  ten_kho_nhap       text,
  kho_nhap_don_vi_id bigint,
  don_vi_cuu_tro_id  bigint,
  ten_don_vi_cuu_tro text,
  dot_cuu_tro_id     bigint,
  ten_dot_cuu_tro    text,
  hang_hoa_id        bigint,
  ten_hang_hoa       text,
  don_vi_tinh        text,
  so_luong           numeric,
  don_gia            numeric,
  thanh_tien         numeric,
  ghi_chu            text,
  total_count        bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    c.id, c.phieu_id, p.so_phieu, p.loai_phieu, p.ngay_phieu,
    p.kho_xuat_id, kx.ten_kho AS ten_kho_xuat, kx.don_vi_id AS kho_xuat_don_vi_id,
    p.kho_nhap_id, kn.ten_kho AS ten_kho_nhap, kn.don_vi_id AS kho_nhap_don_vi_id,
    p.don_vi_cuu_tro_id, dv.ten AS ten_don_vi_cuu_tro,
    p.dot_cuu_tro_id,    dt.ten AS ten_dot_cuu_tro,
    c.hang_hoa_id, hh.ten_hang_hoa,
    c.don_vi_tinh, c.so_luong, c.don_gia, c.thanh_tien, c.ghi_chu,
    COUNT(*) OVER () AS total_count
  FROM public.kho_nhap_xuat_kho_ct c
  JOIN      public.kho_nhap_xuat_kho      p  ON p.id  = c.phieu_id
  LEFT JOIN public.kho_danh_sach_kho      kx ON kx.id = p.kho_xuat_id
  LEFT JOIN public.kho_danh_sach_kho      kn ON kn.id = p.kho_nhap_id
  LEFT JOIN public.kho_don_vi_cuu_tro     dv ON dv.id = p.don_vi_cuu_tro_id
  LEFT JOIN public.kho_dot_cuu_tro        dt ON dt.id = p.dot_cuu_tro_id
  LEFT JOIN public.kho_danh_sach_hang_hoa hh ON hh.id = c.hang_hoa_id
  WHERE (
      p_search IS NULL
      OR p.so_phieu      ILIKE '%' || p_search || '%'
      OR hh.ten_hang_hoa ILIKE '%' || p_search || '%'
      OR kx.ten_kho      ILIKE '%' || p_search || '%'
      OR kn.ten_kho      ILIKE '%' || p_search || '%'
      OR dv.ten          ILIKE '%' || p_search || '%'
      OR dt.ten          ILIKE '%' || p_search || '%'
      OR c.don_vi_tinh   ILIKE '%' || p_search || '%'
    )
    AND (
      -- KHÔNG nới lỏng khi thiếu đơn vị: cán bộ cấp Xã phường chưa được gán
      -- đơn vị phải thấy RỖNG, đúng như canViewNhapXuatKhoRow ở client.
      COALESCE(p_view_all, true)
      OR kx.don_vi_id = p_viewer_don_vi_id
      OR kn.don_vi_id = p_viewer_don_vi_id
    )
    AND (p_loai_phieu  IS NULL OR p.loai_phieu = p_loai_phieu)
    AND (p_kho_id      IS NULL OR p.kho_xuat_id = p_kho_id OR p.kho_nhap_id = p_kho_id)
    AND (p_hang_hoa_id IS NULL OR c.hang_hoa_id = p_hang_hoa_id)
    AND (nullif(btrim(coalesce(p_column_search->>'so_phieu','')),'') IS NULL
         OR p.so_phieu ILIKE '%'||btrim(p_column_search->>'so_phieu')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'loai_phieu','')),'') IS NULL
         OR p.loai_phieu ILIKE '%'||btrim(p_column_search->>'loai_phieu')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ngay_phieu','')),'') IS NULL
         OR p.ngay_phieu::text ILIKE '%'||btrim(p_column_search->>'ngay_phieu')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_hang_hoa','')),'') IS NULL
         OR hh.ten_hang_hoa ILIKE '%'||btrim(p_column_search->>'ten_hang_hoa')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'don_vi_tinh','')),'') IS NULL
         OR c.don_vi_tinh ILIKE '%'||btrim(p_column_search->>'don_vi_tinh')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'so_luong','')),'') IS NULL
         OR c.so_luong::text ILIKE '%'||btrim(p_column_search->>'so_luong')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'don_gia','')),'') IS NULL
         OR c.don_gia::text ILIKE '%'||btrim(p_column_search->>'don_gia')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'thanh_tien','')),'') IS NULL
         OR c.thanh_tien::text ILIKE '%'||btrim(p_column_search->>'thanh_tien')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_kho_xuat','')),'') IS NULL
         OR kx.ten_kho ILIKE '%'||btrim(p_column_search->>'ten_kho_xuat')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_kho_nhap','')),'') IS NULL
         OR kn.ten_kho ILIKE '%'||btrim(p_column_search->>'ten_kho_nhap')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_don_vi_cuu_tro','')),'') IS NULL
         OR dv.ten ILIKE '%'||btrim(p_column_search->>'ten_don_vi_cuu_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_dot_cuu_tro','')),'') IS NULL
         OR dt.ten ILIKE '%'||btrim(p_column_search->>'ten_dot_cuu_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ghi_chu','')),'') IS NULL
         OR c.ghi_chu ILIKE '%'||btrim(p_column_search->>'ghi_chu')||'%')
  ORDER BY
    CASE WHEN p_sort = 'so_phieu_asc'      THEN p.so_phieu      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_phieu_desc'     THEN p.so_phieu      END DESC NULLS LAST,
    CASE WHEN p_sort = 'loai_phieu_asc'    THEN p.loai_phieu    END ASC  NULLS LAST,
    CASE WHEN p_sort = 'loai_phieu_desc'   THEN p.loai_phieu    END DESC NULLS LAST,
    CASE WHEN p_sort = 'ngay_phieu_asc'    THEN p.ngay_phieu    END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ngay_phieu_desc'   THEN p.ngay_phieu    END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_hang_hoa_asc'  THEN hh.ten_hang_hoa END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_hang_hoa_desc' THEN hh.ten_hang_hoa END DESC NULLS LAST,
    CASE WHEN p_sort = 'don_vi_tinh_asc'   THEN c.don_vi_tinh   END ASC  NULLS LAST,
    CASE WHEN p_sort = 'don_vi_tinh_desc'  THEN c.don_vi_tinh   END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_luong_asc'      THEN c.so_luong      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_luong_desc'     THEN c.so_luong      END DESC NULLS LAST,
    CASE WHEN p_sort = 'don_gia_asc'       THEN c.don_gia       END ASC  NULLS LAST,
    CASE WHEN p_sort = 'don_gia_desc'      THEN c.don_gia       END DESC NULLS LAST,
    CASE WHEN p_sort = 'thanh_tien_asc'    THEN c.thanh_tien    END ASC  NULLS LAST,
    CASE WHEN p_sort = 'thanh_tien_desc'   THEN c.thanh_tien    END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_kho_xuat_asc'  THEN kx.ten_kho      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_kho_xuat_desc' THEN kx.ten_kho      END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_kho_nhap_asc'  THEN kn.ten_kho      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_kho_nhap_desc' THEN kn.ten_kho      END DESC NULLS LAST,
    p.ngay_phieu DESC NULLS LAST, p.so_phieu DESC NULLS LAST, c.thu_tu ASC NULLS LAST, c.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$$;

GRANT EXECUTE ON FUNCTION public.get_kho_nhap_xuat_kho_ct_page(
  text, integer, integer, text, boolean, bigint, text, bigint, bigint, jsonb
) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
