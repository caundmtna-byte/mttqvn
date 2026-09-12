/**
 * Dựng mô hình "QUYẾT ĐỊNH khen thưởng" từ một bản ghi `mttq_khen_thuong`.
 * Toàn bộ là hàm thuần (không DOM, không React) để ba đường xuất — xem trước/in,
 * DOCX, PDF — dùng chung một nguồn dữ liệu và để viết test được.
 */
import { txt } from '@/lib/text';
import type { CompanyInfo } from '@/store/useStore';
import type { MttqCanBo } from '@/features/mat-tran-to-quoc/danh-sach-can-bo/core/types';
import type { MttqKhenThuong } from '../core/types';
import {
  canViewKhenThuongDetailChiTietLine,
  type MttqKhenThuongViewer,
} from '../hooks/use-mttq-khen-thuong-viewer';
import {
  doan,
  formatDiaDanhNgayThang,
  type VanBanHanhChinhModel,
  type VanBanKhoiNoiDung,
} from './van-ban-hanh-chinh';
import { chuanHoaSoQuyetDinh, soLuongVanBan } from './so-quyet-dinh';

/** Địa danh ghi trên văn bản — cơ quan đóng tại tỉnh Nghệ An. */
export const DIA_DANH_MAC_DINH = 'Nghệ An';

export interface KhenThuongQuyetDinhContext {
  company?: CompanyInfo | null;
  viewer: MttqKhenThuongViewer;
  canBoMap?: Map<string, MttqCanBo>;
  /** Ngày ký hiển thị trên văn bản; mặc định lấy `ngay_khen_thuong`. */
  ngayKy?: string | null;
}

/** Một người được khen sau khi đã lọc theo phạm vi xem. */
export interface KhenThuongNguoiDuocKhen {
  stt: number;
  hoTen: string;
  chucVuDonVi: string;
  capKhenThuong: string;
  danhHieu: string;
  hinhThuc: string;
  noiDungKhen: string;
}

function moTaChucVuDonVi(canBo?: MttqCanBo): string {
  const chucVu = canBo?.ten_chuc_vu?.trim() ?? '';
  const donVi =
    canBo?.ten_don_vi?.trim() ||
    canBo?.ten_bo_phan?.trim() ||
    canBo?.ten_phong_ban?.trim() ||
    (canBo?.ten_to_chuc_arr ?? []).filter(Boolean).join(', ');
  const parts = [chucVu, donVi].map((s) => s.trim()).filter(Boolean);
  return parts.join(' - ');
}

/**
 * Danh sách người được khen trong phạm vi xem của người dùng.
 * In một quyết định mà cán bộ không được phép xem dòng đó là lộ dữ liệu, nên
 * việc lọc phải nằm ở đây chứ không chỉ ở giao diện.
 */
export function buildKhenThuongNguoiDuocKhen(
  kt: MttqKhenThuong,
  viewer: MttqKhenThuongViewer,
  canBoMap?: Map<string, MttqCanBo>,
): KhenThuongNguoiDuocKhen[] {
  const ec = txt('common.emptyCell');
  return (kt.chi_tiet ?? [])
    .filter((line) => canViewKhenThuongDetailChiTietLine(viewer, line))
    .map((line, index) => {
      const canBo = canBoMap?.get(String(line.can_bo_id));
      const chucVuDonVi = moTaChucVuDonVi(canBo);
      return {
        stt: index + 1,
        hoTen: line.ten_can_bo?.trim() || canBo?.ho_ten?.trim() || ec,
        chucVuDonVi: chucVuDonVi || ec,
        capKhenThuong: line.cap_khen_thuong ?? ec,
        danhHieu: line.danh_hieu ?? ec,
        hinhThuc: line.hinh_thuc_khen ?? ec,
        noiDungKhen: line.noi_dung_khen?.trim() || '',
      };
    });
}

/** Gộp danh hiệu xuất hiện trong quyết định: `Giấy khen, Bằng khen`. */
export function gopDanhHieu(rows: KhenThuongNguoiDuocKhen[]): string {
  const seen: string[] = [];
  for (const r of rows) {
    const v = r.danhHieu.trim();
    if (v && !seen.includes(v)) seen.push(v);
  }
  return seen.join(', ');
}

/**
 * Thành tích chung của quyết định: ưu tiên nội dung khen ghi trên các dòng chi
 * tiết (khi tất cả giống nhau), sau đó tới nội dung bị nhập nhầm vào `so_qd`,
 * cuối cùng là ghi chú của quyết định.
 */
export function gopThanhTich(
  rows: KhenThuongNguoiDuocKhen[],
  noiDungNhapNhamSoQd: string | null,
  ghiChu: string | null | undefined,
): string {
  const noiDungs: string[] = [];
  for (const r of rows) {
    const v = r.noiDungKhen.trim();
    if (v && !noiDungs.includes(v)) noiDungs.push(v);
  }
  if (noiDungs.length === 1) return noiDungs[0];
  if (noiDungNhapNhamSoQd?.trim()) return noiDungNhapNhamSoQd.trim();
  if (noiDungs.length > 1) return txt('matTranKhenThuong.printPreview.thanhTichNhieuLoai');
  return ghiChu?.trim() || txt('matTranKhenThuong.printPreview.thanhTichMacDinh');
}

export interface KhenThuongQuyetDinhDocumentModel extends VanBanHanhChinhModel {
  /** Dùng cho tên file tải về và tiêu đề cửa sổ in. */
  soKyHieuGon: string;
  rows: KhenThuongNguoiDuocKhen[];
  /** True khi `so_qd` không phải số quyết định — trang xem trước cảnh báo. */
  canhBaoSoQd: boolean;
}

export function buildKhenThuongQuyetDinhDocumentModel(
  kt: MttqKhenThuong,
  ctx: KhenThuongQuyetDinhContext,
): KhenThuongQuyetDinhDocumentModel {
  const t = (k: string) => txt(`matTranKhenThuong.printPreview.${k}`);
  const soQd = chuanHoaSoQuyetDinh(kt.so_qd);
  const rows = buildKhenThuongNguoiDuocKhen(kt, ctx.viewer, ctx.canBoMap);
  const danhHieu = gopDanhHieu(rows) || t('danhHieuMacDinh');
  const thanhTich = gopThanhTich(rows, soQd.noiDungNhapNham, kt.ghi_chu);
  // Khối tên cơ quan: dòng trên là cơ quan chủ quản (lấy từ Thông tin tổ chức),
  // dòng dưới in đậm là cơ quan ban hành văn bản.
  const coQuanChuQuan = ctx.company?.companyName?.trim() || t('coQuanChuQuan');
  const ngayKy = ctx.ngayKy?.trim() || kt.ngay_khen_thuong;

  const bangNguoiDuocKhen: VanBanKhoiNoiDung = {
    kind: 'bang',
    headers: [
      t('colStt'),
      t('colHoTen'),
      t('colChucVuDonVi'),
      t('colCapKhenThuong'),
      t('colDanhHieu'),
      t('colHinhThuc'),
    ],
    rows: rows.map((r) => [
      String(r.stt),
      r.hoTen,
      r.chucVuDonVi,
      r.capKhenThuong,
      r.danhHieu,
      r.hinhThuc,
    ]),
    aligns: ['center', 'left', 'left', 'center', 'center', 'center'],
    widths: [8, 20, 30, 14, 14, 14],
    emptyMessage: t('empty'),
  };

  const noiDung: VanBanKhoiNoiDung[] = [
    doan(
      `${t('dieu1')} ${t('dieu1Noi').replace('{{danhHieu}}', danhHieu).replace('{{soLuong}}', soLuongVanBan(rows.length)).replace('{{thanhTich}}', thanhTich)}`,
      { indent: true },
    ),
    doan(t('dieu1DanhSach'), { indent: true, italic: true }),
    bangNguoiDuocKhen,
    doan(`${t('dieu2')} ${t('dieu2Noi')}`, { indent: true }),
    doan(`${t('dieu3')} ${t('dieu3Noi')}`, { indent: true }),
  ];

  const donViDeXuat = kt.don_vi_de_xuat?.trim();

  return {
    coQuanChuQuan: coQuanChuQuan,
    coQuanBanHanh: t('banThuongTruc'),
    soKyHieu: soQd.soKyHieu,
    diaDanhNgayThang: formatDiaDanhNgayThang(DIA_DANH_MAC_DINH, ngayKy),
    tenLoai: t('tenLoaiQuyetDinh'),
    trichYeu: t('trichYeuQuyetDinh').replace('{{danhHieu}}', danhHieu),
    thamQuyen: t('thamQuyen'),
    canCu: [
      t('canCuDieuLe'),
      t('canCuQuyChe'),
      donViDeXuat ? t('canCuDeNghiDonVi').replace('{{donVi}}', donViDeXuat) : t('canCuDeNghi'),
    ],
    noiDung,
    noiNhan: [t('noiNhan1'), t('noiNhan2'), t('noiNhan3')],
    chuKy: { thayMat: t('kyThayMat'), chucDanh: t('kyChucDanh') },
    soKyHieuGon: soQd.hopLe ? soQd.soKyHieu.split('/')[0] : '',
    rows,
    canhBaoSoQd: !soQd.hopLe,
  };
}
