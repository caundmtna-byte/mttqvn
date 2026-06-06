import { describe, expect, it } from 'vitest';
import { canViewChuongTrinhNamRow, type ChuongTrinhNamViewer } from '../use-chuong-trinh-nam-viewer';

function row(id_phong_ban: string | null, id_nguoi_tao = 'other') {
  return { id_phong_ban, id_nguoi_tao };
}

describe('canViewChuongTrinhNamRow', () => {
  it('bypass when viewAll', () => {
    const viewer: ChuongTrinhNamViewer = {
      viewAll: true,
      viewerNhanVienId: '1',
      viewerPhongBanId: '5',
    };
    expect(canViewChuongTrinhNamRow(viewer, row('99'))).toBe(true);
  });

  it('restricted: cùng phòng ban thì được xem', () => {
    const viewer: ChuongTrinhNamViewer = {
      viewAll: false,
      viewerNhanVienId: '5',
      viewerPhongBanId: '3',
    };
    expect(canViewChuongTrinhNamRow(viewer, row('3'))).toBe(true);
    expect(canViewChuongTrinhNamRow(viewer, row('4'))).toBe(false);
  });

  it('restricted: người tạo luôn xem được của mình dù khác phòng', () => {
    const viewer: ChuongTrinhNamViewer = {
      viewAll: false,
      viewerNhanVienId: '5',
      viewerPhongBanId: '3',
    };
    expect(canViewChuongTrinhNamRow(viewer, row('99', '5'))).toBe(true);
  });

  it('restricted: người tạo xem được khi chương trình không có phòng ban', () => {
    const viewer: ChuongTrinhNamViewer = {
      viewAll: false,
      viewerNhanVienId: '5',
      viewerPhongBanId: '3',
    };
    expect(canViewChuongTrinhNamRow(viewer, row(null, '5'))).toBe(true);
  });

  it('restricted: không phải người tạo và khác phòng → không được xem', () => {
    const viewer: ChuongTrinhNamViewer = {
      viewAll: false,
      viewerNhanVienId: '5',
      viewerPhongBanId: '3',
    };
    expect(canViewChuongTrinhNamRow(viewer, row('4', '9'))).toBe(false);
  });

  it('restricted: chương trình không có phòng ban, không phải người tạo — không được xem', () => {
    const viewer: ChuongTrinhNamViewer = {
      viewAll: false,
      viewerNhanVienId: '5',
      viewerPhongBanId: '3',
    };
    expect(canViewChuongTrinhNamRow(viewer, row(null, '9'))).toBe(false);
  });

  it('restricted: viewer không có phòng ban và không phải người tạo — không được xem', () => {
    const viewer: ChuongTrinhNamViewer = {
      viewAll: false,
      viewerNhanVienId: '5',
      viewerPhongBanId: null,
    };
    expect(canViewChuongTrinhNamRow(viewer, row('3', '9'))).toBe(false);
  });

  it('restricted: viewer không có nhan_vien_id — chỉ xem theo phòng ban', () => {
    const viewer: ChuongTrinhNamViewer = {
      viewAll: false,
      viewerNhanVienId: null,
      viewerPhongBanId: '3',
    };
    expect(canViewChuongTrinhNamRow(viewer, row('3', '9'))).toBe(true);
    expect(canViewChuongTrinhNamRow(viewer, row('4', '9'))).toBe(false);
  });
});
