import type { BadgeConfig } from '@/components/ui/EnumBadge';
import { txt } from '@/lib/text';
import type { MttqTangLuongLoaiKy } from '../core/types';
import { MTTQ_TANG_LUONG_LOAI_KY_OPTIONS } from '../core/constants';

export function getTangLuongLoaiKyLabel(loai: MttqTangLuongLoaiKy): string {
  return MTTQ_TANG_LUONG_LOAI_KY_OPTIONS.find((o) => o.value === loai)?.label ?? loai;
}

export function getTangLuongLoaiKyBadgeConfig(): BadgeConfig<MttqTangLuongLoaiKy> {
  const map: Record<MttqTangLuongLoaiKy, { label: string; color: 'emerald' | 'amber' | 'rose' | 'sky' }> = {
    dung_han: { label: txt('matTranTangLuong.loaiKy.dungHan'), color: 'emerald' },
    truoc_han_6: { label: txt('matTranTangLuong.loaiKy.truocHan6'), color: 'amber' },
    truoc_han_9: { label: txt('matTranTangLuong.loaiKy.truocHan9'), color: 'rose' },
    truoc_han_12: { label: txt('matTranTangLuong.loaiKy.truocHan12'), color: 'sky' },
  };
  return MTTQ_TANG_LUONG_LOAI_KY_OPTIONS.reduce(
    (acc, o) => {
      acc[o.value] = { label: map[o.value].label, color: map[o.value].color };
      return acc;
    },
    {} as BadgeConfig<MttqTangLuongLoaiKy>,
  );
}

export function formatNgachBacLabel(tenNgach: string | null | undefined, maBac: string | null | undefined): string {
  if (!tenNgach && !maBac) return '—';
  if (tenNgach && maBac) return `${tenNgach} · ${maBac}`;
  return tenNgach ?? maBac ?? '—';
}
