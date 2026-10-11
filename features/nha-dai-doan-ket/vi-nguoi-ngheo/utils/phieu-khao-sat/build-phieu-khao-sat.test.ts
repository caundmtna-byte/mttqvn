/**
 * Bốn phiếu khảo sát in: đúng phiếu theo lĩnh vực, ô ☒ đúng dữ liệu, ô trống ⇒
 * dòng chấm (không bao giờ lọt "null"/"undefined"), số mục liền mạch như mẫu.
 */
import { describe, expect, it } from 'vitest';
import type { HoNgheo } from '@/features/nha-dai-doan-ket/thong-tin-ho-ngheo/core/types';
import { O_CHON, O_TRONG } from '@/lib/bien-ban/bien-ban-model';
import { bienBanToRows } from '@/lib/bien-ban/download-bien-ban-xlsx';
import type { VnnLinhVuc } from '../../core/constants';
import type { VnnPhieuKhaoSat } from '../../core/phieu-khao-sat';
import type { ViNguoiNgheo } from '../../core/types';
import { buildPhieuKhaoSat } from './build-phieu-khao-sat';

function vnn(linhVuc: VnnLinhVuc, extra: Partial<ViNguoiNgheo> = {}): ViNguoiNgheo {
  return {
    id: '12',
    noi_dung_ho_tro: 'Hỗ trợ khẩn cấp',
    nam: 2026,
    linh_vuc_ho_tro: linhVuc,
    nguon: 'Cứu trợ',
    nguon_ho_tro: 'Cấp tỉnh',
    ho_ngheo_id: null,
    ho_ten_nguoi_nhan: 'Nguyễn Thị Hiệp',
    xa_phuong_id: '1',
    ten_xa_phuong: 'xã Thần Lĩnh',
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
    ...extra,
  };
}

const HO: HoNgheo = {
  id: '7',
  ho_ten_dai_dien: 'Trần Văn Viên',
  so_cccd: '040123456789',
  xa_phuong_id: '1',
  ten_xa_phuong: 'xã Thần Lĩnh',
  khoi_xom: 'Xóm 3',
  doi_tuong: 'Cận nghèo',
  dien_thoai: '0912345678',
  dan_toc_id: '1',
  ten_dan_toc: 'Kinh',
  ton_giao: 'Không',
  to_chuc: 'Mặt trận',
  so_tai_khoan: null,
  ngan_hang: null,
  trang_thai: 'Đang khó khăn',
  ngay_cap_nhat_trang_thai: '',
  ghi_chu: null,
  id_nguoi_tao: '1',
  tg_tao: '',
  tg_cap_nhat: '',
  nhan_khau: {
    gioi_tinh: 'Nam',
    nam_sinh: 1970,
    ngay_cap_cccd: '2021-04-05',
    noi_cap_cccd: null,
    ho_ten_vo_chong: 'Lê Thị Hoa',
    so_nhan_khau: 4,
    nghe_nghiep: 'Làm nông',
    trinh_do_hoc_van: null,
    tinh_trang_viec_lam: null,
    doi_tuong_uu_tien: 'Thân nhân liệt sĩ',
    tinh_trang_dat: 'Có GCN QSDĐ',
  },
};

function rows(linhVuc: VnnLinhVuc, extra: Partial<ViNguoiNgheo> = {}, ho: HoNgheo | null = null) {
  const model = buildPhieuKhaoSat({ vnn: vnn(linhVuc, extra), ho });
  if (!model) throw new Error('không có phiếu');
  return bienBanToRows(model);
}

function dong(all: string[], prefix: string): string {
  const r = all.find((x) => x.trimStart().startsWith(prefix));
  if (!r) throw new Error(`không thấy dòng "${prefix}"`);
  return r;
}

/** Số mục đầu dòng ("12. …") theo thứ tự xuất hiện. */
function soMuc(all: string[]): number[] {
  return all.map((r) => /^(\d+)\. /.exec(r)?.[1]).filter(Boolean).map(Number);
}

describe('buildPhieuKhaoSat — chọn phiếu theo lĩnh vực', () => {
  it.each([
    ['Cứu trợ', 'THIÊN TAI'],
    ['Nhà bị sập', 'THIÊN TAI'],
    ['Hoả hoạn', 'THIÊN TAI'],
    ['Chữa bệnh', 'ỐM ĐAU'],
    ['Người chết', 'ỐM ĐAU'],
    ['Mô hình sinh kế', 'SINH KẾ'],
    ['Học sinh nghèo', 'HỌC SINH'],
  ] as const)('%s ⇒ phiếu %s', (linhVuc, tuKhoa) => {
    expect(rows(linhVuc).slice(0, 3).join(' ')).toContain(tuKhoa);
  });

  it('Tết vì người nghèo không có phiếu', () => {
    expect(buildPhieuKhaoSat({ vnn: vnn('Tết vì người nghèo'), ho: null })).toBeNull();
  });

  it.each([
    ['Cứu trợ', 27],
    ['Chữa bệnh', 28],
    ['Mô hình sinh kế', 23],
    ['Học sinh nghèo', 22],
  ] as const)('%s: số mục chạy liền 1 → %i như mẫu', (linhVuc, cuoi) => {
    expect(soMuc(rows(linhVuc))).toEqual(Array.from({ length: cuoi }, (_, i) => i + 1));
  });
});

describe('buildPhieuKhaoSat — dữ liệu', () => {
  it('chưa gắn hộ, chưa nhập phiếu ⇒ toàn dòng chấm, không lọt null/undefined', () => {
    for (const lv of ['Cứu trợ', 'Chữa bệnh', 'Mô hình sinh kế', 'Học sinh nghèo'] as const) {
      const text = rows(lv, { so_tien: null, noi_dung_ho_tro: '' }).join('\n');
      expect(text).not.toMatch(/null|undefined|NaN/);
      expect(dong(rows(lv), '2. ')).toMatch(/^2\. Số Căn cước: \.+ {3}Ngày cấp: \.+$/);
    }
  });

  it('mục I lấy từ hộ nghèo được gắn', () => {
    const r = rows('Cứu trợ', { ho_ngheo_id: '7' }, HO);
    expect(dong(r, '1. ')).toBe('1. Họ tên chủ hộ: Trần Văn Viên   Giới tính: Nam   Năm sinh: 1970');
    expect(dong(r, '2. ')).toBe('2. Số Căn cước: 040123456789   Ngày cấp: 05/04/2021');
    expect(dong(r, '6. ')).toBe('6. Dân tộc: Kinh   Tôn giáo: Không');
    // Diện hộ lấy của hộ khi khoản không ghi.
    expect(dong(r, '8. ')).toContain(`${O_CHON} Hộ cận nghèo`);
    expect(dong(r, '8. ')).toContain(`${O_TRONG} Hộ nghèo`);
    expect(dong(r, '19. ')).toContain(`${O_CHON} Có Giấy chứng nhận QSDĐ`);
  });

  it('đối tượng ưu tiên chữ tự do của hộ ⇒ in vào "Khác:"', () => {
    const r = rows('Cứu trợ', {}, HO);
    expect(r.join('\n')).toContain(`${O_CHON} Khác: Thân nhân liệt sĩ`);
  });

  it('dòng lĩnh vực đầu phiếu tick đúng; Hoả hoạn để trống cả hai và tự tick "Hỏa hoạn"', () => {
    expect(dong(rows('Nhà bị sập'), 'Lĩnh vực')).toBe(
      `Lĩnh vực hỗ trợ: ${O_TRONG} Cứu trợ   ${O_CHON} Nhà bị sập`,
    );
    const hh = rows('Hoả hoạn');
    expect(dong(hh, 'Lĩnh vực')).not.toContain(O_CHON);
    expect(hh.join('\n')).toContain(`${O_CHON} Hỏa hoạn`);
  });

  it('Hoả hoạn đã tick loại sự cố khác ⇒ không tự tick đè', () => {
    const p: VnnPhieuKhaoSat = { chung: {}, thien_tai: { loai_su_co: ['Lũ, ngập lụt'] } };
    const text = rows('Hoả hoạn', { phieu_khao_sat: p }).join('\n');
    expect(text).toContain(`${O_CHON} Lũ, ngập lụt`);
    expect(text).toContain(`${O_TRONG} Hỏa hoạn`);
  });

  it('Chữa bệnh / Người chết tick đúng mục "Trường hợp" và dòng lĩnh vực', () => {
    expect(dong(rows('Chữa bệnh'), '10. ')).toBe(
      `10. Trường hợp: ${O_CHON} Ốm đau, bệnh hiểm nghèo   ${O_TRONG} Qua đời`,
    );
    const r = rows('Người chết');
    expect(dong(r, '10. ')).toContain(`${O_CHON} Qua đời`);
    expect(dong(r, 'Lĩnh vực')).toContain(`${O_CHON} Thăm hỏi gia đình có người qua đời`);
  });

  it('hình thức "Hiện vật và Tiền" ⇒ tick "Tiền mặt và hiện vật"', () => {
    const r = rows('Mô hình sinh kế', { hinh_thuc_ho_tro: 'Hiện vật và Tiền' });
    expect(dong(r, '21. ')).toBe(
      `21. Hình thức đề xuất: ${O_TRONG} Tiền mặt   ${O_TRONG} Hiện vật   ${O_CHON} Tiền mặt và hiện vật`,
    );
  });

  it('mức đề xuất: ô nhập riêng ưu tiên; trống thì ghép nội dung + số tiền', () => {
    expect(dong(rows('Mô hình sinh kế'), '22. ')).toBe(
      '22. Mức/nội dung đề xuất hỗ trợ: Hỗ trợ khẩn cấp; 2.000.000 đồng',
    );
    const p: VnnPhieuKhaoSat = { chung: { muc_de_xuat: '01 con bò giống' } };
    expect(dong(rows('Mô hình sinh kế', { phieu_khao_sat: p }), '22. ')).toBe(
      '22. Mức/nội dung đề xuất hỗ trợ: 01 con bò giống',
    );
  });

  it('mục II học sinh in đúng dữ liệu đã nhập, ngày dd/mm/yyyy, ô tick nhiều', () => {
    const p: VnnPhieuKhaoSat = {
      chung: { ngay_khao_sat: '2026-10-05', ket_luan: 'Đủ điều kiện, đề nghị hỗ trợ' },
      hoc_sinh: {
        ho_ten: 'Trần Văn An',
        ngay_sinh: '2014-03-09',
        lop: '6A',
        truong: 'THCS Thần Lĩnh',
        ket_qua_hoc_tap: 'Giỏi',
        nhu_cau: ['Học bổng', 'Xe đạp'],
        khoang_cach_km: 4.5,
      },
    };
    const r = rows('Học sinh nghèo', { phieu_khao_sat: p });
    expect(dong(r, '11. ')).toBe('11. Ngày sinh: 09/03/2014   Lớp: 6A   Trường: THCS Thần Lĩnh');
    expect(dong(r, '13. ')).toContain(`${O_CHON} Giỏi`);
    expect(dong(r, '15. ')).toContain('4,5 km');
    expect(r.join('\n')).toContain(`${O_CHON} Học bổng   ${O_CHON} Xe đạp`);
    expect(dong(r, '19. ')).toContain(`${O_CHON} Đủ điều kiện, đề nghị hỗ trợ`);
    expect(r).toContain('Thần Lĩnh, ngày 05 tháng 10 năm 2026');
  });
});
