/**
 * Xuất Nhuận bút — MỘT FILE, NHIỀU SHEET.
 *
 * `ExportDialog` dùng chung chỉ ghi được một sheet phẳng, trong khi người chi trả
 * cần cộng tiền sẵn theo đơn vị / thể loại / người viết để đối chiếu khi in.
 * Mọi sheet gộp đều có cột "Số tiền"; KHÔNG sheet nào có cột tỷ trọng.
 *
 * Tách hai lớp: `buildNhuanButSheets` thuần (có test) và `exportNhuanButToExcel`
 * mỏng (chỉ ghi file, `xlsx` import động để giữ nguyên tách chunk của vite).
 */
import { txt } from '@/lib/text';
import { getTodayISODate } from '@/lib/utils';
import type { BaiVietDanhSach } from '../../bai-viet/core/types';
import { donViKeyOf, DON_VI_CHUA_GAN, type CommissionSeriesPoint } from './aggregate-commission';

export interface NhuanButExportInput {
  /** Các dòng đã lọc đúng như trên màn hình. */
  rows: BaiVietDanhSach[];
  /** Nhãn phạm vi đang xem ("Của tôi" / "Tất cả"). */
  scopeLabel: string;
  range: { start: string | null; end: string | null };
  /** Bộ lọc đang bật, đã đổi id thành tên — để người nhận file biết số này lọc bằng gì. */
  activeFilters: { label: string; value: string }[];
  seriesByMonth: CommissionSeriesPoint[];
}

export interface NhuanButExportSheet {
  name: string;
  rows: Record<string, unknown>[];
}

interface Group {
  key: string;
  label: string;
  soBai: number;
  soTien: number;
}

/** `don_gia` từ Supabase có thể về dạng chuỗi — cộng thẳng sẽ ra nối chuỗi. */
function soTienOf(item: BaiVietDanhSach): number {
  const n = Number(item.don_gia);
  return Number.isFinite(n) ? n : 0;
}

function groupRows(
  rows: BaiVietDanhSach[],
  keyOf: (r: BaiVietDanhSach) => string,
  labelOf: (r: BaiVietDanhSach) => string,
): Group[] {
  const tally = new Map<string, Group>();
  for (const r of rows) {
    const key = keyOf(r);
    const cur = tally.get(key);
    if (cur) {
      cur.soBai += 1;
      cur.soTien += soTienOf(r);
    } else {
      tally.set(key, { key, label: labelOf(r), soBai: 1, soTien: soTienOf(r) });
    }
  }
  return [...tally.values()].sort(
    (a, b) => b.soTien - a.soTien || a.label.localeCompare(b.label, 'vi'),
  );
}

export function buildNhuanButSheets(input: NhuanButExportInput): NhuanButExportSheet[] {
  const colChiTieu = txt('articleCommission.exportColChiTieu');
  const colGiaTri = txt('articleCommission.exportColGiaTri');
  const colSoBai = txt('articleCommission.exportColSoBai');
  const colSoTien = txt('articleCommission.exportColSoTien');
  const colDonVi = txt('articleCommission.exportColDonVi');
  const chuaGan = txt('articleCommission.donViChuaGan');
  const rangeAll = txt('articleCommission.exportRangeAll');

  const tongTien = input.rows.reduce((s, r) => s + soTienOf(r), 0);
  const soBai = input.rows.length;

  const tongHop: Record<string, unknown>[] = [
    { [colChiTieu]: txt('articleCommission.kpiTotal'), [colGiaTri]: tongTien },
    { [colChiTieu]: txt('articleCommission.kpiArticles'), [colGiaTri]: soBai },
    {
      [colChiTieu]: txt('articleCommission.kpiAvg'),
      [colGiaTri]: soBai > 0 ? Math.round(tongTien / soBai) : 0,
    },
    { [colChiTieu]: txt('articleCommission.exportPhamVi'), [colGiaTri]: input.scopeLabel },
    { [colChiTieu]: txt('articleCommission.exportRangeFrom'), [colGiaTri]: input.range.start || rangeAll },
    { [colChiTieu]: txt('articleCommission.exportRangeTo'), [colGiaTri]: input.range.end || rangeAll },
    ...input.activeFilters.map((f) => ({ [colChiTieu]: f.label, [colGiaTri]: f.value })),
  ];

  /** Sheet gộp: nhóm + số bài + số tiền, đóng bằng dòng Tổng cộng để người in đối chiếu ngay. */
  const groupSheet = (colLabel: string, groups: Group[]): Record<string, unknown>[] => {
    const rows = groups.map((g) => ({
      [colLabel]: g.label,
      [colSoBai]: g.soBai,
      [colSoTien]: g.soTien,
    }));
    if (rows.length > 0) {
      rows.push({
        [colLabel]: txt('articleCommission.exportRowTongCong'),
        [colSoBai]: groups.reduce((s, g) => s + g.soBai, 0),
        [colSoTien]: groups.reduce((s, g) => s + g.soTien, 0),
      });
    }
    return rows;
  };

  const donViGroups = groupRows(
    input.rows,
    donViKeyOf,
    (r) => (donViKeyOf(r) === DON_VI_CHUA_GAN ? chuaGan : r.ten_don_vi_nguoi_tao?.trim() || chuaGan),
  );

  const nguoiVietRows = groupRows(
    input.rows,
    (r) => String(r.id_nguoi_tao),
    (r) => r.ho_va_ten_nguoi_tao?.trim() || r.ten_tai_khoan_nguoi_tao?.trim() || String(r.id_nguoi_tao),
  );
  // Đơn vị của người viết lấy từ dòng đầu tiên của họ — đơn vị nằm trên hồ sơ
  // nhân viên nên một người chỉ thuộc một đơn vị.
  const donViCuaNguoi = new Map<string, string>();
  for (const r of input.rows) {
    const id = String(r.id_nguoi_tao);
    if (donViCuaNguoi.has(id)) continue;
    donViCuaNguoi.set(
      id,
      donViKeyOf(r) === DON_VI_CHUA_GAN ? chuaGan : r.ten_don_vi_nguoi_tao?.trim() || chuaGan,
    );
  }
  const theoNguoiViet: Record<string, unknown>[] = nguoiVietRows.map((g) => ({
    [txt('articleCommission.exportColNguoi')]: g.label,
    [colDonVi]: donViCuaNguoi.get(g.key) ?? chuaGan,
    [colSoBai]: g.soBai,
    [colSoTien]: g.soTien,
  }));
  if (theoNguoiViet.length > 0) {
    theoNguoiViet.push({
      [txt('articleCommission.exportColNguoi')]: txt('articleCommission.exportRowTongCong'),
      [colDonVi]: '',
      [colSoBai]: soBai,
      [colSoTien]: tongTien,
    });
  }

  return [
    { name: txt('articleCommission.exportSheetTongHop'), rows: tongHop },
    {
      name: txt('articleCommission.exportSheetTheoDonVi'),
      rows: groupSheet(colDonVi, donViGroups),
    },
    {
      name: txt('articleCommission.exportSheetTheoTheLoai'),
      rows: groupSheet(
        txt('articleCommission.exportColTheLoai'),
        groupRows(
          input.rows,
          (r) => String(r.id_the_loai),
          (r) => r.ten_the_loai?.trim() || String(r.id_the_loai),
        ),
      ),
    },
    {
      name: txt('articleCommission.exportSheetTheoNguon'),
      rows: groupSheet(
        txt('articleCommission.exportColNguon'),
        groupRows(
          input.rows,
          (r) => String(r.id_nguon_dang),
          (r) => r.ten_nguon_dang?.trim() || String(r.id_nguon_dang),
        ),
      ),
    },
    {
      name: txt('articleCommission.exportSheetTheoTrang'),
      rows: groupSheet(
        txt('articleCommission.exportColTrang'),
        groupRows(
          input.rows,
          (r) => String(r.id_trang_dang),
          (r) => r.ten_trang_dang?.trim() || String(r.id_trang_dang),
        ),
      ),
    },
    { name: txt('articleCommission.exportSheetTheoNguoiViet'), rows: theoNguoiViet },
    {
      name: txt('articleCommission.exportSheetTheoThoiGian'),
      rows: input.seriesByMonth.map((p) => ({
        [txt('articleCommission.exportColKy')]: p.label,
        [colSoBai]: p.count,
        [colSoTien]: p.total,
      })),
    },
    {
      name: txt('articleCommission.exportSheetChiTiet'),
      rows: input.rows.map((item, i) => ({
        [txt('articleCommission.exportColStt')]: i + 1,
        [txt('articleCommission.exportColTenBai')]: item.ten_bai,
        [txt('articleCommission.exportColNgayDang')]: item.ngay_dang,
        [txt('articleCommission.exportColTheLoai')]: item.ten_the_loai ?? '',
        [colSoTien]: soTienOf(item),
        [txt('articleCommission.exportColNguoi')]:
          item.ho_va_ten_nguoi_tao ?? item.ten_tai_khoan_nguoi_tao ?? '',
        [colDonVi]:
          donViKeyOf(item) === DON_VI_CHUA_GAN ? chuaGan : item.ten_don_vi_nguoi_tao?.trim() || chuaGan,
        [txt('articleCommission.exportColNguon')]: item.ten_nguon_dang ?? '',
        [txt('articleCommission.exportColTrang')]: item.ten_trang_dang ?? '',
        [txt('articleCommission.exportColLink')]: item.link,
      })),
    },
  ];
}

export async function exportNhuanButToExcel(input: NhuanButExportInput): Promise<void> {
  const mod = await import('xlsx');
  const XLSX = mod.default ?? mod;
  const wb = XLSX.utils.book_new();
  for (const sheet of buildNhuanButSheets(input)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet.rows), sheet.name);
  }
  XLSX.writeFile(wb, `${txt('articleCommission.exportFileName')}_${getTodayISODate()}.xlsx`);
}
