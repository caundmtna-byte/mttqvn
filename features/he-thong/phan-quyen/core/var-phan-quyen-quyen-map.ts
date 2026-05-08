import type { ActionType } from './types';

/** Thứ tự cố định khi ghi DB (ổn định diff). Không ghi `tat_ca` — xem `actionsToQuyenText`. */
const VI_ORDER = [
  'xem',
  'them',
  'sua',
  'xoa',
  'phe_duyet',
  'xuat',
  'nhap',
  'quan_tri',
] as const;

const VI_TO_ACTION: Record<string, ActionType> = {
  xem: 'view',
  them: 'create',
  sua: 'update',
  xoa: 'delete',
  phe_duyet: 'approve',
  xuat: 'export',
  nhap: 'import',
  quan_tri: 'admin',
};

/** Parse cột `quyen` từ DB → danh sách ActionType (bỏ token không hợp lệ). */
export function parseQuyenTextToActions(raw: string | null | undefined): ActionType[] {
  const s = String(raw ?? '').trim();
  if (!s) return [];
  const seen = new Set<ActionType>();
  const out: ActionType[] = [];
  for (const part of s.split(',')) {
    const token = part.trim().toLowerCase();
    if (!token) continue;
    if (token === 'tat_ca') {
      for (const a of ['view', 'create', 'update', 'delete'] as const) {
        if (!seen.has(a)) {
          seen.add(a);
          out.push(a);
        }
      }
      continue;
    }
    const action = VI_TO_ACTION[token];
    if (action && !seen.has(action)) {
      seen.add(action);
      out.push(action);
    }
  }
  return out;
}

const CRUD_VI = ['xem', 'them', 'sua', 'xoa'] as const;

/** Ghi DB: ActionType[] → chuỗi token tiếng Việt. Không lưu `tat_ca`; chọn đủ cột “toàn bộ” (`all`) → chỉ `xem,them,sua,xoa`. */
export function actionsToQuyenText(actions: readonly ActionType[]): string {
  const set = new Set(actions);
  if (set.has('all')) {
    return CRUD_VI.join(',');
  }
  set.delete('all');
  const tokens: string[] = [];
  for (const vi of VI_ORDER) {
    const a = VI_TO_ACTION[vi];
    if (a && set.has(a)) tokens.push(vi);
  }
  return tokens.join(',');
}
