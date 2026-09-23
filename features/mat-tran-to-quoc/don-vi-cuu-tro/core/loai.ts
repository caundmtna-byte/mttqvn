import { txt } from '@/lib/text';
import type { BadgeConfig } from '@/components/ui/EnumBadge';

/** Giá trị `loai` lưu DB — nhãn hiển thị qua `matTranDonViCuuTro.loai.*`. */
export const KHO_DON_VI_CUU_TRO_LOAI = [
  'doanh_nghiep',
  'cau_lac_bo',
  'cq_cap_tinh',
  'ca_nhan',
  'co_so_ton_giao',
  'nhom_thien_nguyen',
  'don_vi_su_nghiep',
  'cq_cap_xa',
] as const;

export type KhoDonViCuuTroLoai = (typeof KHO_DON_VI_CUU_TRO_LOAI)[number];

export const KHO_DON_VI_CUU_TRO_LOAI_DEFAULT: KhoDonViCuuTroLoai = 'doanh_nghiep';

const LOAI_SET = new Set<string>(KHO_DON_VI_CUU_TRO_LOAI);

/**
 * Bộ giá trị cũ (trước migration 20260921100000) → loại tương đương gần nhất.
 * Giữ lại để bản ghi còn nằm trong cache trình duyệt hoặc file nhập cũ không rơi
 * hết về giá trị mặc định.
 */
const LOAI_LEGACY: Record<string, KhoDonViCuuTroLoai> = {
  chua: 'co_so_ton_giao',
  giao_xu: 'co_so_ton_giao',
  co_quan: 'cq_cap_tinh',
  don_vi: 'don_vi_su_nghiep',
  to_chuc: 'don_vi_su_nghiep',
};

const LOAI_LABEL_KEY: Record<KhoDonViCuuTroLoai, `matTranDonViCuuTro.loai.${string}`> = {
  doanh_nghiep: 'matTranDonViCuuTro.loai.doanhNghiep',
  cau_lac_bo: 'matTranDonViCuuTro.loai.cauLacBo',
  cq_cap_tinh: 'matTranDonViCuuTro.loai.cqCapTinh',
  ca_nhan: 'matTranDonViCuuTro.loai.caNhan',
  co_so_ton_giao: 'matTranDonViCuuTro.loai.coSoTonGiao',
  nhom_thien_nguyen: 'matTranDonViCuuTro.loai.nhomThienNguyen',
  don_vi_su_nghiep: 'matTranDonViCuuTro.loai.donViSuNghiep',
  cq_cap_xa: 'matTranDonViCuuTro.loai.cqCapXa',
};

/** Chuẩn hoá giá trị từ DB / import (bộ giá trị cũ → loại tương đương). */
export function parseKhoDonViCuuTroLoai(raw: unknown): KhoDonViCuuTroLoai {
  const s = String(raw ?? KHO_DON_VI_CUU_TRO_LOAI_DEFAULT);
  if (LOAI_SET.has(s)) return s as KhoDonViCuuTroLoai;
  return LOAI_LEGACY[s] ?? KHO_DON_VI_CUU_TRO_LOAI_DEFAULT;
}

export function isKhoDonViCuuTroCaNhan(loai: KhoDonViCuuTroLoai): boolean {
  return loai === 'ca_nhan';
}

export function khoDonViCuuTroLoaiLabel(loai: KhoDonViCuuTroLoai): string {
  return txt(LOAI_LABEL_KEY[loai]);
}

export function buildKhoDonViCuuTroLoaiBadgeConfig(): BadgeConfig<KhoDonViCuuTroLoai> {
  return {
    doanh_nghiep: { label: txt('matTranDonViCuuTro.loai.doanhNghiep'), color: 'indigo' },
    cau_lac_bo: { label: txt('matTranDonViCuuTro.loai.cauLacBo'), color: 'cyan' },
    cq_cap_tinh: { label: txt('matTranDonViCuuTro.loai.cqCapTinh'), color: 'slate' },
    ca_nhan: { label: txt('matTranDonViCuuTro.loai.caNhan'), color: 'amber' },
    co_so_ton_giao: { label: txt('matTranDonViCuuTro.loai.coSoTonGiao'), color: 'violet' },
    nhom_thien_nguyen: { label: txt('matTranDonViCuuTro.loai.nhomThienNguyen'), color: 'rose' },
    don_vi_su_nghiep: { label: txt('matTranDonViCuuTro.loai.donViSuNghiep'), color: 'blue' },
    cq_cap_xa: { label: txt('matTranDonViCuuTro.loai.cqCapXa'), color: 'emerald' },
  };
}

export function khoDonViCuuTroLoaiComboboxOptions(): { label: string; value: KhoDonViCuuTroLoai }[] {
  return KHO_DON_VI_CUU_TRO_LOAI.map((value) => ({
    value,
    label: khoDonViCuuTroLoaiLabel(value),
  }));
}
