/**
 * Nhập phiếu nhập/xuất kho từ Excel — mùa bão lụt hàng về ồ ạt, không ai ngồi
 * gõ tay từng phiếu được.
 *
 * Hình dạng file và lý do chọn: xem đầu `utils/nhap-xuat-kho-import-rows.ts`.
 *
 * GHI DỮ LIỆU ĐI QUA RPC NGUYÊN TỬ `rpc_kho_tao_phieu_nhap_xuat`
 * (`createNhapXuatKho`), mỗi phiếu một lần gọi. Tuyệt đối không insert phiếu cha
 * rồi insert dòng con: mạng rớt giữa chừng sẽ để lại phiếu rỗng trong sổ chứng từ.
 *
 * Mỗi phiếu là một GIAO DỊCH riêng, nên:
 *  - trigger hoãn kiểm tồn âm (`trg_kho_nxk_ton_am`) nổ ở đúng phiếu gây âm,
 *    và câu lỗi tiếng Việt của nó được gắn vào MỌI dòng của phiếu đó;
 *  - một phiếu hỏng không kéo theo các phiếu khác trong cùng file.
 *
 * `id_nguoi_tao` KHÔNG gửi lên: máy chủ tự gán từ phiên đăng nhập
 * (`tg_gan_id_nguoi_tao_kho_nhap_xuat_kho`).
 */
import { txt } from '@/lib/text';
import { getErrorMessage } from '@/lib/utils';
import type { ImportErrorRow } from '@/components/shared/ImportDialog';
import { IMPORT_ROW_NUM_KEY } from '@/components/shared/ImportDialog';
import { getKhoDanhSachKhoList } from '@/features/mat-tran-to-quoc/danh-sach-kho/services/kho-danh-sach-kho-service';
import { getKhoDonViCuuTroList } from '@/features/mat-tran-to-quoc/don-vi-cuu-tro/services/kho-don-vi-cuu-tro-service';
import { getKhoDotCuuTroList } from '@/features/mat-tran-to-quoc/dot-cuu-tro/services/kho-dot-cuu-tro-service';
import { getKhoDanhSachHangHoaList } from '@/features/mat-tran-to-quoc/hang-hoa/services/kho-danh-sach-hang-hoa-service';
import { createNhapXuatKho } from './kho-nhap-xuat-kho-service';
import {
  NHAP_XUAT_KHO_IMPORT_MAX_ROWS,
  buildNhapXuatKhoImportPhieus,
  type ImportSourceRow,
  type NhapXuatKhoImportViewer,
} from '../utils/nhap-xuat-kho-import-rows';

export type NhapXuatKhoImportResult = {
  /** Số PHIẾU đã ghi (không phải số dòng Excel). */
  created: number;
  errors: string[];
  errorRows: ImportErrorRow[];
};

function importRowNum(raw: Record<string, unknown>, fallback: number): number {
  const v = raw[IMPORT_ROW_NUM_KEY];
  if (typeof v === 'number' && v > 0) return v;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** `ImportDialog` chỉ hiện 10 lỗi đầu — chèn câu tóm tắt để không ai tưởng chỉ có 10. */
function withErrorSummary(errors: string[]): string[] {
  if (errors.length <= 10) return errors;
  return [txt('matTranNhapXuatKho.import.errSummary', { count: errors.length }), ...errors];
}

export async function importNhapXuatKhoRows(
  rows: Record<string, unknown>[],
  viewer: NhapXuatKhoImportViewer,
): Promise<NhapXuatKhoImportResult> {
  if (rows.length > NHAP_XUAT_KHO_IMPORT_MAX_ROWS) {
    return {
      created: 0,
      errors: [
        txt('matTranNhapXuatKho.import.errTooManyRows', {
          count: rows.length,
          max: NHAP_XUAT_KHO_IMPORT_MAX_ROWS,
        }),
      ],
      errorRows: [],
    };
  }

  const [khoRows, donViRows, dotRows, hangRows] = await Promise.all([
    getKhoDanhSachKhoList(),
    getKhoDonViCuuTroList(),
    getKhoDotCuuTroList(),
    getKhoDanhSachHangHoaList(),
  ]);

  const source: ImportSourceRow[] = rows.map((raw, i) => {
    const rowNum = importRowNum(raw, i + 2);
    const data = { ...raw };
    delete data[IMPORT_ROW_NUM_KEY];
    return { rowNum, data };
  });

  const { phieus, errors: buildErrors } = buildNhapXuatKhoImportPhieus(source, {
    khoList: khoRows.map((k) => ({ id: String(k.id), ten: k.ten_kho, don_vi_id: k.don_vi_id })),
    donViCuuTroList: donViRows.map((d) => ({ id: String(d.id), ten: d.ten })),
    dotCuuTroList: dotRows.map((d) => ({ id: String(d.id), ten: d.ten })),
    hangHoaList: hangRows.map((h) => ({
      id: String(h.id),
      ten: h.ten_hang_hoa,
      don_vi_tinh: h.don_vi_tinh,
    })),
    viewer,
  });

  const errorRows: ImportErrorRow[] = buildErrors.map((e) => ({
    rowNum: e.rowNum,
    data: e.data,
    message: e.message,
  }));

  // Ghi tuần tự từng phiếu. Không bắn song song: các phiếu cùng một kho sẽ
  // tranh nhau advisory lock của `fn_kho_khoa_kho`, và thứ tự ghi lộn xộn làm
  // câu báo "tồn không đủ" trỏ vào phiếu khó hiểu với người dùng.
  let created = 0;
  for (const phieu of phieus) {
    try {
      await createNhapXuatKho(phieu.values);
      created += 1;
    } catch (err) {
      const detail = txt('matTranNhapXuatKho.import.errPhieuGhiThatBai', {
        ma_phieu: phieu.maPhieu,
        message: getErrorMessage(err),
      });
      for (const r of phieu.rows) {
        errorRows.push({
          rowNum: r.rowNum,
          data: r.data,
          message: txt('matTranNhapXuatKho.import.rowPrefix', { row: r.rowNum }) + detail,
        });
      }
    }
  }

  errorRows.sort((a, b) => a.rowNum - b.rowNum);
  const errors = errorRows.map((e) => e.message);

  return { created, errors: withErrorSummary(errors), errorRows };
}
