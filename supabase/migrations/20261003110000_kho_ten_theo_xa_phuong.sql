-- Tên kho gắn xã/phường = "MTTQ <tên xã>" — máy chủ gán, không nhập tay.
--
-- Trước đây `ten_kho` là ô gõ tay nên lệch khỏi tên xã ("MTTQ Quỳnh Mai" của
-- phường Quỳnh Mai, "Thiên Nhân" ≠ "Thiên Nhẫn", thừa dấu cách…). Tồn kho,
-- Nhập–xuất kho và các RPC đều đọc thẳng cột này nên phải sửa tận gốc ở DB.
--
-- Kho không gắn xã (vd. Kho MTTQ tỉnh) giữ tên nhập tay.
-- Client có bản sao quy tắc ở features/mat-tran-to-quoc/danh-sach-kho/utils/ten-kho.ts.

CREATE OR REPLACE FUNCTION public.fn_ten_kho_theo_xa(p_ten_xa text)
RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  -- "Xã Yên Hòa" → "MTTQ xã Yên Hòa"; gộp khoảng trắng thừa.
  SELECT 'MTTQ ' || lower(left(t, 1)) || substr(t, 2)
  FROM (SELECT regexp_replace(btrim(p_ten_xa), '\s+', ' ', 'g') AS t) s
  WHERE t <> '';
$$;

CREATE OR REPLACE FUNCTION public.fn_kho_gan_ten_theo_xa()
RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_ten text;
BEGIN
  IF NEW.don_vi_id IS NOT NULL THEN
    SELECT public.fn_ten_kho_theo_xa(x.ten) INTO v_ten
    FROM public.var_ssn_xa_phuong x WHERE x.id = NEW.don_vi_id;
    IF v_ten IS NOT NULL THEN
      NEW.ten_kho := v_ten;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kho_gan_ten_theo_xa ON public.kho_danh_sach_kho;
CREATE TRIGGER trg_kho_gan_ten_theo_xa
  BEFORE INSERT OR UPDATE OF ten_kho, don_vi_id ON public.kho_danh_sach_kho
  FOR EACH ROW EXECUTE FUNCTION public.fn_kho_gan_ten_theo_xa();

-- Đổi tên xã → tên kho đi theo.
CREATE OR REPLACE FUNCTION public.fn_xa_phuong_dong_bo_ten_kho()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.kho_danh_sach_kho
  SET ten_kho = public.fn_ten_kho_theo_xa(NEW.ten)
  WHERE don_vi_id = NEW.id
    AND public.fn_ten_kho_theo_xa(NEW.ten) IS NOT NULL
    AND ten_kho IS DISTINCT FROM public.fn_ten_kho_theo_xa(NEW.ten);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_xa_phuong_dong_bo_ten_kho ON public.var_ssn_xa_phuong;
CREATE TRIGGER trg_xa_phuong_dong_bo_ten_kho
  AFTER UPDATE OF ten ON public.var_ssn_xa_phuong
  FOR EACH ROW WHEN (OLD.ten IS DISTINCT FROM NEW.ten)
  EXECUTE FUNCTION public.fn_xa_phuong_dong_bo_ten_kho();

-- Chuẩn hoá dữ liệu sẵn có.
UPDATE public.kho_danh_sach_kho k
SET ten_kho = public.fn_ten_kho_theo_xa(x.ten)
FROM public.var_ssn_xa_phuong x
WHERE x.id = k.don_vi_id
  AND public.fn_ten_kho_theo_xa(x.ten) IS NOT NULL
  AND k.ten_kho IS DISTINCT FROM public.fn_ten_kho_theo_xa(x.ten);
