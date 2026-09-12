-- ============================================================================
-- audit_log — nhật ký thay đổi cho nhóm bảng nhạy cảm
--
-- Hiện hệ thống KHÔNG trả lời được câu hỏi cơ bản nhất của một cơ quan nhà nước:
-- "ai đã sửa bản ghi này, lúc nào, từ giá trị gì sang giá trị gì?".
-- Không có cột `id_nguoi_sua` / `id_nguoi_xoa`, không có bảng nhật ký, không có
-- trigger ghi log — kể cả với bảng nâng lương, hồ sơ nhân viên và phân quyền.
--
-- Bản này thêm một bảng nhật ký + MỘT trigger dùng chung, gắn trước cho nhóm
-- nhạy cảm nhất. Mở rộng sang bảng khác chỉ là thêm một dòng CREATE TRIGGER.
--
-- Nguyên tắc:
--   · Nhật ký là bằng chứng ⇒ người dùng KHÔNG được sửa/xoá (chỉ đọc).
--   · Trigger chạy SECURITY DEFINER nên vẫn ghi được dù người dùng không có
--     quyền ghi vào bảng nhật ký.
--   · Ghi cả dòng cũ và dòng mới dạng jsonb — nhóm bảng này đều nhỏ.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id                  bigserial PRIMARY KEY,
  bang                text        NOT NULL,
  ban_ghi_id          text,
  hanh_dong           text        NOT NULL CHECK (hanh_dong IN ('them', 'sua', 'xoa')),
  -- Ai thao tác: id nhân viên (nếu tra được) và luôn kèm auth uid để không mất vết.
  nguoi_thuc_hien_id  bigint,
  auth_user_id        uuid,
  tg                  timestamptz NOT NULL DEFAULT now(),
  du_lieu_cu          jsonb,
  du_lieu_moi         jsonb
);

COMMENT ON TABLE public.audit_log IS
  'Nhật ký thay đổi các bảng nhạy cảm (lương, nhân viên, phân quyền, kho cứu trợ). '
  'Chỉ đọc với người dùng; chỉ trigger fn_ghi_nhat_ky() được ghi vào.';

CREATE INDEX IF NOT EXISTS idx_audit_log_bang_ban_ghi ON public.audit_log (bang, ban_ghi_id, tg DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_tg           ON public.audit_log (tg DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_nguoi        ON public.audit_log (nguoi_thuc_hien_id, tg DESC);

-- ---------------------------------------------------------------------------
-- Trigger dùng chung
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_ghi_nhat_ky()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_hanh_dong text;
  v_ban_ghi_id text;
  v_cu jsonb;
  v_moi jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_hanh_dong := 'them';
    v_moi := to_jsonb(NEW);
    v_ban_ghi_id := v_moi->>'id';
  ELSIF TG_OP = 'UPDATE' THEN
    v_hanh_dong := 'sua';
    v_cu  := to_jsonb(OLD);
    v_moi := to_jsonb(NEW);
    v_ban_ghi_id := v_moi->>'id';
    -- Không ghi khi nội dung không đổi (ví dụ trigger tg_cap_nhat chạm vào dòng).
    IF v_cu - 'tg_cap_nhat' = v_moi - 'tg_cap_nhat' THEN
      RETURN NULL;
    END IF;
  ELSE
    v_hanh_dong := 'xoa';
    v_cu := to_jsonb(OLD);
    v_ban_ghi_id := v_cu->>'id';
  END IF;

  INSERT INTO public.audit_log (
    bang, ban_ghi_id, hanh_dong, nguoi_thuc_hien_id, auth_user_id, du_lieu_cu, du_lieu_moi
  ) VALUES (
    TG_TABLE_NAME, v_ban_ghi_id, v_hanh_dong,
    public.fn_nhan_vien_id_hien_tai(), auth.uid(), v_cu, v_moi
  );

  RETURN NULL; -- AFTER trigger, giá trị trả về bị bỏ qua.
END;
$$;

COMMENT ON FUNCTION public.fn_ghi_nhat_ky() IS
  'Trigger AFTER INSERT/UPDATE/DELETE dùng chung, ghi vào audit_log. '
  'Gắn thêm cho bảng mới: CREATE TRIGGER tg_audit_<bang> AFTER INSERT OR UPDATE OR DELETE '
  'ON public.<bang> FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_nhat_ky();';

-- ---------------------------------------------------------------------------
-- Gắn cho nhóm bảng nhạy cảm nhất
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t text;
  danh_sach text[] := ARRAY[
    'mttq_tang_luong',          -- nâng lương: tiền, dễ tranh chấp nhất
    'var_nhan_vien',            -- hồ sơ cán bộ + tài khoản đăng nhập
    'var_phan_quyen',           -- ma trận quyền: đổi ở đây là đổi ai xem được gì
    'var_chuc_vu',              -- cấp bậc / cấp quản lý — đầu vào của phân quyền
    'kho_nhap_xuat_kho',        -- chứng từ hàng cứu trợ
    'kho_nhap_xuat_kho_ct'
  ];
BEGIN
  FOREACH t IN ARRAY danh_sach LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS tg_audit_%I ON public.%I', t, t);
      EXECUTE format(
        'CREATE TRIGGER tg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I '
        'FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_nhat_ky()', t, t);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Quyền: nhật ký chỉ được ĐỌC, không ai sửa/xoá được qua API
-- ---------------------------------------------------------------------------

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_log_select ON public.audit_log;
CREATE POLICY audit_log_select ON public.audit_log
  FOR SELECT TO authenticated
  USING (true);

-- Cố tình KHÔNG có policy INSERT/UPDATE/DELETE: RLS bật + không policy = chặn.
-- Trigger ghi được vì chạy SECURITY DEFINER dưới quyền chủ sở hữu hàm.
REVOKE INSERT, UPDATE, DELETE ON public.audit_log FROM anon, authenticated;
GRANT SELECT ON public.audit_log TO authenticated;

NOTIFY pgrst, 'reload schema';
