import { PERMISSION_FUNCTIONS } from './permission-modules-config';

/** `module_key` cũ trước khi đổi route → `module_id` chuẩn hiện tại. */
const LEGACY_MODULE_STORAGE_KEY_TO_ID: Record<string, string> = {
  'hoa-hong-viet-bai': 'quan-ly-viet-bai/nhuan-but-viet-bai',
  'quan-ly-viet-bai/hoa-hong-viet-bai': 'quan-ly-viet-bai/nhuan-but-viet-bai',
  'don-vi-ho-tro': 'nghia-tinh-dong-lam/nha-tai-tro',
  'mat-tran-to-quoc/kho-cuu-tro/don-vi-ho-tro': 'nghia-tinh-dong-lam/nha-tai-tro',
  'mat-tran-to-quoc/kho-cuu-tro/dot-cuu-tro': 'nghia-tinh-dong-lam/chuong-trinh-van-dong',
  'mat-tran-to-quoc/kho-cuu-tro/hang-hoa': 'nghia-tinh-dong-lam/danh-muc-hang-hoa',
  'mat-tran-to-quoc/kho-cuu-tro/nhap-xuat-kho': 'nghia-tinh-dong-lam/tiep-nhan-phan-bo-hang',
  'mat-tran-to-quoc/kho-cuu-tro/ton-kho': 'nghia-tinh-dong-lam/ton-kho',
  'mat-tran-to-quoc/kho-cuu-tro/danh-sach-kho': 'nghia-tinh-dong-lam/danh-sach-kho',
  'mat-tran-to-quoc/kho-cuu-tro/don-vi-cuu-tro': 'nghia-tinh-dong-lam/nha-tai-tro',
  'mat-tran-to-quoc/kho-cuu-tro/bao-cao-ho-tro': 'nghia-tinh-dong-lam/bao-cao-tiep-nhan-phan-bo',
  // module_id dạng đường dẫn trước khi nhóm đổi thành /nghia-tinh-dong-lam (2026-10-04).
  'an-sinh-xa-hoi/kho-cuu-tro/dot-cuu-tro': 'nghia-tinh-dong-lam/chuong-trinh-van-dong',
  'an-sinh-xa-hoi/kho-cuu-tro/tiep-nhan': 'nghia-tinh-dong-lam/tiep-nhan',
  'an-sinh-xa-hoi/kho-cuu-tro/hang-hoa': 'nghia-tinh-dong-lam/danh-muc-hang-hoa',
  'an-sinh-xa-hoi/kho-cuu-tro/nhap-xuat-kho': 'nghia-tinh-dong-lam/tiep-nhan-phan-bo-hang',
  'an-sinh-xa-hoi/kho-cuu-tro/ton-kho': 'nghia-tinh-dong-lam/ton-kho',
  'an-sinh-xa-hoi/kho-cuu-tro/danh-sach-kho': 'nghia-tinh-dong-lam/danh-sach-kho',
  'an-sinh-xa-hoi/kho-cuu-tro/don-vi-cuu-tro': 'nghia-tinh-dong-lam/nha-tai-tro',
  'an-sinh-xa-hoi/kho-cuu-tro/bao-cao-ho-tro': 'nghia-tinh-dong-lam/bao-cao-tiep-nhan-phan-bo',
  'an-sinh-xa-hoi/khen-thuong-nha-tai-tro/danh-sach': 'nghia-tinh-dong-lam/khen-thuong-nha-tai-tro',
  'an-sinh-xa-hoi/nha-dai-doan-ket/danh-sach': 'nghia-tinh-dong-lam/nha-dai-doan-ket',
  'an-sinh-xa-hoi/vi-nguoi-ngheo/danh-sach': 'nghia-tinh-dong-lam/chuong-trinh-ho-tro',
  'an-sinh-xa-hoi/thong-tin-ho-ngheo/danh-sach': 'nghia-tinh-dong-lam/doi-tuong-ho-tro',
};

function lastPathSegment(moduleId: string): string {
  const parts = moduleId.split('/').filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1]! : moduleId;
}

/** Key ngắn lưu DB — ưu tiên `storageKey` trong config, không thì segment cuối của `module_id`. */
export function getModuleStorageKey(moduleId: string): string {
  for (const fn of PERMISSION_FUNCTIONS) {
    for (const gr of fn.groups) {
      for (const m of gr.modules) {
        if (m.id === moduleId) {
          const custom = m.storageKey?.trim();
          return custom && custom.length > 0 ? custom : lastPathSegment(moduleId);
        }
      }
    }
  }
  return lastPathSegment(moduleId);
}

/** DB → `module_id` đầy đủ cho UI / `can()`. Hỗ trợ dòng cũ lưu full path. */
export function resolveModuleIdFromStorageKey(raw: string): string | null {
  const key = raw.trim();
  if (!key) return null;

  const legacyId = LEGACY_MODULE_STORAGE_KEY_TO_ID[key];
  if (legacyId) return legacyId;

  for (const fn of PERMISSION_FUNCTIONS) {
    for (const gr of fn.groups) {
      for (const m of gr.modules) {
        if (m.id === key) return m.id;
        const sk = m.storageKey?.trim();
        const effective = sk && sk.length > 0 ? sk : lastPathSegment(m.id);
        if (effective === key) return m.id;
      }
    }
  }
  return null;
}

/** Các giá trị `module_key` có thể có trên DB (ngắn + full path legacy) để xóa đúng dòng. */
export function moduleKeysForDbLookup(canonicalModuleId: string): string[] {
  const short = getModuleStorageKey(canonicalModuleId);
  const base = short === canonicalModuleId ? [short] : [...new Set([short, canonicalModuleId])];
  const legacyKeys = Object.entries(LEGACY_MODULE_STORAGE_KEY_TO_ID)
    .filter(([, id]) => id === canonicalModuleId)
    .map(([k]) => k);
  return [...new Set([...base, ...legacyKeys])];
}
