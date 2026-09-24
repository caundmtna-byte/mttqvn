/**
 * Đọc MỘT dòng Excel thành dữ liệu bài viết — hàm thuần, không gọi mạng.
 *
 * Mọi danh mục (thể loại / nguồn đăng / trang đăng / nhân viên) được nạp sẵn một
 * lần rồi truyền vào đây dưới dạng mảng tra cứu. Tra danh mục bằng request trong
 * vòng lặp là lỗi N+1 mà vài module thế hệ cũ đang mắc.
 *
 * Chấp nhận cả id lẫn tên; tên so khớp sau khi BỎ DẤU và bỏ phân biệt hoa/thường
 * để người nhập không phải gõ đúng từng dấu.
 */
import { txt } from '@/lib/text';
import type { ImportRowOutcome } from '@/lib/data/import-runner';
import { parseSoInput } from '@/lib/number';
import { findRef, parseImportNgay, trimCell, type NamedRef } from '@/lib/data/import-cells';
import { baiVietDanhSachSchema, type BaiVietDanhSachFormValues } from '../core/schema';
import { normalizeBaiVietLinkForCompare } from './bai-viet-link-conflict';
import { normalizeBaiVietTenBaiForCompare } from './bai-viet-ten-bai-conflict';

/** Trần dòng mỗi lần nhập. Cao hơn nữa thì trình duyệt ôm cả file lẫn danh mục sẽ đuối. */
export const BAI_VIET_IMPORT_MAX_ROWS = 2000;

export interface TheLoaiRef extends NamedRef {
  /** Đơn giá mặc định của thể loại — dùng khi người nhập không được sửa đơn giá. */
  donGia: number;
}

export type { ImportRowOutcome } from '@/lib/data/import-runner';
export { findRef, parseImportNgay, trimCell, type NamedRef };

export interface BaiVietImportRowInput {
  theLoai: readonly TheLoaiRef[];
  nguonDang: readonly NamedRef[];
  trangDang: readonly NamedRef[];
  /** Chỉ truyền khi người chạy đủ quyền gán bài cho người khác. */
  nhanVien?: readonly NamedRef[];
  /** Nhân viên mặc định (người đang đăng nhập) khi dòng không chỉ định người tạo. */
  idNguoiTaoMacDinh: string;
  /** Không đủ quyền sửa đơn giá thì bỏ qua cột đơn giá, lấy đơn giá của thể loại. */
  choSuaDonGia: boolean;
}

export interface BaiVietImportRow {
  rowNum: number;
  /** Dữ liệu gốc của dòng — để file lỗi tải về còn đủ. */
  raw: Record<string, unknown>;
  /** Cột "Mã hệ thống" (id) nếu file có — khoá chắc nhất để ghi đè. */
  idKey: string | null;
  values: BaiVietDanhSachFormValues;
  idNguoiTao: string;
  /** Khoá so trùng, tính sẵn để lớp lập kế hoạch khỏi chuẩn hoá lại. */
  linkKey: string;
  tenBaiKey: string;
}

function fail(rowNum: number, message: string): { ok: false; message: string } {
  return { ok: false, message: txt('articleList.import.rowPrefix', { row: rowNum }) + message };
}

export function parseBaiVietImportRow(
  rowNum: number,
  raw: Record<string, unknown>,
  ctx: BaiVietImportRowInput,
): ImportRowOutcome<BaiVietImportRow> {
  const tenBai = trimCell(raw.ten_bai);
  if (!tenBai) return fail(rowNum, txt('articleList.import.errTenBaiTrong'));

  const theLoai = findRef(ctx.theLoai, raw.id_the_loai);
  if (!theLoai) {
    return fail(rowNum, txt('articleList.import.errTheLoai', { gia_tri: trimCell(raw.id_the_loai) }));
  }

  const nguon = findRef(ctx.nguonDang, raw.id_nguon_dang);
  if (!nguon) {
    return fail(rowNum, txt('articleList.import.errNguonDang', { gia_tri: trimCell(raw.id_nguon_dang) }));
  }

  const trang = findRef(ctx.trangDang, raw.id_trang_dang);
  if (!trang) {
    return fail(rowNum, txt('articleList.import.errTrangDang', { gia_tri: trimCell(raw.id_trang_dang) }));
  }

  const ngayDang = parseImportNgay(raw.ngay_dang);
  if (!ngayDang) {
    return fail(rowNum, txt('articleList.import.errNgayDang', { gia_tri: trimCell(raw.ngay_dang) }));
  }

  // Không đủ quyền sửa đơn giá thì cột này trong file bị bỏ qua hoàn toàn và lấy
  // đơn giá mặc định của thể loại — đúng bằng hành vi của form nhập tay.
  let donGia = theLoai.donGia;
  if (ctx.choSuaDonGia) {
    const rawDonGia = raw.don_gia;
    const isEmpty = rawDonGia == null || trimCell(rawDonGia) === '';
    if (!isEmpty) {
      const n =
        typeof rawDonGia === 'number'
          ? rawDonGia
          : parseSoInput(trimCell(rawDonGia), { choThapPhan: true });
      if (n == null || !Number.isFinite(n)) {
        return fail(rowNum, txt('articleList.import.errDonGia', { gia_tri: trimCell(rawDonGia) }));
      }
      donGia = n;
    }
  }

  let idNguoiTao = ctx.idNguoiTaoMacDinh;
  const rawNguoiTao = trimCell(raw.id_nguoi_tao);
  if (rawNguoiTao && ctx.nhanVien) {
    const nv = findRef(ctx.nhanVien, rawNguoiTao);
    if (!nv) return fail(rowNum, txt('articleList.import.errNguoiTao', { gia_tri: rawNguoiTao }));
    idNguoiTao = nv.id;
  }
  if (!idNguoiTao) return fail(rowNum, txt('articleList.import.errKhongCoNguoiTao'));

  const parsed = baiVietDanhSachSchema.safeParse({
    ten_bai: tenBai,
    id_the_loai: theLoai.id,
    don_gia: donGia,
    ngay_dang: ngayDang,
    id_nguon_dang: nguon.id,
    id_trang_dang: trang.id,
    link: trimCell(raw.link),
  });
  if (!parsed.success) {
    return fail(rowNum, parsed.error.issues[0]?.message ?? parsed.error.message);
  }

  return {
    ok: true,
    data: {
      rowNum,
      raw,
      idKey: trimCell(raw.id) || null,
      values: parsed.data,
      idNguoiTao,
      linkKey: normalizeBaiVietLinkForCompare(parsed.data.link),
      tenBaiKey: normalizeBaiVietTenBaiForCompare(parsed.data.ten_bai),
    },
  };
}
