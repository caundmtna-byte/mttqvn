-- Module "Tiếp nhận" — ghi nhận khoản tài trợ của nhà tài trợ cho một chương trình
-- vận động, in "Biên bản xác nhận khoản tài trợ" (TT 20/2026/TT-BTC).
--
-- Giá trị một khoản = Tiền (chuyển khoản/tiền mặt) + Giấy tờ có giá (quy VNĐ)
--                   + Hiện vật khác không qua kho (quy VNĐ)
--                   + Σ thành tiền các phiếu "Nhập từ ngoài" ĐƯỢC GẮN vào khoản này.
-- Hàng qua kho KHÔNG nhập tay giá trị lần hai: gắn phiếu nhập ⇒ tự cộng. Một phiếu
-- chỉ gắn được vào MỘT khoản (UNIQUE) và phải cùng nhà tài trợ — tránh tính trùng.
--
-- Phạm vi: đơn vị tiếp nhận = đơn vị chủ trì của chương trình. Cán bộ Xã phường
-- (không kiêm Tỉnh) chỉ đọc/ghi khoản của chương trình xã mình — CÙNG luật với kho
-- (fn_kho_xem_tat_ca, fn_don_vi_cua_toi). Bản sao client:
-- features/mat-tran-to-quoc/dot-cuu-tro/utils/pham-vi-chuong-trinh.ts.

BEGIN;

-- 0. Nhà tài trợ: mã số thuế (biên bản cần) --------------------------------------
ALTER TABLE public.kho_don_vi_cuu_tro ADD COLUMN ma_so_thue text;

-- 1. Phạm vi chương trình --------------------------------------------------------
CREATE FUNCTION public.fn_chuong_trinh_trong_pham_vi(p_chuong_trinh_id bigint) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
  SELECT public.fn_kho_xem_tat_ca() OR EXISTS (
    SELECT 1 FROM public.kho_dot_cuu_tro d
    WHERE d.id = p_chuong_trinh_id
      AND d.don_vi_chu_tri_loai = 'xa_phuong'
      AND d.don_vi_chu_tri_id = public.fn_don_vi_cua_toi()
  );
$$;

COMMENT ON FUNCTION public.fn_chuong_trinh_trong_pham_vi(bigint) IS
  'Chương trình vận động có thuộc phạm vi người đăng nhập không: quản trị/Tỉnh ⇒ mọi chương trình; cán bộ Xã phường ⇒ chỉ chương trình do xã mình chủ trì.';

-- 2. Bảng tiếp nhận --------------------------------------------------------------
CREATE SEQUENCE public.tn_tiep_nhan_so_phieu_seq;

CREATE TABLE public.tn_tiep_nhan (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    so_phieu text NOT NULL,
    ngay_tiep_nhan date NOT NULL DEFAULT CURRENT_DATE,
    nha_tai_tro_id bigint NOT NULL
      REFERENCES public.kho_don_vi_cuu_tro(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    chuong_trinh_id bigint NOT NULL
      REFERENCES public.kho_dot_cuu_tro(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    hinh_thuc text,
    so_tien numeric(15,0) NOT NULL DEFAULT 0,
    giay_to_co_gia_mo_ta text,
    giay_to_co_gia_gia_tri numeric(15,0),
    hien_vat_khac_mo_ta text,
    hien_vat_khac_gia_tri numeric(15,0),
    muc_dich text[] NOT NULL DEFAULT ARRAY[]::text[],
    dia_diem_lap text,
    phu_luc jsonb,
    trang_thai text NOT NULL DEFAULT 'Đăng ký',
    ngay_cap_nhat_trang_thai timestamp with time zone NOT NULL DEFAULT now(),
    ghi_chu text,
    id_nguoi_tao bigint
      REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE SET NULL,
    id_nguoi_cap_nhat bigint
      REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE SET NULL,
    tg_tao timestamp with time zone NOT NULL DEFAULT now(),
    tg_cap_nhat timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT tn_so_phieu_uq UNIQUE (so_phieu),
    CONSTRAINT tn_hinh_thuc_chk
      CHECK (hinh_thuc IS NULL OR hinh_thuc = ANY (ARRAY['Chuyển khoản'::text, 'Tiền mặt'::text])),
    -- Có tiền thì phải biết hình thức; không có tiền thì không ghi hình thức.
    CONSTRAINT tn_hinh_thuc_theo_tien_chk
      CHECK ((so_tien > 0) = (hinh_thuc IS NOT NULL)),
    CONSTRAINT tn_so_tien_chk CHECK (so_tien >= 0),
    CONSTRAINT tn_gtcg_chk CHECK (giay_to_co_gia_gia_tri IS NULL OR giay_to_co_gia_gia_tri >= 0),
    CONSTRAINT tn_hv_khac_chk CHECK (hien_vat_khac_gia_tri IS NULL OR hien_vat_khac_gia_tri >= 0),
    CONSTRAINT tn_muc_dich_chk CHECK (muc_dich <@ ARRAY[
      'giao_duc_y_te_van_hoa'::text, 'thien_tai_dich_benh'::text, 'nha_dai_doan_ket'::text,
      'dia_ban_dbkk'::text, 'khoa_hoc_cong_nghe'::text
    ]),
    CONSTRAINT tn_phu_luc_chk CHECK (
      phu_luc IS NULL OR (jsonb_typeof(phu_luc) = 'array' AND jsonb_array_length(phu_luc) <= 30)
    ),
    CONSTRAINT tn_trang_thai_chk
      CHECK (trang_thai = ANY (ARRAY['Đăng ký'::text, 'Đã bàn giao'::text]))
);

COMMENT ON TABLE public.tn_tiep_nhan IS
  'Khoản tài trợ tiếp nhận (module Tiếp nhận). Giá trị = so_tien + giay_to_co_gia_gia_tri + hien_vat_khac_gia_tri + Σ phiếu nhập kho gắn qua tn_tiep_nhan_phieu_kho.';

CREATE INDEX idx_tn_nha_tai_tro ON public.tn_tiep_nhan (nha_tai_tro_id);
CREATE INDEX idx_tn_chuong_trinh ON public.tn_tiep_nhan (chuong_trinh_id);
CREATE INDEX idx_tn_ngay ON public.tn_tiep_nhan (ngay_tiep_nhan);

-- Số phiếu TN-YYYY-NNNN (cùng khuôn fn_kho_sinh_so_phieu).
CREATE FUNCTION public.fn_tn_sinh_so_phieu() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.so_phieu IS NOT NULL AND length(trim(NEW.so_phieu)) > 0 THEN
    RETURN NEW;
  END IF;
  NEW.so_phieu := format(
    'TN-%s-%s',
    to_char(COALESCE(NEW.ngay_tiep_nhan, CURRENT_DATE), 'YYYY'),
    lpad(nextval('public.tn_tiep_nhan_so_phieu_seq')::text, 4, '0')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tn_sinh_so_phieu BEFORE INSERT ON public.tn_tiep_nhan
  FOR EACH ROW EXECUTE FUNCTION public.fn_tn_sinh_so_phieu();
CREATE TRIGGER trg_tn_updated BEFORE UPDATE ON public.tn_tiep_nhan
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();
CREATE TRIGGER trg_tn_ngay_trang_thai BEFORE INSERT OR UPDATE ON public.tn_tiep_nhan
  FOR EACH ROW EXECUTE FUNCTION public.fn_gan_ngay_trang_thai();
CREATE TRIGGER tg_gan_id_nguoi_tao_tn_tiep_nhan BEFORE INSERT ON public.tn_tiep_nhan
  FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();
CREATE TRIGGER tg_gan_nguoi_cap_nhat_tn_tiep_nhan BEFORE INSERT OR UPDATE ON public.tn_tiep_nhan
  FOR EACH ROW EXECUTE FUNCTION public.fn_gan_nguoi_cap_nhat();
CREATE TRIGGER tg_lich_su_trang_thai_tn_tiep_nhan AFTER UPDATE OF trang_thai ON public.tn_tiep_nhan
  FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_lich_su_trang_thai();
CREATE TRIGGER tg_audit_tn_tiep_nhan AFTER INSERT OR DELETE OR UPDATE ON public.tn_tiep_nhan
  FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_nhat_ky();

-- 3. Phiếu nhập kho gắn vào khoản tiếp nhận --------------------------------------
CREATE TABLE public.tn_tiep_nhan_phieu_kho (
    tiep_nhan_id bigint NOT NULL
      REFERENCES public.tn_tiep_nhan(id) ON UPDATE CASCADE ON DELETE CASCADE,
    phieu_id bigint NOT NULL
      REFERENCES public.kho_nhap_xuat_kho(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    PRIMARY KEY (tiep_nhan_id, phieu_id),
    -- Một phiếu nhập chỉ thuộc MỘT khoản tiếp nhận ⇒ không cộng hai lần.
    CONSTRAINT tn_phieu_kho_phieu_uq UNIQUE (phieu_id)
);

COMMENT ON TABLE public.tn_tiep_nhan_phieu_kho IS
  'Phiếu "Nhập từ ngoài" thuộc khoản tiếp nhận. Phiếu phải cùng nhà tài trợ; mỗi phiếu chỉ gắn một lần.';

-- Phiếu phải là nhập từ ngoài và cùng nhà tài trợ với khoản tiếp nhận. Đọc bằng
-- quyền định nghĩa: kiểm tính nhất quán dữ liệu, không phụ thuộc người gọi thấy gì.
CREATE FUNCTION public.fn_tn_kiem_phieu_kho() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.kho_nhap_xuat_kho p
    JOIN public.tn_tiep_nhan t ON t.id = NEW.tiep_nhan_id
    WHERE p.id = NEW.phieu_id
      AND p.loai_phieu = 'nhap_ngoai'
      AND p.don_vi_cuu_tro_id = t.nha_tai_tro_id
  ) INTO v_ok;
  IF NOT v_ok THEN
    RAISE EXCEPTION 'TN_PHIEU_KHONG_HOP_LE: Phiếu kho phải là phiếu "Nhập từ ngoài" của đúng nhà tài trợ.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tn_kiem_phieu_kho BEFORE INSERT OR UPDATE ON public.tn_tiep_nhan_phieu_kho
  FOR EACH ROW EXECUTE FUNCTION public.fn_tn_kiem_phieu_kho();

-- Đổi nhà tài trợ của khoản đã gắn phiếu ⇒ chặn (phải gỡ phiếu trước; RPC lưu đã
-- làm đúng thứ tự: gỡ liên kết → sửa đầu phiếu → gắn lại).
CREATE FUNCTION public.fn_tn_chan_doi_nha_tai_tro() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.nha_tai_tro_id IS DISTINCT FROM OLD.nha_tai_tro_id AND EXISTS (
    SELECT 1 FROM public.tn_tiep_nhan_phieu_kho WHERE tiep_nhan_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'TN_DOI_NHA_TAI_TRO: Gỡ các phiếu kho đã gắn trước khi đổi nhà tài trợ.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tn_chan_doi_nha_tai_tro BEFORE UPDATE OF nha_tai_tro_id ON public.tn_tiep_nhan
  FOR EACH ROW EXECUTE FUNCTION public.fn_tn_chan_doi_nha_tai_tro();

-- Giá trị hàng kho của một khoản — quyền định nghĩa vì RLS kho giới hạn theo xã,
-- tính dưới RLS người gọi sẽ ra số thiếu.
CREATE FUNCTION public.fn_tn_gia_tri_phieu_kho(p_tiep_nhan_id bigint) RETURNS numeric
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COALESCE(sum(ct.thanh_tien), 0)::numeric
  FROM public.tn_tiep_nhan_phieu_kho l
  JOIN public.kho_nhap_xuat_kho_ct ct ON ct.phieu_id = l.phieu_id
  WHERE l.tiep_nhan_id = p_tiep_nhan_id;
$$;

-- 4. RLS -------------------------------------------------------------------------
ALTER TABLE public.tn_tiep_nhan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tn_tiep_nhan_phieu_kho ENABLE ROW LEVEL SECURITY;

CREATE POLICY tn_tiep_nhan_xem ON public.tn_tiep_nhan FOR SELECT TO authenticated
  USING (public.fn_chuong_trinh_trong_pham_vi(chuong_trinh_id));
CREATE POLICY tn_tiep_nhan_them ON public.tn_tiep_nhan FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.fn_co_quyen('tiep-nhan', 'them'))
              AND public.fn_chuong_trinh_trong_pham_vi(chuong_trinh_id));
CREATE POLICY tn_tiep_nhan_sua ON public.tn_tiep_nhan FOR UPDATE TO authenticated
  USING ((SELECT public.fn_co_quyen('tiep-nhan', 'sua'))
         AND public.fn_chuong_trinh_trong_pham_vi(chuong_trinh_id))
  WITH CHECK ((SELECT public.fn_co_quyen('tiep-nhan', 'sua'))
              AND public.fn_chuong_trinh_trong_pham_vi(chuong_trinh_id));
CREATE POLICY tn_tiep_nhan_xoa ON public.tn_tiep_nhan FOR DELETE TO authenticated
  USING ((SELECT public.fn_co_quyen('tiep-nhan', 'xoa'))
         AND public.fn_chuong_trinh_trong_pham_vi(chuong_trinh_id));

-- Bảng liên kết đi theo khoản cha: thấy/ghi được khi thấy/ghi được khoản đó.
CREATE POLICY tn_phieu_kho_xem ON public.tn_tiep_nhan_phieu_kho FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tn_tiep_nhan t WHERE t.id = tiep_nhan_id));
CREATE POLICY tn_phieu_kho_ghi ON public.tn_tiep_nhan_phieu_kho FOR ALL TO authenticated
  USING (
    ((SELECT public.fn_co_quyen('tiep-nhan', 'them')) OR (SELECT public.fn_co_quyen('tiep-nhan', 'sua')))
    AND EXISTS (SELECT 1 FROM public.tn_tiep_nhan t WHERE t.id = tiep_nhan_id)
  )
  WITH CHECK (
    ((SELECT public.fn_co_quyen('tiep-nhan', 'them')) OR (SELECT public.fn_co_quyen('tiep-nhan', 'sua')))
    AND EXISTS (SELECT 1 FROM public.tn_tiep_nhan t WHERE t.id = tiep_nhan_id)
  );

GRANT ALL ON TABLE public.tn_tiep_nhan TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.tn_tiep_nhan_phieu_kho TO anon, authenticated, service_role;
GRANT ALL ON SEQUENCE public.tn_tiep_nhan_so_phieu_seq TO anon, authenticated, service_role;
GRANT ALL ON SEQUENCE public.tn_tiep_nhan_id_seq TO anon, authenticated, service_role;

-- 5. RPC lưu (một giao dịch: đầu phiếu + phiếu kho gắn) ----------------------------
-- SECURITY INVOKER: RLS của hai bảng chặn quyền và phạm vi như ghi trực tiếp.
CREATE FUNCTION public.rpc_tn_luu_tiep_nhan(
  p_id bigint,
  p_data jsonb,
  p_phieu_ids bigint[] DEFAULT ARRAY[]::bigint[]
) RETURNS bigint
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_id bigint := p_id;
  v_tong numeric;
BEGIN
  IF v_id IS NULL THEN
    INSERT INTO public.tn_tiep_nhan (
      ngay_tiep_nhan, nha_tai_tro_id, chuong_trinh_id, hinh_thuc, so_tien,
      giay_to_co_gia_mo_ta, giay_to_co_gia_gia_tri, hien_vat_khac_mo_ta, hien_vat_khac_gia_tri,
      muc_dich, dia_diem_lap, phu_luc, trang_thai, ghi_chu
    ) VALUES (
      COALESCE((p_data->>'ngay_tiep_nhan')::date, CURRENT_DATE),
      (p_data->>'nha_tai_tro_id')::bigint,
      (p_data->>'chuong_trinh_id')::bigint,
      NULLIF(p_data->>'hinh_thuc', ''),
      COALESCE((p_data->>'so_tien')::numeric, 0),
      NULLIF(btrim(p_data->>'giay_to_co_gia_mo_ta'), ''),
      (p_data->>'giay_to_co_gia_gia_tri')::numeric,
      NULLIF(btrim(p_data->>'hien_vat_khac_mo_ta'), ''),
      (p_data->>'hien_vat_khac_gia_tri')::numeric,
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_data->'muc_dich')), ARRAY[]::text[]),
      NULLIF(btrim(p_data->>'dia_diem_lap'), ''),
      CASE WHEN jsonb_typeof(p_data->'phu_luc') = 'array' AND jsonb_array_length(p_data->'phu_luc') > 0
           THEN p_data->'phu_luc' END,
      COALESCE(NULLIF(p_data->>'trang_thai', ''), 'Đăng ký'),
      NULLIF(btrim(p_data->>'ghi_chu'), '')
    )
    RETURNING id INTO v_id;
  ELSE
    -- Gỡ liên kết TRƯỚC khi sửa đầu phiếu: đổi nhà tài trợ bị chặn nếu còn phiếu gắn.
    DELETE FROM public.tn_tiep_nhan_phieu_kho WHERE tiep_nhan_id = v_id;
    UPDATE public.tn_tiep_nhan SET
      ngay_tiep_nhan         = COALESCE((p_data->>'ngay_tiep_nhan')::date, ngay_tiep_nhan),
      nha_tai_tro_id         = (p_data->>'nha_tai_tro_id')::bigint,
      chuong_trinh_id        = (p_data->>'chuong_trinh_id')::bigint,
      hinh_thuc              = NULLIF(p_data->>'hinh_thuc', ''),
      so_tien                = COALESCE((p_data->>'so_tien')::numeric, 0),
      giay_to_co_gia_mo_ta   = NULLIF(btrim(p_data->>'giay_to_co_gia_mo_ta'), ''),
      giay_to_co_gia_gia_tri = (p_data->>'giay_to_co_gia_gia_tri')::numeric,
      hien_vat_khac_mo_ta    = NULLIF(btrim(p_data->>'hien_vat_khac_mo_ta'), ''),
      hien_vat_khac_gia_tri  = (p_data->>'hien_vat_khac_gia_tri')::numeric,
      muc_dich               = COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_data->'muc_dich')), ARRAY[]::text[]),
      dia_diem_lap           = NULLIF(btrim(p_data->>'dia_diem_lap'), ''),
      phu_luc                = CASE WHEN jsonb_typeof(p_data->'phu_luc') = 'array'
                                     AND jsonb_array_length(p_data->'phu_luc') > 0
                                    THEN p_data->'phu_luc' END,
      ghi_chu                = NULLIF(btrim(p_data->>'ghi_chu'), '')
    WHERE id = v_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'TN_KHONG_TIM_THAY: Không tìm thấy khoản tiếp nhận hoặc không có quyền sửa.';
    END IF;
  END IF;

  INSERT INTO public.tn_tiep_nhan_phieu_kho (tiep_nhan_id, phieu_id)
  SELECT v_id, x FROM unnest(COALESCE(p_phieu_ids, ARRAY[]::bigint[])) AS x;

  -- Khoản tiếp nhận phải có giá trị — bản sao luật `tongGiaTriTiepNhan > 0` ở client.
  SELECT t.so_tien + COALESCE(t.giay_to_co_gia_gia_tri, 0) + COALESCE(t.hien_vat_khac_gia_tri, 0)
         + public.fn_tn_gia_tri_phieu_kho(t.id)
    INTO v_tong
  FROM public.tn_tiep_nhan t WHERE t.id = v_id;
  IF COALESCE(v_tong, 0) <= 0 THEN
    RAISE EXCEPTION 'TN_GIA_TRI_RONG: Khoản tiếp nhận phải có số tiền, giấy tờ có giá, hiện vật hoặc phiếu nhập kho.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN v_id;
END;
$$;

GRANT ALL ON FUNCTION public.rpc_tn_luu_tiep_nhan(bigint, jsonb, bigint[]) TO authenticated, service_role;

-- 6. RPC đọc phân trang ------------------------------------------------------------
-- SECURITY DEFINER để cộng đủ giá trị phiếu kho; phạm vi lọc TƯỜNG MINH bằng
-- fn_chuong_trinh_trong_pham_vi (đúng luật RLS SELECT ở trên).
CREATE FUNCTION public.get_tn_tiep_nhan_page(
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0,
  p_sort text DEFAULT NULL,
  p_nha_tai_tro_ids bigint[] DEFAULT NULL,
  p_chuong_trinh_ids bigint[] DEFAULT NULL,
  p_hinh_thuc text[] DEFAULT NULL,
  p_trang_thai text[] DEFAULT NULL,
  p_tu_ngay date DEFAULT NULL,
  p_den_ngay date DEFAULT NULL,
  p_id bigint DEFAULT NULL
) RETURNS TABLE (
  id bigint, so_phieu text, ngay_tiep_nhan date,
  nha_tai_tro_id bigint, ten_nha_tai_tro text, loai_nha_tai_tro text,
  chuong_trinh_id bigint, ten_chuong_trinh text,
  don_vi_chu_tri_loai text, don_vi_chu_tri_id bigint, ten_don_vi_tiep_nhan text,
  hinh_thuc text, so_tien numeric,
  giay_to_co_gia_gia_tri numeric, hien_vat_khac_gia_tri numeric,
  gia_tri_phieu_kho numeric, so_phieu_kho bigint, tong_gia_tri numeric,
  trang_thai text, ngay_cap_nhat_trang_thai timestamp with time zone, ghi_chu text,
  id_nguoi_tao bigint, ho_va_ten_nguoi_tao text, ten_tai_khoan_nguoi_tao text,
  id_nguoi_cap_nhat bigint, ho_va_ten_nguoi_cap_nhat text, ten_tai_khoan_nguoi_cap_nhat text,
  tg_tao timestamp with time zone, tg_cap_nhat timestamp with time zone,
  total_count bigint
)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
  WITH kho AS (
    SELECT l.tiep_nhan_id, sum(ct.thanh_tien) AS gia_tri, count(DISTINCT l.phieu_id) AS so_phieu
    FROM public.tn_tiep_nhan_phieu_kho l
    JOIN public.kho_nhap_xuat_kho_ct ct ON ct.phieu_id = l.phieu_id
    GROUP BY l.tiep_nhan_id
  ),
  src AS (
    SELECT
      t.*,
      ntt.ten  AS ten_nha_tai_tro,
      ntt.loai AS loai_nha_tai_tro,
      d.ten    AS ten_chuong_trinh,
      d.don_vi_chu_tri_loai,
      d.don_vi_chu_tri_id,
      CASE WHEN d.don_vi_chu_tri_loai = 'xa_phuong' THEN xp.ten ELSE 'MTTQ tỉnh' END AS ten_don_vi_tiep_nhan,
      COALESCE(kho.gia_tri, 0)  AS gia_tri_phieu_kho,
      COALESCE(kho.so_phieu, 0) AS so_phieu_kho,
      t.so_tien + COALESCE(t.giay_to_co_gia_gia_tri, 0) + COALESCE(t.hien_vat_khac_gia_tri, 0)
        + COALESCE(kho.gia_tri, 0) AS tong_gia_tri,
      nt.ho_va_ten     AS ho_va_ten_nguoi_tao,
      nt.ten_tai_khoan AS ten_tai_khoan_nguoi_tao,
      nc.ho_va_ten     AS ho_va_ten_nguoi_cap_nhat,
      nc.ten_tai_khoan AS ten_tai_khoan_nguoi_cap_nhat
    FROM public.tn_tiep_nhan t
    JOIN public.kho_don_vi_cuu_tro ntt ON ntt.id = t.nha_tai_tro_id
    JOIN public.kho_dot_cuu_tro d      ON d.id = t.chuong_trinh_id
    LEFT JOIN public.var_ssn_xa_phuong xp ON xp.id = d.don_vi_chu_tri_id
    LEFT JOIN kho ON kho.tiep_nhan_id = t.id
    LEFT JOIN public.var_nhan_vien nt ON nt.id = t.id_nguoi_tao
    LEFT JOIN public.var_nhan_vien nc ON nc.id = t.id_nguoi_cap_nhat
    WHERE public.fn_chuong_trinh_trong_pham_vi(t.chuong_trinh_id)
  )
  SELECT
    s.id, s.so_phieu, s.ngay_tiep_nhan,
    s.nha_tai_tro_id, s.ten_nha_tai_tro, s.loai_nha_tai_tro,
    s.chuong_trinh_id, s.ten_chuong_trinh,
    s.don_vi_chu_tri_loai, s.don_vi_chu_tri_id, s.ten_don_vi_tiep_nhan,
    s.hinh_thuc, s.so_tien,
    s.giay_to_co_gia_gia_tri, s.hien_vat_khac_gia_tri,
    s.gia_tri_phieu_kho, s.so_phieu_kho, s.tong_gia_tri,
    s.trang_thai, s.ngay_cap_nhat_trang_thai, s.ghi_chu,
    s.id_nguoi_tao, s.ho_va_ten_nguoi_tao, s.ten_tai_khoan_nguoi_tao,
    s.id_nguoi_cap_nhat, s.ho_va_ten_nguoi_cap_nhat, s.ten_tai_khoan_nguoi_cap_nhat,
    s.tg_tao, s.tg_cap_nhat,
    COUNT(*) OVER () AS total_count
  FROM src s
  WHERE (p_id IS NULL OR s.id = p_id)
    AND (
      p_search IS NULL
      OR public.fn_chuan_hoa_tim_kiem(concat_ws(' ',
        s.so_phieu, s.ten_nha_tai_tro, s.ten_chuong_trinh, s.ten_don_vi_tiep_nhan,
        s.hinh_thuc, s.trang_thai, s.ghi_chu,
        s.tong_gia_tri::text, replace(to_char(round(s.tong_gia_tri), 'FM999,999,999,999,990'), ',', '.'),
        to_char(s.ngay_tiep_nhan, 'DD/MM/YYYY')
      )) LIKE public.fn_mau_tim_kiem(p_search)
    )
    AND (p_nha_tai_tro_ids  IS NULL OR cardinality(p_nha_tai_tro_ids)  = 0 OR s.nha_tai_tro_id  = ANY (p_nha_tai_tro_ids))
    AND (p_chuong_trinh_ids IS NULL OR cardinality(p_chuong_trinh_ids) = 0 OR s.chuong_trinh_id = ANY (p_chuong_trinh_ids))
    AND (p_hinh_thuc        IS NULL OR cardinality(p_hinh_thuc)        = 0 OR s.hinh_thuc       = ANY (p_hinh_thuc))
    AND (p_trang_thai       IS NULL OR cardinality(p_trang_thai)       = 0 OR s.trang_thai      = ANY (p_trang_thai))
    AND (p_tu_ngay  IS NULL OR s.ngay_tiep_nhan >= p_tu_ngay)
    AND (p_den_ngay IS NULL OR s.ngay_tiep_nhan <= p_den_ngay)
  ORDER BY
    CASE WHEN p_sort = 'so_phieu_asc'         THEN s.so_phieu         END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_phieu_desc'        THEN s.so_phieu         END DESC NULLS LAST,
    CASE WHEN p_sort = 'ngay_tiep_nhan_asc'   THEN s.ngay_tiep_nhan   END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ngay_tiep_nhan_desc'  THEN s.ngay_tiep_nhan   END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_nha_tai_tro_asc'  THEN s.ten_nha_tai_tro  END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_nha_tai_tro_desc' THEN s.ten_nha_tai_tro  END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_chuong_trinh_asc' THEN s.ten_chuong_trinh END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_chuong_trinh_desc' THEN s.ten_chuong_trinh END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_tien_asc'          THEN s.so_tien          END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_tien_desc'         THEN s.so_tien          END DESC NULLS LAST,
    CASE WHEN p_sort = 'tong_gia_tri_asc'     THEN s.tong_gia_tri     END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tong_gia_tri_desc'    THEN s.tong_gia_tri     END DESC NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_asc'       THEN s.trang_thai       END ASC  NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_desc'      THEN s.trang_thai       END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_asc'      THEN s.tg_cap_nhat      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_desc'     THEN s.tg_cap_nhat      END DESC NULLS LAST,
    -- Mặc định: mới tiếp nhận lên trước. Kết thúc bằng khoá chính để phân trang ổn định.
    s.ngay_tiep_nhan DESC, s.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$$;

GRANT ALL ON FUNCTION public.get_tn_tiep_nhan_page(text, integer, integer, text, bigint[], bigint[], text[], text[], date, date, bigint)
  TO authenticated, service_role;

-- Phiếu "Nhập từ ngoài" của một nhà tài trợ, kèm tổng tiền và khoản tiếp nhận đang
-- gắn (nếu có) — nguồn của ô chọn phiếu trong form. Quyền định nghĩa + lọc phạm vi
-- kho của người gọi (đúng luật RLS đọc phiếu kho).
CREATE FUNCTION public.get_tn_phieu_kho_cua_nha_tai_tro(p_nha_tai_tro_id bigint)
RETURNS TABLE (
  phieu_id bigint, so_phieu text, ngay_phieu date, ten_kho text,
  ten_chuong_trinh text, tong_tien numeric, so_dong bigint,
  tiep_nhan_id bigint, so_phieu_tiep_nhan text
)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
  SELECT
    p.id, p.so_phieu, p.ngay_phieu, k.ten_kho, d.ten,
    COALESCE(sum(ct.thanh_tien), 0), count(ct.id),
    l.tiep_nhan_id, t.so_phieu
  FROM public.kho_nhap_xuat_kho p
  LEFT JOIN public.kho_danh_sach_kho k ON k.id = p.kho_nhap_id
  LEFT JOIN public.kho_dot_cuu_tro d ON d.id = p.dot_cuu_tro_id
  LEFT JOIN public.kho_nhap_xuat_kho_ct ct ON ct.phieu_id = p.id
  LEFT JOIN public.tn_tiep_nhan_phieu_kho l ON l.phieu_id = p.id
  LEFT JOIN public.tn_tiep_nhan t ON t.id = l.tiep_nhan_id
  WHERE p.loai_phieu = 'nhap_ngoai'
    AND p.don_vi_cuu_tro_id = p_nha_tai_tro_id
    AND (public.fn_kho_xem_tat_ca() OR p.kho_nhap_id = ANY (public.fn_kho_cua_toi()))
  GROUP BY p.id, k.ten_kho, d.ten, l.tiep_nhan_id, t.so_phieu
  ORDER BY p.ngay_phieu DESC, p.id DESC;
$$;

GRANT ALL ON FUNCTION public.get_tn_phieu_kho_cua_nha_tai_tro(bigint) TO authenticated, service_role;

-- 7. Seed quyền: chép từ module anh em "Chương trình vận động" (dot-cuu-tro) ------
-- Không seed = chỉ cap_bac 1 mở được module. Cơ quan tự bỏ tích trên màn Phân quyền.
INSERT INTO public.var_phan_quyen (chuc_vu_id, module_key, quyen)
SELECT DISTINCT ON (src.chuc_vu_id) src.chuc_vu_id, 'tiep-nhan', src.quyen
FROM public.var_phan_quyen src
WHERE src.module_key IN ('dot-cuu-tro', 'an-sinh-xa-hoi/kho-cuu-tro/dot-cuu-tro')
  AND NOT EXISTS (
    SELECT 1 FROM public.var_phan_quyen existing
    WHERE existing.chuc_vu_id = src.chuc_vu_id
      AND existing.module_key IN ('tiep-nhan', 'an-sinh-xa-hoi/kho-cuu-tro/tiep-nhan')
  )
ORDER BY src.chuc_vu_id, (src.module_key = 'dot-cuu-tro') DESC;

COMMIT;
