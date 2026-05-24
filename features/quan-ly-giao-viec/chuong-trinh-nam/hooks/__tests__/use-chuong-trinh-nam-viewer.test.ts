import { describe, expect, it } from 'vitest';
import { canViewChuongTrinhNamRow, type ChuongTrinhNamViewer } from '../use-chuong-trinh-nam-viewer';

function row(id_nguoi_tao: string) {
  return { id_nguoi_tao };
}

describe('canViewChuongTrinhNamRow', () => {
  it('bypass when viewAll', () => {
    const viewer: ChuongTrinhNamViewer = {
      viewAll: true,
      viewerNhanVienId: '1',
    };
    expect(canViewChuongTrinhNamRow(viewer, row('99'))).toBe(true);
  });

  it('restricted: only creator', () => {
    const viewer: ChuongTrinhNamViewer = {
      viewAll: false,
      viewerNhanVienId: '5',
    };
    expect(canViewChuongTrinhNamRow(viewer, row('5'))).toBe(true);
    expect(canViewChuongTrinhNamRow(viewer, row('6'))).toBe(false);
  });

  it('restricted: no viewer nhan vien id — no rows', () => {
    const viewer: ChuongTrinhNamViewer = {
      viewAll: false,
      viewerNhanVienId: null,
    };
    expect(canViewChuongTrinhNamRow(viewer, row('5'))).toBe(false);
  });
});
