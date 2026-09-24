/**
 * Kế hoạch nhập file: đối chiếu từng dòng với bản ghi đã có rồi phân loại
 * thêm mới / ghi đè / bỏ qua / lỗi. Hàm thuần — cùng một kế hoạch dùng cho cả
 * bước xem trước và bước ghi thật, nên con số người dùng thấy trước khi bấm
 * đúng bằng thứ sẽ xảy ra.
 *
 * Mỗi module chỉ khai danh sách khoá (`ImportKeySpec`): khoá nào là unique dưới
 * DB, cách chuẩn hoá giá trị ở bản ghi cũ và ở dòng trong file. Luật chung:
 *
 * - Trùng khoá unique (hoặc khoá tham chiếu đang chọn) ngay trong file → lỗi.
 * - `insert`: đụng khoá unique của bản ghi đã có → bỏ qua (DB sẽ chặn).
 * - `update`: không khớp bản ghi nào theo khoá đang chọn → bỏ qua.
 * - `upsert`: không khớp khoá đang chọn nhưng đụng unique ở khoá KHÁC → lỗi.
 * - Khoá không unique khớp từ hai bản ghi trở lên → lỗi, không đoán.
 * - Khớp được nhưng đụng unique của một bản ghi KHÁC → lỗi (DB sẽ trả 23505).
 * - Hai dòng cùng trỏ một bản ghi → dòng sau lỗi.
 * - Bản ghi ngoài phạm vi ghi của người dùng (`canWrite`) → lỗi.
 */
import { txt } from '@/lib/text';
import type { ImportWriteMode } from '@/components/shared/ImportDialog';

export interface ImportKeySpec<E, R> {
  key: string;
  /** Nhãn dùng trong câu báo lỗi, ví dụ "số CCCD". */
  label: string;
  /** Khớp đúng một unique index dưới DB (khoá chính `id` cũng là unique). */
  unique: boolean;
  /** Giá trị khoá đã chuẩn hoá; `null` = bản ghi/dòng không có khoá này. */
  ofExisting: (e: E) => string | null;
  ofRow: (r: R) => string | null;
}

export interface ImportPlanItem<R> {
  rowNum: number;
  row: R;
  /** Id bản ghi sẽ bị ghi đè (chỉ có ở nhánh `updates`). */
  existingId?: string;
}

export interface ImportPlanIssue<R> {
  rowNum: number;
  row: R;
  message: string;
}

export interface ImportPlan<R> {
  creates: ImportPlanItem<R>[];
  updates: ImportPlanItem<R>[];
  /** Dòng CỐ Ý không ghi theo chế độ đã chọn — không phải lỗi. */
  skips: ImportPlanIssue<R>[];
  errors: ImportPlanIssue<R>[];
}

export interface BuildImportPlanInput<E, R> {
  rows: readonly R[];
  existing: readonly E[];
  mode: ImportWriteMode;
  /** Khoá tham chiếu người dùng chọn. Thứ tự khớp theo thứ tự trong `keys`. */
  matchKeys: readonly string[];
  keys: readonly ImportKeySpec<E, R>[];
  /** Bản ghi này người dùng có được ghi đè không. Bỏ trống = được hết. */
  canWrite?: (e: E) => boolean;
  /**
   * Luật riêng của module khi ghi đè — cần CẢ bản ghi cũ lẫn dòng mới (ví dụ
   * xoá đơn vị của một hồ sơ cấp xã). Trả câu lỗi (không kèm "Dòng n: ") hoặc
   * `null`. Chạy ở bước lập kế hoạch nên bước xem trước đã thấy lỗi.
   */
  checkUpdate?: (e: E, row: R) => string | null;
}

/** Họ tên, tên danh mục…: bỏ khoảng trắng thừa, không phân biệt hoa/thường. */
export function chuanHoaKhoaVanBan(v: string | null | undefined): string | null {
  const s = (v ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
  return s === '' ? null : s;
}

/** Ghép nhiều phần thành một khoá; thiếu bất kỳ phần nào thì không có khoá. */
export function ghepKhoa(...parts: (string | null | undefined)[]): string | null {
  const norm = parts.map((p) => (p == null ? '' : String(p).trim()));
  return norm.some((p) => p === '') ? null : norm.join('␟');
}

function rowMsg(rowNum: number, message: string): string {
  return txt('shared.import.rowPrefix', { row: rowNum }) + message;
}

export function buildImportPlan<E extends { id: string }, R extends { rowNum: number }>(
  input: BuildImportPlanInput<E, R>,
): ImportPlan<R> {
  const plan: ImportPlan<R> = { creates: [], updates: [], skips: [], errors: [] };
  const selected = input.keys.filter((k) => input.matchKeys.includes(k.key));
  const selectedSet = new Set(selected.map((k) => k.key));

  /** Khoá → mọi bản ghi mang khoá đó (khoá không unique có thể nhiều bản ghi). */
  const index = new Map<string, Map<string, E[]>>();
  for (const spec of input.keys) {
    const m = new Map<string, E[]>();
    for (const e of input.existing) {
      const v = spec.ofExisting(e);
      if (v == null) continue;
      const list = m.get(v);
      if (list) list.push(e);
      else m.set(v, [e]);
    }
    index.set(spec.key, m);
  }
  const lookup = (spec: ImportKeySpec<E, R>, row: R): E[] => {
    const v = spec.ofRow(row);
    return v == null ? [] : (index.get(spec.key)?.get(v) ?? []);
  };

  /** Khoá cần soi trùng trong file: mọi khoá unique + khoá đang chọn. */
  const fileCheckKeys = input.keys.filter((k) => k.unique || selectedSet.has(k.key));
  const seen = new Map<string, Map<string, number>>(fileCheckKeys.map((k) => [k.key, new Map()]));
  /** Bản ghi đã bị một dòng nhận — chặn hai dòng cùng ghi đè một bản ghi. */
  const claimed = new Map<string, number>();
  const uniqueKeys = input.keys.filter((k) => k.unique);

  rowLoop: for (const row of input.rows) {
    const err = (message: string) =>
      plan.errors.push({ rowNum: row.rowNum, row, message: rowMsg(row.rowNum, message) });
    const skip = (message: string) =>
      plan.skips.push({ rowNum: row.rowNum, row, message: rowMsg(row.rowNum, message) });

    for (const spec of fileCheckKeys) {
      const v = spec.ofRow(row);
      if (v == null) continue;
      const prev = seen.get(spec.key)!.get(v);
      if (prev != null) {
        err(txt('shared.import.errTrungTrongFile', { cot: spec.label, row: prev }));
        continue rowLoop;
      }
    }
    for (const spec of fileCheckKeys) {
      const v = spec.ofRow(row);
      if (v != null) seen.get(spec.key)!.set(v, row.rowNum);
    }

    /** Bản ghi đầu tiên đụng khoá unique (chọn hay không) — DB chắc chắn chặn. */
    const uniqueHit = (): E | undefined => {
      for (const spec of uniqueKeys) {
        const hit = lookup(spec, row)[0];
        if (hit) return hit;
      }
      return undefined;
    };

    if (input.mode === 'insert') {
      if (uniqueHit()) skip(txt('shared.import.skipDaTonTai'));
      else plan.creates.push({ rowNum: row.rowNum, row });
      continue;
    }

    let matched: E | undefined;
    for (const spec of selected) {
      const hits = lookup(spec, row);
      if (hits.length > 1) {
        err(txt('shared.import.errKhopNhieu', { cot: spec.label, count: hits.length }));
        continue rowLoop;
      }
      if (hits.length === 1) {
        matched = hits[0];
        break;
      }
    }

    if (!matched) {
      if (input.mode === 'update') {
        skip(txt('shared.import.skipChuaTonTai'));
        continue;
      }
      if (uniqueHit()) {
        // Không khớp theo khoá đã chọn nhưng lại đụng bản ghi cũ ở khoá khác:
        // thêm mới chắc chắn hỏng. Nói rõ để người dùng tick thêm cột tham chiếu.
        err(txt('shared.import.errTrungKhoaKhac'));
        continue;
      }
      plan.creates.push({ rowNum: row.rowNum, row });
      continue;
    }

    for (const spec of uniqueKeys) {
      const other = lookup(spec, row).find((e) => e.id !== matched.id);
      if (other) {
        err(txt('shared.import.errTrungBanGhiKhac', { cot: spec.label }));
        continue rowLoop;
      }
    }

    if (input.canWrite && !input.canWrite(matched)) {
      err(txt('shared.import.errNgoaiPhamVi'));
      continue;
    }

    const updateErr = input.checkUpdate?.(matched, row);
    if (updateErr) {
      err(updateErr);
      continue;
    }

    const claimedBy = claimed.get(matched.id);
    if (claimedBy != null) {
      err(txt('shared.import.errTrungBanGhiDich', { row: claimedBy }));
      continue;
    }
    claimed.set(matched.id, row.rowNum);
    plan.updates.push({ rowNum: row.rowNum, row, existingId: matched.id });
  }

  return plan;
}
