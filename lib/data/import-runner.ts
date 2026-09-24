/**
 * Điều phối nhập file dùng chung: đọc dòng → dựng kế hoạch → xem trước / ghi.
 *
 * Module chỉ khai: cách nạp dữ liệu tham chiếu + bản ghi đã có (`load`), cách đọc
 * một dòng (`parseRow`), danh sách khoá (`keys`), và hai hàm ghi (`create`,
 * `update`). Xem trước và ghi thật gọi chung `prepare`, nên con số ở bước xem
 * trước đúng bằng thứ sẽ ghi.
 *
 * Ghi đè CHỈ đụng các cột có trong file (đã map ở hộp thoại) — xem
 * `pickMappedColumns`. Ghi tuần tự: mỗi dòng một lỗi riêng, dòng hỏng không kéo
 * dòng lành theo.
 */
import { txt } from '@/lib/text';
import { getErrorMessage } from '@/lib/utils';
import {
  IMPORT_ROW_NUM_KEY,
  type ImportBatchResult,
  type ImportDryRunResult,
  type ImportErrorRow,
  type ImportRunOptions,
} from '@/components/shared/ImportDialog';
import { buildImportPlan, type ImportKeySpec, type ImportPlan } from './import-plan';

export type ImportRowOutcome<T> = { ok: true; data: T } | { ok: false; message: string };

/** Dòng đã đọc: luôn mang số dòng và dữ liệu gốc (để file lỗi tải về còn đủ). */
export interface ImportParsedRow {
  rowNum: number;
  raw: Record<string, unknown>;
}

export interface ImportLoaded<Ctx, E> {
  ctx: Ctx;
  existing: readonly E[];
  notes?: string[];
}

export interface ImportRunnerConfig<Ctx, E extends { id: string }, R extends ImportParsedRow> {
  maxRows: number;
  load: (rows: readonly Record<string, unknown>[], options: ImportRunOptions) => Promise<ImportLoaded<Ctx, E>>;
  parseRow: (rowNum: number, raw: Record<string, unknown>, ctx: Ctx) => ImportRowOutcome<R>;
  keys: readonly ImportKeySpec<E, R>[];
  canWrite?: (e: E, ctx: Ctx) => boolean;
  /** Luật riêng khi ghi đè, xét cả bản ghi cũ — xem `BuildImportPlanInput.checkUpdate`. */
  checkUpdate?: (e: E, row: R, mapped: ReadonlySet<string>, ctx: Ctx) => string | null;
  create: (row: R, ctx: Ctx) => Promise<unknown>;
  /** `mapped`: cột có trong file — chỉ ghi các cột này. */
  update: (id: string, row: R, mapped: ReadonlySet<string>, ctx: Ctx) => Promise<unknown>;
}

export function importRowNum(raw: Record<string, unknown>, fallback: number): number {
  const v = raw[IMPORT_ROW_NUM_KEY];
  if (typeof v === 'number' && v > 0) return v;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** `ImportDialog` chỉ hiện 10 lỗi đầu — chèn câu tóm tắt để không ai tưởng chỉ có 10. */
export function withErrorSummary(errors: string[]): string[] {
  if (errors.length <= 10) return errors;
  return [txt('shared.import.errSummary', { count: errors.length }), ...errors];
}

/** Cột đã map ở hộp thoại: hộp thoại luôn đặt khoá cho mọi cột đã map, kể cả ô trống. */
export function mappedColumnsOf(rows: readonly Record<string, unknown>[]): Set<string> {
  const out = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) if (k !== IMPORT_ROW_NUM_KEY) out.add(k);
  return out;
}

/**
 * Giữ lại các trường của payload mà cột tương ứng có trong file.
 *
 * Không làm vậy thì default của schema (trạng thái, tôn giáo…) và các ô không
 * có trong file sẽ ghi đè ngầm dữ liệu thật của bản ghi cũ. `alias` dùng khi
 * tên cột import khác tên cột DB.
 */
export function pickMappedColumns(
  payload: Record<string, unknown>,
  mapped: ReadonlySet<string>,
  alias: Readonly<Record<string, string>> = {},
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (mapped.has(alias[k] ?? k)) out[k] = v;
  }
  return out;
}

/** Dòng nào trong file có điền cột này (để biết có cần cảnh báo bỏ qua cột không). */
export function coCot(rows: readonly Record<string, unknown>[], key: string): boolean {
  return rows.some((r) => {
    const v = r[key];
    return v != null && String(v).trim() !== '';
  });
}

interface Prepared<Ctx, R> {
  ctx: Ctx;
  plan: ImportPlan<R>;
  parseErrors: ImportErrorRow[];
  notes: string[];
}

export function createImportRunner<Ctx, E extends { id: string }, R extends ImportParsedRow>(
  config: ImportRunnerConfig<Ctx, E, R>,
) {
  const tooMany = (count: number) =>
    txt('shared.import.errTooManyRows', { count, max: config.maxRows });

  async function prepare(
    rows: Record<string, unknown>[],
    options: ImportRunOptions,
  ): Promise<Prepared<Ctx, R>> {
    const { ctx, existing, notes = [] } = await config.load(rows, options);
    const parsed: R[] = [];
    const parseErrors: ImportErrorRow[] = [];
    rows.forEach((r, i) => {
      const rowNum = importRowNum(r, i + 2);
      const raw = { ...r };
      delete raw[IMPORT_ROW_NUM_KEY];
      const outcome = config.parseRow(rowNum, raw, ctx);
      if (outcome.ok) parsed.push(outcome.data);
      else parseErrors.push({ rowNum, data: raw, message: outcome.message });
    });
    const canWrite = config.canWrite;
    const checkUpdate = config.checkUpdate;
    const mapped = mappedColumnsOf(rows);
    const plan = buildImportPlan<E, R>({
      rows: parsed,
      existing,
      mode: options.mode,
      matchKeys: options.matchKeys,
      keys: config.keys,
      canWrite: canWrite ? (e) => canWrite(e, ctx) : undefined,
      checkUpdate: checkUpdate ? (e, r) => checkUpdate(e, r, mapped, ctx) : undefined,
    });
    return { ctx, plan, parseErrors, notes };
  }

  async function dryRun(
    rows: Record<string, unknown>[],
    options: ImportRunOptions,
  ): Promise<ImportDryRunResult> {
    if (rows.length > config.maxRows) throw new Error(tooMany(rows.length));
    const { plan, parseErrors, notes } = await prepare(rows, options);
    return {
      willCreate: plan.creates.length,
      willUpdate: plan.updates.length,
      // Dòng hỏng cũng là dòng không được ghi — gộp vào "bỏ qua" để tổng ba số
      // luôn bằng số dòng đọc được.
      willSkip: plan.skips.length + plan.errors.length + parseErrors.length,
      notes,
    };
  }

  async function run(
    rows: Record<string, unknown>[],
    options: ImportRunOptions,
  ): Promise<ImportBatchResult> {
    if (rows.length > config.maxRows) {
      return { created: 0, updated: 0, skipped: 0, errors: [tooMany(rows.length)], errorRows: [] };
    }
    const { ctx, plan, parseErrors, notes } = await prepare(rows, options);
    const mapped = mappedColumnsOf(rows);

    const errors: string[] = [...notes];
    const errorRows: ImportErrorRow[] = [];
    const pushErr = (rowNum: number, data: Record<string, unknown>, message: string) => {
      errors.push(message);
      errorRows.push({ rowNum, data, message });
    };
    for (const e of parseErrors) pushErr(e.rowNum, e.data, e.message);
    for (const e of plan.errors) pushErr(e.rowNum, e.row.raw, e.message);
    for (const s of plan.skips) pushErr(s.rowNum, s.row.raw, s.message);

    let created = 0;
    for (const item of plan.creates) {
      try {
        await config.create(item.row, ctx);
        created += 1;
      } catch (err) {
        pushErr(item.rowNum, item.row.raw, txt('shared.import.rowPrefix', { row: item.rowNum }) + getErrorMessage(err));
      }
    }

    let updated = 0;
    for (const item of plan.updates) {
      try {
        await config.update(item.existingId!, item.row, mapped, ctx);
        updated += 1;
      } catch (err) {
        pushErr(item.rowNum, item.row.raw, txt('shared.import.rowPrefix', { row: item.rowNum }) + getErrorMessage(err));
      }
    }

    return {
      created,
      updated,
      skipped: plan.skips.length,
      errors: withErrorSummary(errors),
      errorRows,
    };
  }

  return { dryRun, run };
}
