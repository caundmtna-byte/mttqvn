/**
 * Chuỗi giao diện (một ngôn ngữ): gộp bảng phẳng từ `ui` + các module để tra key động (`txt`).
 * Chuỗi tĩnh nên import trực tiếp từ `./ui` hoặc `features/.../text`.
 */
import { fmt } from '../fmt';
import { ui } from './ui';
import { tenure } from './tenure';
import { taiLieu } from './tai-lieu';
import { employee } from '../../features/he-thong/nhan-vien/text';
import { department } from '../../features/he-thong/phong-ban/text';
import { position } from '../../features/he-thong/chuc-vu/text';
import { permission } from '../../features/he-thong/phan-quyen/text';
import { company } from '../../features/he-thong/thong-tin-cong-ty/text';

function flatten(prefix: string, obj: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  function walk(p: string, o: unknown) {
    if (typeof o === 'string') {
      out[p] = o;
      return;
    }
    if (o && typeof o === 'object' && !Array.isArray(o)) {
      for (const [k, v] of Object.entries(o)) {
        walk(p ? `${p}.${k}` : k, v);
      }
    }
  }
  walk(prefix, obj);
  return out;
}

/** Tất cả key dạng `nav.home`, `employee.detail.fullName`, … */
export const STRINGS: Readonly<Record<string, string>> = Object.freeze({
  ...flatten('', ui),
  ...flatten('employee', employee),
  ...flatten('department', department),
  ...flatten('position', position),
  ...flatten('permission', permission),
  ...flatten('company', company),
  ...flatten('tenure', tenure),
  ...flatten('taiLieu', taiLieu),
});

export type TFunction = typeof txt;

/**
 * Tra chuỗi theo key (breadcrumb, phân quyền động, …).
 * Hỗ trợ thay `{{var}}` qua object options (bỏ qua `lng`, `ns`, `defaultValue`).
 */
export function txt(key: string, options?: Record<string, unknown> | string): string {
  if (typeof options === 'string') {
    const fallback = options;
    const raw = STRINGS[key];
    return raw !== undefined ? raw : fallback;
  }

  const raw = STRINGS[key];
  if (raw === undefined) return key;

  if (!options || typeof options !== 'object') return raw;

  const vars: Record<string, string | number | undefined> = {};
  for (const [k, v] of Object.entries(options)) {
    if (k === 'lng' || k === 'ns' || k === 'defaultValue') continue;
    vars[k] = v as string | number | undefined;
  }
  return fmt(raw, vars);
}

export { ui, tenure, taiLieu, employee, department, position, permission, company };
export { fmt };
