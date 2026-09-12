-- ============================================================================
-- Lịch sử trạng thái + luật chuyển trạng thái
--
-- Hai lỗ hổng đang có:
--
-- 1. **Không có luật chuyển trạng thái nào.** Hộp thoại đổi trạng thái đổ ra
--    TOÀN BỘ danh sách, không lọc theo trạng thái hiện tại. Một quyết định khen
--    thưởng đã ở trạng thái "Đã ban hành" vẫn nhảy ngược về "Mới" được, và từ
--    "Hủy" nhảy thẳng sang "Đã ban hành" được. Không guard ở client, không
--    trigger ở DB.
--
-- 2. **Đổi trạng thái không để lại vết.** Ghi chú khi đổi trạng thái bị ghi đè
--    vào chính cột `ghi_chu` của bản ghi ⇒ mất lịch sử. Không có cột người
--    duyệt, thời điểm duyệt, lý do trả lại.
--
-- Bản này làm phần ở DATABASE. Phần client (chỉ hiện những trạng thái hợp lệ
-- trong hộp thoại, và kiểm quyền `approve` trước khi cho ban hành) làm riêng.
--
-- ── Vì sao chỉ đặt luật cho khen thưởng ─────────────────────────────────────
-- Khen thưởng là **quyết định hành chính**: đã ban hành thì không được lùi về
-- nháp. Ngược lại, "công việc" mở lại một việc đã hoàn thành là chuyện bình
-- thường trong điều hành — chặn nó sẽ làm hỏng luồng làm việc thật. Cho nên
-- cơ chế viết chung, nhưng luật chỉ bật cho bảng thực sự cần. Thêm bảng khác
-- về sau chỉ là thêm một nhánh trong `fn_kiem_luat_trang_thai`.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Bảng lịch sử trạng thái
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lich_su_trang_thai (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bang               text        NOT NULL,
  ban_ghi_id         text        NOT NULL,
  tu_trang_thai      text,
  den_trang_thai     text        NOT NULL,
  -- Lý do / ghi chú của lần đổi này. Trước đây bị ghi đè vào `ghi_chu` của bản
  -- ghi nên mất sạch lịch sử; nay mỗi lần đổi giữ lý do riêng.
  ly_do              text,
  nguoi_thuc_hien_id bigint      REFERENCES public.var_nhan_vien (id)
                                 ON UPDATE CASCADE ON DELETE SET NULL,
  auth_user_id       uuid,
  tg                 timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lich_su_trang_thai_ban_ghi
  ON public.lich_su_trang_thai (bang, ban_ghi_id, tg DESC);

COMMENT ON TABLE public.lich_su_trang_thai IS
  'Vết mọi lần đổi trạng thái: từ đâu sang đâu, ai đổi, lúc nào, vì sao.';

-- ---------------------------------------------------------------------------
-- 2. Luật chuyển trạng thái
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_kiem_luat_trang_thai()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_tu  text := OLD.trang_thai;
  v_den text := NEW.trang_thai;
BEGIN
  IF v_tu IS NOT DISTINCT FROM v_den THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'mttq_khen_thuong' THEN
    -- Đã ban hành là đã phát hành quyết định ra ngoài: chỉ còn đường huỷ,
    -- không lùi về nháp.
    IF v_tu = 'Đã ban hành' AND v_den IN ('Mới', 'Đang xử lý') THEN
      RAISE EXCEPTION
        'TRANG_THAI_KHONG_HOP_LE: Quyết định đã ban hành thì không quay lại trạng thái "%" được. Nếu sai sót, hãy huỷ quyết định rồi lập quyết định mới.',
        v_den;
    END IF;
    -- Đã huỷ thì không "sống lại" thành quyết định có hiệu lực.
    IF v_tu = 'Hủy' AND v_den = 'Đã ban hành' THEN
      RAISE EXCEPTION
        'TRANG_THAI_KHONG_HOP_LE: Quyết định đã huỷ thì không ban hành lại được. Hãy lập quyết định mới.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_kiem_luat_trang_thai() IS
  'Chặn các bước chuyển trạng thái không hợp lệ. Thêm bảng mới = thêm một nhánh IF.';

DROP TRIGGER IF EXISTS tg_luat_trang_thai_mttq_khen_thuong ON public.mttq_khen_thuong;
CREATE TRIGGER tg_luat_trang_thai_mttq_khen_thuong
  BEFORE UPDATE OF trang_thai ON public.mttq_khen_thuong
  FOR EACH ROW EXECUTE FUNCTION public.fn_kiem_luat_trang_thai();

-- ---------------------------------------------------------------------------
-- 3. Ghi vết mỗi lần đổi trạng thái
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_ghi_lich_su_trang_thai()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF OLD.trang_thai IS NOT DISTINCT FROM NEW.trang_thai THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.lich_su_trang_thai (
    bang, ban_ghi_id, tu_trang_thai, den_trang_thai, ly_do, nguoi_thuc_hien_id, auth_user_id
  ) VALUES (
    TG_TABLE_NAME,
    NEW.id::text,
    OLD.trang_thai,
    NEW.trang_thai,
    -- Nhiều bảng dùng `ghi_chu` để chứa lý do đổi trạng thái; chụp lại tại đây
    -- để lần đổi sau ghi đè cũng không mất.
    NULLIF(btrim(COALESCE(to_jsonb(NEW)->>'ghi_chu', '')), ''),
    public.fn_nhan_vien_id_hien_tai(),
    auth.uid()
  );
  RETURN NULL;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  -- Ghi vết cho mọi bảng có cột `trang_thai` mà nghiệp vụ có đổi trạng thái.
  FOREACH t IN ARRAY ARRAY[
    'mttq_khen_thuong',
    'cong_viec_danh_sach',
    'chuong_trinh_nam'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS tg_lich_su_trang_thai_%I ON public.%I', t, t);
      EXECUTE format(
        'CREATE TRIGGER tg_lich_su_trang_thai_%I AFTER UPDATE OF trang_thai ON public.%I '
        'FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_lich_su_trang_thai()', t, t);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Người duyệt / thời điểm duyệt cho quyết định khen thưởng
--
-- Bản in tập huấn đã có mục "Người phê duyệt", tức là nghiệp vụ CÓ khâu phê
-- duyệt — nhưng chỉ tồn tại trên giấy, dữ liệu không lưu ai duyệt.
-- ---------------------------------------------------------------------------
ALTER TABLE public.mttq_khen_thuong
  ADD COLUMN IF NOT EXISTS nguoi_duyet_id bigint,
  ADD COLUMN IF NOT EXISTS tg_duyet timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'mttq_khen_thuong_nguoi_duyet_id_fkey'
      AND conrelid = 'public.mttq_khen_thuong'::regclass
  ) THEN
    ALTER TABLE public.mttq_khen_thuong
      ADD CONSTRAINT mttq_khen_thuong_nguoi_duyet_id_fkey
      FOREIGN KEY (nguoi_duyet_id) REFERENCES public.var_nhan_vien (id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- Ai bấm "Đã ban hành" thì người đó là người duyệt — gán ở máy chủ, không tin
-- giá trị trình duyệt gửi lên.
CREATE OR REPLACE FUNCTION public.fn_gan_nguoi_duyet_khen_thuong()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NEW.trang_thai = 'Đã ban hành' AND OLD.trang_thai IS DISTINCT FROM 'Đã ban hành' THEN
    NEW.nguoi_duyet_id := public.fn_nhan_vien_id_hien_tai();
    NEW.tg_duyet := now();
  ELSIF NEW.trang_thai <> 'Đã ban hành' AND OLD.trang_thai = 'Đã ban hành' THEN
    -- Rời khỏi trạng thái đã ban hành (chỉ còn đường huỷ) thì xoá dấu duyệt.
    NEW.nguoi_duyet_id := NULL;
    NEW.tg_duyet := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_gan_nguoi_duyet_khen_thuong ON public.mttq_khen_thuong;
CREATE TRIGGER tg_gan_nguoi_duyet_khen_thuong
  BEFORE UPDATE OF trang_thai ON public.mttq_khen_thuong
  FOR EACH ROW EXECUTE FUNCTION public.fn_gan_nguoi_duyet_khen_thuong();

-- ---------------------------------------------------------------------------
-- 5. Quyền — lịch sử là bằng chứng, chỉ đọc
-- ---------------------------------------------------------------------------
ALTER TABLE public.lich_su_trang_thai ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lich_su_trang_thai_doc ON public.lich_su_trang_thai;
CREATE POLICY lich_su_trang_thai_doc ON public.lich_su_trang_thai
  FOR SELECT TO authenticated USING (true);

-- Cố tình không có policy ghi: trigger chạy SECURITY DEFINER nên vẫn ghi được.
REVOKE INSERT, UPDATE, DELETE ON public.lich_su_trang_thai FROM anon, authenticated;
GRANT SELECT ON public.lich_su_trang_thai TO authenticated;

NOTIFY pgrst, 'reload schema';
