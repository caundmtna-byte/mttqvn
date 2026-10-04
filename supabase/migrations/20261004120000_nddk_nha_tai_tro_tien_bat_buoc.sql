-- Nhà đại đoàn kết + Chương trình hỗ trợ:
--   1. NĐĐK có ô "Nhà tài trợ" (ảnh yêu cầu: "Bổ sung trường này — chọn Nhà tài trợ").
--      Bắt buộc ở client khi Nguồn hỗ trợ = "Ủng hộ trực tiếp" — đó là khoản được cộng
--      vào Kết quả hỗ trợ của nhà tài trợ (xem migration nha_tai_tro_ket_qua_khong_trung).
--   2. Tiền bắt buộc khi hồ sơ đã chốt:
--        NĐĐK: Đã phê duyệt / Đang thực hiện / Đã bàn giao ⇒ so_tien > 0
--        CT hỗ trợ: Đã nhận ⇒ phần tiền mặt và/hoặc phần hiện vật quy đổi > 0 theo hình thức
--      CHECK đặt NOT VALID: dòng cũ thiếu tiền vẫn nằm yên, lần SỬA tới mới phải điền.
--      Bản sao ở client: core/schema.ts của từng module (superRefine) — sửa một bên phải
--      sửa cả bên kia.

BEGIN;

ALTER TABLE public.nddk_nha_dai_doan_ket
  ADD COLUMN nha_tai_tro_id bigint
    REFERENCES public.kho_don_vi_cuu_tro(id) ON UPDATE CASCADE ON DELETE RESTRICT;
CREATE INDEX idx_nddk_nha_tai_tro ON public.nddk_nha_dai_doan_ket (nha_tai_tro_id);
COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.nha_tai_tro_id IS
  'Nhà tài trợ (kho_don_vi_cuu_tro). Bắt buộc ở client khi nguon_ho_tro = ''Ủng hộ trực tiếp''.';

ALTER TABLE public.nddk_nha_dai_doan_ket
  ADD CONSTRAINT nddk_so_tien_theo_trang_thai_chk CHECK (
    trang_thai <> ALL (ARRAY['Đã phê duyệt'::text, 'Đang thực hiện'::text, 'Đã bàn giao'::text])
    OR COALESCE(so_tien, 0) > 0
  ) NOT VALID;

ALTER TABLE public.vnn_chuong_trinh
  ADD CONSTRAINT vnn_so_tien_theo_trang_thai_chk CHECK (
    trang_thai <> 'Đã nhận'
    OR (
      (hinh_thuc_ho_tro = 'Hiện vật' OR COALESCE(so_tien, 0) > 0)
      AND (hinh_thuc_ho_tro = 'Tiền mặt' OR COALESCE(tong_tien_quy_doi, 0) > 0)
    )
  ) NOT VALID;

-- RPC phân trang: thêm cột + tham số ⇒ phải DROP rồi tạo lại.
DROP FUNCTION public.get_nddk_page(text, integer, integer, text, boolean, bigint, integer[], text[], text[], text[], text[], text[], bigint[], jsonb);

CREATE FUNCTION public.get_nddk_page(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_sort text DEFAULT NULL::text, p_view_all boolean DEFAULT true, p_viewer_xa_phuong_id bigint DEFAULT NULL::bigint, p_nam integer[] DEFAULT NULL::integer[], p_nguon text[] DEFAULT NULL::text[], p_nguon_ho_tro text[] DEFAULT NULL::text[], p_doi_tuong text[] DEFAULT NULL::text[], p_loai_hinh text[] DEFAULT NULL::text[], p_trang_thai text[] DEFAULT NULL::text[], p_xa_phuong_ids bigint[] DEFAULT NULL::bigint[], p_column_search jsonb DEFAULT NULL::jsonb, p_nha_tai_tro_ids bigint[] DEFAULT NULL::bigint[]) RETURNS TABLE(id bigint, noi_dung_ho_tro text, nam integer, nguon text, nguon_ho_tro text, ho_ngheo_id bigint, ho_ten_chu_ho text, xa_phuong_id bigint, ten_xa_phuong text, khoi_xom text, doi_tuong text, loai_hinh_ho_tro text, so_tien numeric, trang_thai text, ngay_cap_nhat_trang_thai timestamp with time zone, ghi_chu text, id_nguoi_tao bigint, ho_va_ten_nguoi_tao text, ten_tai_khoan_nguoi_tao text, tg_tao timestamp with time zone, tg_cap_nhat timestamp with time zone, id_nguoi_cap_nhat bigint, ho_va_ten_nguoi_cap_nhat text, ten_tai_khoan_nguoi_cap_nhat text, nha_tai_tro_id bigint, ten_nha_tai_tro text, total_count bigint)
    LANGUAGE sql STABLE
    AS $$
  WITH src AS (
    SELECT
      t.*,
      xp.ten           AS ten_xa_phuong,
      nt.ho_va_ten     AS ho_va_ten_nguoi_tao,
      nt.ten_tai_khoan AS ten_tai_khoan_nguoi_tao,
      nc.ho_va_ten     AS ho_va_ten_nguoi_cap_nhat,
      nc.ten_tai_khoan AS ten_tai_khoan_nguoi_cap_nhat,
      ntt.ten          AS ten_nha_tai_tro,
      COALESCE(NULLIF(btrim(nt.ho_va_ten), ''), NULLIF(btrim(nt.ten_tai_khoan), ''), '')
        AS nguoi_tao_display
    FROM public.nddk_nha_dai_doan_ket t
    LEFT JOIN public.var_ssn_xa_phuong xp ON xp.id = t.xa_phuong_id
    LEFT JOIN public.var_nhan_vien     nt ON nt.id = t.id_nguoi_tao
    LEFT JOIN public.var_nhan_vien     nc ON nc.id = t.id_nguoi_cap_nhat
    LEFT JOIN public.kho_don_vi_cuu_tro ntt ON ntt.id = t.nha_tai_tro_id
  )
  SELECT
    s.id, s.noi_dung_ho_tro, s.nam, s.nguon, s.nguon_ho_tro,
    s.ho_ngheo_id, s.ho_ten_chu_ho, s.xa_phuong_id, s.ten_xa_phuong, s.khoi_xom,
    s.doi_tuong, s.loai_hinh_ho_tro, s.so_tien,
    s.trang_thai, s.ngay_cap_nhat_trang_thai, s.ghi_chu,
    s.id_nguoi_tao, s.ho_va_ten_nguoi_tao, s.ten_tai_khoan_nguoi_tao,
    s.tg_tao, s.tg_cap_nhat,
    s.id_nguoi_cap_nhat, s.ho_va_ten_nguoi_cap_nhat, s.ten_tai_khoan_nguoi_cap_nhat,
    s.nha_tai_tro_id, s.ten_nha_tai_tro,
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
        s.ten_nha_tai_tro,
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
    AND (p_nha_tai_tro_ids IS NULL OR cardinality(p_nha_tai_tro_ids) = 0 OR s.nha_tai_tro_id = ANY (p_nha_tai_tro_ids))
    -- Tìm theo từng cột: so khớp trên ĐÚNG chuỗi hiển thị của cột đó.
    AND (nullif(btrim(coalesce(p_column_search->>'nam','')),'') IS NULL
         OR s.nam::text ILIKE '%'||btrim(p_column_search->>'nam')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'noi_dung_ho_tro','')),'') IS NULL
         OR s.noi_dung_ho_tro ILIKE '%'||btrim(p_column_search->>'noi_dung_ho_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'nguon','')),'') IS NULL
         OR s.nguon ILIKE '%'||btrim(p_column_search->>'nguon')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'nguon_ho_tro','')),'') IS NULL
         OR s.nguon_ho_tro ILIKE '%'||btrim(p_column_search->>'nguon_ho_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_nha_tai_tro','')),'') IS NULL
         OR s.ten_nha_tai_tro ILIKE '%'||btrim(p_column_search->>'ten_nha_tai_tro')||'%')
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
    CASE WHEN p_sort = 'ten_nha_tai_tro_asc'          THEN s.ten_nha_tai_tro          END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_nha_tai_tro_desc'         THEN s.ten_nha_tai_tro          END DESC NULLS LAST,
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
$$;


GRANT ALL ON FUNCTION public.get_nddk_page(text, integer, integer, text, boolean, bigint, integer[], text[], text[], text[], text[], text[], bigint[], jsonb, bigint[]) TO anon, authenticated, service_role;

COMMIT;
