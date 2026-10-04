import { describe, expect, it } from 'vitest';
import { tiepNhanSchema, tiepNhanToFormInput, tiepNhanToRpcData } from './schema';

const base = () => ({ ...tiepNhanToFormInput(null, '2026-10-04'), nha_tai_tro_id: '12', chuong_trinh_id: '9' });

describe('tiepNhanSchema', () => {
  it('khoản chỉ có tiền: hợp lệ khi có hình thức', () => {
    const r = tiepNhanSchema.safeParse({ ...base(), so_tien: '1.000.000', hinh_thuc: 'Tiền mặt' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.so_tien).toBe(1_000_000);
  });

  it('có tiền mà bỏ trống hình thức ⇒ lỗi ở ô hình thức', () => {
    const r = tiepNhanSchema.safeParse({ ...base(), so_tien: '500000', hinh_thuc: '' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map((i) => i.path[0])).toContain('hinh_thuc');
  });

  it('khoản rỗng (không tiền, không hiện vật, không phiếu kho) ⇒ bị chặn', () => {
    const r = tiepNhanSchema.safeParse(base());
    expect(r.success).toBe(false);
  });

  it('chỉ gắn phiếu nhập kho là đủ giá trị', () => {
    const r = tiepNhanSchema.safeParse({ ...base(), phieu_ids: ['86'], gia_tri_phieu_kho: 36_000 });
    expect(r.success).toBe(true);
  });

  it('hiện vật khác có giá trị thì phải ghi nội dung', () => {
    const r = tiepNhanSchema.safeParse({ ...base(), hien_vat_khac_gia_tri: '300000' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map((i) => i.path[0])).toContain('hien_vat_khac_mo_ta');
  });
});

describe('tiepNhanToRpcData', () => {
  it('không có tiền thì không gửi hình thức (khớp CHECK có tiền ⇔ có hình thức)', () => {
    const r = tiepNhanSchema.parse({ ...base(), hinh_thuc: 'Chuyển khoản', giay_to_co_gia_mo_ta: 'Sổ tiết kiệm', giay_to_co_gia_gia_tri: '2000000' });
    const data = tiepNhanToRpcData(r);
    expect(data.so_tien).toBe(0);
    expect(data.hinh_thuc).toBeNull();
  });

  it('bỏ dòng phụ lục trống', () => {
    const r = tiepNhanSchema.parse({
      ...base(),
      so_tien: '100000',
      phu_luc: [
        { ho_ten: 'Nguyễn Văn A', dia_chi: 'Xóm 3', quan_he: 'Bản thân', noi_dung_gia_tri: '100.000 đ' },
        { ho_ten: '', dia_chi: '', quan_he: '', noi_dung_gia_tri: '' },
      ],
    });
    expect((tiepNhanToRpcData(r).phu_luc as unknown[]).length).toBe(1);
  });
});
