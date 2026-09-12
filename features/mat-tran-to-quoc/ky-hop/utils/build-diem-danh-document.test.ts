import { describe, expect, it } from 'vitest';
import type { MttqUyVienUyBanListRow } from '@/features/mat-tran-to-quoc/uy-vien-uy-ban/core/types';
import type { MttqUyVienUyBanViewer } from '@/features/mat-tran-to-quoc/uy-vien-uy-ban/hooks/use-mttq-uy-vien-uy-ban-viewer';
import type { MttqDiemDanhUyVien, MttqKyHop } from '../core/types';
import {
  buildDiemDanhDocumentModel,
  buildDiemDanhPrintRows,
  buildTrangThaiMap,
  tongHopDiemDanh,
} from './build-diem-danh-document';

function uyVien(over: Partial<MttqUyVienUyBanListRow>): MttqUyVienUyBanListRow {
  return {
    id: over.id ?? '1',
    can_bo_id: '10',
    ma_uv: null,
    nhiem_ky_id: '5',
    ten_nhiem_ky: '2024-2029',
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
    so_ky_hop: 0,
    diem_danh_co_mat: 0,
    diem_danh_vang_mat: 0,
    diem_danh_chua: 0,
  };
}

function diemDanh(uyVienId: string, trangThai: 'Có mặt' | 'Vắng mặt'): MttqDiemDanhUyVien {
  return { id: `d${uyVienId}`, ky_hop_id: '99', uy_vien_id: uyVienId, trang_thai: trangThai, ghi_chu: null };
}

const kyHop: MttqKyHop = {
  id: '99',
  nhiem_ky_id: '5',
  ten_nhiem_ky: '2024-2029',
  don_vi_id: null,
  ten_don_vi: null,
  ky_thu: '3',
  ngay_hop: '2025-09-05',
  noi_dung_ky_hop: null,
  tai_lieu_hop: null,
  ghi_chu: null,
  id_nguoi_tao: '1',
  tg_tao: '2025-09-01T00:00:00Z',
  tg_cap_nhat: '2025-09-01T00:00:00Z',
  diem_danh_co_mat: 0,
  diem_danh_vang_mat: 0,
  diem_danh_chua: 0,
};

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

const rows = [
  uyVien({ id: '1', ho_va_ten: 'A', don_vi_id: '77' }),
  uyVien({ id: '2', ho_va_ten: 'B', don_vi_id: '88' }),
  uyVien({ id: '3', ho_va_ten: 'C', don_vi_id: '77' }),
];

describe('buildTrangThaiMap', () => {
  it('gom trạng thái theo uy_vien_id', () => {
    const m = buildTrangThaiMap([diemDanh('1', 'Có mặt'), diemDanh('2', 'Vắng mặt')]);
    expect(m.get('1')).toBe('Có mặt');
    expect(m.get('2')).toBe('Vắng mặt');
    expect(m.get('3')).toBeUndefined();
  });
});

describe('buildDiemDanhPrintRows', () => {
  it('ủy viên chưa có bản ghi điểm danh thì ghi "Chưa điểm danh", không để trống', () => {
    const out = buildDiemDanhPrintRows(rows, buildTrangThaiMap([diemDanh('1', 'Có mặt')]), viewerXemHet);
    expect(out.map((r) => r.trangThai)).toEqual(['Có mặt', 'Chưa điểm danh', 'Chưa điểm danh']);
  });

  it('cán bộ xã chỉ in được ủy viên cùng đơn vị, STT đánh lại liên tục', () => {
    const out = buildDiemDanhPrintRows(rows, new Map(), viewerXaPhuong);
    expect(out.map((r) => r.hoTen)).toEqual(['A', 'C']);
    expect(out.map((r) => r.stt)).toEqual([1, 2]);
  });
});

describe('buildDiemDanhPrintRows — lọc theo đơn vị kỳ họp', () => {
  it('kỳ họp cấp xã chỉ in ủy viên của xã đó', () => {
    const out = buildDiemDanhPrintRows(rows, new Map(), viewerXemHet, '77');
    expect(out.map((r) => r.hoTen)).toEqual(['A', 'C']);
  });

  it('giữ ủy viên khác đơn vị nếu đã có bản ghi điểm danh của kỳ họp này', () => {
    const dd = buildTrangThaiMap([diemDanh('2', 'Có mặt')]);
    const out = buildDiemDanhPrintRows(rows, dd, viewerXemHet, '77');
    expect(out.map((r) => r.hoTen)).toEqual(['A', 'B', 'C']);
  });

  it('kỳ họp cấp tỉnh (không có đơn vị) in toàn bộ ủy viên nhiệm kỳ', () => {
    const out = buildDiemDanhPrintRows(rows, new Map(), viewerXemHet, null);
    expect(out).toHaveLength(3);
  });
});

describe('tongHopDiemDanh', () => {
  it('đếm trên đúng những dòng được in, không đếm dòng ngoài phạm vi xem', () => {
    const dd = buildTrangThaiMap([
      diemDanh('1', 'Có mặt'),
      diemDanh('2', 'Có mặt'),
      diemDanh('3', 'Vắng mặt'),
    ]);
    const tatCa = tongHopDiemDanh(buildDiemDanhPrintRows(rows, dd, viewerXemHet));
    expect(tatCa).toEqual({ tong: 3, coMat: 2, vangMat: 1, chuaDiemDanh: 0 });

    const theoXa = tongHopDiemDanh(buildDiemDanhPrintRows(rows, dd, viewerXaPhuong));
    expect(theoXa).toEqual({ tong: 2, coMat: 1, vangMat: 1, chuaDiemDanh: 0 });
  });
});

describe('buildDiemDanhDocumentModel', () => {
  it('dựng đủ tiêu đề, thông tin chung và bảng theo phạm vi xem', () => {
    const model = buildDiemDanhDocumentModel(kyHop, {
      viewer: viewerXaPhuong,
      uyVienRows: rows,
      diemDanhRows: [diemDanh('1', 'Có mặt')],
    });

    expect(model.diaDanhNgayThang).toBe('Nghệ An, ngày 05 tháng 9 năm 2025');
    expect(model.trichYeu).toContain('3');
    expect(model.tongHop.tong).toBe(2);
    expect(model.rows).toHaveLength(2);

    const bang = model.noiDung.find((k) => k.kind === 'bang');
    if (bang?.kind === 'bang') {
      expect(bang.rows).toHaveLength(2);
      // Cột cuối là ô ký tên — luôn để trống cho người dự họp ký.
      expect(bang.rows[0][bang.headers.length - 1]).toBe('');
    }

    const tongHopMuc = model.thongTinChung?.find((m) => m.value.includes('Có mặt'));
    expect(tongHopMuc?.value).toContain('Có mặt 1');
  });
});
