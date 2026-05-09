import { describe, expect, it } from 'vitest';
import { canViewChuongTrinhNamRow, type ChuongTrinhNamViewer } from '../use-chuong-trinh-nam-viewer';

function row(id_nguoi_tao: string, id_phong_ban: string | null) {
  return { id_nguoi_tao, id_phong_ban };
}

describe('canViewChuongTrinhNamRow', () => {
  it('bypass when viewAll', () => {
    const viewer: ChuongTrinhNamViewer = {
      viewAll: true,
      viewerNhanVienId: '1',
      viewerPhongBanId: '10',
    };
    expect(canViewChuongTrinhNamRow(viewer, row('99', null))).toBe(true);
  });

  it('restricted: same creator OR same phong ban', () => {
    const viewer: ChuongTrinhNamViewer = {
      viewAll: false,
      viewerNhanVienId: '5',
      viewerPhongBanId: '100',
    };
    expect(canViewChuongTrinhNamRow(viewer, row('5', '200'))).toBe(true);
    expect(canViewChuongTrinhNamRow(viewer, row('6', '100'))).toBe(true);
    expect(canViewChuongTrinhNamRow(viewer, row('6', '200'))).toBe(false);
  });

  it('restricted: null row phong ban only matches creator', () => {
    const viewer: ChuongTrinhNamViewer = {
      viewAll: false,
      viewerNhanVienId: '5',
      viewerPhongBanId: '100',
    };
    expect(canViewChuongTrinhNamRow(viewer, row('5', null))).toBe(true);
    expect(canViewChuongTrinhNamRow(viewer, row('6', null))).toBe(false);
  });

  it('restricted: no viewer phong ban — only creator', () => {
    const viewer: ChuongTrinhNamViewer = {
      viewAll: false,
      viewerNhanVienId: '5',
      viewerPhongBanId: null,
    };
    expect(canViewChuongTrinhNamRow(viewer, row('5', '100'))).toBe(true);
    expect(canViewChuongTrinhNamRow(viewer, row('6', '100'))).toBe(false);
  });

  it('restricted: no viewer nhan vien id — only same phong ban', () => {
    const viewer: ChuongTrinhNamViewer = {
      viewAll: false,
      viewerNhanVienId: null,
      viewerPhongBanId: '100',
    };
    expect(canViewChuongTrinhNamRow(viewer, row('6', '100'))).toBe(true);
    expect(canViewChuongTrinhNamRow(viewer, row('6', null))).toBe(false);
  });
});
