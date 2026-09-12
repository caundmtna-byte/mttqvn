import { describe, expect, it } from 'vitest';
import type { MttqUyVienUyBanListRow } from '../core/types';
import type { MttqUyVienUyBanViewer } from '../hooks/use-mttq-uy-vien-uy-ban-viewer';
import {
  rutGonTenNhiemKy,
  buildUyVienNhiemKyDocumentModel,
  buildUyVienPrintRows,
  moTaChucVuDonViUyVien,
  tongHopCoCauUyVien,
} from './build-uy-vien-nhiem-ky-document';

function uyVien(over: Partial<MttqUyVienUyBanListRow>): MttqUyVienUyBanListRow {
  return {
    id: over.id ?? '1',
    can_bo_id: '10',
    ma_uv: null,
    nhiem_ky_id: '5',
    ten_nhiem_ky: over.ten_nhiem_ky ?? '2024-2029',
    don_vi_id: over.don_vi_id ?? null,
    ten_don_vi: over.ten_don_vi ?? null,
    ho_va_ten: over.ho_va_ten ?? 'Nguyễn Văn A',
    chuc_vu_don_vi: over.chuc_vu_don_vi ?? 'Ủy viên',
    ngay_sinh: over.ngay_sinh ?? null,
    gioi_tinh: over.gioi_tinh ?? null,
    trang_thai_tham_gia: over.trang_thai_tham_gia ?? null,
    ten_trang_thai_can_bo: null,
    ngay_nhap_trang_thai: null,
    van_hoa: null,
    trinh_do_cm: null,
    trinh_do_llct: null,
    dan_toc: over.dan_toc ?? null,
    ton_giao: null,
    dang_vien: over.dang_vien ?? false,
    ngay_vao_dang: null,
    que_quan: null,
    noi_o_hien_nay: null,
    so_dien_thoai: null,
    ghi_chu: null,
    id_nguoi_tao: over.id_nguoi_tao ?? '1',
    tg_tao: '2025-01-01T00:00:00Z',
    tg_cap_nhat: '2025-01-01T00:00:00Z',
    ten_phong_ban_hien_thi: over.ten_phong_ban_hien_thi ?? null,
    ten_don_vi_can_bo: over.ten_don_vi_can_bo ?? null,
    so_ky_hop: 0,
    diem_danh_co_mat: 0,
    diem_danh_vang_mat: 0,
    diem_danh_chua: 0,
  };
}

const viewerXemHet: MttqUyVienUyBanViewer = {
  canViewAll: true,
  chucVuCapQuanLy: null,
  viewerNhanVienId: '1',
  viewerDonViId: null,
};

const viewerXaPhuong: MttqUyVienUyBanViewer = {
  canViewAll: false,
  chucVuCapQuanLy: 'Xã phường',
  viewerNhanVienId: '9',
  viewerDonViId: '77',
};

describe('moTaChucVuDonViUyVien', () => {
  it('ghép chức vụ, phòng ban, đơn vị — bỏ phần trống', () => {
    expect(
      moTaChucVuDonViUyVien(
        uyVien({ chuc_vu_don_vi: 'Phó Chủ tịch', ten_don_vi: 'Xã Nghi Lộc' }),
      ),
    ).toBe('Phó Chủ tịch, Xã Nghi Lộc');
  });

  it('dùng đơn vị của hồ sơ cán bộ khi ủy viên không gắn đơn vị', () => {
    expect(
      moTaChucVuDonViUyVien(uyVien({ chuc_vu_don_vi: '', ten_don_vi_can_bo: 'Xã Hưng Đông' })),
    ).toBe('Xã Hưng Đông');
  });
});

describe('buildUyVienPrintRows', () => {
  const rows = [
    uyVien({ id: '1', ho_va_ten: 'A', don_vi_id: '77' }),
    uyVien({ id: '2', ho_va_ten: 'B', don_vi_id: '88' }),
    uyVien({ id: '3', ho_va_ten: 'C', don_vi_id: '77' }),
  ];

  it('người xem toàn hệ thống thấy đủ', () => {
    expect(buildUyVienPrintRows(rows, viewerXemHet).map((r) => r.hoTen)).toEqual(['A', 'B', 'C']);
  });

  it('cán bộ xã chỉ in được ủy viên của xã mình', () => {
    const out = buildUyVienPrintRows(rows, viewerXaPhuong);
    expect(out.map((r) => r.hoTen)).toEqual(['A', 'C']);
    expect(out.map((r) => r.stt)).toEqual([1, 2]);
  });

  it('định dạng ngày sinh theo kiểu Việt Nam', () => {
    const out = buildUyVienPrintRows([uyVien({ ngay_sinh: '1980-03-08' })], viewerXemHet);
    expect(out[0].ngaySinh).toBe('08/03/1980');
  });
});

describe('tongHopCoCauUyVien', () => {
  it('đếm nữ, dân tộc thiểu số, đảng viên trong phạm vi xem', () => {
    const rows = [
      uyVien({ id: '1', gioi_tinh: 'Nữ', dan_toc: 'Thái', dang_vien: true, don_vi_id: '77' }),
      uyVien({ id: '2', gioi_tinh: 'Nam', dan_toc: 'Kinh', dang_vien: true, don_vi_id: '77' }),
      uyVien({ id: '3', gioi_tinh: 'Nữ', dan_toc: 'Kinh', dang_vien: false, don_vi_id: '88' }),
    ];
    expect(tongHopCoCauUyVien(rows, viewerXemHet)).toEqual({
      tong: 3,
      nu: 2,
      danToc: 1,
      dangVien: 2,
    });
    expect(tongHopCoCauUyVien(rows, viewerXaPhuong)).toEqual({
      tong: 2,
      nu: 1,
      danToc: 1,
      dangVien: 2,
    });
  });
});

describe('rutGonTenNhiemKy', () => {
  it('bỏ tiền tố "Nhiệm kỳ" có sẵn trong dữ liệu', () => {
    expect(rutGonTenNhiemKy('Nhiệm kỳ 2025 -2030')).toBe('2025 -2030');
    expect(rutGonTenNhiemKy('nhiệm kỳ 2024-2029')).toBe('2024-2029');
  });

  it('giữ nguyên khi không có tiền tố', () => {
    expect(rutGonTenNhiemKy('2025-2030')).toBe('2025-2030');
    expect(rutGonTenNhiemKy(null)).toBe('');
  });
});

describe('buildUyVienNhiemKyDocumentModel', () => {
  it('lấy tên nhiệm kỳ từ dữ liệu khi không truyền vào', () => {
    const model = buildUyVienNhiemKyDocumentModel({
      viewer: viewerXemHet,
      rows: [uyVien({ ten_nhiem_ky: '2024-2029' })],
    });
    expect(model.tenNhiemKy).toBe('2024-2029');
    expect(model.trichYeu).toContain('2024-2029');
  });

  it('bảng chỉ gồm ủy viên trong phạm vi xem và số liệu cơ cấu khớp', () => {
    const rows = [
      uyVien({ id: '1', ho_va_ten: 'A', gioi_tinh: 'Nữ', don_vi_id: '77' }),
      uyVien({ id: '2', ho_va_ten: 'B', don_vi_id: '88' }),
    ];
    const model = buildUyVienNhiemKyDocumentModel({ viewer: viewerXaPhuong, rows });
    const bang = model.noiDung.find((k) => k.kind === 'bang');
    if (bang?.kind === 'bang') {
      expect(bang.rows).toHaveLength(1);
      expect(bang.rows[0][1]).toBe('A');
    }
    expect(model.tongHop).toEqual({ tong: 1, nu: 1, danToc: 0, dangVien: 0 });
  });

  it('danh sách rỗng vẫn dựng được văn bản kèm câu thông báo trống', () => {
    const model = buildUyVienNhiemKyDocumentModel({ viewer: viewerXemHet, rows: [] });
    const bang = model.noiDung.find((k) => k.kind === 'bang');
    expect(bang?.kind).toBe('bang');
    if (bang?.kind === 'bang') {
      expect(bang.rows).toHaveLength(0);
      expect(bang.emptyMessage).toBeTruthy();
    }
  });
});
