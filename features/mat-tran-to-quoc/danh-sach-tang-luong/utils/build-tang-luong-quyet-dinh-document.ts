/**
 * Dựng mô hình "QUYẾT ĐỊNH nâng bậc lương" từ một bản ghi `mttq_tang_luong`.
 * Hàm thuần — dùng chung cho xem trước/in, DOCX và PDF.
 */
import { txt } from '@/lib/text';
import { formatDate, formatDecimal } from '@/lib/utils';
import type { CompanyInfo } from '@/store/useStore';
import type { MttqTangLuongListRow } from '../core/types';
import { getTangLuongLoaiKyLabel } from './display-format';
import { docSoTienVND } from './luong-bang-chu';
import {
  doan,
  formatDiaDanhNgayThang,
  type VanBanHanhChinhModel,
  type VanBanKhoiNoiDung,
} from './van-ban-hanh-chinh';

export const DIA_DANH_MAC_DINH = 'Nghệ An';

/** Ô "Số:" bỏ trống — `mttq_tang_luong` chưa có cột số quyết định. */
export const SO_QD_LUONG_PLACEHOLDER = '……../QĐ-MTTQ-BTT';

/**
 * Ô trống trên bản in dùng gạch ngang, KHÔNG dùng « Chưa có » như trên màn hình:
 * văn bản hành chính không viết "từ Chưa có lên ngạch…".
 */
const PRINT_EMPTY = '-';

export interface TangLuongQuyetDinhContext {
  company?: CompanyInfo | null;
  /** Ngày ký; mặc định lấy `ngay_nang_luong`. */
  ngayKy?: string | null;
}

export interface TangLuongQuyetDinhDocumentModel extends VanBanHanhChinhModel {
  /** Họ tên cán bộ — dùng đặt tên file tải về. */
  tenCanBo: string;
}

/**
 * Số tiền trên văn bản: chỉ nhóm hàng nghìn, KHÔNG kèm ký hiệu `₫`
 * (thể thức hành chính viết "11.938.000 đồng", không viết "11.938.000 ₫").
 */
export function formatTienVanBan(n: number | null | undefined): string {
  // `Number(null)` là 0 — chặn trước để ô tiền trống không in thành "0".
  if (n === null || n === undefined) return '';
  const v = Number(n);
  if (!Number.isFinite(v)) return '';
  return formatDecimal(Math.round(v), 0);
}

/** `Chuyên viên · A1` → chuỗi mô tả ngạch/bậc trên văn bản. */
export function moTaNgachBac(
  tenNgach: string | null | undefined,
  maBac: string | null | undefined,
): string {
  const ngach = tenNgach?.trim() ?? '';
  const bac = maBac?.trim() ?? '';
  if (ngach && bac) return `ngạch ${ngach}, bậc ${bac}`;
  if (ngach) return `ngạch ${ngach}`;
  if (bac) return `bậc ${bac}`;
  return '';
}

/** Mô tả chức vụ + đơn vị công tác của cán bộ trên văn bản. */
export function moTaChucVuDonVi(row: MttqTangLuongListRow): string {
  const parts = [
    row.ten_chuc_vu?.trim(),
    row.ten_bo_phan?.trim() || row.ten_phong_ban?.trim(),
    row.ten_don_vi?.trim(),
  ].filter((s): s is string => Boolean(s));
  return parts.join(', ');
}

/**
 * Câu mô tả loại kỳ nâng lương: đúng hạn hay trước hạn mấy tháng.
 * Nâng trước hạn phải nêu rõ số tháng rút ngắn — đây là căn cứ pháp lý của
 * quyết định, thiếu là văn bản không đứng được.
 */
export function moTaLoaiKy(row: MttqTangLuongListRow): string {
  const nhan = getTangLuongLoaiKyLabel(row.loai_ky);
  if (row.loai_ky === 'dung_han') return nhan;
  const soThang = Number(row.so_thang_rut_ngan);
  if (!Number.isFinite(soThang) || soThang <= 0) return nhan;
  // Nhãn loại kỳ đã chứa sẵn số tháng ("Trước hạn 6 tháng") thì không lặp lại.
  if (nhan.includes(String(soThang))) return nhan;
  return `${nhan} (rút ngắn ${soThang} tháng)`;
}

export function buildTangLuongQuyetDinhDocumentModel(
  row: MttqTangLuongListRow,
  ctx: TangLuongQuyetDinhContext = {},
): TangLuongQuyetDinhDocumentModel {
  const t = (k: string) => txt(`matTranTangLuong.printPreview.${k}`);
  const ec = PRINT_EMPTY;
  // Khối tên cơ quan: dòng trên là cơ quan chủ quản (lấy từ Thông tin tổ chức),
  // dòng dưới in đậm là cơ quan ban hành văn bản.
  const coQuanChuQuan = ctx.company?.companyName?.trim() || t('coQuanChuQuan');
  const ngayKy = ctx.ngayKy?.trim() || row.ngay_nang_luong;
  const tenCanBo = row.ho_ten_can_bo?.trim() || ec;
  const chucVuDonVi = moTaChucVuDonVi(row) || ec;
  const ngachBacCu = moTaNgachBac(row.ten_ngach_cu, row.ma_bac_cu);
  const ngachBacMoi = moTaNgachBac(row.ten_ngach_moi, row.ma_bac_moi);

  const bangThongTin: VanBanKhoiNoiDung = {
    kind: 'bang',
    headers: [t('colChiTieu'), t('colTruoc'), t('colSau')],
    rows: [
      [t('rowNgachBac'), ngachBacCu || ec, ngachBacMoi || ec],
      [t('rowLuong'), ec, formatTienVanBan(row.luong)],
      [t('rowHieuLuc'), ec, formatDate(row.ngay_nang_luong)],
      [
        t('rowLoaiKy'),
        row.ngay_den_han_goc ? formatDate(row.ngay_den_han_goc) : ec,
        moTaLoaiKy(row),
      ],
    ],
    aligns: ['left', 'center', 'center'],
    widths: [34, 33, 33],
  };

  // Không có ngạch/bậc cũ thì bỏ hẳn vế "từ …" — viết "từ - lên …" là sai thể thức.
  const dieu1Mau = ngachBacCu ? t('dieu1Noi') : t('dieu1NoiKhongCoCu');

  const noiDung: VanBanKhoiNoiDung[] = [
    doan(
      `${t('dieu1')} ${dieu1Mau
        .replace('{{hoTen}}', tenCanBo)
        .replace('{{chucVuDonVi}}', chucVuDonVi)
        .replace('{{ngachBacCu}}', ngachBacCu)
        .replace('{{ngachBacMoi}}', ngachBacMoi || ec)}`,
      { indent: true },
    ),
    bangThongTin,
    doan(
      `${t('dieu2')} ${t('dieu2Noi')
        .replace('{{luong}}', `${formatTienVanBan(row.luong)} đồng`)
        .replace('{{luongBangChu}}', docSoTienVND(row.luong))
        .replace('{{ngayHieuLuc}}', formatDate(row.ngay_nang_luong))}`,
      { indent: true },
    ),
    doan(`${t('dieu3')} ${t('dieu3Noi').replace('{{hoTen}}', tenCanBo)}`, { indent: true }),
  ];

  return {
    coQuanChuQuan: coQuanChuQuan,
    coQuanBanHanh: t('banThuongTruc'),
    soKyHieu: SO_QD_LUONG_PLACEHOLDER,
    diaDanhNgayThang: formatDiaDanhNgayThang(DIA_DANH_MAC_DINH, ngayKy),
    tenLoai: t('tenLoai'),
    trichYeu: t('trichYeu'),
    thamQuyen: t('thamQuyen'),
    canCu: [t('canCuDieuLe'), t('canCuNghiDinh'), t('canCuDeNghi')],
    noiDung,
    noiNhan: [t('noiNhan1'), t('noiNhan2'), t('noiNhan3')],
    chuKy: { thayMat: t('kyThayMat'), chucDanh: t('kyChucDanh') },
    tenCanBo,
  };
}
