-- Kho cứu trợ (tiếp theo 20261003140000_kho_rls_pham_vi_xa.sql):
--
-- 1. kho_ton_kho_view chỉ trả dòng của kho trong phạm vi người xem.
--    View là security_invoker nên cộng trên các phiếu người gọi thấy được. Cán
--    bộ xã thấy phiếu "kho tỉnh → kho xã", nên view từng trả thêm một dòng KHO
--    TỈNH với tồn âm (chỉ tính phần đã chuyển xuống). Lọc theo đúng phạm vi:
--    kho của xã thì vẫn tính đủ, vì mọi phiếu dính tới kho đó đều đọc được.
--
-- 2. Năm bảng danh mục kho hết cho mọi tài khoản ghi (USING (true)): ghi gác
--    bằng fn_co_quyen(<module_key>, them|sua|xoa) — đúng quyền giao diện đang
--    gác. Đọc vẫn mở: đây là danh mục dùng chung toàn tỉnh, không có cột xã hay
--    người tạo. Riêng kho_danh_sach_kho còn bó theo xã (kho gắn don_vi_id).
--    Trigger fn_xa_phuong_dong_bo_ten_kho đã là SECURITY DEFINER nên đổi tên xã
--    vẫn đổi được tên kho.

-- ---------------------------------------------------------------------------
-- Hàm đơn vị của người đăng nhập — tách từ fn_kho_cua_toi để dùng chung
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_don_vi_cua_toi() RETURNS bigint
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
  SELECT nv.don_vi_id
  FROM public.var_nhan_vien nv
  WHERE lower(btrim(nv.ten_tai_khoan)) = public.fn_ten_dang_nhap_hien_tai()
    AND nv.trang_thai = 'Hoạt động'
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.fn_don_vi_cua_toi() IS 'var_nhan_vien.don_vi_id (xã/phường) của người đang đăng nhập, hoặc NULL.';

CREATE OR REPLACE FUNCTION public.fn_kho_cua_toi() RETURNS bigint[]
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
  SELECT COALESCE(array_agg(k.id), ARRAY[]::bigint[])
  FROM public.kho_danh_sach_kho k
  WHERE k.don_vi_id = public.fn_don_vi_cua_toi();
$$;

-- ---------------------------------------------------------------------------
-- 1. View tồn kho theo phạm vi
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.kho_ton_kho_view WITH (security_invoker='true') AS
 WITH movements AS (
         SELECT m.kho_nhap_id AS kho_id,
            ct.hang_hoa_id,
            ct.so_luong AS qty
           FROM public.kho_nhap_xuat_kho m
             JOIN public.kho_nhap_xuat_kho_ct ct ON ct.phieu_id = m.id
          WHERE m.kho_nhap_id IS NOT NULL
        UNION ALL
         SELECT m.kho_xuat_id AS kho_id,
            ct.hang_hoa_id,
            - ct.so_luong AS qty
           FROM public.kho_nhap_xuat_kho m
             JOIN public.kho_nhap_xuat_kho_ct ct ON ct.phieu_id = m.id
          WHERE m.kho_xuat_id IS NOT NULL
        )
 SELECT kho_id,
    hang_hoa_id,
    sum(qty)::numeric(18,3) AS ton_kho
   FROM movements
  WHERE (SELECT public.fn_kho_xem_tat_ca())
     OR kho_id = ANY ((SELECT public.fn_kho_cua_toi())::bigint[])
  GROUP BY kho_id, hang_hoa_id;

-- ---------------------------------------------------------------------------
-- 2. Quyền ghi danh mục
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('kho_danh_muc_hang_hoa',  'hang-hoa'),
      ('kho_danh_sach_hang_hoa', 'hang-hoa'),
      ('kho_don_vi_cuu_tro',     'don-vi-cuu-tro'),
      ('kho_dot_cuu_tro',        'dot-cuu-tro')
    ) AS t(bang, module_key)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.bang || '_modify', r.bang);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT public.fn_co_quyen(%L, ''them'')))',
      r.bang || '_them', r.bang, r.module_key);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ((SELECT public.fn_co_quyen(%L, ''sua''))) WITH CHECK ((SELECT public.fn_co_quyen(%L, ''sua'')))',
      r.bang || '_sua', r.bang, r.module_key, r.module_key);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ((SELECT public.fn_co_quyen(%L, ''xoa'')))',
      r.bang || '_xoa', r.bang, r.module_key);
  END LOOP;
END $$;

-- Danh sách kho: quyền module + kho phải thuộc xã mình (trừ Tỉnh / quản trị).
DROP POLICY IF EXISTS kho_danh_sach_kho_modify ON public.kho_danh_sach_kho;

CREATE POLICY kho_danh_sach_kho_them ON public.kho_danh_sach_kho FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.fn_co_quyen('danh-sach-kho', 'them'))
    AND ((SELECT public.fn_kho_xem_tat_ca()) OR don_vi_id = (SELECT public.fn_don_vi_cua_toi()))
  );

CREATE POLICY kho_danh_sach_kho_sua ON public.kho_danh_sach_kho FOR UPDATE TO authenticated
  USING (
    (SELECT public.fn_co_quyen('danh-sach-kho', 'sua'))
    AND ((SELECT public.fn_kho_xem_tat_ca()) OR don_vi_id = (SELECT public.fn_don_vi_cua_toi()))
  )
  WITH CHECK (
    (SELECT public.fn_co_quyen('danh-sach-kho', 'sua'))
    AND ((SELECT public.fn_kho_xem_tat_ca()) OR don_vi_id = (SELECT public.fn_don_vi_cua_toi()))
  );

CREATE POLICY kho_danh_sach_kho_xoa ON public.kho_danh_sach_kho FOR DELETE TO authenticated
  USING (
    (SELECT public.fn_co_quyen('danh-sach-kho', 'xoa'))
    AND ((SELECT public.fn_kho_xem_tat_ca()) OR don_vi_id = (SELECT public.fn_don_vi_cua_toi()))
  );
