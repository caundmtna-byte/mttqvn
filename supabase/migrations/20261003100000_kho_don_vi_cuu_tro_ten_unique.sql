-- Đơn vị hỗ trợ: TÊN NHÀ TÀI TRỢ là duy nhất.
-- So khớp sau khi bỏ khoảng trắng đầu/cuối, gộp khoảng trắng thừa, về chữ thường —
-- trùng với `chuanHoaKhoaVanBan` ở client (luồng nhập Excel + kiểm trùng trên form).
-- Hai cá nhân cùng họ tên thì ghi kèm địa danh, ví dụ "Nguyễn Thị Mai (Đông Thành)".
--
-- Dữ liệu cũ đang trùng ⇒ DỪNG và liệt kê, KHÔNG tự gộp/xoá: bản ghi đã gắn phiếu
-- nhập kho / chương trình hỗ trợ / khen thưởng nhà tài trợ, người dùng phải tự quyết.

BEGIN;

DO $$
DECLARE
  v_trung text;
BEGIN
  SELECT string_agg(format('«%s» (id: %s)', ten_mau, ids), E'\n')
  INTO v_trung
  FROM (
    SELECT min(ten) AS ten_mau, string_agg(id::text, ', ' ORDER BY id) AS ids
    FROM public.kho_don_vi_cuu_tro
    GROUP BY lower(regexp_replace(btrim(ten), '\s+', ' ', 'g'))
    HAVING count(*) > 1
  ) t;

  IF v_trung IS NOT NULL THEN
    RAISE EXCEPTION E'Còn tên nhà tài trợ trùng nhau — đổi tên hoặc gộp rồi chạy lại:\n%', v_trung;
  END IF;
END $$;

-- Index thường cũ (lower(trim(ten))) thay bằng unique index cùng biểu thức chuẩn hoá.
DROP INDEX IF EXISTS public.idx_kho_don_vi_cuu_tro_ten_lower;

CREATE UNIQUE INDEX uq_kho_don_vi_cuu_tro_ten_lower
  ON public.kho_don_vi_cuu_tro (lower(regexp_replace(btrim(ten), '\s+', ' ', 'g')));

COMMIT;
