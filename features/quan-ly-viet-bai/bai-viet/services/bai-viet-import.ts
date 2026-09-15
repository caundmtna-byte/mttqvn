/**
 * Nhập bài viết từ Excel — điều phối giữa hộp thoại và CSDL.
 *
 * Hình dạng file: MỘT SHEET PHẲNG, một dòng một bài (`ImportDialog` chỉ đọc
 * sheet đầu tiên; các sheet sau trong file mẫu chỉ để tra cứu).
 *
 * Khác mọi module import khác trong repo: ở đây có GHI ĐÈ. Vì vậy luồng chạy
 * hai lần cùng một hàm dựng kế hoạch — một lần cho bước xem trước, một lần khi
 * ghi thật — để con số người dùng nhìn thấy đúng bằng thứ sắp xảy ra.
 *
 * Danh mục nạp MỘT LẦN rồi đối chiếu offline; tra danh mục trong vòng lặp là
 * lỗi N+1 mà vài module thế hệ cũ đang mắc.
 */
import { txt } from '@/lib/text';
import { getErrorMessage } from '@/lib/utils';
import type {
  ImportBatchResult,
  ImportDryRunResult,
  ImportErrorRow,
  ImportRunOptions,
} from '@/components/shared/ImportDialog';
import { IMPORT_ROW_NUM_KEY } from '@/components/shared/ImportDialog';
import { getTheLoais } from '@/features/quan-ly-viet-bai/thiet-lap-bai-viet/services/the-loai-service';
import { getThietLapKhacAll } from '@/features/quan-ly-viet-bai/thiet-lap-bai-viet/services/thiet-lap-khac-service';
import { getEmployeeNameRefs } from '@/features/he-thong/nhan-vien/services/nhan-vien-service';
import type { BaiVietDanhSach } from '../core/types';
import {
  createBaiVietDanhSachForImport,
  getBaiVietDanhSachList,
  updateBaiVietDanhSachForImport,
} from './bai-viet-danh-sach-service';
import {
  BAI_VIET_IMPORT_MAX_ROWS,
  parseBaiVietImportRow,
  type BaiVietImportRow,
  type BaiVietImportRowInput,
  type NamedRef,
  type TheLoaiRef,
} from '../utils/bai-viet-import-row';
import { buildBaiVietImportPlan, type BaiVietImportPlan } from '../utils/bai-viet-import-plan';

export interface BaiVietImportContext {
  /** Nhân viên của người đang đăng nhập — người tạo mặc định cho mọi dòng. */
  idNhanVienHienTai: string;
  /** Được gán bài cho người khác (chỉ quản trị bài viết / cấp bậc 1). */
  choGanNguoiKhac: boolean;
  /** Được sửa đơn giá; không thì cột đơn giá trong file bị bỏ qua. */
  choSuaDonGia: boolean;
}

/** Danh mục + danh sách bài hiện có, nạp một lần cho cả xem trước lẫn ghi. */
interface ImportRefs {
  theLoai: TheLoaiRef[];
  nguonDang: NamedRef[];
  trangDang: NamedRef[];
  nhanVien?: NamedRef[];
  existing: BaiVietDanhSach[];
}

function importRowNum(raw: Record<string, unknown>, fallback: number): number {
  const v = raw[IMPORT_ROW_NUM_KEY];
  if (typeof v === 'number' && v > 0) return v;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** `ImportDialog` chỉ hiện 10 lỗi đầu — chèn câu tóm tắt để không ai tưởng chỉ có 10. */
function withErrorSummary(errors: string[]): string[] {
  if (errors.length <= 10) return errors;
  return [txt('articleList.import.errSummary', { count: errors.length }), ...errors];
}

/** Dòng nào trong file có điền cột này (để biết có cần cảnh báo bỏ qua cột không). */
function coCot(rows: readonly Record<string, unknown>[], key: string): boolean {
  return rows.some((r) => {
    const v = r[key];
    return v != null && String(v).trim() !== '';
  });
}

async function loadRefs(ctx: BaiVietImportContext, canNhanVien: boolean): Promise<ImportRefs> {
  const [theLoais, khacAll, existing, nhanVienRaw] = await Promise.all([
    getTheLoais(),
    getThietLapKhacAll(),
    getBaiVietDanhSachList(),
    canNhanVien ? getEmployeeNameRefs() : Promise.resolve([]),
  ]);

  return {
    theLoai: theLoais.map((t) => ({
      id: String(t.id),
      ten: t.ten_the_loai,
      donGia: Number(t.don_gia) || 0,
    })),
    nguonDang: khacAll
      .filter((k) => k.loai === 'nguon_dang')
      .map((k) => ({ id: String(k.id), ten: k.ten })),
    trangDang: khacAll
      .filter((k) => k.loai === 'trang_dang')
      .map((k) => ({ id: String(k.id), ten: k.ten })),
    nhanVien: canNhanVien
      ? nhanVienRaw.map((n) => ({ id: n.id, ten: n.ho_va_ten, alias: n.ten_tai_khoan }))
      : undefined,
    existing,
  };
}

interface PreparedRows {
  plan: BaiVietImportPlan;
  /** Lỗi đọc dòng (sai ngày, sai danh mục…) — tách khỏi lỗi đối chiếu của kế hoạch. */
  parseErrors: { rowNum: number; data: Record<string, unknown>; message: string }[];
  notes: string[];
}

/** Đọc + đối chiếu toàn bộ file. Không ghi gì — dùng chung cho xem trước và ghi. */
async function prepare(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
  ctx: BaiVietImportContext,
): Promise<PreparedRows> {
  const notes: string[] = [];

  const fileCoCotNguoiTao = coCot(rows, 'id_nguoi_tao');
  const dungCotNguoiTao = fileCoCotNguoiTao && ctx.choGanNguoiKhac;
  if (fileCoCotNguoiTao && !ctx.choGanNguoiKhac) {
    // Im lặng gán sai người là kiểu hỏng không để lại dấu vết nào — phải nói ra.
    notes.push(txt('articleList.import.noteBoQuaCotNguoiTao'));
  }
  if (coCot(rows, 'don_gia') && !ctx.choSuaDonGia) {
    notes.push(txt('articleList.import.noteBoQuaCotDonGia'));
  }

  const refs = await loadRefs(ctx, dungCotNguoiTao);
  const rowCtx: BaiVietImportRowInput = {
    theLoai: refs.theLoai,
    nguonDang: refs.nguonDang,
    trangDang: refs.trangDang,
    nhanVien: dungCotNguoiTao ? refs.nhanVien : undefined,
    idNguoiTaoMacDinh: ctx.idNhanVienHienTai,
    choSuaDonGia: ctx.choSuaDonGia,
  };

  const parsed: BaiVietImportRow[] = [];
  const parseErrors: PreparedRows['parseErrors'] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNum = importRowNum(rows[i], i + 2);
    const rowData = { ...rows[i] };
    delete rowData[IMPORT_ROW_NUM_KEY];

    const outcome = parseBaiVietImportRow(rowNum, rowData, rowCtx);
    if (!outcome.ok) {
      parseErrors.push({ rowNum, data: rowData, message: outcome.message });
      continue;
    }
    parsed.push(outcome.data);
  }

  const plan = buildBaiVietImportPlan({
    rows: parsed,
    existing: refs.existing,
    mode: options.mode,
    matchKeys: options.matchKeys,
  });

  return { plan, parseErrors, notes };
}

export async function dryRunBaiVietImport(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
  ctx: BaiVietImportContext,
): Promise<ImportDryRunResult> {
  if (rows.length > BAI_VIET_IMPORT_MAX_ROWS) {
    throw new Error(
      txt('articleList.import.errTooManyRows', {
        count: rows.length,
        max: BAI_VIET_IMPORT_MAX_ROWS,
      }),
    );
  }
  const { plan, parseErrors, notes } = await prepare(rows, options, ctx);
  return {
    willCreate: plan.creates.length,
    willUpdate: plan.updates.length,
    // Dòng hỏng cũng là dòng không được ghi — gộp vào cột "bỏ qua" để tổng ba số
    // luôn bằng số dòng đọc được, không ai phải tự cộng trừ.
    willSkip: plan.skips.length + plan.errors.length + parseErrors.length,
    notes,
  };
}

export async function importBaiVietRows(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
  ctx: BaiVietImportContext,
): Promise<ImportBatchResult> {
  if (rows.length > BAI_VIET_IMPORT_MAX_ROWS) {
    return {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [
        txt('articleList.import.errTooManyRows', {
          count: rows.length,
          max: BAI_VIET_IMPORT_MAX_ROWS,
        }),
      ],
      errorRows: [],
    };
  }

  const { plan, parseErrors, notes } = await prepare(rows, options, ctx);

  const errors: string[] = [...notes, ...parseErrors.map((e) => e.message)];
  const errorRows: ImportErrorRow[] = parseErrors.map((e) => ({
    rowNum: e.rowNum,
    data: e.data,
    message: e.message,
  }));
  for (const e of plan.errors) {
    errors.push(e.message);
    errorRows.push({ rowNum: e.rowNum, data: {}, message: e.message });
  }
  for (const s of plan.skips) {
    errors.push(s.message);
  }

  // Ghi tuần tự: mỗi dòng một lỗi riêng, dòng hỏng không kéo dòng lành theo.
  let created = 0;
  for (const item of plan.creates) {
    try {
      await createBaiVietDanhSachForImport(item.row.values, item.row.idNguoiTao);
      created += 1;
    } catch (err) {
      const msg =
        txt('articleList.import.rowPrefix', { row: item.rowNum }) + getErrorMessage(err);
      errors.push(msg);
      errorRows.push({ rowNum: item.rowNum, data: { ...item.row.values }, message: msg });
    }
  }

  let updated = 0;
  for (const item of plan.updates) {
    try {
      await updateBaiVietDanhSachForImport(item.existingId!, item.row.values);
      updated += 1;
    } catch (err) {
      const msg =
        txt('articleList.import.rowPrefix', { row: item.rowNum }) + getErrorMessage(err);
      errors.push(msg);
      errorRows.push({ rowNum: item.rowNum, data: { ...item.row.values }, message: msg });
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
