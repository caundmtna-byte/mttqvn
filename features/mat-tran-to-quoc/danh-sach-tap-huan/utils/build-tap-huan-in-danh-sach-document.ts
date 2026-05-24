import { txt } from '@/lib/text';
import { formatDateShort, getTodayISODate } from '@/lib/utils';
import type { CompanyInfo } from '@/store/useStore';
import type { MttqCanBo } from '@/features/mat-tran-to-quoc/danh-sach-can-bo/core/types';
import type { MttqLopTapHuan } from '../core/types';
import type { MttqLopTapHuanViewer } from '../hooks/use-mttq-tap-huan-viewer';
import {
  buildTapHuanInDanhSachMeta,
  buildTapHuanInDanhSachRows,
  type TapHuanInDanhSachPrintRow,
} from './build-tap-huan-in-danh-sach-rows';

export interface TapHuanInDanhSachMetaItem {
  label: string;
  value: string;
}

export interface TapHuanInDanhSachFooterModel {
  nguoiTaoLabel: string;
  nguoiTaoValue: string;
  nguoiKiemTraLabel: string;
  nguoiPheDuyetLabel: string;
}

export interface TapHuanInDanhSachDocumentModel {
  companyName: string;
  address?: string;
  phone?: string;
  documentTitle: string;
  metaItems: TapHuanInDanhSachMetaItem[];
  signedDateLabel: string;
  signedDateValue: string;
  rows: TapHuanInDanhSachPrintRow[];
  emptyMessage: string;
  sttColumnKey: string;
  nameColumnKey: string;
  footer: TapHuanInDanhSachFooterModel;
}

export function buildTapHuanInDanhSachDocumentModel(
  lop: MttqLopTapHuan,
  company: CompanyInfo | null | undefined,
  viewer: MttqLopTapHuanViewer,
  canBoMap?: Map<string, MttqCanBo>,
): TapHuanInDanhSachDocumentModel {
  const metaRecord = buildTapHuanInDanhSachMeta(lop);
  const metaItems = Object.entries(metaRecord).map(([label, value]) => ({ label, value }));
  const signedDateLabel = txt('matTranTapHuan.printPreview.signedDate');
  const signedDateValue = formatDateShort(getTodayISODate());
  const rows = buildTapHuanInDanhSachRows(lop, viewer, canBoMap);
  const sttColumnKey = txt('matTranTapHuan.printPreview.colStt');
  const nameColumnKey = txt('matTranTapHuan.form.hoVaTen');
  const ec = txt('common.emptyCell');
  const nguoiTao =
    lop.ho_va_ten_nguoi_tao?.trim() || lop.ten_tai_khoan_nguoi_tao?.trim() || ec;

  return {
    companyName: company?.companyName?.trim() || '—',
    address: company?.address?.trim() || undefined,
    phone: company?.phone?.trim() || undefined,
    documentTitle: txt('matTranTapHuan.printPreview.documentTitle'),
    metaItems,
    signedDateLabel,
    signedDateValue,
    rows,
    emptyMessage: txt('matTranTapHuan.printPreview.empty'),
    sttColumnKey,
    nameColumnKey,
    footer: {
      nguoiTaoLabel: txt('matTranTapHuan.printPreview.footerNguoiTao'),
      nguoiTaoValue: nguoiTao,
      nguoiKiemTraLabel: txt('matTranTapHuan.printPreview.footerNguoiKiemTra'),
      nguoiPheDuyetLabel: txt('matTranTapHuan.printPreview.footerNguoiPheDuyet'),
    },
  };
}

/** Meta hiển thị 2 cột: ghép các mục + ngày in thành cặp theo hàng. */
export function layoutTapHuanMetaPairs(
  metaItems: TapHuanInDanhSachMetaItem[],
  signedDate: TapHuanInDanhSachMetaItem,
): TapHuanInDanhSachMetaItem[][] {
  const all = [...metaItems, signedDate];
  const pairs: TapHuanInDanhSachMetaItem[][] = [];
  for (let i = 0; i < all.length; i += 2) {
    const row: TapHuanInDanhSachMetaItem[] = [all[i]];
    if (all[i + 1]) row.push(all[i + 1]);
    pairs.push(row);
  }
  return pairs;
}
