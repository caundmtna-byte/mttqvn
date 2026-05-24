import { describe, expect, it } from 'vitest';
import {
  isCongViecAssigneeSelectable,
  type CongViecAssigneeScope,
} from '../use-cong-viec-assignee-scope';

function scope(partial: Partial<CongViecAssigneeScope>): CongViecAssigneeScope {
  return {
    canSelectAll: false,
    chucVuCapQuanLy: null,
    viewerDonViId: null,
    ...partial,
  };
}

function emp(id: string, don_vi_id?: string | null) {
  return { id, don_vi_id };
}

describe('isCongViecAssigneeSelectable', () => {
  it('canSelectAll bypass — mọi NV', () => {
    const s = scope({ canSelectAll: true, chucVuCapQuanLy: 'Xã phường', viewerDonViId: '1' });
    expect(isCongViecAssigneeSelectable(s, emp('99', '2'))).toBe(true);
  });

  it('Tỉnh qua canSelectAll — NV khác đơn vị vẫn được chọn', () => {
    const s = scope({ canSelectAll: true, chucVuCapQuanLy: 'Tỉnh', viewerDonViId: '1' });
    expect(isCongViecAssigneeSelectable(s, emp('2', '99'))).toBe(true);
  });

  it('Xã phường — cùng don_vi_id', () => {
    const s = scope({ chucVuCapQuanLy: 'Xã phường', viewerDonViId: '10' });
    expect(isCongViecAssigneeSelectable(s, emp('2', '10'))).toBe(true);
  });

  it('Xã phường — khác don_vi_id → không, trừ ngoại lệ', () => {
    const s = scope({ chucVuCapQuanLy: 'Xã phường', viewerDonViId: '10' });
    expect(isCongViecAssigneeSelectable(s, emp('2', '20'))).toBe(false);
    expect(
      isCongViecAssigneeSelectable(s, emp('2', '20'), {
        viewerNhanVienId: '2',
      }),
    ).toBe(true);
    expect(
      isCongViecAssigneeSelectable(s, emp('2', '20'), {
        savedTrachNhiemId: '2',
      }),
    ).toBe(true);
    expect(
      isCongViecAssigneeSelectable(s, emp('3', '20'), {
        savedHoTroIds: ['3'],
      }),
    ).toBe(true);
  });

  it('Xã phường không có viewerDonViId — chỉ ngoại lệ', () => {
    const s = scope({ chucVuCapQuanLy: 'Xã phường', viewerDonViId: null });
    expect(isCongViecAssigneeSelectable(s, emp('2', '10'))).toBe(false);
    expect(
      isCongViecAssigneeSelectable(s, emp('5', '10'), { viewerNhanVienId: '5' }),
    ).toBe(true);
  });

  it('cap_quan_ly null — chỉ ngoại lệ', () => {
    const s = scope({ chucVuCapQuanLy: null, viewerDonViId: '10' });
    expect(isCongViecAssigneeSelectable(s, emp('2', '10'))).toBe(false);
    expect(
      isCongViecAssigneeSelectable(s, emp('2', '10'), { savedTrachNhiemId: '2' }),
    ).toBe(true);
  });
});
