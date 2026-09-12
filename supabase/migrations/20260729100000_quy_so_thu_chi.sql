-- ============================================================================
-- Quỹ Vì người nghèo + Quỹ Cứu trợ — sổ thu chi và hai danh mục
--
-- Đây là lỗ hổng nghiệp vụ lớn nhất còn lại: kho cứu trợ (HIỆN VẬT) đã làm đầy
-- đủ, nhưng **quỹ TIỀN** thì chưa có gì — chưa sổ thu chi, chưa đối chiếu tài
-- khoản, chưa báo cáo công khai. Hai quỹ này có nghĩa vụ công khai theo luật.
--
-- ── Vì sao MỘT bộ bảng cho HAI quỹ ──────────────────────────────────────────
-- Quỹ Vì người nghèo và Quỹ Cứu trợ có cấu trúc giống hệt nhau: cùng sổ thu
-- chi, cùng danh mục khoản thu/chi, cùng danh mục tài khoản, cùng báo cáo. Khác
-- nhau ở dữ liệu, không ở nghiệp vụ. Nhân đôi 4 bảng sẽ nhân đôi vĩnh viễn mọi
-- ràng buộc, trigger, RPC và màn hình. Ở đây dùng một cột phân biệt `quy`, mọi
-- truy vấn đều lọc theo nó.
--
-- ── Nguyên tắc đã áp ────────────────────────────────────────────────────────
-- · Số chứng từ sinh tự động theo năm + loại (PT/PC), UNIQUE trong từng quỹ —
--   sổ quỹ phải liên tục, không được trùng số.
-- · `loai` của dòng sổ phải KHỚP `loai` của khoản mục — chặn ở DB chứ không chỉ
--   ở form, vì đây là tiền.
-- · Ghi nhật ký thay đổi (`audit_log`) ngay từ đầu: sửa một dòng thu chi phải
--   trả lời được ai sửa, lúc nào, từ giá trị nào.
-- · `id_nguoi_tao` do máy chủ gán, không tin giá trị trình duyệt gửi lên.
-- · RLS siết quyền GHI theo đúng ma trận quyền của ứng dụng.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Danh mục tài khoản / nguồn quỹ (tiền mặt, tài khoản ngân hàng…)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quy_danh_muc_tai_khoan (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  quy           text        NOT NULL CHECK (quy IN ('vi_nguoi_ngheo', 'cuu_tro')),
  ten           text        NOT NULL CHECK (btrim(ten) <> ''),
  -- Tiền mặt thì để trống hai cột dưới.
  so_tai_khoan  text,
  ngan_hang     text,
  mo_ta         text,
  trang_thai    text        NOT NULL DEFAULT 'Hoạt động'
                            CHECK (trang_thai IN ('Hoạt động', 'Ngừng')),
  thu_tu        integer     NOT NULL DEFAULT 0,
  tg_tao        timestamptz NOT NULL DEFAULT now(),
  tg_cap_nhat   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_quy_danh_muc_tai_khoan_ten
  ON public.quy_danh_muc_tai_khoan (quy, lower(btrim(ten)));

COMMENT ON TABLE public.quy_danh_muc_tai_khoan IS
  'Nguồn giữ tiền của quỹ: quỹ tiền mặt hoặc tài khoản ngân hàng.';

-- ---------------------------------------------------------------------------
-- 2. Danh mục khoản thu / khoản chi
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quy_danh_muc_khoan (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  quy         text        NOT NULL CHECK (quy IN ('vi_nguoi_ngheo', 'cuu_tro')),
  loai        text        NOT NULL CHECK (loai IN ('thu', 'chi')),
  ten         text        NOT NULL CHECK (btrim(ten) <> ''),
  mo_ta       text,
  thu_tu      integer     NOT NULL DEFAULT 0,
  trang_thai  text        NOT NULL DEFAULT 'Hoạt động'
                          CHECK (trang_thai IN ('Hoạt động', 'Ngừng')),
  tg_tao      timestamptz NOT NULL DEFAULT now(),
  tg_cap_nhat timestamptz NOT NULL DEFAULT now(),
  -- Khoá phụ để dòng sổ tham chiếu kèm `loai`, nhờ đó DB tự chặn việc gán
  -- khoản CHI cho một phiếu THU (xem FK ghép ở bảng sổ).
  CONSTRAINT uq_quy_danh_muc_khoan_id_loai UNIQUE (id, loai)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_quy_danh_muc_khoan_ten
  ON public.quy_danh_muc_khoan (quy, loai, lower(btrim(ten)));

COMMENT ON TABLE public.quy_danh_muc_khoan IS
  'Danh mục khoản thu và khoản chi của quỹ, dùng để phân loại từng dòng sổ.';

-- ---------------------------------------------------------------------------
-- 3. Sổ thu chi
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.quy_so_thu_chi_pt_seq;  -- phiếu thu
CREATE SEQUENCE IF NOT EXISTS public.quy_so_thu_chi_pc_seq;  -- phiếu chi

CREATE TABLE IF NOT EXISTS public.quy_so_thu_chi (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  quy             text        NOT NULL CHECK (quy IN ('vi_nguoi_ngheo', 'cuu_tro')),
  loai            text        NOT NULL CHECK (loai IN ('thu', 'chi')),
  so_chung_tu     text        NOT NULL,
  ngay_chung_tu   date        NOT NULL DEFAULT CURRENT_DATE,
  khoan_id        bigint      NOT NULL,
  tai_khoan_id    bigint      NOT NULL
                              REFERENCES public.quy_danh_muc_tai_khoan (id)
                              ON UPDATE CASCADE ON DELETE RESTRICT,
  -- Tiền: dương tuyệt đối. Hướng thu/chi nằm ở cột `loai`, không dùng số âm —
  -- số âm trong sổ quỹ là nguồn gốc của mọi nhầm lẫn khi cộng dồn.
  so_tien         numeric(18, 2) NOT NULL CHECK (so_tien > 0),
  noi_dung        text        NOT NULL CHECK (btrim(noi_dung) <> ''),
  -- Người nộp tiền (phiếu thu) hoặc người nhận tiền (phiếu chi).
  nguoi_nop_nhan  text,
  -- Xã/phường liên quan — dùng cho báo cáo theo địa bàn và phạm vi xem sau này.
  don_vi_id       bigint      REFERENCES public.var_ssn_xa_phuong (id)
                              ON UPDATE CASCADE ON DELETE SET NULL,
  chung_tu_goc    text,
  ghi_chu         text,
  id_nguoi_tao    bigint      REFERENCES public.var_nhan_vien (id)
                              ON UPDATE CASCADE ON DELETE RESTRICT,
  tg_tao          timestamptz NOT NULL DEFAULT now(),
  tg_cap_nhat     timestamptz NOT NULL DEFAULT now(),

  -- Khoản mục phải cùng loại với dòng sổ: khoản CHI không gán được cho phiếu THU.
  CONSTRAINT quy_so_thu_chi_khoan_fkey
    FOREIGN KEY (khoan_id, loai) REFERENCES public.quy_danh_muc_khoan (id, loai)
    ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_quy_so_thu_chi_so_chung_tu
  ON public.quy_so_thu_chi (quy, so_chung_tu);
CREATE INDEX IF NOT EXISTS idx_quy_so_thu_chi_ngay
  ON public.quy_so_thu_chi (quy, ngay_chung_tu DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_quy_so_thu_chi_tai_khoan
  ON public.quy_so_thu_chi (tai_khoan_id);

COMMENT ON TABLE public.quy_so_thu_chi IS
  'Sổ thu chi của quỹ. Mỗi dòng là một phiếu thu hoặc phiếu chi.';

-- ---------------------------------------------------------------------------
-- 4. Sinh số chứng từ — PT-2026-0001 / PC-2026-0001
--
-- Dùng `nextval()` trên sequence (an toàn khi hai người lập phiếu cùng lúc) +
-- UNIQUE ở trên làm chốt chặn cuối. Cùng khuôn với `fn_kho_sinh_so_phieu`.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_quy_sinh_so_chung_tu()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_nam    text := to_char(COALESCE(NEW.ngay_chung_tu, CURRENT_DATE), 'YYYY');
  v_prefix text;
  v_seq    bigint;
BEGIN
  IF NEW.so_chung_tu IS NOT NULL AND btrim(NEW.so_chung_tu) <> '' THEN
    RETURN NEW;
  END IF;
  IF NEW.loai = 'thu' THEN
    v_prefix := 'PT';
    v_seq := nextval('public.quy_so_thu_chi_pt_seq');
  ELSE
    v_prefix := 'PC';
    v_seq := nextval('public.quy_so_thu_chi_pc_seq');
  END IF;
  NEW.so_chung_tu := v_prefix || '-' || v_nam || '-' || lpad(v_seq::text, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_quy_sinh_so_chung_tu ON public.quy_so_thu_chi;
CREATE TRIGGER tg_quy_sinh_so_chung_tu
  BEFORE INSERT ON public.quy_so_thu_chi
  FOR EACH ROW EXECUTE FUNCTION public.fn_quy_sinh_so_chung_tu();

-- Số chứng từ đã phát hành thì không đổi — cùng lý do với số phiếu kho: chứng
-- từ đã in, đã ký, đã vào sổ.
CREATE OR REPLACE FUNCTION public.fn_quy_chan_doi_so_chung_tu()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.so_chung_tu IS DISTINCT FROM OLD.so_chung_tu THEN
    RAISE EXCEPTION 'SO_CHUNG_TU_KHONG_DOI_DUOC: Số chứng từ "%" đã phát hành nên không đổi được.',
      OLD.so_chung_tu;
  END IF;
  IF NEW.loai IS DISTINCT FROM OLD.loai THEN
    RAISE EXCEPTION 'LOAI_PHIEU_KHONG_DOI_DUOC: Phiếu "%" đã phát hành là phiếu % nên không đổi sang % được.',
      OLD.so_chung_tu,
      CASE OLD.loai WHEN 'thu' THEN 'thu' ELSE 'chi' END,
      CASE NEW.loai WHEN 'thu' THEN 'thu' ELSE 'chi' END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_quy_chan_doi_so_chung_tu ON public.quy_so_thu_chi;
CREATE TRIGGER tg_quy_chan_doi_so_chung_tu
  BEFORE UPDATE OF so_chung_tu, loai ON public.quy_so_thu_chi
  FOR EACH ROW EXECUTE FUNCTION public.fn_quy_chan_doi_so_chung_tu();

-- ---------------------------------------------------------------------------
-- 5. Cùng quỹ — khoản mục và tài khoản phải thuộc đúng quỹ của dòng sổ
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_quy_kiem_cung_quy()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_quy_khoan text;
  v_quy_tk    text;
BEGIN
  SELECT quy INTO v_quy_khoan FROM public.quy_danh_muc_khoan WHERE id = NEW.khoan_id;
  SELECT quy INTO v_quy_tk    FROM public.quy_danh_muc_tai_khoan WHERE id = NEW.tai_khoan_id;

  IF v_quy_khoan IS DISTINCT FROM NEW.quy THEN
    RAISE EXCEPTION 'QUY_KHONG_KHOP: Khoản mục đã chọn không thuộc quỹ của phiếu này.';
  END IF;
  IF v_quy_tk IS DISTINCT FROM NEW.quy THEN
    RAISE EXCEPTION 'QUY_KHONG_KHOP: Tài khoản đã chọn không thuộc quỹ của phiếu này.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_quy_kiem_cung_quy ON public.quy_so_thu_chi;
CREATE TRIGGER tg_quy_kiem_cung_quy
  BEFORE INSERT OR UPDATE OF quy, khoan_id, tai_khoan_id ON public.quy_so_thu_chi
  FOR EACH ROW EXECUTE FUNCTION public.fn_quy_kiem_cung_quy();

-- ---------------------------------------------------------------------------
-- 6. `tg_cap_nhat`, người tạo, nhật ký thay đổi
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_quy_set_tg_cap_nhat()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.tg_cap_nhat := now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['quy_danh_muc_tai_khoan', 'quy_danh_muc_khoan', 'quy_so_thu_chi'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS tg_quy_tg_cap_nhat_%I ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER tg_quy_tg_cap_nhat_%I BEFORE UPDATE ON public.%I '
      'FOR EACH ROW EXECUTE FUNCTION public.fn_quy_set_tg_cap_nhat()', t, t);
  END LOOP;

  -- Người lập phiếu: gán từ phiên đăng nhập, bỏ qua giá trị trình duyệt gửi lên.
  EXECUTE 'DROP TRIGGER IF EXISTS tg_gan_id_nguoi_tao_quy_so_thu_chi ON public.quy_so_thu_chi';
  EXECUTE 'CREATE TRIGGER tg_gan_id_nguoi_tao_quy_so_thu_chi BEFORE INSERT ON public.quy_so_thu_chi '
          'FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao()';

  -- Nhật ký thay đổi — đây là tiền, phải truy vết được từ ngày đầu.
  FOREACH t IN ARRAY ARRAY['quy_so_thu_chi', 'quy_danh_muc_khoan', 'quy_danh_muc_tai_khoan'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS tg_audit_%I ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER tg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I '
      'FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_nhat_ky()', t, t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 7. Số dư theo tài khoản — thu trừ chi
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.quy_so_du_view AS
SELECT
  tk.quy,
  tk.id                                   AS tai_khoan_id,
  tk.ten                                  AS ten_tai_khoan,
  COALESCE(SUM(s.so_tien) FILTER (WHERE s.loai = 'thu'), 0) AS tong_thu,
  COALESCE(SUM(s.so_tien) FILTER (WHERE s.loai = 'chi'), 0) AS tong_chi,
  COALESCE(SUM(s.so_tien) FILTER (WHERE s.loai = 'thu'), 0)
    - COALESCE(SUM(s.so_tien) FILTER (WHERE s.loai = 'chi'), 0) AS so_du
FROM public.quy_danh_muc_tai_khoan tk
LEFT JOIN public.quy_so_thu_chi s ON s.tai_khoan_id = tk.id
GROUP BY tk.quy, tk.id, tk.ten;

COMMENT ON VIEW public.quy_so_du_view IS
  'Số dư từng tài khoản của quỹ = tổng thu − tổng chi. Chưa có tồn đầu kỳ; '
  'khi làm chốt sổ theo kỳ thì phải thay bằng cách tính có số dư đầu kỳ.';

-- ---------------------------------------------------------------------------
-- 8. Quyền — đọc mở như phần còn lại của hệ thống, GHI siết theo ma trận quyền
-- ---------------------------------------------------------------------------
ALTER TABLE public.quy_danh_muc_tai_khoan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quy_danh_muc_khoan     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quy_so_thu_chi         ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('quy_danh_muc_tai_khoan', 'danh-muc-tai-khoan'),
      ('quy_danh_muc_khoan',     'danh-muc-chi-phi'),
      ('quy_so_thu_chi',         'so-thu-chi')
    ) AS t(bang, module_key)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.bang || '_doc', r.bang);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)',
      r.bang || '_doc', r.bang);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.bang || '_them', r.bang);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated '
      'WITH CHECK (public.fn_co_quyen(%L, %L))',
      r.bang || '_them', r.bang, r.module_key, 'them');

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.bang || '_sua', r.bang);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated '
      'USING (public.fn_co_quyen(%L, %L)) WITH CHECK (public.fn_co_quyen(%L, %L))',
      r.bang || '_sua', r.bang, r.module_key, 'sua', r.module_key, 'sua');

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.bang || '_xoa', r.bang);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated '
      'USING (public.fn_co_quyen(%L, %L))',
      r.bang || '_xoa', r.bang, r.module_key, 'xoa');
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quy_danh_muc_tai_khoan TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quy_danh_muc_khoan     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quy_so_thu_chi         TO authenticated;
GRANT SELECT ON public.quy_so_du_view TO authenticated;

NOTIFY pgrst, 'reload schema';
