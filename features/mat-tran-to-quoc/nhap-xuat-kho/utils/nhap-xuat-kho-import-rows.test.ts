import { describe, it, expect } from 'vitest';
import {
  buildNhapXuatKhoImportPhieus,
  khoTrongPhamViGhi,
  parseImportLoaiPhieu,
  parseImportNgay,
  parseImportSo,
  type ImportSourceRow,
  type NhapXuatKhoImportCtx,
} from './nhap-xuat-kho-import-rows';

function ctx(over: Partial<NhapXuatKhoImportCtx> = {}): NhapXuatKhoImportCtx {
  return {
    khoList: [
      { id: '1', ten: 'Kho tỉnh', don_vi_id: null },
      { id: '2', ten: 'Kho xã Môn Sơn', don_vi_id: '900' },
      { id: '3', ten: 'Kho xã Lượng Minh', don_vi_id: '901' },
    ],
    donViCuuTroList: [{ id: '50', ten: 'Công ty ABC' }],
    dotCuuTroList: [{ id: '60', ten: 'Bão số 3 năm 2026' }],
    hangHoaList: [
      { id: '10', ten: 'Gạo tẻ', don_vi_tinh: 'kg' },
      { id: '11', ten: 'Mì tôm', don_vi_tinh: 'thùng' },
    ],
    viewer: { canViewAll: true, chucVuCapQuanLy: null, viewerDonViId: null },
    ...over,
  };
}

const nhapHeader = {
  ma_phieu: 'P1',
  loai_phieu: 'Nhập từ ngoài',
  ngay_phieu: '15/09/2026',
  kho_nhap_id: 'Kho xã Môn Sơn',
  don_vi_cuu_tro_id: 'Công ty ABC',
};

function src(rowNum: number, data: Record<string, unknown>): ImportSourceRow {
  return { rowNum, data };
}

describe('parseImportNgay', () => {
  it('đọc được ISO, dd/mm/yyyy và số serial của Excel', () => {
    expect(parseImportNgay('2026-09-15')).toBe('2026-09-15');
    expect(parseImportNgay('15/09/2026')).toBe('2026-09-15');
    expect(parseImportNgay(46280)).toBe('2026-09-15');
  });

  it('chuỗi lạ ⇒ null', () => {
    expect(parseImportNgay('15 tháng 9')).toBeNull();
    expect(parseImportNgay('')).toBeNull();
  });
});

describe('parseImportSo', () => {
  it('ô kiểu số của Excel dùng nguyên', () => {
    expect(parseImportSo(1000)).toEqual({ ok: true, value: 1000 });
    expect(parseImportSo(12.5)).toEqual({ ok: true, value: 12.5 });
  });

  it('chuỗi số thuần, dấu phẩy là dấu thập phân', () => {
    expect(parseImportSo('1000')).toEqual({ ok: true, value: 1000 });
    expect(parseImportSo('12,5')).toEqual({ ok: true, value: 12.5 });
  });

  it('TỪ CHỐI dấu phân cách hàng nghìn thay vì đoán — 1.000 là 1000 hay 1,0?', () => {
    expect(parseImportSo('1.000')).toEqual({ ok: false, reason: 'ambiguous' });
    expect(parseImportSo('1,000,000')).toEqual({ ok: false, reason: 'ambiguous' });
  });

  it('chữ hoặc rỗng ⇒ invalid', () => {
    expect(parseImportSo('hai tấn')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseImportSo('')).toEqual({ ok: false, reason: 'invalid' });
  });
});

describe('parseImportLoaiPhieu', () => {
  it('nhận nhãn tiếng Việt, mã kỹ thuật và cách viết không dấu', () => {
    expect(parseImportLoaiPhieu('Nhập từ ngoài')).toBe('nhap_ngoai');
    expect(parseImportLoaiPhieu('nhap_ngoai')).toBe('nhap_ngoai');
    expect(parseImportLoaiPhieu('XUẤT RA NGOÀI')).toBe('xuat_ngoai');
    expect(parseImportLoaiPhieu('chuyen kho')).toBe('chuyen_kho');
    expect(parseImportLoaiPhieu('trả hàng')).toBeNull();
  });
});

describe('khoTrongPhamViGhi', () => {
  const kho = { id: '2', ten: 'Kho xã Môn Sơn', don_vi_id: '900' };

  it('cấp tỉnh / xem toàn bộ ⇒ mọi kho', () => {
    expect(khoTrongPhamViGhi({ canViewAll: true, chucVuCapQuanLy: null, viewerDonViId: null }, kho)).toBe(true);
    expect(khoTrongPhamViGhi({ canViewAll: false, chucVuCapQuanLy: 'Tỉnh', viewerDonViId: null }, kho)).toBe(true);
  });

  it('xã phường ⇒ chỉ kho cùng đơn vị', () => {
    expect(khoTrongPhamViGhi({ canViewAll: false, chucVuCapQuanLy: 'Xã phường', viewerDonViId: '900' }, kho)).toBe(true);
    expect(khoTrongPhamViGhi({ canViewAll: false, chucVuCapQuanLy: 'Xã phường', viewerDonViId: '901' }, kho)).toBe(false);
    expect(khoTrongPhamViGhi({ canViewAll: false, chucVuCapQuanLy: 'Xã phường', viewerDonViId: null }, kho)).toBe(false);
  });
});

describe('buildNhapXuatKhoImportPhieus', () => {
  it('gom nhiều dòng hàng cùng mã phiếu thành MỘT phiếu, giữ thứ tự dòng', () => {
    const { phieus, errors } = buildNhapXuatKhoImportPhieus(
      [
        src(2, { ...nhapHeader, hang_hoa_id: 'Gạo tẻ', so_luong: 500 }),
        src(3, { ...nhapHeader, hang_hoa_id: 'Mì tôm', so_luong: 20, don_gia: 120000 }),
      ],
      ctx(),
    );
    expect(errors).toEqual([]);
    expect(phieus).toHaveLength(1);
    expect(phieus[0].maPhieu).toBe('P1');
    expect(phieus[0].values.loai_phieu).toBe('nhap_ngoai');
    expect(phieus[0].values.ngay_phieu).toBe('2026-09-15');
    expect(phieus[0].values.kho_nhap_id).toBe('2');
    expect(phieus[0].values.don_vi_cuu_tro_id).toBe('50');
    expect(phieus[0].values.chi_tiet).toEqual([
      { hang_hoa_id: '10', don_vi_tinh: 'kg', so_luong: '500', don_gia: '', ghi_chu: '' },
      { hang_hoa_id: '11', don_vi_tinh: 'thùng', so_luong: '20', don_gia: '120000', ghi_chu: '' },
    ]);
  });

  it('hai mã phiếu khác nhau ⇒ hai phiếu', () => {
    const { phieus } = buildNhapXuatKhoImportPhieus(
      [
        src(2, { ...nhapHeader, hang_hoa_id: 'Gạo tẻ', so_luong: 1 }),
        src(3, { ...nhapHeader, ma_phieu: 'P2', hang_hoa_id: 'Mì tôm', so_luong: 2 }),
      ],
      ctx(),
    );
    expect(phieus.map((p) => p.maPhieu)).toEqual(['P1', 'P2']);
  });

  it('kho sai tên ⇒ câu lỗi nêu đúng tên kho và đúng dòng', () => {
    const { phieus, errors } = buildNhapXuatKhoImportPhieus(
      [src(12, { ...nhapHeader, kho_nhap_id: 'Kho xã Môn Sơn 2', hang_hoa_id: 'Gạo tẻ', so_luong: 1 })],
      ctx(),
    );
    expect(phieus).toHaveLength(0);
    expect(errors[0].rowNum).toBe(12);
    expect(errors[0].message).toContain('Dòng 12:');
    expect(errors[0].message).toContain('không tìm thấy kho « Kho xã Môn Sơn 2 »');
  });

  it('MỘT dòng hàng sai ⇒ CẢ PHIẾU bị loại, mọi dòng của phiếu đều vào file lỗi', () => {
    const { phieus, errors } = buildNhapXuatKhoImportPhieus(
      [
        src(2, { ...nhapHeader, hang_hoa_id: 'Gạo tẻ', so_luong: 500 }),
        src(3, { ...nhapHeader, hang_hoa_id: 'Nước mắm', so_luong: 10 }),
        src(4, { ...nhapHeader, hang_hoa_id: 'Mì tôm', so_luong: 20 }),
      ],
      ctx(),
    );
    expect(phieus).toHaveLength(0);
    expect(errors.map((e) => e.rowNum)).toEqual([2, 3, 4]);
    expect(errors.find((e) => e.rowNum === 3)!.message).toContain('không tìm thấy hàng hóa « Nước mắm »');
    expect(errors.find((e) => e.rowNum === 2)!.message).toBe(
      'Dòng 2: phiếu « P1 » có lỗi ở dòng 3 nên CẢ PHIẾU chưa được nhập. Sửa dòng lỗi rồi nhập lại toàn bộ các dòng của phiếu này.',
    );
  });

  it('phiếu hỏng không kéo theo phiếu khác trong cùng file', () => {
    const { phieus, errors } = buildNhapXuatKhoImportPhieus(
      [
        src(2, { ...nhapHeader, hang_hoa_id: 'Nước mắm', so_luong: 1 }),
        src(3, { ...nhapHeader, ma_phieu: 'P2', hang_hoa_id: 'Gạo tẻ', so_luong: 100 }),
      ],
      ctx(),
    );
    expect(phieus.map((p) => p.maPhieu)).toEqual(['P2']);
    expect(errors.map((e) => e.rowNum)).toEqual([2]);
  });

  it('thông tin đầu phiếu lệch giữa các dòng cùng mã ⇒ báo cột lệch và dòng gốc', () => {
    const { phieus, errors } = buildNhapXuatKhoImportPhieus(
      [
        src(2, { ...nhapHeader, hang_hoa_id: 'Gạo tẻ', so_luong: 1 }),
        src(3, { ...nhapHeader, ngay_phieu: '16/09/2026', hang_hoa_id: 'Mì tôm', so_luong: 2 }),
      ],
      ctx(),
    );
    expect(phieus).toHaveLength(0);
    const loi3 = errors.find((e) => e.rowNum === 3)!;
    expect(loi3.message).toContain('cột Ngày phiếu khác với dòng 2');
    expect(loi3.message).toContain('« P1 »');
  });

  it('thiếu mã phiếu ⇒ lỗi ngay dòng đó, không gom vào phiếu nào', () => {
    const { phieus, errors } = buildNhapXuatKhoImportPhieus(
      [src(5, { ...nhapHeader, ma_phieu: '', hang_hoa_id: 'Gạo tẻ', so_luong: 1 })],
      ctx(),
    );
    expect(phieus).toHaveLength(0);
    expect(errors[0].message).toContain('Dòng 5: chưa điền Mã phiếu');
  });

  it('phiếu xuất thiếu đợt cứu trợ ⇒ dùng đúng luật của form, báo theo mã phiếu', () => {
    const { phieus, errors } = buildNhapXuatKhoImportPhieus(
      [
        src(2, {
          ma_phieu: 'PX1',
          loai_phieu: 'Xuất ra ngoài',
          ngay_phieu: '15/09/2026',
          kho_xuat_id: 'Kho tỉnh',
          hang_hoa_id: 'Gạo tẻ',
          so_luong: 10,
        }),
      ],
      ctx(),
    );
    expect(phieus).toHaveLength(0);
    expect(errors[0].message).toBe(
      'Dòng 2: phiếu « PX1 » chưa hợp lệ: ' + errors[0].message.split('chưa hợp lệ: ')[1],
    );
    expect(errors[0].message).toContain('Dòng 2: phiếu « PX1 » chưa hợp lệ');
    expect(errors[0].message).toContain('đợt cứu trợ');
  });

  it('chuyển kho cùng một kho ⇒ bị chặn', () => {
    const { phieus, errors } = buildNhapXuatKhoImportPhieus(
      [
        src(2, {
          ma_phieu: 'PC1',
          loai_phieu: 'Chuyển kho',
          ngay_phieu: '15/09/2026',
          kho_xuat_id: 'Kho tỉnh',
          kho_nhap_id: 'Kho tỉnh',
          hang_hoa_id: 'Gạo tẻ',
          so_luong: 10,
        }),
      ],
      ctx(),
    );
    expect(phieus).toHaveLength(0);
    expect(errors[0].message).toContain('phiếu « PC1 » chưa hợp lệ');
  });

  it('cán bộ xã không lập được phiếu cho kho của xã khác', () => {
    const { phieus, errors } = buildNhapXuatKhoImportPhieus(
      [src(2, { ...nhapHeader, hang_hoa_id: 'Gạo tẻ', so_luong: 1 })],
      ctx({ viewer: { canViewAll: false, chucVuCapQuanLy: 'Xã phường', viewerDonViId: '901' } }),
    );
    expect(phieus).toHaveLength(0);
    expect(errors[0].message).toContain('kho « Kho xã Môn Sơn » không thuộc đơn vị của bạn');
  });

  it('đơn vị tính để trống ⇒ lấy theo hàng hóa trong danh mục', () => {
    const { phieus } = buildNhapXuatKhoImportPhieus(
      [src(2, { ...nhapHeader, hang_hoa_id: 'Gạo tẻ', so_luong: 5, don_vi_tinh: '' })],
      ctx(),
    );
    expect(phieus[0].values.chi_tiet[0].don_vi_tinh).toBe('kg');
  });

  it('số lượng có dấu phân cách hàng nghìn ⇒ bắt sửa, không đoán', () => {
    const { errors } = buildNhapXuatKhoImportPhieus(
      [src(2, { ...nhapHeader, hang_hoa_id: 'Gạo tẻ', so_luong: '1.000' })],
      ctx(),
    );
    expect(errors[0].message).toContain('dấu phân cách hàng nghìn');
  });

  it('số lượng bằng 0 ⇒ chặn', () => {
    const { errors } = buildNhapXuatKhoImportPhieus(
      [src(2, { ...nhapHeader, hang_hoa_id: 'Gạo tẻ', so_luong: 0 })],
      ctx(),
    );
    expect(errors[0].message).toContain('phải lớn hơn 0');
  });
});
