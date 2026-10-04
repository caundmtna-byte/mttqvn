import { describe, expect, it } from 'vitest';
import { runsText, type BienBanBlock } from '@/lib/bien-ban/bien-ban-model';
import type { TiepNhanFull } from '../../core/types';
import { buildBienBanXacNhanTaiTro, moTaHienVat, tenBenNhanTaiTro } from './build-bien-ban-xac-nhan-tai-tro';

function khoan(over: Partial<TiepNhanFull> = {}): TiepNhanFull {
  return {
    id: '1',
    so_phieu: 'TN-2026-0001',
    ngay_tiep_nhan: '2026-10-05',
    nha_tai_tro_id: '12',
    ten_nha_tai_tro: 'Công ty ABC',
    loai_nha_tai_tro: 'doanh_nghiep',
    chuong_trinh_id: '9',
    ten_chuong_trinh: 'Bão số 1 năm 2026',
    don_vi_chu_tri_loai: 'tinh',
    don_vi_chu_tri_id: null,
    ten_don_vi_tiep_nhan: 'MTTQ tỉnh',
    hinh_thuc: 'Chuyển khoản',
    so_tien: 10_000_000,
    giay_to_co_gia_gia_tri: null,
    hien_vat_khac_gia_tri: null,
    gia_tri_phieu_kho: 0,
    so_phieu_kho: 0,
    tong_gia_tri: 10_000_000,
    trang_thai: 'Đăng ký',
    ngay_cap_nhat_trang_thai: '',
    ghi_chu: null,
    ho_va_ten_nguoi_tao: null,
    ten_tai_khoan_nguoi_tao: null,
    ho_va_ten_nguoi_cap_nhat: null,
    ten_tai_khoan_nguoi_cap_nhat: null,
    tg_tao: '',
    tg_cap_nhat: '',
    giay_to_co_gia_mo_ta: null,
    hien_vat_khac_mo_ta: null,
    muc_dich: ['thien_tai_dich_benh'],
    dia_diem_lap: null,
    phu_luc: [],
    phieu_kho: [],
    ...over,
  };
}

const doanText = (blocks: BienBanBlock[]) =>
  blocks.filter((b): b is Extract<BienBanBlock, { kind: 'doan' }> => b.kind === 'doan').map((b) => runsText(b.runs));

describe('buildBienBanXacNhanTaiTro', () => {
  it('tick đúng mục đích đã chọn, đủ 5 ô', () => {
    const m = buildBienBanXacNhanTaiTro(khoan(), null);
    const lc = m.blocks.find((b) => b.kind === 'lua-chon');
    expect(lc?.kind === 'lua-chon' && lc.options.length).toBe(5);
    expect(lc?.kind === 'lua-chon' && lc.options.filter((o) => o.checked).map((o) => o.label)).toEqual([
      'Phòng, chống, khắc phục hậu quả thiên tai, dịch bệnh',
    ]);
  });

  it('in tổng giá trị kèm bằng chữ', () => {
    const lines = doanText(buildBienBanXacNhanTaiTro(khoan(), null).blocks);
    expect(lines.some((l) => l.includes('10.000.000') && l.startsWith('Với tổng giá trị'))).toBe(true);
    expect(lines.some((l) => l.startsWith('(Bằng chữ: Mười triệu'))).toBe(true);
  });

  it('phụ lục trống ⇒ 10 dòng viết tay (thêm dòng đánh số cột)', () => {
    const bang = buildBienBanXacNhanTaiTro(khoan(), null).blocks.find((b) => b.kind === 'bang');
    expect(bang?.kind === 'bang' && bang.rows.length).toBe(11);
  });

  it('phụ lục có dữ liệu ⇒ in đúng số dòng đã nhập', () => {
    const tn = khoan({ phu_luc: [{ ho_ten: 'Nguyễn Văn A', dia_chi: 'Xóm 3', quan_he: 'Bản thân', noi_dung_gia_tri: '500.000' }] });
    const bang = buildBienBanXacNhanTaiTro(tn, null).blocks.find((b) => b.kind === 'bang');
    expect(bang?.kind === 'bang' && bang.rows).toEqual([
      ['1', '2', '3', '4', '5', '6'],
      ['1', 'Nguyễn Văn A', 'Xóm 3', 'Bản thân', '500.000', ''],
    ]);
  });

  it('phụ lục nằm sau một khối ngắt trang', () => {
    const kinds = buildBienBanXacNhanTaiTro(khoan(), null).blocks.map((b) => b.kind);
    expect(kinds.indexOf('ngat-trang')).toBeGreaterThan(kinds.indexOf('chu-ky'));
    expect(kinds.indexOf('bang')).toBeGreaterThan(kinds.indexOf('ngat-trang'));
  });
});

describe('tenBenNhanTaiTro', () => {
  it('chương trình tỉnh ⇒ tỉnh Nghệ An; chương trình xã ⇒ tên xã đầy đủ', () => {
    expect(tenBenNhanTaiTro({ don_vi_chu_tri_loai: 'tinh', ten_don_vi_tiep_nhan: 'MTTQ tỉnh' })).toBe('tỉnh Nghệ An');
    expect(tenBenNhanTaiTro({ don_vi_chu_tri_loai: 'xa_phuong', ten_don_vi_tiep_nhan: 'Tân Kỳ' })).toBe('xã Tân Kỳ');
    expect(tenBenNhanTaiTro({ don_vi_chu_tri_loai: 'xa_phuong', ten_don_vi_tiep_nhan: 'phường Tây Hiếu' })).toBe(
      'phường Tây Hiếu',
    );
  });
});

describe('moTaHienVat', () => {
  it('ghép phiếu kho gắn và hiện vật khác', () => {
    const phieu = { phieu_id: '86', so_phieu: 'PN-2026-0013', ngay_phieu: '', ten_kho: null, ten_chuong_trinh: null, tong_tien: 36000, so_dong: 1, tiep_nhan_id: '1', so_phieu_tiep_nhan: null };
    expect(moTaHienVat({ phieu_kho: [phieu], hien_vat_khac_mo_ta: '50 suất quà' })).toBe(
      'Hàng nhập kho theo phiếu PN-2026-0013; 50 suất quà',
    );
    expect(moTaHienVat({ phieu_kho: [], hien_vat_khac_mo_ta: '  ' })).toBeNull();
  });
});
