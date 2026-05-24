import { txt } from '@/lib/text';
import type { BadgeConfig } from '@/components/ui/EnumBadge';

/** Giá trị `loai` lưu DB — nhãn hiển thị qua `matTranDonViCuuTro.loai.*`. */
export const KHO_DON_VI_CUU_TRO_LOAI = ['chua', 'giao_xu', 'co_quan', 'don_vi', 'ca_nhan'] as const;

export type KhoDonViCuuTroLoai = (typeof KHO_DON_VI_CUU_TRO_LOAI)[number];

export const KHO_DON_VI_CUU_TRO_LOAI_DEFAULT: KhoDonViCuuTroLoai = 'don_vi';

const LOAI_SET = new Set<string>(KHO_DON_VI_CUU_TRO_LOAI);

const LOAI_LABEL_KEY: Record<KhoDonViCuuTroLoai, `matTranDonViCuuTro.loai.${string}`> = {
  chua: 'matTranDonViCuuTro.loai.chua',
  giao_xu: 'matTranDonViCuuTro.loai.giaoXu',
  co_quan: 'matTranDonViCuuTro.loai.coQuan',
  don_vi: 'matTranDonViCuuTro.loai.donVi',
  ca_nhan: 'matTranDonViCuuTro.loai.caNhan',
};

/** Chuẩn hoá giá trị từ DB / import (`to_chuc` cũ → `don_vi`). */
export function parseKhoDonViCuuTroLoai(raw: unknown): KhoDonViCuuTroLoai {
  const s = String(raw ?? KHO_DON_VI_CUU_TRO_LOAI_DEFAULT);
  if (s === 'to_chuc') return 'don_vi';
  if (LOAI_SET.has(s)) return s as KhoDonViCuuTroLoai;
  return KHO_DON_VI_CUU_TRO_LOAI_DEFAULT;
}

export function isKhoDonViCuuTroCaNhan(loai: KhoDonViCuuTroLoai): boolean {
  return loai === 'ca_nhan';
}

export function khoDonViCuuTroLoaiLabel(loai: KhoDonViCuuTroLoai): string {
  return txt(LOAI_LABEL_KEY[loai]);
}

export function buildKhoDonViCuuTroLoaiBadgeConfig(): BadgeConfig<KhoDonViCuuTroLoai> {
  return {
    chua: { label: txt('matTranDonViCuuTro.loai.chua'), color: 'violet' },
    giao_xu: { label: txt('matTranDonViCuuTro.loai.giaoXu'), color: 'blue' },
    co_quan: { label: txt('matTranDonViCuuTro.loai.coQuan'), color: 'slate' },
    don_vi: { label: txt('matTranDonViCuuTro.loai.donVi'), color: 'indigo' },
    ca_nhan: { label: txt('matTranDonViCuuTro.loai.caNhan'), color: 'amber' },
  };
}

export function khoDonViCuuTroLoaiComboboxOptions(): { label: string; value: KhoDonViCuuTroLoai }[] {
  return KHO_DON_VI_CUU_TRO_LOAI.map((value) => ({
    value,
    label: khoDonViCuuTroLoaiLabel(value),
  }));
}
