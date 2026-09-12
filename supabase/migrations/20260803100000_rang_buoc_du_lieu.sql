-- ============================================================================
-- Ràng buộc dữ liệu — đợt 2
--
-- Bốn ràng buộc bị hoãn ở `20260728110000_rang_buoc_con_thieu.sql` vì dữ liệu
-- thật vi phạm. File này CHỈ xử lý hai trường hợp đã có kết luận rõ ràng và
-- không cần ai quyết định nghiệp vụ:
--
--   ✔ (1) `mttq_khen_thuong.so_qd` — tách cột, làm sạch, thêm UNIQUE.
--   ✔ (4) `pbxh_thuc_hien_phan_bien_xa_hoi` — thêm CHECK đúng bằng luật zod
--          đang chạy (0 dòng vi phạm; bản CHẶT hơn vẫn chờ quyết định).
--
-- Hai trường hợp còn lại KHÔNG làm ở đây vì phải người quản trị quyết định —
-- xem `docs/rang-buoc-du-lieu-cho-quyet-dinh.md` (có sẵn SQL chờ duyệt):
--   ✖ (2) FK `var_nhan_vien.id_bo_phan` — 17 dòng mồ côi, gán về đâu là quyết
--         định tổ chức.
--   ✖ (3) UNIQUE `mttq_ky_hop(nhiem_ky_id, ky_thu)` — ràng buộc đặt SAI phạm
--         vi (thiếu `don_vi_id`) và `ky_thu` là text tự do.
--
-- Toàn bộ file idempotent: chạy lại lần hai không đổi thêm dòng nào.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. mttq_khen_thuong — tách "số quyết định" khỏi "nội dung khen"
--
-- Gốc rễ không nằm ở dữ liệu mà ở NHÃN giao diện: ô nhập `so_qd` bị dán nhãn
-- "Nội dung khen", nên cán bộ gõ nguyên câu lý do khen thưởng vào ô đáng lẽ là
-- số quyết định. Hệ quả: 10/12 dòng chứa văn xuôi, 4 dòng trùng nhau từng chữ,
-- và ô "Số:" trên bản in quyết định phải để trống điền tay
-- (xem `utils/so-quyet-dinh.ts` — lớp vá tạm ở client).
--
-- Thứ tự xử lý: thêm cột đúng nghĩa → chuyển văn xuôi sang cột đó → xoá trắng
-- `so_qd` của những dòng đó → mới thêm UNIQUE. Thêm UNIQUE trước khi làm sạch
-- chỉ khoá cứng cái sai lại.
--
-- Quy tắc phân loại PHẢI khớp `laSoQuyetDinhHopLe()` ở
-- `features/mat-tran-to-quoc/danh-sach-khen-thuong/utils/so-quyet-dinh.ts`:
-- có chữ số · dài ≤ 24 ký tự · tối đa 3 từ. Hai nơi lệch nhau là dữ liệu và
-- bản in nói hai chuyện khác nhau.
-- ----------------------------------------------------------------------------

ALTER TABLE public.mttq_khen_thuong
  ADD COLUMN IF NOT EXISTS noi_dung_khen text;

COMMENT ON COLUMN public.mttq_khen_thuong.noi_dung_khen IS
  'Nội dung / lý do khen thưởng chung của cả quyết định. Tách khỏi so_qd tháng 8/2026 vì nhãn giao diện đặt sai.';

COMMENT ON COLUMN public.mttq_khen_thuong.so_qd IS
  'Số / ký hiệu quyết định (vd 12/QĐ-MTTQ-BTT). NULL = chưa có số. Duy nhất khi có giá trị.';

-- `so_qd` phải cho phép NULL: quyết định đang soạn thì chưa có số, và 10 dòng
-- cũ sau khi chuyển văn xuôi đi sẽ không còn số nào để điền.
ALTER TABLE public.mttq_khen_thuong
  ALTER COLUMN so_qd DROP NOT NULL;

DO $$
DECLARE
  v_chuyen bigint;
  v_trung  bigint;
BEGIN
  -- Chuẩn hoá khoảng trắng thừa trước, để việc so trùng không bị " 12" ≠ "12".
  UPDATE public.mttq_khen_thuong
  SET so_qd = NULLIF(btrim(so_qd), '')
  WHERE so_qd IS NOT NULL
    AND so_qd IS DISTINCT FROM NULLIF(btrim(so_qd), '');

  -- Chuyển văn xuôi sang cột đúng nghĩa. Chỉ đụng dòng `noi_dung_khen` còn
  -- trống ⇒ chạy lại migration không ghi đè nội dung người dùng đã sửa tay.
  WITH da_chuyen AS (
    UPDATE public.mttq_khen_thuong
    SET noi_dung_khen = btrim(so_qd),
        so_qd         = NULL
    WHERE so_qd IS NOT NULL
      AND noi_dung_khen IS NULL
      AND NOT (
        length(btrim(so_qd)) <= 24
        AND btrim(so_qd) ~ '\d'
        AND array_length(regexp_split_to_array(btrim(so_qd), '\s+'), 1) <= 3
      )
    RETURNING 1
  )
  SELECT count(*) INTO v_chuyen FROM da_chuyen;

  RAISE NOTICE 'mttq_khen_thuong: chuyển % dòng văn xuôi từ so_qd sang noi_dung_khen.', v_chuyen;

  -- Sau khi làm sạch mà vẫn còn trùng thì DỪNG — không ép UNIQUE lên dữ liệu thật.
  SELECT count(*) INTO v_trung FROM (
    SELECT 1 FROM public.mttq_khen_thuong
    WHERE so_qd IS NOT NULL
    GROUP BY so_qd HAVING count(*) > 1
  ) t;

  IF v_trung > 0 THEN
    RAISE EXCEPTION 'DUNG: còn % giá trị so_qd trùng nhau sau khi làm sạch. Gộp/sửa thủ công rồi chạy lại.', v_trung;
  END IF;
END $$;

-- Chuỗi rỗng không phải "chưa có số" — ép về NULL để một trạng thái chỉ có một
-- cách biểu diễn, nếu không UNIQUE sẽ coi '' là một số quyết định thật.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.mttq_khen_thuong'::regclass
      AND conname  = 'chk_mttq_khen_thuong_so_qd_khong_rong'
  ) THEN
    ALTER TABLE public.mttq_khen_thuong
      ADD CONSTRAINT chk_mttq_khen_thuong_so_qd_khong_rong
      CHECK (so_qd IS NULL OR (btrim(so_qd) = so_qd AND so_qd <> ''));
  END IF;
END $$;

-- UNIQUE một phần: nhiều quyết định chưa có số (NULL) vẫn tồn tại song song,
-- nhưng đã có số thì không được trùng — trùng số quyết định là sai thể thức
-- văn bản và làm mọi tra cứu theo số trả về hai bản ghi.
CREATE UNIQUE INDEX IF NOT EXISTS uq_mttq_khen_thuong_so_qd
  ON public.mttq_khen_thuong (so_qd)
  WHERE so_qd IS NOT NULL;

-- ----------------------------------------------------------------------------
-- RPC ghi khen thưởng — thêm tham số `p_noi_dung_khen`
--
-- CREATE OR REPLACE không thêm được tham số (sẽ thành hàm nạp chồng thứ hai và
-- PostgREST không biết chọn cái nào), nên phải DROP cả chữ ký cũ lẫn chữ ký mới
-- rồi tạo lại. Phần thân giữ nguyên logic của `20260727100000`.
-- ----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.rpc_khen_thuong_tao_quyet_dinh(TEXT, DATE, TEXT, TEXT, TEXT, BIGINT, JSONB);
DROP FUNCTION IF EXISTS public.rpc_khen_thuong_tao_quyet_dinh(TEXT, DATE, TEXT, TEXT, TEXT, BIGINT, JSONB, TEXT);

CREATE FUNCTION public.rpc_khen_thuong_tao_quyet_dinh(
  p_so_qd            TEXT,
  p_ngay_khen_thuong DATE,
  p_don_vi_de_xuat   TEXT,
  p_ghi_chu          TEXT,
  p_trang_thai       TEXT,
  p_id_nguoi_tao     BIGINT,
  p_chi_tiet         JSONB,
  p_noi_dung_khen    TEXT
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_id BIGINT;
BEGIN
  IF p_chi_tiet IS NULL OR jsonb_array_length(p_chi_tiet) = 0 THEN
    RAISE EXCEPTION 'KHEN_THUONG_CHI_TIET_RONG: Quyết định khen thưởng phải có ít nhất 1 cán bộ được khen.';
  END IF;

  INSERT INTO public.mttq_khen_thuong (
    so_qd, noi_dung_khen, ngay_khen_thuong, don_vi_de_xuat, ghi_chu, trang_thai, id_nguoi_tao
  ) VALUES (
    NULLIF(btrim(p_so_qd), ''), NULLIF(btrim(p_noi_dung_khen), ''),
    p_ngay_khen_thuong, p_don_vi_de_xuat, p_ghi_chu, p_trang_thai, p_id_nguoi_tao
  )
  RETURNING id INTO v_id;

  INSERT INTO public.mttq_khen_thuong_ct
    (id_khen_thuong, can_bo_id, cap_khen_thuong, hinh_thuc_khen, danh_hieu, noi_dung_khen, ho_so_khen)
  SELECT
    v_id,
    (line->>'can_bo_id')::BIGINT,
    line->>'cap_khen_thuong',
    line->>'hinh_thuc_khen',
    line->>'danh_hieu',
    NULLIF(line->>'noi_dung_khen', ''),
    NULLIF(line->>'ho_so_khen', '')
  FROM jsonb_array_elements(p_chi_tiet) WITH ORDINALITY AS t(line, thu_tu)
  ORDER BY t.thu_tu;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_khen_thuong_tao_quyet_dinh(
  TEXT, DATE, TEXT, TEXT, TEXT, BIGINT, JSONB, TEXT
) TO authenticated;

DROP FUNCTION IF EXISTS public.rpc_khen_thuong_cap_nhat_quyet_dinh(BIGINT, TEXT, DATE, TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.rpc_khen_thuong_cap_nhat_quyet_dinh(BIGINT, TEXT, DATE, TEXT, TEXT, TEXT, JSONB, TEXT);

CREATE FUNCTION public.rpc_khen_thuong_cap_nhat_quyet_dinh(
  p_id               BIGINT,
  p_so_qd            TEXT,
  p_ngay_khen_thuong DATE,
  p_don_vi_de_xuat   TEXT,
  p_ghi_chu          TEXT,
  p_trang_thai       TEXT,
  p_chi_tiet         JSONB,
  p_noi_dung_khen    TEXT
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_dong_la BIGINT;
BEGIN
  IF p_chi_tiet IS NULL OR jsonb_array_length(p_chi_tiet) = 0 THEN
    RAISE EXCEPTION 'KHEN_THUONG_CHI_TIET_RONG: Quyết định khen thưởng phải có ít nhất 1 cán bộ được khen.';
  END IF;

  UPDATE public.mttq_khen_thuong SET
    so_qd            = NULLIF(btrim(p_so_qd), ''),
    noi_dung_khen    = NULLIF(btrim(p_noi_dung_khen), ''),
    ngay_khen_thuong = p_ngay_khen_thuong,
    don_vi_de_xuat   = p_don_vi_de_xuat,
    ghi_chu          = p_ghi_chu,
    trang_thai       = p_trang_thai
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'KHEN_THUONG_KHONG_TON_TAI: Không tìm thấy quyết định khen thưởng %.', p_id;
  END IF;

  -- Dòng cũ client gửi lên phải đúng là dòng của quyết định này.
  SELECT NULLIF(line->>'id', '')::BIGINT INTO v_dong_la
  FROM jsonb_array_elements(p_chi_tiet) AS line
  WHERE NULLIF(line->>'id', '') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.mttq_khen_thuong_ct c
      WHERE c.id = NULLIF(line->>'id', '')::BIGINT AND c.id_khen_thuong = p_id
    )
  LIMIT 1;

  IF v_dong_la IS NOT NULL THEN
    RAISE EXCEPTION 'KHEN_THUONG_DONG_LA: Dòng chi tiết % không thuộc quyết định %.', v_dong_la, p_id;
  END IF;

  DELETE FROM public.mttq_khen_thuong_ct c
  WHERE c.id_khen_thuong = p_id
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_chi_tiet) AS line
      WHERE NULLIF(line->>'id', '')::BIGINT = c.id
    );

  UPDATE public.mttq_khen_thuong_ct c SET
    can_bo_id       = (l.line->>'can_bo_id')::BIGINT,
    cap_khen_thuong = l.line->>'cap_khen_thuong',
    hinh_thuc_khen  = l.line->>'hinh_thuc_khen',
    danh_hieu       = l.line->>'danh_hieu',
    noi_dung_khen   = NULLIF(l.line->>'noi_dung_khen', ''),
    ho_so_khen      = NULLIF(l.line->>'ho_so_khen', '')
  FROM (
    SELECT line FROM jsonb_array_elements(p_chi_tiet) AS line
    WHERE NULLIF(line->>'id', '') IS NOT NULL
  ) AS l
  WHERE c.id_khen_thuong = p_id
    AND c.id = NULLIF(l.line->>'id', '')::BIGINT;

  INSERT INTO public.mttq_khen_thuong_ct
    (id_khen_thuong, can_bo_id, cap_khen_thuong, hinh_thuc_khen, danh_hieu, noi_dung_khen, ho_so_khen)
  SELECT
    p_id,
    (t.line->>'can_bo_id')::BIGINT,
    t.line->>'cap_khen_thuong',
    t.line->>'hinh_thuc_khen',
    t.line->>'danh_hieu',
    NULLIF(t.line->>'noi_dung_khen', ''),
    NULLIF(t.line->>'ho_so_khen', '')
  FROM jsonb_array_elements(p_chi_tiet) WITH ORDINALITY AS t(line, thu_tu)
  WHERE NULLIF(t.line->>'id', '') IS NULL
  ORDER BY t.thu_tu;

  RETURN p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_khen_thuong_cap_nhat_quyet_dinh(
  BIGINT, TEXT, DATE, TEXT, TEXT, TEXT, JSONB, TEXT
) TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. pbxh_thuc_hien_phan_bien_xa_hoi — số lần hoàn thành ≤ số lần khảo sát
--
-- Đo lại thì "1/5 dòng vi phạm" chỉ đúng với BẢN CHẶT của ràng buộc. Luật
-- nghiệp vụ đang chạy thật ở
-- `features/phan-bien-xa-hoi/thuc-hien-phan-bien-xa-hoi/core/schema.ts` miễn trừ
-- trường hợp `so_lan_khao_sat = 0` (0 ở đây nghĩa là "chưa nhập số lần khảo
-- sát", không phải "đã khảo sát 0 lần"):
--
--     if (data.so_lan_khao_sat > 0 && data.so_lan_hoan_thanh > data.so_lan_khao_sat)
--
-- Chép đúng luật đó xuống DB thì KHÔNG còn dòng nào vi phạm (0/5) và thêm được
-- ngay. Dòng duy nhất bị bản chặt bắt lỗi (khảo sát 0 · hoàn thành 1) chính là
-- dòng zod cố tình cho qua.
--
-- DB chặt hơn zod là một cái bẫy: form cho bấm Lưu rồi Postgres mới ném lỗi thô
-- mà giao diện không có câu tiếng Việt tương ứng. Nên bản chặt chỉ được thêm
-- SAU khi chốt lại nghĩa của số 0 và sửa cả zod — nằm trong phần chờ quyết
-- định, xem `docs/rang-buoc-du-lieu-cho-quyet-dinh.md`.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_vi_pham bigint;
BEGIN
  SELECT count(*) INTO v_vi_pham
  FROM public.pbxh_thuc_hien_phan_bien_xa_hoi
  WHERE so_lan_khao_sat IS NOT NULL
    AND so_lan_hoan_thanh IS NOT NULL
    AND so_lan_khao_sat <> 0
    AND so_lan_hoan_thanh > so_lan_khao_sat;

  IF v_vi_pham > 0 THEN
    RAISE EXCEPTION 'DUNG: % dòng pbxh có so_lan_hoan_thanh > so_lan_khao_sat. Sửa dữ liệu trước khi thêm CHECK.', v_vi_pham;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.pbxh_thuc_hien_phan_bien_xa_hoi'::regclass
      AND conname  = 'chk_pbxh_so_lan_hoan_thanh'
  ) THEN
    ALTER TABLE public.pbxh_thuc_hien_phan_bien_xa_hoi
      ADD CONSTRAINT chk_pbxh_so_lan_hoan_thanh
      CHECK (
        so_lan_khao_sat IS NULL
        OR so_lan_hoan_thanh IS NULL
        OR so_lan_khao_sat = 0
        OR so_lan_hoan_thanh <= so_lan_khao_sat
      );
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
