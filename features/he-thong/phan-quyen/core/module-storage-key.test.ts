import { describe, expect, it } from 'vitest';
import { getModuleStorageKey, resolveModuleIdFromStorageKey } from './module-storage-key';

/**
 * Nhóm Công tác xã hội đổi đường dẫn (2026-10-04, 2026-10-09) nhưng `module_key` trong
 * `var_phan_quyen` và tham số `fn_co_quyen(...)` của RLS GIỮ NGUYÊN. Bỏ nhầm một
 * `storageKey` là cả cơ quan mất quyền vào module mà DB không báo lỗi gì.
 */
const KHOA_KHONG_DOI: readonly [string, string][] = [
  ['cong-tac-xa-hoi/chuong-trinh-van-dong', 'dot-cuu-tro'],
  ['cong-tac-xa-hoi/tiep-nhan-tien', 'tiep-nhan'],
  ['cong-tac-xa-hoi/danh-muc-hang-hoa', 'hang-hoa'],
  ['cong-tac-xa-hoi/tiep-nhan-phan-bo-hang', 'nhap-xuat-kho'],
  ['cong-tac-xa-hoi/ton-kho', 'ton-kho'],
  ['cong-tac-xa-hoi/danh-sach-kho', 'danh-sach-kho'],
  ['cong-tac-xa-hoi/nha-tai-tro', 'don-vi-cuu-tro'],
  ['cong-tac-xa-hoi/bao-cao-tiep-nhan-phan-bo', 'bao-cao-ho-tro'],
  ['cong-tac-xa-hoi/khen-thuong-nha-tai-tro', 'khen-thuong-nha-tai-tro'],
  ['cong-tac-xa-hoi/nha-dai-doan-ket', 'nha-dai-doan-ket'],
  ['cong-tac-xa-hoi/chuong-trinh-ho-tro', 'vi-nguoi-ngheo'],
  ['cong-tac-xa-hoi/doi-tuong-ho-tro', 'thong-tin-ho-ngheo'],
];

describe('khoá quyền nhóm Công tác xã hội không đổi theo đường dẫn', () => {
  it.each(KHOA_KHONG_DOI)('%s ⇄ %s', (moduleId, khoaDb) => {
    expect(getModuleStorageKey(moduleId)).toBe(khoaDb);
    expect(resolveModuleIdFromStorageKey(khoaDb)).toBe(moduleId);
  });

  it('khoá dạng đường dẫn cũ vẫn quy về module mới', () => {
    expect(resolveModuleIdFromStorageKey('mat-tran-to-quoc/kho-cuu-tro/dot-cuu-tro')).toBe(
      'cong-tac-xa-hoi/chuong-trinh-van-dong',
    );
    expect(resolveModuleIdFromStorageKey('don-vi-ho-tro')).toBe('cong-tac-xa-hoi/nha-tai-tro');
    expect(resolveModuleIdFromStorageKey('nghia-tinh-dong-lam/tiep-nhan')).toBe('cong-tac-xa-hoi/tiep-nhan-tien');
    expect(resolveModuleIdFromStorageKey('nghia-tinh-dong-lam/nha-tai-tro')).toBe('cong-tac-xa-hoi/nha-tai-tro');
  });
});
