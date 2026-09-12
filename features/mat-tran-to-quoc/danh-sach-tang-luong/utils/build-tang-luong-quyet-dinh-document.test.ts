import { describe, expect, it } from 'vitest';
import type { MttqTangLuongListRow } from '../core/types';
import {
  SO_QD_LUONG_PLACEHOLDER,
  buildTangLuongQuyetDinhDocumentModel,
  moTaChucVuDonVi,
  moTaLoaiKy,
  moTaNgachBac,
  formatTienVanBan,
} from './build-tang-luong-quyet-dinh-document';

function row(over?: Partial<MttqTangLuongListRow>): MttqTangLuongListRow {
  return {
    id: '1',
    can_bo_id: '10',
    ngay_nang_luong: '2025-09-05',
    loai_ky: 'dung_han',
    ngach_luong_id_cu: '1',
    bac_luong_id_cu: '1',
    ngach_luong_id_moi: '1',
    bac_luong_id_moi: '2',
    so_thang_rut_ngan: null,
    ngay_den_han_goc: null,
    luong: 6_300_000,
    ghi_chu: null,
    file_quyet_dinh: null,
    id_nguoi_tao: '1',
    tg_tao: '2025-09-01T00:00:00Z',
    tg_cap_nhat: '2025-09-01T00:00:00Z',
    ho_ten_can_bo: 'Nguyễn Văn A',
    phong_ban_id: null,
    chuc_vu_id: null,
    ten_chuc_vu: 'Chuyên viên',
    don_vi_id: null,
    to_chuc_id: null,
    ten_phong_ban: 'Ban Tổ chức',
    ten_bo_phan: null,
    ten_don_vi: null,
    ten_to_chuc: null,
    ten_ngach_cu: 'Chuyên viên',
    ma_bac_cu: '1',
    ten_ngach_moi: 'Chuyên viên',
    ma_bac_moi: '2',
    can_bo_cap_quan_ly: [],
    ...over,
  };
}

describe('moTaNgachBac', () => {
  it('ghép đủ ngạch và bậc', () => {
    expect(moTaNgachBac('Chuyên viên', '2')).toBe('ngạch Chuyên viên, bậc 2');
  });

  it('thiếu một vế thì chỉ ghi vế còn lại', () => {
    expect(moTaNgachBac('Chuyên viên', null)).toBe('ngạch Chuyên viên');
    expect(moTaNgachBac(null, '2')).toBe('bậc 2');
    expect(moTaNgachBac(null, null)).toBe('');
  });
});

describe('moTaChucVuDonVi', () => {
  it('ưu tiên bộ phận con hơn phòng ban cha', () => {
    expect(moTaChucVuDonVi(row({ ten_bo_phan: 'Tổ Hành chính' }))).toBe(
      'Chuyên viên, Tổ Hành chính',
    );
  });

  it('ghép chức vụ, phòng ban, đơn vị xã', () => {
    expect(moTaChucVuDonVi(row({ ten_don_vi: 'Xã Nghi Lộc' }))).toBe(
      'Chuyên viên, Ban Tổ chức, Xã Nghi Lộc',
    );
  });
});

describe('moTaLoaiKy', () => {
  it('đúng hạn chỉ ghi nhãn', () => {
    expect(moTaLoaiKy(row())).not.toContain('rút ngắn');
  });

  it('nhãn đã có sẵn số tháng thì không lặp "(rút ngắn ...)"', () => {
    const out = moTaLoaiKy(row({ loai_ky: 'truoc_han_9', so_thang_rut_ngan: 9 }));
    expect(out).toContain('9');
    expect(out).not.toContain('(rút ngắn');
  });

  it('số tháng khác nhãn thì ghi rõ số tháng rút ngắn thực tế', () => {
    const out = moTaLoaiKy(row({ loai_ky: 'truoc_han_9', so_thang_rut_ngan: 4 }));
    expect(out).toContain('rút ngắn 4 tháng');
  });

  it('trước hạn mà thiếu số tháng thì không bịa ra số', () => {
    const out = moTaLoaiKy(row({ loai_ky: 'truoc_han_6', so_thang_rut_ngan: null }));
    expect(out).not.toContain('rút ngắn');
  });
});

describe('formatTienVanBan', () => {
  it('nhóm hàng nghìn, không kèm ký hiệu ₫', () => {
    expect(formatTienVanBan(11_938_000)).toBe('11.938.000');
    expect(formatTienVanBan(11_938_000)).not.toContain('₫');
  });

  it('giá trị không hợp lệ trả chuỗi rỗng', () => {
    expect(formatTienVanBan(null)).toBe('');
  });
});

describe('buildTangLuongQuyetDinhDocumentModel', () => {
  it('thiếu ngạch/bậc cũ thì bỏ hẳn vế "từ …", không in « Chưa có »', () => {
    const model = buildTangLuongQuyetDinhDocumentModel(
      row({ ten_ngach_cu: null, ma_bac_cu: null }),
    );
    const doanText = model.noiDung
      .filter((k) => k.kind === 'doan')
      .map((k) => (k.kind === 'doan' ? k.text : ''))
      .join(' ');
    expect(doanText).not.toContain('Chưa có');
    expect(doanText).not.toMatch(/từ\s+-\s+lên/);
    expect(doanText).toContain('lên ngạch Chuyên viên, bậc 2');
  });

  it('dựng đúng thể thức và điền số tiền bằng chữ vào Điều 2', () => {
    const model = buildTangLuongQuyetDinhDocumentModel(row());

    expect(model.soKyHieu).toBe(SO_QD_LUONG_PLACEHOLDER);
    expect(model.diaDanhNgayThang).toBe('Nghệ An, ngày 05 tháng 9 năm 2025');
    expect(model.tenCanBo).toBe('Nguyễn Văn A');
    expect((model.canCu ?? []).length).toBeGreaterThan(0);

    const doanText = model.noiDung
      .filter((k) => k.kind === 'doan')
      .map((k) => (k.kind === 'doan' ? k.text : ''))
      .join(' ');
    expect(doanText).toContain('Nguyễn Văn A');
    expect(doanText).toContain('6.300.000 đồng');
    expect(doanText).toContain('Sáu triệu ba trăm nghìn đồng');
    expect(doanText).not.toContain('₫');
    expect(doanText).toContain('Điều 1.');
    expect(doanText).toContain('Điều 3.');
  });

  it('bảng so sánh có đủ dòng ngạch/bậc, lương, hiệu lực, loại kỳ', () => {
    const model = buildTangLuongQuyetDinhDocumentModel(
      row({ loai_ky: 'truoc_han_12', so_thang_rut_ngan: 12, ngay_den_han_goc: '2026-09-05' }),
    );
    const bang = model.noiDung.find((k) => k.kind === 'bang');
    expect(bang?.kind).toBe('bang');
    if (bang?.kind === 'bang') {
      expect(bang.rows).toHaveLength(4);
      expect(bang.rows[0][1]).toContain('bậc 1');
      expect(bang.rows[0][2]).toContain('bậc 2');
      expect(bang.rows[3][2]).toContain('12 tháng');
    }
  });
});
