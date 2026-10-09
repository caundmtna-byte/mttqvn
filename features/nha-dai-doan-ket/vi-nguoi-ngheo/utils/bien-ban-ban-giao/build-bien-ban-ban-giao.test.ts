/**
 * Biên bản bàn giao: ô ☒ đúng lĩnh vực / nguồn / hình thức, bảng hiện vật tính
 * đúng thành tiền + tổng + bằng chữ, người được hỗ trợ lấy từ phiếu khảo sát.
 */
import { describe, expect, it } from 'vitest';
import type { HoNgheo } from '@/features/nha-dai-doan-ket/thong-tin-ho-ngheo/core/types';
import { O_CHON, O_TRONG, type BienBanBlock } from '@/lib/bien-ban/bien-ban-model';
import { bienBanToRows } from '@/lib/bien-ban/download-bien-ban-xlsx';
import type { VnnLinhVuc } from '../../core/constants';
import type { ViNguoiNgheo } from '../../core/types';
import { bangHienVat, buildBienBanBanGiao, oLinhVuc } from './build-bien-ban-ban-giao';

function vnn(linhVuc: VnnLinhVuc, extra: Partial<ViNguoiNgheo> = {}): ViNguoiNgheo {
  return {
    id: '12',
    noi_dung_ho_tro: 'Gạo cứu đói',
    nam: 2026,
    linh_vuc_ho_tro: linhVuc,
    nguon: 'Cứu trợ',
    nguon_ho_tro: 'Cấp tỉnh',
    ho_ngheo_id: null,
    ho_ten_nguoi_nhan: 'Nguyễn Thị Hiệp',
    xa_phuong_id: '1',
    ten_xa_phuong: 'Thần Lĩnh',
    khoi_xom: 'Xóm 3',
    doi_tuong: null,
    hinh_thuc_ho_tro: 'Tiền mặt',
    so_tien: 2_000_000,
    so_luong: null,
    tong_tien_quy_doi: null,
    tong_tien_ban_giao: null,
    trang_thai: 'Đang khảo sát',
    ngay_cap_nhat_trang_thai: '',
    don_vi_ho_tro_id: null,
    ten_don_vi_ho_tro: null,
    ghi_chu: null,
    id_nguoi_tao: '1',
    tg_tao: '',
    tg_cap_nhat: '',
    phieu_khao_sat: null,
    bien_ban_ban_giao: null,
    ...extra,
  };
}

const HO = {
  so_cccd: '040123456789',
  dien_thoai: '0912345678',
  nhan_khau: { nam_sinh: 1970, ngay_cap_cccd: '2021-04-05', noi_cap_cccd: 'Cục CS QLHC' },
} as HoNgheo;

function rows(v: ViNguoiNgheo, ho: HoNgheo | null = null): string[] {
  return bienBanToRows(buildBienBanBanGiao({ vnn: v, ho }));
}

function dong(v: ViNguoiNgheo, batDau: string, ho: HoNgheo | null = null): string {
  const r = rows(v, ho).find((x) => x.startsWith(batDau));
  if (r === undefined) throw new Error(`Không có dòng "${batDau}"`);
  return r;
}

function bang(v: ViNguoiNgheo): Extract<BienBanBlock, { kind: 'bang' }> {
  const b = buildBienBanBanGiao({ vnn: v, ho: null }).blocks.find((x) => x.kind === 'bang');
  if (!b || b.kind !== 'bang') throw new Error('Không có bảng hiện vật');
  return b;
}

describe('buildBienBanBanGiao', () => {
  it('ô lĩnh vực: Hoả hoạn tick "Cứu trợ", Người chết tick "Thăm hỏi…", Tết không tick ô nào', () => {
    expect(oLinhVuc('Hoả hoạn')).toBe('Cứu trợ');
    expect(oLinhVuc('Người chết')).toBe('Người chết');
    expect(oLinhVuc('Tết vì người nghèo')).toBeNull();
    expect(rows(vnn('Người chết')).join('\n')).toContain(`${O_CHON} Thăm hỏi gia đình có người qua đời`);
    const linhVuc = buildBienBanBanGiao({ vnn: vnn('Tết vì người nghèo'), ho: null }).blocks.find(
      (x) => x.kind === 'lua-chon',
    );
    expect(linhVuc?.kind === 'lua-chon' && linhVuc.options.some((o) => o.checked)).toBe(false);
  });

  it('nguồn Ngân sách ⇒ ô "Nguồn khác"; tiền mặt in số + bằng chữ', () => {
    const v = vnn('Cứu trợ', { nguon: 'Ngân sách' });
    expect(dong(v, 'Nguồn hỗ trợ:')).toBe(
      `Nguồn hỗ trợ: ${O_TRONG} Quỹ “Vì người nghèo”   ${O_TRONG} Quỹ Cứu trợ   ${O_CHON} Nguồn khác`,
    );
    expect(dong(v, '2. Tiền mặt')).toBe('2. Tiền mặt: Tổng số tiền 2.000.000 đồng');
    expect(dong(v, '(Bằng chữ')).toBe('(Bằng chữ: Hai triệu đồng)');
  });

  it('khoản Hiện vật: Số tiền là giá trị hiện vật, KHÔNG in sang dòng tiền mặt', () => {
    const v = vnn('Cứu trợ', { hinh_thuc_ho_tro: 'Hiện vật' });
    expect(dong(v, '2. Tiền mặt')).not.toContain('2.000.000');
    expect(dong(v, 'Tổng giá trị hiện vật')).toBe('Tổng giá trị hiện vật (bằng chữ): Hai triệu đồng');
  });

  it('bên nhận lấy CCCD / năm sinh / SĐT từ hộ nghèo; trống ⇒ dòng chấm, không lọt "null"', () => {
    expect(dong(vnn('Cứu trợ'), 'Số Căn cước:', HO)).toBe(
      'Số Căn cước: 040123456789   Ngày cấp: 05/04/2021   Nơi cấp: Cục CS QLHC',
    );
    const all = rows(vnn('Cứu trợ')).join('\n');
    expect(all).not.toMatch(/null|undefined|NaN/);
    expect(dong(vnn('Cứu trợ'), 'Số điện thoại:')).toMatch(/^Số điện thoại: \.+$/);
  });

  it('hiện vật đã nhập: thành tiền = SL × đơn giá, tổng + bằng chữ, đệm đủ 5 dòng', () => {
    const v = vnn('Cứu trợ', {
      hinh_thuc_ho_tro: 'Hiện vật',
      bien_ban_ban_giao: {
        hien_vat: [
          { ten: 'Gạo', dvt: 'kg', so_luong: 20, don_gia: 15_000 },
          { ten: 'Mì tôm', dvt: 'thùng', so_luong: 2, don_gia: 120_000, ghi_chu: 'Hảo Hảo' },
        ],
      },
    });
    const b = bang(v);
    expect(b.rows).toHaveLength(5);
    expect(b.rows[0]).toEqual(['1', 'Gạo', 'kg', '20', '15.000', '300.000', '']);
    expect(b.rows[1][5]).toBe('240.000');
    expect(b.rows[4]).toEqual(['5', '', '', '', '', '', '']);
    expect(b.footer?.cells).toEqual(['Tổng cộng', '', '', '', '540.000', '']);
    expect(dong(v, 'Tổng giá trị hiện vật')).toBe(
      'Tổng giá trị hiện vật (bằng chữ): Năm trăm bốn mươi nghìn đồng',
    );
  });

  it('chưa nhập dòng hiện vật nào, hình thức "Hiện vật" ⇒ một dòng từ Nội dung / Số lượng / Số tiền', () => {
    const { rows: r, tong } = bangHienVat({
      vnn: vnn('Cứu trợ', { hinh_thuc_ho_tro: 'Hiện vật', so_luong: 3, so_tien: 900_000 }),
      ho: null,
    });
    expect(r[0]).toEqual(['1', 'Gạo cứu đói', '', '3', '', '900.000', '']);
    expect(tong).toBe(900_000);
    // "Hiện vật và Tiền" không tách được phần hiện vật ⇒ bảng trống cho viết tay.
    expect(
      bangHienVat({ vnn: vnn('Cứu trợ', { hinh_thuc_ho_tro: 'Hiện vật và Tiền', so_tien: 900_000 }), ho: null }).tong,
    ).toBeNull();
    // Chỉ tiền mặt ⇒ bảng trống, tổng trống.
    expect(bangHienVat({ vnn: vnn('Cứu trợ'), ho: null }).tong).toBeNull();
  });

  it('người được hỗ trợ: học sinh lấy từ phiếu khảo sát; có cột ký Người giám hộ', () => {
    const v = vnn('Học sinh nghèo', {
      phieu_khao_sat: {
        chung: {},
        hoc_sinh: { ho_ten: 'Trần Minh An', ngay_sinh: '2014-09-02', quan_he_chu_ho: 'Con', lop: '6A', truong: 'THCS Thần Lĩnh' },
      },
    });
    expect(dong(v, 'Ông (bà)/em:')).toBe('Ông (bà)/em: Trần Minh An   Năm sinh: 2014');
    expect(dong(v, 'Thông tin bổ sung')).toContain('Lớp 6A, trường THCS Thần Lĩnh');
    expect(rows(v).join('\n')).toContain('NGƯỜI GIÁM HỘ');
    expect(rows(vnn('Cứu trợ')).join('\n')).not.toContain('NGƯỜI GIÁM HỘ');
  });

  it('đoạn "Riêng mô hình sinh kế" / "Riêng nhà ở" chỉ in đúng lĩnh vực', () => {
    const sk = rows(vnn('Mô hình sinh kế', { bien_ban_ban_giao: { so_thang_duy_tri: 24 } })).join('\n');
    expect(sk).toContain('trong thời gian 24 tháng');
    expect(sk).not.toContain('Riêng nhà ở');
    const nha = rows(vnn('Nhà bị sập', { bien_ban_ban_giao: { han_hoan_thanh_nha: '2026-12-31' } })).join('\n');
    expect(nha).toContain('trước ngày 31/12/2026');
    expect(nha).not.toContain('Riêng mô hình sinh kế');
  });

  it('bên giao: trống đơn vị ⇒ "Uỷ ban MTTQ Việt Nam xã …"; số quyết định chỉ số ⇒ thêm "/QĐ-"', () => {
    const v = vnn('Cứu trợ', { bien_ban_ban_giao: { so_quyet_dinh: '15', dai_dien_ho_ten: 'Lê Văn B' } });
    expect(dong(v, 'Đơn vị:')).toBe('Đơn vị: Uỷ ban MTTQ Việt Nam xã Thần Lĩnh');
    expect(dong(v, 'Căn cứ Quyết định số')).toMatch(/^Căn cứ Quyết định số 15\/QĐ-………/);
    expect(dong(vnn('Cứu trợ'), 'Căn cứ Quyết định số')).toMatch(/^Căn cứ Quyết định số ………\/QĐ-………/);
  });
});
