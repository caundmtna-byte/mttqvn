-- Nhà đại đoàn kết BẮT BUỘC gắn một hộ trong Thông tin hộ nghèo, và thông tin
-- chủ hộ lấy từ hộ đó.
--
-- Trước đây cột `ho_ngheo_id` (migration 20260921150300) có nhưng form không ghi,
-- nên section "Nhà đại đoàn kết" trong chi tiết hộ luôn trống, còn họ tên / xã /
-- khối xóm / đối tượng của chủ hộ là bản nhập tay thứ hai — sửa hộ quên sửa nhà
-- là báo cáo lệch.
--
-- 1. Trigger BEFORE trên nddk: thiếu hộ ⇒ chặn; có hộ ⇒ chép 4 cột từ hộ.
--    Chỉ chạy khi INSERT hoặc khi `ho_ngheo_id` bị động tới trong UPDATE, nên
--    các hồ sơ cũ chưa gắn hộ vẫn đổi trạng thái được; chỉ khi mở form sửa
--    (form luôn gửi `ho_ngheo_id`) mới buộc chọn hộ.
-- 2. Trigger AFTER trên hộ: sửa họ tên / xã / khối xóm / đối tượng của hộ ⇒
--    mọi căn nhà gắn hộ đó cập nhật theo.
-- 3. `get_nddk_page` trả thêm `ho_ngheo_id` (đổi kiểu trả về ⇒ phải DROP).

-- ---------------------------------------------------------------------------
-- 1. nddk ← hộ
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_nddk_dong_bo_tu_ho_ngheo()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_ho public.hngh_thong_tin_ho_ngheo%ROWTYPE;
BEGIN
  IF NEW.ho_ngheo_id IS NULL THEN
    RAISE EXCEPTION 'Nhà đại đoàn kết phải gắn với một hộ trong Thông tin hộ nghèo.'
      USING ERRCODE = '23502';
  END IF;

  SELECT * INTO v_ho FROM public.hngh_thong_tin_ho_ngheo WHERE id = NEW.ho_ngheo_id;
  IF NOT FOUND THEN
    -- Để FK báo lỗi chuẩn; không tự chế thông điệp khác cho cùng một lỗi.
    RETURN NEW;
  END IF;

  NEW.ho_ten_chu_ho := v_ho.ho_ten_dai_dien;
  NEW.xa_phuong_id  := v_ho.xa_phuong_id;
  NEW.khoi_xom      := v_ho.khoi_xom;
  NEW.doi_tuong     := v_ho.doi_tuong;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_nddk_dong_bo_tu_ho_ngheo() IS
  'BEFORE INSERT / UPDATE OF ho_ngheo_id: bắt buộc gắn hộ nghèo, chép họ tên / xã / khối xóm / đối tượng từ hộ.';

DROP TRIGGER IF EXISTS trg_nddk_dong_bo_tu_ho_ngheo ON public.nddk_nha_dai_doan_ket;
CREATE TRIGGER trg_nddk_dong_bo_tu_ho_ngheo
  BEFORE INSERT OR UPDATE OF ho_ngheo_id, ho_ten_chu_ho, xa_phuong_id, khoi_xom, doi_tuong
  ON public.nddk_nha_dai_doan_ket
  FOR EACH ROW
  WHEN (pg_trigger_depth() < 2)
  EXECUTE FUNCTION public.fn_nddk_dong_bo_tu_ho_ngheo();

-- ---------------------------------------------------------------------------
-- 2. hộ → nddk
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER: người sửa hộ chưa chắc có quyền sửa nhà; đây là đồng bộ dữ
-- liệu phái sinh, không phải người dùng sửa hồ sơ nhà.
CREATE OR REPLACE FUNCTION public.fn_hngh_lan_sang_nddk()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.nddk_nha_dai_doan_ket n
     SET ho_ten_chu_ho = NEW.ho_ten_dai_dien,
         xa_phuong_id  = NEW.xa_phuong_id,
         khoi_xom      = NEW.khoi_xom,
         doi_tuong     = NEW.doi_tuong
   WHERE n.ho_ngheo_id = NEW.id;
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.fn_hngh_lan_sang_nddk() IS
  'AFTER UPDATE trên hộ nghèo: đồng bộ họ tên / xã / khối xóm / đối tượng sang các nhà đại đoàn kết gắn hộ.';

DROP TRIGGER IF EXISTS trg_hngh_lan_sang_nddk ON public.hngh_thong_tin_ho_ngheo;
CREATE TRIGGER trg_hngh_lan_sang_nddk
  AFTER UPDATE OF ho_ten_dai_dien, xa_phuong_id, khoi_xom, doi_tuong
  ON public.hngh_thong_tin_ho_ngheo
  FOR EACH ROW
  WHEN (
    OLD.ho_ten_dai_dien IS DISTINCT FROM NEW.ho_ten_dai_dien
    OR OLD.xa_phuong_id IS DISTINCT FROM NEW.xa_phuong_id
    OR OLD.khoi_xom     IS DISTINCT FROM NEW.khoi_xom
    OR OLD.doi_tuong    IS DISTINCT FROM NEW.doi_tuong
  )
  EXECUTE FUNCTION public.fn_hngh_lan_sang_nddk();

-- ---------------------------------------------------------------------------
-- 3. get_nddk_page + ho_ngheo_id
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_nddk_page(
  text, integer, integer, text, boolean, bigint,
  integer[], text[], text[], text[], text[], text[], bigint[], jsonb
);

CREATE FUNCTION public.get_nddk_page(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_sort text DEFAULT NULL::text, p_view_all boolean DEFAULT true, p_viewer_xa_phuong_id bigint DEFAULT NULL::bigint, p_nam integer[] DEFAULT NULL::integer[], p_nguon text[] DEFAULT NULL::text[], p_nguon_ho_tro text[] DEFAULT NULL::text[], p_doi_tuong text[] DEFAULT NULL::text[], p_loai_hinh text[] DEFAULT NULL::text[], p_trang_thai text[] DEFAULT NULL::text[], p_xa_phuong_ids bigint[] DEFAULT NULL::bigint[], p_column_search jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(id bigint, noi_dung_ho_tro text, nam integer, nguon text, nguon_ho_tro text, ho_ngheo_id bigint, ho_ten_chu_ho text, xa_phuong_id bigint, ten_xa_phuong text, khoi_xom text, doi_tuong text, loai_hinh_ho_tro text, so_tien numeric, trang_thai text, ngay_cap_nhat_trang_thai timestamp with time zone, ghi_chu text, id_nguoi_tao bigint, ho_va_ten_nguoi_tao text, ten_tai_khoan_nguoi_tao text, tg_tao timestamp with time zone, tg_cap_nhat timestamp with time zone, total_count bigint)
 LANGUAGE sql
 STABLE
AS $function$
  WITH src AS (
    SELECT
      t.*,
      xp.ten           AS ten_xa_phuong,
      nt.ho_va_ten     AS ho_va_ten_nguoi_tao,
      nt.ten_tai_khoan AS ten_tai_khoan_nguoi_tao,
      COALESCE(NULLIF(btrim(nt.ho_va_ten), ''), NULLIF(btrim(nt.ten_tai_khoan), ''), '')
        AS nguoi_tao_display
    FROM public.nddk_nha_dai_doan_ket t
    LEFT JOIN public.var_ssn_xa_phuong xp ON xp.id = t.xa_phuong_id
    LEFT JOIN public.var_nhan_vien     nt ON nt.id = t.id_nguoi_tao
  )
  SELECT
    s.id, s.noi_dung_ho_tro, s.nam, s.nguon, s.nguon_ho_tro,
    s.ho_ngheo_id, s.ho_ten_chu_ho, s.xa_phuong_id, s.ten_xa_phuong, s.khoi_xom,
    s.doi_tuong, s.loai_hinh_ho_tro, s.so_tien,
    s.trang_thai, s.ngay_cap_nhat_trang_thai, s.ghi_chu,
    s.id_nguoi_tao, s.ho_va_ten_nguoi_tao, s.ten_tai_khoan_nguoi_tao,
    s.tg_tao, s.tg_cap_nhat,
    COUNT(*) OVER () AS total_count
  FROM src s
  WHERE (
      p_search IS NULL
      OR public.fn_chuan_hoa_tim_kiem(concat_ws(' ',
        s.nam::text,
        s.ho_ten_chu_ho,
        s.ten_xa_phuong,
        s.khoi_xom,
        s.loai_hinh_ho_tro,
        s.so_tien::text, replace(to_char(round(s.so_tien), 'FM999,999,999,999,990'), ',', '.'),
        s.trang_thai,
        to_char(s.ngay_cap_nhat_trang_thai AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI'),
        s.noi_dung_ho_tro,
        s.nguon,
        s.nguon_ho_tro,
        s.doi_tuong,
        s.ghi_chu,
        s.nguoi_tao_display,
        to_char(s.tg_cap_nhat AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI')
      )) LIKE public.fn_mau_tim_kiem(p_search)
    )
    -- KHÔNG nới lỏng khi thiếu đơn vị: cán bộ cấp Xã phường chưa được gán đơn vị
    -- phải thấy RỖNG, đúng như canViewNddkRow ở client.
    AND (
      COALESCE(p_view_all, true)
      OR s.xa_phuong_id = p_viewer_xa_phuong_id
    )
    AND (p_nam           IS NULL OR cardinality(p_nam)           = 0 OR s.nam              = ANY (p_nam))
    AND (p_nguon         IS NULL OR cardinality(p_nguon)         = 0 OR s.nguon            = ANY (p_nguon))
    AND (p_nguon_ho_tro  IS NULL OR cardinality(p_nguon_ho_tro)  = 0 OR s.nguon_ho_tro     = ANY (p_nguon_ho_tro))
    AND (p_doi_tuong     IS NULL OR cardinality(p_doi_tuong)     = 0 OR s.doi_tuong        = ANY (p_doi_tuong))
    AND (p_loai_hinh     IS NULL OR cardinality(p_loai_hinh)     = 0 OR s.loai_hinh_ho_tro = ANY (p_loai_hinh))
    AND (p_trang_thai    IS NULL OR cardinality(p_trang_thai)    = 0 OR s.trang_thai       = ANY (p_trang_thai))
    AND (p_xa_phuong_ids IS NULL OR cardinality(p_xa_phuong_ids) = 0 OR s.xa_phuong_id     = ANY (p_xa_phuong_ids))
    -- Tìm theo từng cột: so khớp trên ĐÚNG chuỗi hiển thị của cột đó.
    AND (nullif(btrim(coalesce(p_column_search->>'nam','')),'') IS NULL
         OR s.nam::text ILIKE '%'||btrim(p_column_search->>'nam')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'noi_dung_ho_tro','')),'') IS NULL
         OR s.noi_dung_ho_tro ILIKE '%'||btrim(p_column_search->>'noi_dung_ho_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'nguon','')),'') IS NULL
         OR s.nguon ILIKE '%'||btrim(p_column_search->>'nguon')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'nguon_ho_tro','')),'') IS NULL
         OR s.nguon_ho_tro ILIKE '%'||btrim(p_column_search->>'nguon_ho_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ho_ten_chu_ho','')),'') IS NULL
         OR s.ho_ten_chu_ho ILIKE '%'||btrim(p_column_search->>'ho_ten_chu_ho')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_xa_phuong','')),'') IS NULL
         OR s.ten_xa_phuong ILIKE '%'||btrim(p_column_search->>'ten_xa_phuong')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'khoi_xom','')),'') IS NULL
         OR s.khoi_xom ILIKE '%'||btrim(p_column_search->>'khoi_xom')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'doi_tuong','')),'') IS NULL
         OR s.doi_tuong ILIKE '%'||btrim(p_column_search->>'doi_tuong')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'loai_hinh_ho_tro','')),'') IS NULL
         OR s.loai_hinh_ho_tro ILIKE '%'||btrim(p_column_search->>'loai_hinh_ho_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'so_tien','')),'') IS NULL
         OR s.so_tien::text ILIKE '%'||btrim(p_column_search->>'so_tien')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'trang_thai','')),'') IS NULL
         OR s.trang_thai ILIKE '%'||btrim(p_column_search->>'trang_thai')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ghi_chu','')),'') IS NULL
         OR s.ghi_chu ILIKE '%'||btrim(p_column_search->>'ghi_chu')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ho_va_ten_nguoi_tao','')),'') IS NULL
         OR s.nguoi_tao_display ILIKE '%'||btrim(p_column_search->>'ho_va_ten_nguoi_tao')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ngay_cap_nhat_trang_thai','')),'') IS NULL
         OR to_char(s.ngay_cap_nhat_trang_thai, 'DD/MM/YYYY')
            ILIKE '%'||btrim(p_column_search->>'ngay_cap_nhat_trang_thai')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'tg_cap_nhat','')),'') IS NULL
         OR to_char(s.tg_cap_nhat, 'DD/MM/YYYY') ILIKE '%'||btrim(p_column_search->>'tg_cap_nhat')||'%')
  ORDER BY
    CASE WHEN p_sort = 'nam_asc'                      THEN s.nam                      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'nam_desc'                     THEN s.nam                      END DESC NULLS LAST,
    CASE WHEN p_sort = 'noi_dung_ho_tro_asc'          THEN s.noi_dung_ho_tro          END ASC  NULLS LAST,
    CASE WHEN p_sort = 'noi_dung_ho_tro_desc'         THEN s.noi_dung_ho_tro          END DESC NULLS LAST,
    CASE WHEN p_sort = 'nguon_asc'                    THEN s.nguon                    END ASC  NULLS LAST,
    CASE WHEN p_sort = 'nguon_desc'                   THEN s.nguon                    END DESC NULLS LAST,
    CASE WHEN p_sort = 'nguon_ho_tro_asc'             THEN s.nguon_ho_tro             END ASC  NULLS LAST,
    CASE WHEN p_sort = 'nguon_ho_tro_desc'            THEN s.nguon_ho_tro             END DESC NULLS LAST,
    CASE WHEN p_sort = 'ho_ten_chu_ho_asc'            THEN s.ho_ten_chu_ho            END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_ten_chu_ho_desc'           THEN s.ho_ten_chu_ho            END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_xa_phuong_asc'            THEN s.ten_xa_phuong            END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_xa_phuong_desc'           THEN s.ten_xa_phuong            END DESC NULLS LAST,
    CASE WHEN p_sort = 'khoi_xom_asc'                 THEN s.khoi_xom                 END ASC  NULLS LAST,
    CASE WHEN p_sort = 'khoi_xom_desc'                THEN s.khoi_xom                 END DESC NULLS LAST,
    CASE WHEN p_sort = 'doi_tuong_asc'                THEN s.doi_tuong                END ASC  NULLS LAST,
    CASE WHEN p_sort = 'doi_tuong_desc'               THEN s.doi_tuong                END DESC NULLS LAST,
    CASE WHEN p_sort = 'loai_hinh_ho_tro_asc'         THEN s.loai_hinh_ho_tro         END ASC  NULLS LAST,
    CASE WHEN p_sort = 'loai_hinh_ho_tro_desc'        THEN s.loai_hinh_ho_tro         END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_tien_asc'                  THEN s.so_tien                  END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_tien_desc'                 THEN s.so_tien                  END DESC NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_asc'               THEN s.trang_thai               END ASC  NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_desc'              THEN s.trang_thai               END DESC NULLS LAST,
    CASE WHEN p_sort = 'ngay_cap_nhat_trang_thai_asc'  THEN s.ngay_cap_nhat_trang_thai END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ngay_cap_nhat_trang_thai_desc' THEN s.ngay_cap_nhat_trang_thai END DESC NULLS LAST,
    CASE WHEN p_sort = 'ghi_chu_asc'                  THEN s.ghi_chu                  END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ghi_chu_desc'                 THEN s.ghi_chu                  END DESC NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_asc'      THEN s.nguoi_tao_display        END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_desc'     THEN s.nguoi_tao_display        END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_asc'              THEN s.tg_cap_nhat              END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_desc'             THEN s.tg_cap_nhat              END DESC NULLS LAST,
    -- Mặc định: mới cập nhật lên trước. BẮT BUỘC kết thúc bằng khoá chính,
    -- nếu không hai trang liền nhau có thể trùng dòng hoặc bỏ sót dòng.
    s.tg_cap_nhat DESC NULLS LAST, s.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$function$;

GRANT EXECUTE ON FUNCTION public.get_nddk_page(
  text, integer, integer, text, boolean, bigint,
  integer[], text[], text[], text[], text[], text[], bigint[], jsonb
) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
