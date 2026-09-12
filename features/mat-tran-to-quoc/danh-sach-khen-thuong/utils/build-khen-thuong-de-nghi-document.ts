/**
 * Dựng mô hình "DANH SÁCH ĐỀ NGHỊ KHEN THƯỞNG" — biểu mẫu bảng nhiều dòng kèm
 * theo tờ trình/quyết định. Hàm thuần, dùng chung cho xem trước/in, DOCX, PDF.
 */
import { txt } from '@/lib/text';
import { formatDate, getTodayISODate } from '@/lib/utils';
import type { CompanyInfo } from '@/store/useStore';
import type { MttqCanBo } from '@/features/mat-tran-to-quoc/danh-sach-can-bo/core/types';
import type { MttqKhenThuong } from '../core/types';
import type { MttqKhenThuongViewer } from '../hooks/use-mttq-khen-thuong-viewer';
import {
  formatDiaDanhNgayThang,
  type VanBanHanhChinhModel,
  type VanBanKhoiNoiDung,
  type VanBanMucThongTin,
} from './van-ban-hanh-chinh';
import { chuanHoaSoQuyetDinh } from './so-quyet-dinh';
import {
  DIA_DANH_MAC_DINH,
  buildKhenThuongNguoiDuocKhen,
  type KhenThuongNguoiDuocKhen,
} from './build-khen-thuong-quyet-dinh-document';

export interface KhenThuongDeNghiContext {
  company?: CompanyInfo | null;
  viewer: MttqKhenThuongViewer;
  canBoMap?: Map<string, MttqCanBo>;
  /** Ngày lập danh sách; mặc định hôm nay. */
  ngayLap?: string | null;
}

export interface KhenThuongDeNghiDocumentModel extends VanBanHanhChinhModel {
  rows: KhenThuongNguoiDuocKhen[];
  canhBaoSoQd: boolean;
}

/** Khối thông tin chung của tờ danh sách (2 cột). */
export function buildDeNghiThongTinChung(
  kt: MttqKhenThuong,
  soKyHieuHienThi: string,
  soNguoi: number,
): VanBanMucThongTin[] {
  const t = (k: string) => txt(`matTranKhenThuong.printPreview.${k}`);
  const ec = txt('common.emptyCell');
  return [
    { label: t('metaSoQd'), value: soKyHieuHienThi },
    { label: t('metaNgay'), value: formatDate(kt.ngay_khen_thuong) },
    { label: t('metaDonViDeXuat'), value: kt.don_vi_de_xuat?.trim() || ec },
    { label: t('metaTrangThai'), value: kt.trang_thai },
    { label: t('metaSoNguoi'), value: String(soNguoi) },
    { label: t('metaNgayIn'), value: formatDate(getTodayISODate()) },
  ];
}

export function buildKhenThuongDeNghiDocumentModel(
  kt: MttqKhenThuong,
  ctx: KhenThuongDeNghiContext,
): KhenThuongDeNghiDocumentModel {
  const t = (k: string) => txt(`matTranKhenThuong.printPreview.${k}`);
  const soQd = chuanHoaSoQuyetDinh(kt.so_qd);
  const rows = buildKhenThuongNguoiDuocKhen(kt, ctx.viewer, ctx.canBoMap);
  // Khối tên cơ quan: dòng trên là cơ quan chủ quản (lấy từ Thông tin tổ chức),
  // dòng dưới in đậm là cơ quan ban hành văn bản.
  const coQuanChuQuan = ctx.company?.companyName?.trim() || t('coQuanChuQuan');
  const soKyHieuHienThi = soQd.hopLe ? soQd.soKyHieu : t('metaSoQdChuaCo');

  const bang: VanBanKhoiNoiDung = {
    kind: 'bang',
    headers: [
      t('colStt'),
      t('colHoTen'),
      t('colChucVuDonVi'),
      t('colCapKhenThuong'),
      t('colDanhHieu'),
      t('colHinhThuc'),
      t('colNoiDungKhen'),
    ],
    rows: rows.map((r) => [
      String(r.stt),
      r.hoTen,
      r.chucVuDonVi,
      r.capKhenThuong,
      r.danhHieu,
      r.hinhThuc,
      r.noiDungKhen || txt('common.emptyCell'),
    ]),
    aligns: ['center', 'left', 'left', 'center', 'center', 'center', 'left'],
    widths: [8, 15, 21, 11, 11, 11, 23],
    emptyMessage: t('empty'),
  };

  return {
    coQuanChuQuan: coQuanChuQuan,
    coQuanBanHanh: t('banThuongTruc'),
    soKyHieu: soKyHieuHienThi,
    diaDanhNgayThang: formatDiaDanhNgayThang(
      DIA_DANH_MAC_DINH,
      ctx.ngayLap?.trim() || getTodayISODate(),
    ),
    tenLoai: t('tenLoaiDeNghi'),
    trichYeu: t('trichYeuDeNghi'),
    thongTinChung: buildDeNghiThongTinChung(kt, soKyHieuHienThi, rows.length),
    noiDung: [bang],
    chuKy: { thayMat: t('kyThayMat'), chucDanh: t('kyChucDanh') },
    chuKyPhu: { chucDanh: t('kyNguoiLap') },
    rows,
    canhBaoSoQd: !soQd.hopLe,
  };
}
