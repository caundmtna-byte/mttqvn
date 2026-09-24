/**
 * Nhập bài viết từ Excel — điều phối giữa hộp thoại và CSDL.
 *
 * Hình dạng file: MỘT SHEET PHẲNG, một dòng một bài (`ImportDialog` chỉ đọc
 * sheet đầu tiên; các sheet sau trong file mẫu chỉ để tra cứu).
 *
 * Luồng xem trước / ghi / ghi đè dùng lõi chung `lib/data/import-runner.ts`;
 * ở đây chỉ khai danh mục, cách đọc dòng và hai hàm ghi.
 */
import { txt } from '@/lib/text';
import type {
  ImportBatchResult,
  ImportDryRunResult,
  ImportRunOptions,
} from '@/components/shared/ImportDialog';
import { coCot, createImportRunner } from '@/lib/data/import-runner';
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
import { BAI_VIET_IMPORT_KEYS } from '../utils/bai-viet-import-plan';

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

function buildRunner(ctx: BaiVietImportContext) {
  return createImportRunner<BaiVietImportRowInput, BaiVietDanhSach, BaiVietImportRow>({
    maxRows: BAI_VIET_IMPORT_MAX_ROWS,
    keys: BAI_VIET_IMPORT_KEYS,
    async load(rows) {
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
      return {
        ctx: {
          theLoai: refs.theLoai,
          nguonDang: refs.nguonDang,
          trangDang: refs.trangDang,
          nhanVien: dungCotNguoiTao ? refs.nhanVien : undefined,
          idNguoiTaoMacDinh: ctx.idNhanVienHienTai,
          choSuaDonGia: ctx.choSuaDonGia,
        },
        existing: refs.existing,
        notes,
      };
    },
    parseRow: parseBaiVietImportRow,
    create: (row) => createBaiVietDanhSachForImport(row.values, row.idNguoiTao),
    // Mọi cột nội dung của bài đều bắt buộc trong file nên ghi đè cả bản là đúng;
    // đơn giá thiếu cột đã được lấy theo thể loại ở bước đọc dòng.
    update: (id, row) => updateBaiVietDanhSachForImport(id, row.values),
  });
}

export function dryRunBaiVietImport(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
  ctx: BaiVietImportContext,
): Promise<ImportDryRunResult> {
  return buildRunner(ctx).dryRun(rows, options);
}

export function importBaiVietRows(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
  ctx: BaiVietImportContext,
): Promise<ImportBatchResult> {
  return buildRunner(ctx).run(rows, options);
}
