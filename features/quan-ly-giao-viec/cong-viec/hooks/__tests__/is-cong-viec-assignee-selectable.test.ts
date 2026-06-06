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
    viewerPhongBanId: null,
    ...partial,
  };
}

function emp(id: string, don_vi_id?: string | null, id_phong_ban?: string | null) {
  return { id, don_vi_id, id_phong_ban };
}

describe('isCongViecAssigneeSelectable', () => {
  it('canSelectAll bypass — mọi NV', () => {
    const s = scope({ canSelectAll: true, chucVuCapQuanLy: 'Xã phường', viewerDonViId: '1' });
    expect(isCongViecAssigneeSelectable(s, emp('99', '2'))).toBe(true);
  });

  it('Tỉnh qua canSelectAll (cap_bac=1 / quan_tri) — NV khác phòng vẫn được chọn', () => {
    const s = scope({
      canSelectAll: true,
      chucVuCapQuanLy: 'Tỉnh',
      viewerDonViId: '1',
      viewerPhongBanId: '5',
    });
    expect(isCongViecAssigneeSelectable(s, emp('2', '99', '99'))).toBe(true);
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

  it('cap_quan_ly null, không có viewerPhongBanId — chỉ ngoại lệ', () => {
    const s = scope({ chucVuCapQuanLy: null, viewerDonViId: '10', viewerPhongBanId: null });
    expect(isCongViecAssigneeSelectable(s, emp('2', '10', '5'))).toBe(false);
    expect(
      isCongViecAssigneeSelectable(s, emp('2', '10', '5'), { savedTrachNhiemId: '2' }),
    ).toBe(true);
  });

  it('Tỉnh không bypass — cùng phòng ban thì được chọn', () => {
    const s = scope({ chucVuCapQuanLy: 'Tỉnh', viewerPhongBanId: '7' });
    expect(isCongViecAssigneeSelectable(s, emp('2', null, '7'))).toBe(true);
  });

  it('Tỉnh không bypass — khác phòng ban → không, trừ ngoại lệ', () => {
    const s = scope({ chucVuCapQuanLy: 'Tỉnh', viewerPhongBanId: '7' });
    expect(isCongViecAssigneeSelectable(s, emp('2', null, '8'))).toBe(false);
    expect(
      isCongViecAssigneeSelectable(s, emp('2', null, '8'), { viewerNhanVienId: '2' }),
    ).toBe(true);
    expect(
      isCongViecAssigneeSelectable(s, emp('2', null, '8'), { savedTrachNhiemId: '2' }),
    ).toBe(true);
    expect(
      isCongViecAssigneeSelectable(s, emp('3', null, '8'), { savedHoTroIds: ['3'] }),
    ).toBe(true);
  });

  it('Tỉnh không bypass, NV không có phòng ban — không được chọn', () => {
    const s = scope({ chucVuCapQuanLy: 'Tỉnh', viewerPhongBanId: '7' });
    expect(isCongViecAssigneeSelectable(s, emp('2', null, null))).toBe(false);
  });

  it('null cap_quan_ly với viewerPhongBanId — cùng phòng ban thì được chọn', () => {
    const s = scope({ chucVuCapQuanLy: null, viewerPhongBanId: '3' });
    expect(isCongViecAssigneeSelectable(s, emp('2', null, '3'))).toBe(true);
    expect(isCongViecAssigneeSelectable(s, emp('2', null, '4'))).toBe(false);
  });
});
