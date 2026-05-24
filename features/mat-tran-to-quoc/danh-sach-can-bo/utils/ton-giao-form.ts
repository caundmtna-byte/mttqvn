import {
  MTTQ_CAN_BO_TON_GIAO,
  MTTQ_CAN_BO_TON_GIAO_DEFAULT,
  type MttqCanBoTonGiao,
} from '../core/constants';

function isTonGiaoValue(s: string): s is MttqCanBoTonGiao {
  return (MTTQ_CAN_BO_TON_GIAO as readonly string[]).includes(s);
}

/** Chuẩn hoá giá trị DB (kể cả dữ liệu cũ dạng tên tôn giáo) → Có / Không cho form. */
export function normalizeTonGiaoFromDb(raw: string | null | undefined): MttqCanBoTonGiao {
  const s = String(raw ?? '').trim();
  if (!s) return MTTQ_CAN_BO_TON_GIAO_DEFAULT;
  if (isTonGiaoValue(s)) return s;
  const lower = s.toLowerCase();
  if (['không', 'khong', 'no', '0', 'false'].includes(lower)) return 'Không';
  if (['có', 'co', 'yes', '1', 'true', 'x'].includes(lower)) return 'Có';
  return 'Có';
}

/** Import Excel / CSV — mặc định « Không » nếu ô trống. */
export function parseImportTonGiao(raw: unknown): MttqCanBoTonGiao {
  if (raw == null || raw === '') return MTTQ_CAN_BO_TON_GIAO_DEFAULT;
  return normalizeTonGiaoFromDb(String(raw));
}
