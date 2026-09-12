import { describe, expect, it } from 'vitest';
import {
  canViewKyHopRow,
  type KyHopRowForViewGate,
  type MttqKyHopViewer,
} from '@/features/mat-tran-to-quoc/ky-hop/hooks/use-mttq-ky-hop-viewer';
import { canCountKyHop, resolveKyHopUpcomingScope } from './ky-hop-upcoming-scope';

function viewer(over: Partial<MttqKyHopViewer> = {}): MttqKyHopViewer {
  return {
    canViewAll: false,
    chucVuCapQuanLy: null,
    viewerNhanVienId: null,
    viewerDonViId: null,
    ...over,
  };
}

/** Mô phỏng bộ lọc PostgREST mà scope sinh ra, để so với luật lọc dòng của module Kỳ họp. */
function rowPassesScope(v: MttqKyHopViewer, row: KyHopRowForViewGate): boolean {
  const scope = resolveKyHopUpcomingScope(v);
  switch (scope.kind) {
    case 'all':
      return true;
    case 'don_vi':
      return row.don_vi_id?.toString().trim() === scope.donViId;
    case 'nguoi_tao':
      return row.id_nguoi_tao?.toString().trim() === scope.nhanVienId;
    case 'none':
      return false;
  }
}

describe('resolveKyHopUpcomingScope', () => {
  it('bypass (cap_bac=1 / quan_tri / admin) xem hết', () => {
    expect(resolveKyHopUpcomingScope(viewer({ canViewAll: true }))).toEqual({ kind: 'all' });
  });

  it('cấp Tỉnh xem hết', () => {
    expect(resolveKyHopUpcomingScope(viewer({ chucVuCapQuanLy: 'Tỉnh' }))).toEqual({ kind: 'all' });
  });

  it('cấp Xã phường lọc theo đơn vị của mình', () => {
    const v = viewer({ chucVuCapQuanLy: 'Xã phường', viewerDonViId: '12' });
    expect(resolveKyHopUpcomingScope(v)).toEqual({ kind: 'don_vi', donViId: '12' });
  });

  it('cấp Xã phường chưa gắn đơn vị thì KHÔNG đếm dòng nào', () => {
    const v = viewer({ chucVuCapQuanLy: 'Xã phường', viewerDonViId: null });
    expect(resolveKyHopUpcomingScope(v)).toEqual({ kind: 'none' });
    expect(canCountKyHop(resolveKyHopUpcomingScope(v))).toBe(false);
  });

  it('không có cấp quản lý thì chỉ đếm kỳ họp do mình tạo', () => {
    const v = viewer({ viewerNhanVienId: '7' });
    expect(resolveKyHopUpcomingScope(v)).toEqual({ kind: 'nguoi_tao', nhanVienId: '7' });
  });

  it('không cấp quản lý, không hồ sơ nhân viên ⇒ không đếm', () => {
    expect(resolveKyHopUpcomingScope(viewer())).toEqual({ kind: 'none' });
  });
});

describe('scope trùng khớp canViewKyHopRow — không nới rộng phạm vi', () => {
  const rows: KyHopRowForViewGate[] = [
    { don_vi_id: '12', id_nguoi_tao: '7' },
    { don_vi_id: '12', id_nguoi_tao: '9' },
    { don_vi_id: '34', id_nguoi_tao: '7' },
    { don_vi_id: '34', id_nguoi_tao: '9' },
    { don_vi_id: null, id_nguoi_tao: '7' },
    { don_vi_id: null, id_nguoi_tao: null },
  ];

  const viewers: MttqKyHopViewer[] = [
    viewer({ canViewAll: true }),
    viewer({ chucVuCapQuanLy: 'Tỉnh', viewerNhanVienId: '7', viewerDonViId: '12' }),
    viewer({ chucVuCapQuanLy: 'Xã phường', viewerNhanVienId: '7', viewerDonViId: '12' }),
    viewer({ chucVuCapQuanLy: 'Xã phường', viewerNhanVienId: '7', viewerDonViId: null }),
    viewer({ viewerNhanVienId: '7' }),
    viewer({ viewerNhanVienId: null }),
  ];

  it('mọi cặp (viewer, dòng) cho cùng kết quả', () => {
    for (const v of viewers) {
      for (const row of rows) {
        expect({ v, row, ok: rowPassesScope(v, row) }).toEqual({
          v,
          row,
          ok: canViewKyHopRow(v, row),
        });
      }
    }
  });
});
