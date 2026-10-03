import { describe, expect, it } from 'vitest';
import {
  bbbgFormSchema,
  bienBanBanGiaoToFormInput,
  chuanHoaBienBanBanGiao,
  docBienBanBanGiao,
  dongHienVatTrong,
} from './bien-ban-ban-giao';

function form(patch: Record<string, unknown>) {
  return bbbgFormSchema.parse({ ...bienBanBanGiaoToFormInput(null), ...patch });
}

describe('chuanHoaBienBanBanGiao', () => {
  it('form trống ⇒ null (không ghi object rỗng vào jsonb)', () => {
    expect(chuanHoaBienBanBanGiao(form({ hien_vat: [dongHienVatTrong()] }), 'Cứu trợ')).toBeNull();
  });

  it('bỏ dòng hiện vật trống, đọc số kiểu VN ("1.500.000", "2,5")', () => {
    const v = form({
      dai_dien_ho_ten: '  Lê Văn B ',
      hien_vat: [
        dongHienVatTrong(),
        { ...dongHienVatTrong(), ten: 'Gạo', so_luong: '2,5', don_gia: '1.500.000' },
      ],
    });
    expect(chuanHoaBienBanBanGiao(v, 'Cứu trợ')).toEqual({
      dai_dien_ho_ten: 'Lê Văn B',
      hien_vat: [{ ten: 'Gạo', so_luong: 2.5, don_gia: 1_500_000 }],
    });
  });

  it('ô ẩn theo lĩnh vực bị bỏ khi đổi lĩnh vực', () => {
    const v = form({ so_thang_duy_tri: '24', han_hoan_thanh_nha: '2026-12-31', muc_dich: 'Sửa nhà' });
    expect(chuanHoaBienBanBanGiao(v, 'Mô hình sinh kế')).toEqual({ so_thang_duy_tri: 24, muc_dich: 'Sửa nhà' });
    expect(chuanHoaBienBanBanGiao(v, 'Nhà bị sập')).toEqual({
      han_hoan_thanh_nha: '2026-12-31',
      muc_dich: 'Sửa nhà',
    });
  });
});

describe('docBienBanBanGiao', () => {
  it('phòng thủ: trường sai kiểu bỏ riêng trường đó, dòng hiện vật rác bị lọc', () => {
    expect(
      docBienBanBanGiao({
        dia_diem: 'Nhà văn hoá xóm 3',
        ngay_ban_giao: 'hôm qua',
        hien_vat: [{ ten: 'Gạo', so_luong: 'abc' }, 'rác', null, {}],
      }),
    ).toEqual({ dia_diem: 'Nhà văn hoá xóm 3', hien_vat: [{ ten: 'Gạo' }] });
    expect(docBienBanBanGiao(null)).toBeNull();
    expect(docBienBanBanGiao([1, 2])).toBeNull();
  });
});
