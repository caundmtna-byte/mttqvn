-- Kho cứu trợ: chặn phạm vi xã ở database cho phiếu nhập xuất kho.
--
-- Trước đây kho_nhap_xuat_kho(_ct) là USING (true) cho cả đọc lẫn ghi — cán bộ
-- xã gọi thẳng API là đọc/sửa được phiếu của mọi xã; việc lọc chỉ nằm ở client.
--
-- Luật (bản gốc; client chép ở features/mat-tran-to-quoc/danh-sach-kho/utils/pham-vi-kho.ts):
--   · Bị giới hạn ⇔ nhân viên đang hoạt động, cap_quan_ly có 'Xã phường', không
--     có 'Tỉnh', và không phải quản trị. Còn lại xem hết (giữ hành vi cũ).
--   · ĐỌC phiếu: kho xuất HOẶC kho nhập thuộc xã mình — xã nhận hàng chuyển kho
--     vẫn thấy phiếu.
--   · GHI phiếu: "kho chính" thuộc xã mình — nhap_ngoai → kho_nhap_id;
--     xuat_ngoai / chuyen_kho → kho_xuat_id. Kho nhập của chuyển kho để tự do
--     (được chuyển sang xã khác), nên xã nhận hàng thấy nhưng không sửa được.
--   · Chưa gán don_vi_id ⇒ không đọc, không ghi được phiếu nào.
--
-- Các hàm tổng hợp SECURITY INVOKER (kho_ton_kho_view, get_ktnt_thanh_tich,
-- get_kho_don_vi_cuu_tro_*) cố ý giữ nguyên: cán bộ xã chỉ thấy phần thuộc kho
-- của xã mình.
--
-- Các hàm kiểm tồn chuyển sang SECURITY DEFINER: chúng phải thấy MỌI phiếu của
-- kho đang kiểm. Ví dụ xã A xoá phiếu chuyển A→B — tồn kho B tính trên phiếu mà
-- A nhìn thấy sẽ sai, có thể để lọt tồn âm.

-- ---------------------------------------------------------------------------
-- 1. Hàm phạm vi
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_kho_xem_tat_ca() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
  SELECT public.fn_la_quan_tri() OR NOT EXISTS (
    SELECT 1
    FROM public.var_nhan_vien nv
    WHERE lower(btrim(nv.ten_tai_khoan)) = public.fn_ten_dang_nhap_hien_tai()
      AND nv.trang_thai = 'Hoạt động'
      AND 'Xã phường' = ANY (COALESCE(nv.cap_quan_ly, ARRAY[]::text[]))
      AND NOT ('Tỉnh' = ANY (COALESCE(nv.cap_quan_ly, ARRAY[]::text[])))
  );
$$;

COMMENT ON FUNCTION public.fn_kho_xem_tat_ca() IS 'Người đang đăng nhập có xem/ghi được phiếu kho của mọi xã không. FALSE chỉ khi là cán bộ cấp Xã phường (không kiêm Tỉnh, không phải quản trị).';

CREATE OR REPLACE FUNCTION public.fn_kho_cua_toi() RETURNS bigint[]
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
  SELECT COALESCE(array_agg(k.id), ARRAY[]::bigint[])
  FROM public.kho_danh_sach_kho k
  WHERE k.don_vi_id = (
    SELECT nv.don_vi_id
    FROM public.var_nhan_vien nv
    WHERE lower(btrim(nv.ten_tai_khoan)) = public.fn_ten_dang_nhap_hien_tai()
      AND nv.trang_thai = 'Hoạt động'
    LIMIT 1
  );
$$;

COMMENT ON FUNCTION public.fn_kho_cua_toi() IS 'Danh sách id kho thuộc xã (don_vi_id) của người đang đăng nhập. Rỗng nếu chưa gán đơn vị.';

CREATE OR REPLACE FUNCTION public.fn_kho_phieu_ghi_duoc(p_loai text, p_kho_xuat bigint, p_kho_nhap bigint) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
  SELECT public.fn_kho_xem_tat_ca()
      OR (CASE WHEN p_loai = 'nhap_ngoai' THEN p_kho_nhap ELSE p_kho_xuat END) = ANY (public.fn_kho_cua_toi());
$$;

COMMENT ON FUNCTION public.fn_kho_phieu_ghi_duoc(text, bigint, bigint) IS 'Phiếu có nằm trong phạm vi GHI không: kho chính (nhap_ngoai → kho nhập; xuat_ngoai/chuyen_kho → kho xuất) thuộc xã mình.';

CREATE OR REPLACE FUNCTION public.fn_kho_ct_ghi_duoc(p_phieu_id bigint) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.kho_nhap_xuat_kho p
    WHERE p.id = p_phieu_id
      AND public.fn_kho_phieu_ghi_duoc(p.loai_phieu, p.kho_xuat_id, p.kho_nhap_id)
  );
$$;

COMMENT ON FUNCTION public.fn_kho_ct_ghi_duoc(bigint) IS 'Dòng chi tiết ghi được khi phiếu cha nằm trong phạm vi GHI (fn_kho_phieu_ghi_duoc).';

-- ---------------------------------------------------------------------------
-- 2. Policy kho_nhap_xuat_kho
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS kho_nhap_xuat_kho_select ON public.kho_nhap_xuat_kho;
DROP POLICY IF EXISTS kho_nhap_xuat_kho_modify ON public.kho_nhap_xuat_kho;

CREATE POLICY kho_nhap_xuat_kho_xem ON public.kho_nhap_xuat_kho FOR SELECT TO authenticated
  USING (
    (SELECT public.fn_kho_xem_tat_ca())
    OR kho_xuat_id = ANY ((SELECT public.fn_kho_cua_toi())::bigint[])
    OR kho_nhap_id = ANY ((SELECT public.fn_kho_cua_toi())::bigint[])
  );

CREATE POLICY kho_nhap_xuat_kho_them ON public.kho_nhap_xuat_kho FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.fn_co_quyen('nhap-xuat-kho', 'them'))
    AND public.fn_kho_phieu_ghi_duoc(loai_phieu, kho_xuat_id, kho_nhap_id)
  );

CREATE POLICY kho_nhap_xuat_kho_sua ON public.kho_nhap_xuat_kho FOR UPDATE TO authenticated
  USING (
    (SELECT public.fn_co_quyen('nhap-xuat-kho', 'sua'))
    AND public.fn_kho_phieu_ghi_duoc(loai_phieu, kho_xuat_id, kho_nhap_id)
  )
  WITH CHECK (
    (SELECT public.fn_co_quyen('nhap-xuat-kho', 'sua'))
    AND public.fn_kho_phieu_ghi_duoc(loai_phieu, kho_xuat_id, kho_nhap_id)
  );

CREATE POLICY kho_nhap_xuat_kho_xoa ON public.kho_nhap_xuat_kho FOR DELETE TO authenticated
  USING (
    (SELECT public.fn_co_quyen('nhap-xuat-kho', 'xoa'))
    AND public.fn_kho_phieu_ghi_duoc(loai_phieu, kho_xuat_id, kho_nhap_id)
  );

-- ---------------------------------------------------------------------------
-- 3. Policy kho_nhap_xuat_kho_ct — theo phiếu cha
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS kho_nhap_xuat_kho_ct_select ON public.kho_nhap_xuat_kho_ct;
DROP POLICY IF EXISTS kho_nhap_xuat_kho_ct_modify ON public.kho_nhap_xuat_kho_ct;

-- RLS của bảng phiếu tự lọc trong EXISTS.
CREATE POLICY kho_nhap_xuat_kho_ct_xem ON public.kho_nhap_xuat_kho_ct FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.kho_nhap_xuat_kho p WHERE p.id = phieu_id));

-- Dòng chi tiết được thêm cả lúc lập phiếu (them) lẫn lúc sửa phiếu (sua).
CREATE POLICY kho_nhap_xuat_kho_ct_them ON public.kho_nhap_xuat_kho_ct FOR INSERT TO authenticated
  WITH CHECK (
    ((SELECT public.fn_co_quyen('nhap-xuat-kho', 'them')) OR (SELECT public.fn_co_quyen('nhap-xuat-kho', 'sua')))
    AND public.fn_kho_ct_ghi_duoc(phieu_id)
  );

CREATE POLICY kho_nhap_xuat_kho_ct_sua ON public.kho_nhap_xuat_kho_ct FOR UPDATE TO authenticated
  USING ((SELECT public.fn_co_quyen('nhap-xuat-kho', 'sua')) AND public.fn_kho_ct_ghi_duoc(phieu_id))
  WITH CHECK ((SELECT public.fn_co_quyen('nhap-xuat-kho', 'sua')) AND public.fn_kho_ct_ghi_duoc(phieu_id));

-- Xoá dòng khi sửa phiếu (sua) hoặc khi xoá cả phiếu (xoa).
CREATE POLICY kho_nhap_xuat_kho_ct_xoa ON public.kho_nhap_xuat_kho_ct FOR DELETE TO authenticated
  USING (
    ((SELECT public.fn_co_quyen('nhap-xuat-kho', 'sua')) OR (SELECT public.fn_co_quyen('nhap-xuat-kho', 'xoa')))
    AND public.fn_kho_ct_ghi_duoc(phieu_id)
  );

-- ---------------------------------------------------------------------------
-- 4. Hàm kiểm tồn thấy đủ dữ liệu bất kể RLS
-- ---------------------------------------------------------------------------

ALTER FUNCTION public.fn_kho_khoa_kho(bigint)       SECURITY DEFINER SET search_path TO 'public';
ALTER FUNCTION public.fn_kho_kiem_tra_ton_am(bigint) SECURITY DEFINER SET search_path TO 'public';
ALTER FUNCTION public.fn_kho_kiem_tra_ton_am_ct()    SECURITY DEFINER SET search_path TO 'public';
ALTER FUNCTION public.fn_kho_kiem_tra_ton_am_phieu() SECURITY DEFINER SET search_path TO 'public';
ALTER FUNCTION public.fn_kho_kiem_tra_ton_kho()      SECURITY DEFINER SET search_path TO 'public';
