-- ============================================================================
-- thong_bao — bảng nhắc việc gửi tới từng người, KÈM RLS THẬT NGAY TỪ ĐẦU
--
-- Vì sao phải có RLS ngay (khác các bảng nghiệp vụ còn lại đang `USING (true)`):
-- bảng này chứa nội dung nhắm đích từng người ("Bạn có 12 cán bộ sắp đến hạn
-- nâng lương ở xã X"). Để mở như các bảng khác thì bất kỳ tài khoản nào cũng
-- đọc được toàn bộ hộp thông báo của người khác qua REST API, tức là suy ra
-- được cả dữ liệu lương/công việc mà họ không được xem. Nên ở đây chặn ngay
-- tại database, không chờ đợt RLS sau.
--
-- Luật: mỗi người CHỈ đọc và CHỈ đánh dấu đã đọc thông báo của CHÍNH MÌNH.
-- Không ai được INSERT/DELETE qua REST — thông báo chỉ do hàm sinh
-- `fn_thong_bao_sinh_nhac_viec()` (SECURITY DEFINER) tạo ra.
--
-- Idempotent: chạy lại không lỗi, không nhân đôi dữ liệu.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.thong_bao (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  -- Người nhận. Xoá nhân viên thì hộp thông báo của họ đi theo.
  nhan_vien_id     bigint      NOT NULL
                   REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE CASCADE,

  -- Loại nhắc — quyết định biểu tượng và màu ở giao diện.
  loai             text        NOT NULL,

  -- Sắc thái hiển thị: 'canh_bao' (đỏ, cần xử lý gấp) · 'sap_toi' (hổ phách) · 'tin' (xanh).
  muc_do           text        NOT NULL DEFAULT 'tin',

  tieu_de          text        NOT NULL,
  noi_dung         text        NOT NULL DEFAULT '',

  -- Đường dẫn nội bộ mở tới đúng màn hình (ví dụ '/quan-ly-giao-viec/cong-viec?tab=mine_do').
  duong_dan        text,

  -- Khoá chống trùng: một lần nhắc cho cùng một việc trong cùng một mốc thời gian
  -- chỉ tạo đúng một dòng, dù hàm sinh chạy lại bao nhiêu lần trong ngày.
  khoa_chong_trung text        NOT NULL,

  da_doc           boolean     NOT NULL DEFAULT false,
  tg_doc           timestamptz,
  tg_tao           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT thong_bao_loai_check CHECK (loai IN (
    'cong_viec_qua_han',
    'cong_viec_sap_den_han',
    'tang_luong_sap_den_han'
  )),
  CONSTRAINT thong_bao_muc_do_check CHECK (muc_do IN ('canh_bao', 'sap_toi', 'tin')),
  CONSTRAINT thong_bao_tieu_de_khong_rong CHECK (btrim(tieu_de) <> '')
);

COMMENT ON TABLE public.thong_bao IS
  'Hộp thông báo nhắc việc của từng người. RLS: chỉ chủ sở hữu đọc/đánh dấu đã đọc.';
COMMENT ON COLUMN public.thong_bao.khoa_chong_trung IS
  'Khoá duy nhất theo người nhận — chặn nhắc trùng khi hàm sinh chạy lại trong ngày.';

-- Chặn trùng ở tầng database, không dựa vào "nhớ đã chạy chưa" ở ứng dụng.
CREATE UNIQUE INDEX IF NOT EXISTS ux_thong_bao_chong_trung
  ON public.thong_bao (nhan_vien_id, khoa_chong_trung);

-- Truy vấn duy nhất mà giao diện dùng: hộp của tôi, chưa đọc trước, mới nhất trước.
CREATE INDEX IF NOT EXISTS idx_thong_bao_hop_cua_toi
  ON public.thong_bao (nhan_vien_id, da_doc, tg_tao DESC);

-- ---------------------------------------------------------------------------
-- Chỉ cho phép đổi đúng hai cột `da_doc` / `tg_doc`
--
-- Policy UPDATE ở dưới đã giới hạn "chỉ dòng của mình", nhưng nếu không chặn
-- thêm thì chủ sở hữu vẫn tự sửa được `tieu_de`/`duong_dan` của chính mình qua
-- REST API — một đường dựng thông báo giả trỏ đi đâu tuỳ ý. Trigger này ghim
-- mọi cột khác về giá trị cũ thay vì báo lỗi, nên client không cần biết luật.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_thong_bao_chi_cho_danh_dau_doc()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.id               := OLD.id;
  NEW.nhan_vien_id     := OLD.nhan_vien_id;
  NEW.loai             := OLD.loai;
  NEW.muc_do           := OLD.muc_do;
  NEW.tieu_de          := OLD.tieu_de;
  NEW.noi_dung         := OLD.noi_dung;
  NEW.duong_dan        := OLD.duong_dan;
  NEW.khoa_chong_trung := OLD.khoa_chong_trung;
  NEW.tg_tao           := OLD.tg_tao;

  -- Đánh dấu đã đọc thì ghi luôn mốc thời gian; bỏ đánh dấu thì xoá mốc.
  IF NEW.da_doc AND NOT OLD.da_doc THEN
    NEW.tg_doc := now();
  ELSIF NOT NEW.da_doc THEN
    NEW.tg_doc := NULL;
  ELSE
    NEW.tg_doc := OLD.tg_doc;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_thong_bao_chi_cho_danh_dau_doc() IS
  'Chặn sửa nội dung thông báo: người nhận chỉ được bật/tắt cờ đã đọc.';

-- Hàm trigger nội bộ: không vai nào cần gọi tay (Supabase cấp sẵn EXECUTE cho
-- anon/authenticated trên mọi hàm mới trong `public`).
REVOKE ALL ON FUNCTION public.fn_thong_bao_chi_cho_danh_dau_doc() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS tg_thong_bao_chi_cho_danh_dau_doc ON public.thong_bao;
CREATE TRIGGER tg_thong_bao_chi_cho_danh_dau_doc
  BEFORE UPDATE ON public.thong_bao
  FOR EACH ROW EXECUTE FUNCTION public.fn_thong_bao_chi_cho_danh_dau_doc();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.thong_bao ENABLE ROW LEVEL SECURITY;
-- Kể cả chủ bảng cũng phải qua policy — tránh lọt đường vòng.
ALTER TABLE public.thong_bao FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS thong_bao_select ON public.thong_bao;
DROP POLICY IF EXISTS thong_bao_danh_dau_doc ON public.thong_bao;

-- ĐỌC: đúng hộp của mình. `fn_nhan_vien_id_hien_tai()` trả NULL khi tài khoản
-- chưa gắn hồ sơ nhân viên ⇒ `nhan_vien_id = NULL` là NULL ⇒ không thấy dòng nào.
CREATE POLICY thong_bao_select ON public.thong_bao
  FOR SELECT TO authenticated
  USING (nhan_vien_id = public.fn_nhan_vien_id_hien_tai());

-- GHI: chỉ UPDATE (đánh dấu đã đọc) trên dòng của mình, và không được chuyển
-- dòng sang người khác (`WITH CHECK` cùng điều kiện).
CREATE POLICY thong_bao_danh_dau_doc ON public.thong_bao
  FOR UPDATE TO authenticated
  USING (nhan_vien_id = public.fn_nhan_vien_id_hien_tai())
  WITH CHECK (nhan_vien_id = public.fn_nhan_vien_id_hien_tai());

-- Cố ý KHÔNG có policy INSERT/DELETE cho `authenticated`: thông báo chỉ sinh ra
-- từ hàm SECURITY DEFINER, và người dùng "xoá" bằng cách đánh dấu đã đọc.

-- Quyền bảng — phải REVOKE trước rồi mới GRANT. Supabase có `ALTER DEFAULT
-- PRIVILEGES` cấp sẵn TOÀN BỘ quyền (arwdDxtm) cho `anon` và `authenticated`
-- trên mọi bảng mới trong schema `public`; chỉ GRANT thêm thì hai quyền
-- INSERT/DELETE thừa vẫn còn (hiện đang bị policy chặn, nhưng đó là tầng thứ
-- hai — đừng để nó thành tầng duy nhất).
REVOKE ALL ON public.thong_bao FROM anon, authenticated;
GRANT SELECT, UPDATE ON public.thong_bao TO authenticated;
GRANT ALL ON public.thong_bao TO service_role;

NOTIFY pgrst, 'reload schema';
