-- ============================================================================
-- Khoá kỳ — nhiệm kỳ và kỳ họp
--
-- Hiện trạng trước bản này: **không có khái niệm "khoá sổ" ở bất kỳ đâu**.
-- Nhiệm kỳ 2019-2024 đã kết thúc nhiều năm vẫn sửa/xoá uỷ viên bình thường;
-- điểm danh kỳ họp năm ngoái vẫn bấm đổi được. Cộng thêm RLS còn `USING (true)`
-- cho gần hết các bảng, dữ liệu lịch sử của cơ quan hiện không được bảo vệ:
-- một thao tác nhầm (hoặc một lệnh gọi REST thẳng từ DevTools) là mất vết
-- nhân sự của cả một nhiệm kỳ mà không ai biết.
--
-- Bản này thêm CÔNG TẮC KHOÁ ở hai cấp và chặn GHI bằng trigger — tức là chặn
-- ở tầng database, không phụ thuộc giao diện:
--
--   mttq_nhiem_ky.da_khoa = true
--     ⇒ khoá cả cây: uỷ viên uỷ ban, kỳ họp, và điểm danh của các kỳ họp đó.
--   mttq_ky_hop.da_khoa = true
--     ⇒ khoá riêng kỳ họp đó và bảng điểm danh của nó.
--
-- Vì sao chặn bằng TRIGGER chứ không bằng POLICY: policy chỉ trả "không có
-- dòng nào bị ảnh hưởng" hoặc lỗi 42501 chung chung, người dùng cuối không hiểu
-- vì sao. Trigger `RAISE EXCEPTION 'MA_LOI: câu tiếng Việt'` cho phép hiện đúng
-- lý do ("Nhiệm kỳ đã khoá sổ…") — cùng khuôn với `fn_kiem_luat_trang_thai`
-- và các RPC kho/quỹ đã có, và `lib/supabase/error-messages.ts` map được.
--
-- Ai được khoá / mở khoá: `fn_co_quyen('nhiem-ky','sua')` cho nhiệm kỳ,
-- `fn_co_quyen('ky-hop','sua')` cho kỳ họp (hai hàm này đã tự OR với
-- `fn_la_quan_tri()` — xem 20260726120000_rls_quyen_he_thong.sql).
--
-- Bản này idempotent: chạy lại lần hai không đổi gì.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Cột khoá
--
-- `tg_khoa` / `nguoi_khoa_id` do MÁY CHỦ gán trong trigger (giống
-- `mttq_khen_thuong.nguoi_duyet_id`) — client không gửi lên, và cũng không đặt
-- lại được: một cái vết mà người thao tác tự ghi được thì không phải là vết.
-- ---------------------------------------------------------------------------
ALTER TABLE public.mttq_nhiem_ky
  ADD COLUMN IF NOT EXISTS da_khoa boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tg_khoa timestamptz,
  ADD COLUMN IF NOT EXISTS nguoi_khoa_id bigint;

ALTER TABLE public.mttq_ky_hop
  ADD COLUMN IF NOT EXISTS da_khoa boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tg_khoa timestamptz,
  ADD COLUMN IF NOT EXISTS nguoi_khoa_id bigint;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mttq_nhiem_ky_nguoi_khoa_id_fkey'
  ) THEN
    ALTER TABLE public.mttq_nhiem_ky
      ADD CONSTRAINT mttq_nhiem_ky_nguoi_khoa_id_fkey
      FOREIGN KEY (nguoi_khoa_id) REFERENCES public.var_nhan_vien(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mttq_ky_hop_nguoi_khoa_id_fkey'
  ) THEN
    ALTER TABLE public.mttq_ky_hop
      ADD CONSTRAINT mttq_ky_hop_nguoi_khoa_id_fkey
      FOREIGN KEY (nguoi_khoa_id) REFERENCES public.var_nhan_vien(id);
  END IF;
END $$;

COMMENT ON COLUMN public.mttq_nhiem_ky.da_khoa IS
  'Đã khoá sổ nhiệm kỳ: chặn mọi thao tác ghi vào uỷ viên, kỳ họp và điểm danh thuộc nhiệm kỳ.';
COMMENT ON COLUMN public.mttq_nhiem_ky.tg_khoa IS 'Thời điểm khoá sổ — máy chủ gán.';
COMMENT ON COLUMN public.mttq_nhiem_ky.nguoi_khoa_id IS 'Người khoá sổ — máy chủ gán từ phiên đăng nhập.';
COMMENT ON COLUMN public.mttq_ky_hop.da_khoa IS
  'Đã khoá sổ kỳ họp: chặn ghi vào chính kỳ họp và bảng điểm danh của nó.';
COMMENT ON COLUMN public.mttq_ky_hop.tg_khoa IS 'Thời điểm khoá sổ — máy chủ gán.';
COMMENT ON COLUMN public.mttq_ky_hop.nguoi_khoa_id IS 'Người khoá sổ — máy chủ gán từ phiên đăng nhập.';

-- ---------------------------------------------------------------------------
-- 2. Hàm tra cứu
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER là bắt buộc cho hai hàm tra cứu: phạm vi xem theo đơn vị sẽ
-- được siết dần ở các đợt RLS sau, và khi đó một người không "nhìn thấy" dòng
-- nhiệm kỳ cha sẽ đọc ra NULL — tức là hàng rào tự mở. Đọc bỏ qua RLS thì
-- trạng thái khoá luôn đúng, bất kể ai đang gọi.
CREATE OR REPLACE FUNCTION public.fn_nhiem_ky_da_khoa(p_nhiem_ky_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT nk.da_khoa FROM public.mttq_nhiem_ky nk WHERE nk.id = p_nhiem_ky_id),
    false
  );
$$;

COMMENT ON FUNCTION public.fn_nhiem_ky_da_khoa(bigint) IS
  'Nhiệm kỳ này đã khoá sổ chưa (bỏ qua RLS để trạng thái khoá không phụ thuộc người gọi).';

-- Trả về NGUỒN khoá của một kỳ họp để thông báo nêu đúng chỗ cần mở:
--   'nhiem_ky' — nhiệm kỳ cha đã khoá (mở khoá nhiệm kỳ mới sửa được)
--   'ky_hop'   — riêng kỳ họp bị khoá
--   NULL       — không khoá
CREATE OR REPLACE FUNCTION public.fn_ky_hop_khoa_boi(p_ky_hop_id bigint)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
           WHEN nk.da_khoa THEN 'nhiem_ky'
           WHEN kh.da_khoa THEN 'ky_hop'
           ELSE NULL
         END
  FROM public.mttq_ky_hop kh
  JOIN public.mttq_nhiem_ky nk ON nk.id = kh.nhiem_ky_id
  WHERE kh.id = p_ky_hop_id;
$$;

COMMENT ON FUNCTION public.fn_ky_hop_khoa_boi(bigint) IS
  'Kỳ họp đang bị khoá bởi đâu: ''nhiem_ky'' | ''ky_hop'' | NULL (không khoá).';

-- Cổng quyền khoá/mở khoá.
--
-- CỐ Ý để SECURITY INVOKER: cần đọc `current_user` THẬT của phiên gọi. Qua
-- PostgREST, mọi request chạy dưới vai `authenticated` (hoặc `anon` nếu chưa
-- đăng nhập) — hai vai đó phải qua ma trận quyền. Các đường còn lại (psql bằng
-- vai `postgres`, `service_role`, job nội bộ) là kênh quản trị, không chặn ở
-- đây. Nếu để SECURITY DEFINER thì `current_user` luôn là chủ hàm ⇒ cổng mở
-- toang cho mọi người.
CREATE OR REPLACE FUNCTION public.fn_duoc_khoa_ky(p_module_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, auth
AS $$
  SELECT CASE
           WHEN current_user IN ('authenticated', 'anon')
             THEN public.fn_co_quyen(p_module_key, 'sua')
           ELSE true
         END;
$$;

COMMENT ON FUNCTION public.fn_duoc_khoa_ky(text) IS
  'Người đang đăng nhập có được khoá sổ / mở khoá kỳ của <module_key> không.';

GRANT EXECUTE ON FUNCTION public.fn_nhiem_ky_da_khoa(bigint) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_ky_hop_khoa_boi(bigint) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_duoc_khoa_ky(text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Trigger trên chính hai bảng kỳ
--
-- Ba việc trong một hàm, theo thứ tự:
--   a) đã khoá thì không xoá được;
--   b) bật/tắt cờ khoá phải có quyền, và `tg_khoa`/`nguoi_khoa_id` do máy chủ gán;
--   c) đang khoá thì không sửa được cột nghiệp vụ nào khác.
--
-- (c) so sánh cả dòng bằng `to_jsonb` thay vì liệt kê từng cột: thêm cột mới
-- vào bảng sau này vẫn được bảo vệ, không phải nhớ sửa lại hàm. Ba cột bị loại
-- khỏi phép so sánh là `tg_cap_nhat` (trigger hệ thống tự đặt) và hai cột vết
-- khoá (đã xử lý ở bước b).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_khoa_ky_nhiem_ky()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.da_khoa THEN
      RAISE EXCEPTION 'KY_DA_KHOA: Nhiệm kỳ đã khoá sổ, không xoá được. Hãy mở khoá nhiệm kỳ trước.';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.da_khoa AND NOT public.fn_duoc_khoa_ky('nhiem-ky') THEN
      RAISE EXCEPTION 'KHOA_KY_KHONG_DU_QUYEN: Bạn không có quyền khoá sổ nhiệm kỳ.';
    END IF;
    IF NEW.da_khoa THEN
      NEW.tg_khoa := now();
      NEW.nguoi_khoa_id := public.fn_nhan_vien_id_hien_tai();
    ELSE
      NEW.tg_khoa := NULL;
      NEW.nguoi_khoa_id := NULL;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF OLD.da_khoa IS DISTINCT FROM NEW.da_khoa THEN
    IF NOT public.fn_duoc_khoa_ky('nhiem-ky') THEN
      RAISE EXCEPTION 'KHOA_KY_KHONG_DU_QUYEN: Bạn không có quyền khoá sổ hoặc mở khoá nhiệm kỳ.';
    END IF;
    IF NEW.da_khoa THEN
      NEW.tg_khoa := now();
      NEW.nguoi_khoa_id := public.fn_nhan_vien_id_hien_tai();
    ELSE
      NEW.tg_khoa := NULL;
      NEW.nguoi_khoa_id := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.da_khoa THEN
    IF (to_jsonb(NEW) - 'tg_cap_nhat' - 'tg_khoa' - 'nguoi_khoa_id')
       IS DISTINCT FROM
       (to_jsonb(OLD) - 'tg_cap_nhat' - 'tg_khoa' - 'nguoi_khoa_id') THEN
      RAISE EXCEPTION 'KY_DA_KHOA: Nhiệm kỳ đã khoá sổ, không sửa được. Hãy mở khoá nhiệm kỳ trước.';
    END IF;
    NEW.tg_khoa := OLD.tg_khoa;
    NEW.nguoi_khoa_id := OLD.nguoi_khoa_id;
  ELSE
    NEW.tg_khoa := NULL;
    NEW.nguoi_khoa_id := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_khoa_ky_ky_hop()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF public.fn_nhiem_ky_da_khoa(OLD.nhiem_ky_id) THEN
      RAISE EXCEPTION 'KY_DA_KHOA: Nhiệm kỳ đã khoá sổ, không xoá được kỳ họp. Hãy mở khoá nhiệm kỳ trước.';
    END IF;
    IF OLD.da_khoa THEN
      RAISE EXCEPTION 'KY_DA_KHOA: Kỳ họp đã khoá sổ, không xoá được. Hãy mở khoá kỳ họp trước.';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF public.fn_nhiem_ky_da_khoa(NEW.nhiem_ky_id) THEN
      RAISE EXCEPTION 'KY_DA_KHOA: Nhiệm kỳ đã khoá sổ, không thêm được kỳ họp. Hãy mở khoá nhiệm kỳ trước.';
    END IF;
    IF NEW.da_khoa AND NOT public.fn_duoc_khoa_ky('ky-hop') THEN
      RAISE EXCEPTION 'KHOA_KY_KHONG_DU_QUYEN: Bạn không có quyền khoá sổ kỳ họp.';
    END IF;
    IF NEW.da_khoa THEN
      NEW.tg_khoa := now();
      NEW.nguoi_khoa_id := public.fn_nhan_vien_id_hien_tai();
    ELSE
      NEW.tg_khoa := NULL;
      NEW.nguoi_khoa_id := NULL;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE. Kiểm cả nhiệm kỳ cũ lẫn nhiệm kỳ mới: chuyển một kỳ họp SANG hay
  -- RA KHỎI nhiệm kỳ đã khoá đều là ghi vào sổ đã khoá.
  IF public.fn_nhiem_ky_da_khoa(OLD.nhiem_ky_id) OR public.fn_nhiem_ky_da_khoa(NEW.nhiem_ky_id) THEN
    RAISE EXCEPTION 'KY_DA_KHOA: Nhiệm kỳ đã khoá sổ, không sửa được kỳ họp. Hãy mở khoá nhiệm kỳ trước.';
  END IF;

  IF OLD.da_khoa IS DISTINCT FROM NEW.da_khoa THEN
    IF NOT public.fn_duoc_khoa_ky('ky-hop') THEN
      RAISE EXCEPTION 'KHOA_KY_KHONG_DU_QUYEN: Bạn không có quyền khoá sổ hoặc mở khoá kỳ họp.';
    END IF;
    IF NEW.da_khoa THEN
      NEW.tg_khoa := now();
      NEW.nguoi_khoa_id := public.fn_nhan_vien_id_hien_tai();
    ELSE
      NEW.tg_khoa := NULL;
      NEW.nguoi_khoa_id := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.da_khoa THEN
    IF (to_jsonb(NEW) - 'tg_cap_nhat' - 'tg_khoa' - 'nguoi_khoa_id')
       IS DISTINCT FROM
       (to_jsonb(OLD) - 'tg_cap_nhat' - 'tg_khoa' - 'nguoi_khoa_id') THEN
      RAISE EXCEPTION 'KY_DA_KHOA: Kỳ họp đã khoá sổ, không sửa được. Hãy mở khoá kỳ họp trước.';
    END IF;
    NEW.tg_khoa := OLD.tg_khoa;
    NEW.nguoi_khoa_id := OLD.nguoi_khoa_id;
  ELSE
    NEW.tg_khoa := NULL;
    NEW.nguoi_khoa_id := NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Trigger trên hai bảng con
-- ---------------------------------------------------------------------------

-- Uỷ viên uỷ ban — khoá theo nhiệm kỳ.
CREATE OR REPLACE FUNCTION public.fn_khoa_ky_uy_vien()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF public.fn_nhiem_ky_da_khoa(OLD.nhiem_ky_id) THEN
      RAISE EXCEPTION 'KY_DA_KHOA: Nhiệm kỳ đã khoá sổ, không xoá được uỷ viên. Hãy mở khoá nhiệm kỳ trước.';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF public.fn_nhiem_ky_da_khoa(NEW.nhiem_ky_id) THEN
      RAISE EXCEPTION 'KY_DA_KHOA: Nhiệm kỳ đã khoá sổ, không thêm được uỷ viên. Hãy mở khoá nhiệm kỳ trước.';
    END IF;
    RETURN NEW;
  END IF;

  IF public.fn_nhiem_ky_da_khoa(OLD.nhiem_ky_id) OR public.fn_nhiem_ky_da_khoa(NEW.nhiem_ky_id) THEN
    RAISE EXCEPTION 'KY_DA_KHOA: Nhiệm kỳ đã khoá sổ, không sửa được uỷ viên. Hãy mở khoá nhiệm kỳ trước.';
  END IF;
  RETURN NEW;
END;
$$;

-- Điểm danh — khoá theo kỳ họp, và theo nhiệm kỳ của kỳ họp đó.
CREATE OR REPLACE FUNCTION public.fn_khoa_ky_diem_danh()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_khoa_boi text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_khoa_boi := public.fn_ky_hop_khoa_boi(OLD.ky_hop_id);
    IF v_khoa_boi = 'nhiem_ky' THEN
      RAISE EXCEPTION 'KY_DA_KHOA: Nhiệm kỳ đã khoá sổ, không xoá được điểm danh. Hãy mở khoá nhiệm kỳ trước.';
    ELSIF v_khoa_boi = 'ky_hop' THEN
      RAISE EXCEPTION 'KY_DA_KHOA: Kỳ họp đã khoá sổ, không xoá được điểm danh. Hãy mở khoá kỳ họp trước.';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_khoa_boi := public.fn_ky_hop_khoa_boi(NEW.ky_hop_id);
    IF v_khoa_boi = 'nhiem_ky' THEN
      RAISE EXCEPTION 'KY_DA_KHOA: Nhiệm kỳ đã khoá sổ, không điểm danh được. Hãy mở khoá nhiệm kỳ trước.';
    ELSIF v_khoa_boi = 'ky_hop' THEN
      RAISE EXCEPTION 'KY_DA_KHOA: Kỳ họp đã khoá sổ, không điểm danh được. Hãy mở khoá kỳ họp trước.';
    END IF;
    RETURN NEW;
  END IF;

  v_khoa_boi := COALESCE(
    public.fn_ky_hop_khoa_boi(OLD.ky_hop_id),
    public.fn_ky_hop_khoa_boi(NEW.ky_hop_id)
  );
  IF v_khoa_boi = 'nhiem_ky' THEN
    RAISE EXCEPTION 'KY_DA_KHOA: Nhiệm kỳ đã khoá sổ, không sửa được điểm danh. Hãy mở khoá nhiệm kỳ trước.';
  ELSIF v_khoa_boi = 'ky_hop' THEN
    RAISE EXCEPTION 'KY_DA_KHOA: Kỳ họp đã khoá sổ, không sửa được điểm danh. Hãy mở khoá kỳ họp trước.';
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Gắn trigger
--
-- Tên bắt đầu bằng `trg_..._khoa_ky` để chạy TRƯỚC `trg_..._updated`
-- (`set_tg_cap_nhat`) — Postgres gọi trigger cùng thời điểm theo thứ tự tên.
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_mttq_nhiem_ky_khoa_ky ON public.mttq_nhiem_ky;
CREATE TRIGGER trg_mttq_nhiem_ky_khoa_ky
  BEFORE INSERT OR UPDATE OR DELETE ON public.mttq_nhiem_ky
  FOR EACH ROW EXECUTE FUNCTION public.fn_khoa_ky_nhiem_ky();

DROP TRIGGER IF EXISTS trg_mttq_ky_hop_khoa_ky ON public.mttq_ky_hop;
CREATE TRIGGER trg_mttq_ky_hop_khoa_ky
  BEFORE INSERT OR UPDATE OR DELETE ON public.mttq_ky_hop
  FOR EACH ROW EXECUTE FUNCTION public.fn_khoa_ky_ky_hop();

DROP TRIGGER IF EXISTS trg_mttq_uy_vien_uy_ban_khoa_ky ON public.mttq_uy_vien_uy_ban;
CREATE TRIGGER trg_mttq_uy_vien_uy_ban_khoa_ky
  BEFORE INSERT OR UPDATE OR DELETE ON public.mttq_uy_vien_uy_ban
  FOR EACH ROW EXECUTE FUNCTION public.fn_khoa_ky_uy_vien();

DROP TRIGGER IF EXISTS trg_mttq_diem_danh_uy_vien_khoa_ky ON public.mttq_diem_danh_uy_vien;
CREATE TRIGGER trg_mttq_diem_danh_uy_vien_khoa_ky
  BEFORE INSERT OR UPDATE OR DELETE ON public.mttq_diem_danh_uy_vien
  FOR EACH ROW EXECUTE FUNCTION public.fn_khoa_ky_diem_danh();

NOTIFY pgrst, 'reload schema';
