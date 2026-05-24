import { describe, expect, it } from 'vitest';
import {
  buildMttqCanBoChucVuOptions,
  chucVuBelongsToRootPhongBan,
  collectAllowedPhongBanIds,
  rowMatchesPhongBanFilter,
} from '../chuc-vu-options-for-phong-ban';

const departments = [
  { id: 'pb1', cha_id: null, trang_thai: 'Đang hoạt động' },
  { id: 'bp1', cha_id: 'pb1', trang_thai: 'Đang hoạt động' },
  { id: 'pb2', cha_id: null, trang_thai: 'Đang hoạt động' },
] as const;

const positions = [
  { id: 'cv1', ten_chuc_vu: 'CV PB1', phong_ban_id: 'pb1', trang_thai: 'Đang hoạt động' },
  { id: 'cv2', ten_chuc_vu: 'CV BP1', phong_ban_id: 'bp1', trang_thai: 'Đang hoạt động' },
  { id: 'cv3', ten_chuc_vu: 'CV PB2', phong_ban_id: 'pb2', trang_thai: 'Đang hoạt động' },
] as const;

describe('chuc-vu-options-for-phong-ban', () => {
  it('collectAllowedPhongBanIds includes root and child', () => {
    const ids = collectAllowedPhongBanIds('pb1', departments);
    expect([...ids].sort()).toEqual(['bp1', 'pb1']);
  });

  it('buildMttqCanBoChucVuOptions filters by phòng ban', () => {
    const opts = buildMttqCanBoChucVuOptions({
      positions,
      departments,
      rootPhongBanId: 'pb1',
    });
    expect(opts.map((o) => o.value).sort()).toEqual(['cv1', 'cv2']);
  });

  it('chucVuBelongsToRootPhongBan', () => {
    expect(chucVuBelongsToRootPhongBan('cv2', 'pb1', positions, departments)).toBe(true);
    expect(chucVuBelongsToRootPhongBan('cv3', 'pb1', positions, departments)).toBe(false);
  });

  it('rowMatchesPhongBanFilter matches child when filter is root', () => {
    expect(rowMatchesPhongBanFilter('bp1', ['pb1'], departments)).toBe(true);
    expect(rowMatchesPhongBanFilter('bp1', ['pb2'], departments)).toBe(false);
  });
});
