-- Chương trình vì hộ nghèo (vnn_chuong_trinh):
--   1. Hình thức hỗ trợ: "Quà" → "Hiện vật", "Quà và Tiền" → "Hiện vật và Tiền".
--   2. Ba cột cho khoản có hiện vật: số lượng, tổng tiền quy đổi, tổng tiền khi bàn giao.
--   3. get_vnn_page trả thêm ba cột đó (đổi kiểu trả về ⇒ DROP rồi CREATE).

-- ---------------------------------------------------------------------------
-- 1. Đổi giá trị hình thức. CHECK gốc không đặt tên ⇒ tra tên trong pg_constraint.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.vnn_chuong_trinh'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%hinh_thuc_ho_tro%'
  LOOP
    EXECUTE format('ALTER TABLE public.vnn_chuong_trinh DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

UPDATE public.vnn_chuong_trinh SET hinh_thuc_ho_tro = 'Hiện vật'         WHERE hinh_thuc_ho_tro = 'Quà';
UPDATE public.vnn_chuong_trinh SET hinh_thuc_ho_tro = 'Hiện vật và Tiền' WHERE hinh_thuc_ho_tro = 'Quà và Tiền';

ALTER TABLE public.vnn_chuong_trinh
  ADD CONSTRAINT vnn_chuong_trinh_hinh_thuc_check
    CHECK (hinh_thuc_ho_tro IN ('Tiền mặt', 'Hiện vật và Tiền', 'Hiện vật'));

-- ---------------------------------------------------------------------------
-- 2. Cột hiện vật — chỉ có nghĩa khi hình thức có "Hiện vật"; client gửi NULL
--    cho khoản chỉ có tiền mặt.
-- ---------------------------------------------------------------------------
ALTER TABLE public.vnn_chuong_trinh
  ADD COLUMN IF NOT EXISTS so_luong           INTEGER       CHECK (so_luong IS NULL OR so_luong >= 0),
  ADD COLUMN IF NOT EXISTS tong_tien_quy_doi  NUMERIC(15,0) CHECK (tong_tien_quy_doi IS NULL OR tong_tien_quy_doi >= 0),
  ADD COLUMN IF NOT EXISTS tong_tien_ban_giao NUMERIC(15,0) CHECK (tong_tien_ban_giao IS NULL OR tong_tien_ban_giao >= 0);

COMMENT ON COLUMN public.vnn_chuong_trinh.so_luong IS 'Số lượng hiện vật.';
COMMENT ON COLUMN public.vnn_chuong_trinh.tong_tien_quy_doi IS 'Tổng tiền quy đổi của hiện vật (VND).';
COMMENT ON COLUMN public.vnn_chuong_trinh.tong_tien_ban_giao IS 'Tổng tiền khi bàn giao hiện vật (VND).';

-- ---------------------------------------------------------------------------
-- 3. get_vnn_page — thân giữ nguyên bản 20260923104000, chỉ thêm ba cột.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_vnn_page(
  text, integer, integer, text, boolean, bigint,
  integer[], text[], text[], text[], text[], text[], text[], bigint[], jsonb
);

CREATE FUNCTION public.get_vnn_page(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_sort text DEFAULT NULL::text, p_view_all boolean DEFAULT true, p_viewer_xa_phuong_id bigint DEFAULT NULL::bigint, p_nam integer[] DEFAULT NULL::integer[], p_linh_vuc text[] DEFAULT NULL::text[], p_nguon text[] DEFAULT NULL::text[], p_nguon_ho_tro text[] DEFAULT NULL::text[], p_doi_tuong text[] DEFAULT NULL::text[], p_hinh_thuc text[] DEFAULT NULL::text[], p_trang_thai text[] DEFAULT NULL::text[], p_xa_phuong_ids bigint[] DEFAULT NULL::bigint[], p_column_search jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(id bigint, noi_dung_ho_tro text, nam integer, linh_vuc_ho_tro text, nguon text, nguon_ho_tro text, ho_ngheo_id bigint, ho_ten_nguoi_nhan text, xa_phuong_id bigint, ten_xa_phuong text, khoi_xom text, doi_tuong text, hinh_thuc_ho_tro text, so_tien numeric, so_luong integer, tong_tien_quy_doi numeric, tong_tien_ban_giao numeric, trang_thai text, ngay_cap_nhat_trang_thai timestamp with time zone, don_vi_ho_tro_id bigint, ten_don_vi_ho_tro text, ghi_chu text, id_nguoi_tao bigint, ho_va_ten_nguoi_tao text, ten_tai_khoan_nguoi_tao text, tg_tao timestamp with time zone, tg_cap_nhat timestamp with time zone, total_count bigint)
 LANGUAGE sql
 STABLE
AS $function$
  WITH src AS (
    SELECT
      t.*,
      xp.ten           AS ten_xa_phuong,
      dv.ten           AS ten_don_vi_ho_tro,
      nt.ho_va_ten     AS ho_va_ten_nguoi_tao,
      nt.ten_tai_khoan AS ten_tai_khoan_nguoi_tao,
      COALESCE(NULLIF(btrim(nt.ho_va_ten), ''), NULLIF(btrim(nt.ten_tai_khoan), ''), '')
        AS nguoi_tao_display
    FROM public.vnn_chuong_trinh t
    LEFT JOIN public.var_ssn_xa_phuong  xp ON xp.id = t.xa_phuong_id
    LEFT JOIN public.kho_don_vi_cuu_tro dv ON dv.id = t.don_vi_ho_tro_id
    LEFT JOIN public.var_nhan_vien      nt ON nt.id = t.id_nguoi_tao
  )
  SELECT
    s.id, s.noi_dung_ho_tro, s.nam, s.linh_vuc_ho_tro, s.nguon, s.nguon_ho_tro,
    s.ho_ngheo_id, s.ho_ten_nguoi_nhan, s.xa_phuong_id, s.ten_xa_phuong, s.khoi_xom,
    s.doi_tuong, s.hinh_thuc_ho_tro, s.so_tien,
    s.so_luong, s.tong_tien_quy_doi, s.tong_tien_ban_giao,
    s.trang_thai, s.ngay_cap_nhat_trang_thai,
    s.don_vi_ho_tro_id, s.ten_don_vi_ho_tro, s.ghi_chu,
    s.id_nguoi_tao, s.ho_va_ten_nguoi_tao, s.ten_tai_khoan_nguoi_tao,
    s.tg_tao, s.tg_cap_nhat,
    COUNT(*) OVER () AS total_count
  FROM src s
  WHERE (
      p_search IS NULL
      OR public.fn_chuan_hoa_tim_kiem(concat_ws(' ',
        s.nam::text,
        s.ho_ten_nguoi_nhan,
        s.ten_xa_phuong,
        s.linh_vuc_ho_tro,
        s.hinh_thuc_ho_tro,
        s.so_tien::text, replace(to_char(round(s.so_tien), 'FM999,999,999,999,990'), ',', '.'),
        s.trang_thai,
        s.ten_don_vi_ho_tro,
        s.noi_dung_ho_tro,
        s.khoi_xom,
        s.doi_tuong,
        s.nguon,
        s.nguon_ho_tro,
        to_char(s.ngay_cap_nhat_trang_thai AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI'),
        s.ghi_chu,
        s.nguoi_tao_display,
        to_char(s.tg_cap_nhat AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI')
      )) LIKE public.fn_mau_tim_kiem(p_search)
    )
    -- KHÔNG nới lỏng khi thiếu đơn vị: cán bộ cấp Xã phường chưa được gán đơn vị
    -- phải thấy RỖNG, đúng như canViewVnnRow ở client.
    AND (
      COALESCE(p_view_all, true)
      OR s.xa_phuong_id = p_viewer_xa_phuong_id
    )
    AND (p_nam           IS NULL OR cardinality(p_nam)           = 0 OR s.nam              = ANY (p_nam))
    AND (p_linh_vuc      IS NULL OR cardinality(p_linh_vuc)      = 0 OR s.linh_vuc_ho_tro  = ANY (p_linh_vuc))
    AND (p_nguon         IS NULL OR cardinality(p_nguon)         = 0 OR s.nguon            = ANY (p_nguon))
    AND (p_nguon_ho_tro  IS NULL OR cardinality(p_nguon_ho_tro)  = 0 OR s.nguon_ho_tro     = ANY (p_nguon_ho_tro))
    AND (p_doi_tuong     IS NULL OR cardinality(p_doi_tuong)     = 0 OR s.doi_tuong        = ANY (p_doi_tuong))
    AND (p_hinh_thuc     IS NULL OR cardinality(p_hinh_thuc)     = 0 OR s.hinh_thuc_ho_tro = ANY (p_hinh_thuc))
    AND (p_trang_thai    IS NULL OR cardinality(p_trang_thai)    = 0 OR s.trang_thai       = ANY (p_trang_thai))
    AND (p_xa_phuong_ids IS NULL OR cardinality(p_xa_phuong_ids) = 0 OR s.xa_phuong_id     = ANY (p_xa_phuong_ids))
    -- Tìm theo từng cột: so khớp trên ĐÚNG chuỗi hiển thị của cột đó.
    AND (nullif(btrim(coalesce(p_column_search->>'nam','')),'') IS NULL
         OR s.nam::text ILIKE '%'||btrim(p_column_search->>'nam')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'noi_dung_ho_tro','')),'') IS NULL
         OR s.noi_dung_ho_tro ILIKE '%'||btrim(p_column_search->>'noi_dung_ho_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'linh_vuc_ho_tro','')),'') IS NULL
         OR s.linh_vuc_ho_tro ILIKE '%'||btrim(p_column_search->>'linh_vuc_ho_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'nguon','')),'') IS NULL
         OR s.nguon ILIKE '%'||btrim(p_column_search->>'nguon')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'nguon_ho_tro','')),'') IS NULL
         OR s.nguon_ho_tro ILIKE '%'||btrim(p_column_search->>'nguon_ho_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ho_ten_nguoi_nhan','')),'') IS NULL
         OR s.ho_ten_nguoi_nhan ILIKE '%'||btrim(p_column_search->>'ho_ten_nguoi_nhan')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_xa_phuong','')),'') IS NULL
         OR s.ten_xa_phuong ILIKE '%'||btrim(p_column_search->>'ten_xa_phuong')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'khoi_xom','')),'') IS NULL
         OR s.khoi_xom ILIKE '%'||btrim(p_column_search->>'khoi_xom')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'doi_tuong','')),'') IS NULL
         OR s.doi_tuong ILIKE '%'||btrim(p_column_search->>'doi_tuong')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'hinh_thuc_ho_tro','')),'') IS NULL
         OR s.hinh_thuc_ho_tro ILIKE '%'||btrim(p_column_search->>'hinh_thuc_ho_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'trang_thai','')),'') IS NULL
         OR s.trang_thai ILIKE '%'||btrim(p_column_search->>'trang_thai')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_don_vi_ho_tro','')),'') IS NULL
         OR s.ten_don_vi_ho_tro ILIKE '%'||btrim(p_column_search->>'ten_don_vi_ho_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ghi_chu','')),'') IS NULL
         OR s.ghi_chu ILIKE '%'||btrim(p_column_search->>'ghi_chu')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'so_tien','')),'') IS NULL
         OR s.so_tien::text ILIKE '%'||btrim(p_column_search->>'so_tien')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ho_va_ten_nguoi_tao','')),'') IS NULL
         OR s.nguoi_tao_display ILIKE '%'||btrim(p_column_search->>'ho_va_ten_nguoi_tao')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ngay_cap_nhat_trang_thai','')),'') IS NULL
         OR to_char(s.ngay_cap_nhat_trang_thai, 'DD/MM/YYYY')
            ILIKE '%'||btrim(p_column_search->>'ngay_cap_nhat_trang_thai')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'tg_cap_nhat','')),'') IS NULL
         OR to_char(s.tg_cap_nhat, 'DD/MM/YYYY') ILIKE '%'||btrim(p_column_search->>'tg_cap_nhat')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'so_luong','')),'') IS NULL
         OR s.so_luong::text ILIKE '%'||btrim(p_column_search->>'so_luong')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'tong_tien_quy_doi','')),'') IS NULL
         OR s.tong_tien_quy_doi::text ILIKE '%'||btrim(p_column_search->>'tong_tien_quy_doi')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'tong_tien_ban_giao','')),'') IS NULL
         OR s.tong_tien_ban_giao::text ILIKE '%'||btrim(p_column_search->>'tong_tien_ban_giao')||'%')
  ORDER BY
    CASE WHEN p_sort = 'nam_asc' THEN s.nam END ASC  NULLS LAST,
    CASE WHEN p_sort = 'nam_desc' THEN s.nam END DESC NULLS LAST,
    CASE WHEN p_sort = 'noi_dung_ho_tro_asc' THEN s.noi_dung_ho_tro END ASC  NULLS LAST,
    CASE WHEN p_sort = 'noi_dung_ho_tro_desc' THEN s.noi_dung_ho_tro END DESC NULLS LAST,
    CASE WHEN p_sort = 'linh_vuc_ho_tro_asc' THEN s.linh_vuc_ho_tro END ASC  NULLS LAST,
    CASE WHEN p_sort = 'linh_vuc_ho_tro_desc' THEN s.linh_vuc_ho_tro END DESC NULLS LAST,
    CASE WHEN p_sort = 'nguon_asc' THEN s.nguon END ASC  NULLS LAST,
    CASE WHEN p_sort = 'nguon_desc' THEN s.nguon END DESC NULLS LAST,
    CASE WHEN p_sort = 'nguon_ho_tro_asc' THEN s.nguon_ho_tro END ASC  NULLS LAST,
    CASE WHEN p_sort = 'nguon_ho_tro_desc' THEN s.nguon_ho_tro END DESC NULLS LAST,
    CASE WHEN p_sort = 'ho_ten_nguoi_nhan_asc' THEN s.ho_ten_nguoi_nhan END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_ten_nguoi_nhan_desc' THEN s.ho_ten_nguoi_nhan END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_xa_phuong_asc' THEN s.ten_xa_phuong END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_xa_phuong_desc' THEN s.ten_xa_phuong END DESC NULLS LAST,
    CASE WHEN p_sort = 'khoi_xom_asc' THEN s.khoi_xom END ASC  NULLS LAST,
    CASE WHEN p_sort = 'khoi_xom_desc' THEN s.khoi_xom END DESC NULLS LAST,
    CASE WHEN p_sort = 'doi_tuong_asc' THEN s.doi_tuong END ASC  NULLS LAST,
    CASE WHEN p_sort = 'doi_tuong_desc' THEN s.doi_tuong END DESC NULLS LAST,
    CASE WHEN p_sort = 'hinh_thuc_ho_tro_asc' THEN s.hinh_thuc_ho_tro END ASC  NULLS LAST,
    CASE WHEN p_sort = 'hinh_thuc_ho_tro_desc' THEN s.hinh_thuc_ho_tro END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_tien_asc' THEN s.so_tien END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_tien_desc' THEN s.so_tien END DESC NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_asc' THEN s.trang_thai END ASC  NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_desc' THEN s.trang_thai END DESC NULLS LAST,
    CASE WHEN p_sort = 'ngay_cap_nhat_trang_thai_asc' THEN s.ngay_cap_nhat_trang_thai END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ngay_cap_nhat_trang_thai_desc' THEN s.ngay_cap_nhat_trang_thai END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_don_vi_ho_tro_asc' THEN s.ten_don_vi_ho_tro END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_don_vi_ho_tro_desc' THEN s.ten_don_vi_ho_tro END DESC NULLS LAST,
    CASE WHEN p_sort = 'ghi_chu_asc' THEN s.ghi_chu END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ghi_chu_desc' THEN s.ghi_chu END DESC NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_asc' THEN s.nguoi_tao_display END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_desc' THEN s.nguoi_tao_display END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_asc' THEN s.tg_cap_nhat END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_desc' THEN s.tg_cap_nhat END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_luong_asc'  THEN s.so_luong END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_luong_desc' THEN s.so_luong END DESC NULLS LAST,
    CASE WHEN p_sort = 'tong_tien_quy_doi_asc'  THEN s.tong_tien_quy_doi END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tong_tien_quy_doi_desc' THEN s.tong_tien_quy_doi END DESC NULLS LAST,
    CASE WHEN p_sort = 'tong_tien_ban_giao_asc'  THEN s.tong_tien_ban_giao END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tong_tien_ban_giao_desc' THEN s.tong_tien_ban_giao END DESC NULLS LAST,
    -- Mặc định: mới cập nhật lên trước. BẮT BUỘC kết thúc bằng khoá chính,
    -- nếu không hai trang liền nhau có thể trùng dòng hoặc bỏ sót dòng.
    s.tg_cap_nhat DESC NULLS LAST, s.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$function$;

GRANT EXECUTE ON FUNCTION public.get_vnn_page(
  text, integer, integer, text, boolean, bigint,
  integer[], text[], text[], text[], text[], text[], text[], bigint[], jsonb
) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
