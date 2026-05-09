import type { MttqCanBo } from '@/features/mat-tran-to-quoc/danh-sach-can-bo/core/types';
import type { MttqLopTapHuanCt } from '@/features/mat-tran-to-quoc/danh-sach-tap-huan/core/types';

function pickEmbedded<T>(v: unknown): T | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return (v[0] as T | undefined) ?? undefined;
  return v as T;
}

/** Trường tối thiểu để dựng chuỗi hiển thị (client hoặc embed PostgREST). */
export type TapHuanCanBoSnapshotSource = {
  ten_chuc_vu?: string | null;
  ten_to_chuc?: string | null;
  ten_phong_ban?: string | null;
  ten_bo_phan?: string | null;
};

/** Chức vụ + « tổ chức — phòng ban » từ nguồn hồ sơ cán bộ. */
export function tapHuanSnapshotFromSource(
  s: TapHuanCanBoSnapshotSource | null | undefined,
): { chuc_vu: string; don_vi_cong_tac: string } {
  if (!s) return { chuc_vu: '', don_vi_cong_tac: '' };
  const chuc_vu = (s.ten_chuc_vu ?? '').trim();
  const toChuc = (s.ten_to_chuc ?? '').trim();
  const pb = (s.ten_phong_ban ?? '').trim();
  const boPhan = (s.ten_bo_phan ?? '').trim();
  const phongBanHienThi = pb && boPhan ? `${pb} · ${boPhan}` : pb || boPhan;
  const parts = [toChuc, phongBanHienThi].filter(Boolean);
  const don_vi_cong_tac = parts.join(' — ');
  return { chuc_vu, don_vi_cong_tac };
}

export function tapHuanSnapshotFromCanBo(
  c: MttqCanBo | null | undefined,
): { chuc_vu: string; don_vi_cong_tac: string } {
  return tapHuanSnapshotFromSource(
    c
      ? {
          ten_chuc_vu: c.ten_chuc_vu,
          ten_to_chuc: c.ten_to_chuc,
          ten_phong_ban: c.ten_phong_ban,
          ten_bo_phan: c.ten_bo_phan,
        }
      : undefined,
  );
}

/** Ba cột hiển thị bảng chi tiết / drawer (khớp cách tách trường hồ sơ cán bộ). */
export type TapHuanCanBoThreeColDisplay = {
  ten_to_chuc: string;
  ten_phong_ban: string;
  ten_chuc_vu: string;
};

export function tapHuanCanBoThreeColFromSource(
  s: TapHuanCanBoSnapshotSource | null | undefined,
): TapHuanCanBoThreeColDisplay {
  if (!s) return { ten_to_chuc: '', ten_phong_ban: '', ten_chuc_vu: '' };
  const pb = (s.ten_phong_ban ?? '').trim();
  const boPhan = (s.ten_bo_phan ?? '').trim();
  const ten_phong_ban = pb && boPhan ? `${pb} · ${boPhan}` : pb || boPhan;
  return {
    ten_to_chuc: (s.ten_to_chuc ?? '').trim(),
    ten_phong_ban,
    ten_chuc_vu: (s.ten_chuc_vu ?? '').trim(),
  };
}

export function tapHuanCanBoThreeColFromCanBo(
  c: MttqCanBo | null | undefined,
): TapHuanCanBoThreeColDisplay {
  return tapHuanCanBoThreeColFromSource(
    c
      ? {
          ten_chuc_vu: c.ten_chuc_vu,
          ten_to_chuc: c.ten_to_chuc,
          ten_phong_ban: c.ten_phong_ban,
          ten_bo_phan: c.ten_bo_phan,
        }
      : undefined,
  );
}

/** Đủ dữ liệu để tham gia lớp: có chức vụ và ít nhất một trong (tổ chức, phòng ban). */
export function tapHuanCanBoProfileComplete(c: MttqCanBo | null | undefined): boolean {
  const t = tapHuanCanBoThreeColFromCanBo(c);
  return Boolean(
    t.ten_chuc_vu.trim() && (t.ten_to_chuc.trim() || t.ten_phong_ban.trim()),
  );
}

/** Chi tiết lớp: ưu tiên danh sách cán bộ client, không thì dùng trường đã flatten từ API. */
export function tapHuanThreeColForChiTietRow(
  r: Pick<MttqLopTapHuanCt, 'chuc_vu' | 'ten_to_chuc' | 'ten_phong_ban' | 'can_bo_id'>,
  c: MttqCanBo | undefined,
): TapHuanCanBoThreeColDisplay {
  if (c) return tapHuanCanBoThreeColFromCanBo(c);
  return tapHuanCanBoThreeColFromSource({
    ten_chuc_vu: r.chuc_vu,
    ten_to_chuc: r.ten_to_chuc ?? null,
    ten_phong_ban: r.ten_phong_ban ?? null,
    ten_bo_phan: null,
  });
}

/** Bản ghi `can_bo` embed từ PostgREST (dòng `mttq_lop_tap_huan_ct`). */
export function tapHuanSnapshotSourceFromPostgrestCanBoEmbed(
  canBo: Record<string, unknown> | undefined,
): TapHuanCanBoSnapshotSource | undefined {
  if (!canBo) return undefined;
  const cvEmb = pickEmbedded<{ ten_chuc_vu?: unknown }>(canBo.chuc_vu);
  const tcEmb = pickEmbedded<{ ten?: unknown }>(canBo.to_chuc);
  const pbEmb = pickEmbedded<{ ten_phong_ban?: unknown }>(canBo.phong_ban);
  return {
    ten_chuc_vu: cvEmb?.ten_chuc_vu != null ? String(cvEmb.ten_chuc_vu) : null,
    ten_to_chuc: tcEmb?.ten != null ? String(tcEmb.ten) : null,
    ten_phong_ban: pbEmb?.ten_phong_ban != null ? String(pbEmb.ten_phong_ban) : null,
    ten_bo_phan: null,
  };
}
