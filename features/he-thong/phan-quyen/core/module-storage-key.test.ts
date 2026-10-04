import { describe, expect, it } from 'vitest';
import { getModuleStorageKey, resolveModuleIdFromStorageKey } from './module-storage-key';

/**
 * Nhóm Nghĩa tình dòng Lam đổi đường dẫn (2026-10-04) nhưng `module_key` trong
 * `var_phan_quyen` và tham số `fn_co_quyen(...)` của RLS GIỮ NGUYÊN. Bỏ nhầm một
 * `storageKey` là cả cơ quan mất quyền vào module mà DB không báo lỗi gì.
 */
const KHOA_KHONG_DOI: readonly [string, string][] = [
  ['nghia-tinh-dong-lam/chuong-trinh-van-dong', 'dot-cuu-tro'],
  ['nghia-tinh-dong-lam/tiep-nhan', 'tiep-nhan'],
  ['nghia-tinh-dong-lam/danh-muc-hang-hoa', 'hang-hoa'],
  ['nghia-tinh-dong-lam/tiep-nhan-phan-bo-hang', 'nhap-xuat-kho'],
  ['nghia-tinh-dong-lam/ton-kho', 'ton-kho'],
  ['nghia-tinh-dong-lam/danh-sach-kho', 'danh-sach-kho'],
  ['nghia-tinh-dong-lam/nha-tai-tro', 'don-vi-cuu-tro'],
  ['nghia-tinh-dong-lam/bao-cao-tiep-nhan-phan-bo', 'bao-cao-ho-tro'],
  ['nghia-tinh-dong-lam/khen-thuong-nha-tai-tro', 'khen-thuong-nha-tai-tro'],
  ['nghia-tinh-dong-lam/nha-dai-doan-ket', 'nha-dai-doan-ket'],
  ['nghia-tinh-dong-lam/chuong-trinh-ho-tro', 'vi-nguoi-ngheo'],
  ['nghia-tinh-dong-lam/doi-tuong-ho-tro', 'thong-tin-ho-ngheo'],
];

describe('khoá quyền nhóm Nghĩa tình dòng Lam không đổi theo đường dẫn', () => {
  it.each(KHOA_KHONG_DOI)('%s ⇄ %s', (moduleId, khoaDb) => {
    expect(getModuleStorageKey(moduleId)).toBe(khoaDb);
    expect(resolveModuleIdFromStorageKey(khoaDb)).toBe(moduleId);
  });

  it('khoá dạng đường dẫn cũ vẫn quy về module mới', () => {
    expect(resolveModuleIdFromStorageKey('mat-tran-to-quoc/kho-cuu-tro/dot-cuu-tro')).toBe(
      'nghia-tinh-dong-lam/chuong-trinh-van-dong',
    );
    expect(resolveModuleIdFromStorageKey('don-vi-ho-tro')).toBe('nghia-tinh-dong-lam/nha-tai-tro');
  });
});
