import { describe, expect, it } from 'vitest';
import { coTheSuaKhiKhoa, daKhoaSo, nguonKhoaKy } from './khoa-ky';

describe('nguonKhoaKy', () => {
  it('không khoá thì trả null', () => {
    expect(nguonKhoaKy({})).toBeNull();
    expect(nguonKhoaKy({ nhiemKyDaKhoa: false, kyHopDaKhoa: false })).toBeNull();
  });

  it('nhiệm kỳ khoá thì nguồn là nhiệm kỳ', () => {
    expect(nguonKhoaKy({ nhiemKyDaKhoa: true })).toBe('nhiem_ky');
  });

  it('chỉ kỳ họp khoá thì nguồn là kỳ họp', () => {
    expect(nguonKhoaKy({ nhiemKyDaKhoa: false, kyHopDaKhoa: true })).toBe('ky_hop');
  });

  it('cả hai cùng khoá thì nhiệm kỳ đè lên — mở khoá kỳ họp không đủ', () => {
    expect(nguonKhoaKy({ nhiemKyDaKhoa: true, kyHopDaKhoa: true })).toBe('nhiem_ky');
  });

  it('null/undefined coi như chưa khoá (dữ liệu cũ trước migration)', () => {
    expect(nguonKhoaKy({ nhiemKyDaKhoa: null, kyHopDaKhoa: undefined })).toBeNull();
  });
});

describe('daKhoaSo', () => {
  it('đúng bằng việc có nguồn khoá hay không', () => {
    expect(daKhoaSo({})).toBe(false);
    expect(daKhoaSo({ kyHopDaKhoa: true })).toBe(true);
    expect(daKhoaSo({ nhiemKyDaKhoa: true })).toBe(true);
  });
});

describe('coTheSuaKhiKhoa', () => {
  it('có quyền + chưa khoá ⇒ được', () => {
    expect(coTheSuaKhiKhoa({ coQuyen: true })).toBe(true);
    expect(coTheSuaKhiKhoa({ coQuyen: true, nhiemKyDaKhoa: false, kyHopDaKhoa: false })).toBe(true);
  });

  it('có quyền nhưng nhiệm kỳ đã khoá ⇒ không được', () => {
    expect(coTheSuaKhiKhoa({ coQuyen: true, nhiemKyDaKhoa: true })).toBe(false);
  });

  it('có quyền nhưng kỳ họp đã khoá ⇒ không được', () => {
    expect(coTheSuaKhiKhoa({ coQuyen: true, kyHopDaKhoa: true })).toBe(false);
  });

  it('chưa khoá nhưng không có quyền ⇒ không được', () => {
    expect(coTheSuaKhiKhoa({ coQuyen: false })).toBe(false);
    expect(coTheSuaKhiKhoa({})).toBe(false);
  });

  it('khoá sổ không phải là quyền: thiếu quyền hay đã khoá đều chặn như nhau', () => {
    expect(coTheSuaKhiKhoa({ coQuyen: false, nhiemKyDaKhoa: true })).toBe(false);
  });
});
