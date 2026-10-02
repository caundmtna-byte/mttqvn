/**
 * Phần giống nhau của 4 phiếu khảo sát: tiêu đề, mục I (thông tin hộ), mục III
 * (ý kiến tổ công tác) và khối ký 4 cột. Mục II mỗi phiếu tự dựng.
 *
 * Số mục đánh liền mạch bằng `boDem` — mẫu giấy đánh 1 → hết, mục III tiếp số
 * của mục II.
 */
import type { HoNgheo } from '@/features/nha-dai-doan-ket/thong-tin-ho-ngheo/core/types';
import {
  DOTS_LONG,
  DOTS_MEDIUM,
  DOTS_SHORT,
  diaDanhXa,
  doan,
  dongDiaDanhNgay,
  f,
  luaChon,
  ngayGach,
  soVN,
  t,
  type BienBanBlock,
  type BienBanRun,
  type DanhMucLuaChon,
} from '@/lib/bien-ban/bien-ban-model';
import type { ViNguoiNgheo } from '../../core/types';
import {
  PKS_DOI_TUONG_UU_TIEN,
  PKS_KET_LUAN,
  type PksChung,
  type VnnPhieuKhaoSat,
} from '../../core/phieu-khao-sat';

/** Dữ liệu đầu vào của mọi builder. `ho` null khi khoản chưa gắn hộ nghèo. */
export interface PhieuKhaoSatNguon {
  vnn: ViNguoiNgheo;
  ho: HoNgheo | null;
}

/** Bộ đếm số mục: `so()` trả "10. ", "11. "… */
export function boDem(batDau = 1): () => string {
  let n = batDau;
  return () => `${n++}. `;
}

export function danhMuc(values: readonly string[]): DanhMucLuaChon[] {
  return values.map((v) => ({ value: v, label: v }));
}

export function phieuCua(vnn: ViNguoiNgheo): VnnPhieuKhaoSat {
  return vnn.phieu_khao_sat ?? { chung: {} };
}

/** "1.500.000 đồng" — trống ⇒ dòng chấm rồi chữ "đồng" như mẫu giấy. */
export function tienRuns(n: number | null | undefined, dots = DOTS_SHORT): BienBanRun[] {
  return [f(soVN(n), dots), t(' đồng')];
}

export function tieuDe(dongPhu: string[]): BienBanBlock {
  return {
    kind: 'tieu-de',
    lines: [
      { text: 'PHIẾU KHẢO SÁT', bold: true, size: 'lg' },
      ...dongPhu.map((text) => ({ text, bold: true })),
      { text: '-----', bold: true },
    ],
  };
}

export function tieuMuc(text: string): BienBanBlock {
  return doan([t(text, { bold: true })]);
}

/** Dòng nghiêng đậm chia nhóm trong mục II, vd "Trường hợp qua đời:". */
export function nhomPhu(text: string): BienBanBlock {
  return doan([t(text, { bold: true, italic: true })]);
}

export function dongChu(so: string, label: string, value: string | null | undefined): BienBanBlock {
  return doan([t(`${so}${label}: `), f(value, DOTS_LONG)]);
}

const DIEN_HO: DanhMucLuaChon[] = [
  { value: 'Hộ nghèo', label: 'Hộ nghèo' },
  { value: 'Cận nghèo', label: 'Hộ cận nghèo' },
  { value: 'Khó khăn', label: 'Hộ có hoàn cảnh khó khăn' },
];

export function tenChuHo({ vnn, ho }: PhieuKhaoSatNguon): string {
  return ho?.ho_ten_dai_dien?.trim() || vnn.ho_ten_nguoi_nhan;
}

/** Mục I — mục 1 đến 9, giống hệt nhau ở cả 4 phiếu (chỉ khác nhãn mục 1). */
export function mucThongTinHo(
  nguon: PhieuKhaoSatNguon,
  so: () => string,
  nhanChuHo = 'Họ tên chủ hộ',
): BienBanBlock[] {
  const { vnn, ho } = nguon;
  const nk = ho?.nhan_khau;
  const chung: PksChung = phieuCua(vnn).chung;

  // Hộ nghèo chỉ có "đối tượng ưu tiên" dạng chữ tự do — chưa tick ô nào thì in vào "Khác:".
  const uuTienKhac =
    chung.doi_tuong_uu_tien_khac ??
    (chung.doi_tuong_uu_tien?.length ? null : (nk?.doi_tuong_uu_tien ?? null));

  return [
    tieuMuc('I. THÔNG TIN HỘ GIA ĐÌNH'),
    doan([
      t(`${so()}${nhanChuHo}: `),
      f(tenChuHo(nguon), DOTS_MEDIUM),
      t('   Giới tính: '),
      f(nk?.gioi_tinh, 10),
      t('   Năm sinh: '),
      f(nk?.nam_sinh, 12),
    ]),
    doan([
      t(`${so()}Số Căn cước: `),
      f(ho?.so_cccd, DOTS_MEDIUM),
      t('   Ngày cấp: '),
      f(ngayGach(nk?.ngay_cap_cccd), DOTS_SHORT),
    ]),
    dongChu(so(), 'Họ tên vợ hoặc chồng', nk?.ho_ten_vo_chong),
    doan([
      t(`${so()}Số nhân khẩu: `),
      f(nk?.so_nhan_khau, DOTS_SHORT),
      t('   Số điện thoại liên hệ: '),
      f(ho?.dien_thoai, DOTS_SHORT),
    ]),
    doan([
      t(`${so()}Nơi thường trú: Khối/xóm/thôn/bản: `),
      f(vnn.khoi_xom ?? ho?.khoi_xom, DOTS_SHORT),
      t('   xã/phường: '),
      f(diaDanhXa(vnn.ten_xa_phuong ?? ho?.ten_xa_phuong), DOTS_SHORT),
    ]),
    doan([
      t(`${so()}Dân tộc: `),
      f(ho?.ten_dan_toc, DOTS_MEDIUM),
      t('   Tôn giáo: '),
      f(ho?.ton_giao, DOTS_SHORT),
    ]),
    doan([
      t(`${so()}Nghề nghiệp: `),
      f(nk?.nghe_nghiep, DOTS_MEDIUM),
      t('   Thu nhập bình quân/tháng: '),
      ...tienRuns(chung.thu_nhap_binh_quan),
    ]),
    luaChon(`${so()}Diện hộ:`, DIEN_HO, vnn.doi_tuong ?? ho?.doi_tuong ?? null, 'inline'),
    luaChon(
      `${so()}Đối tượng ưu tiên:`,
      danhMuc(PKS_DOI_TUONG_UU_TIEN),
      chung.doi_tuong_uu_tien,
      'luoi',
      { value: uuTienKhac },
    ),
  ];
}

/** Hai mục cuối mục II của mọi phiếu: hoàn cảnh gia đình + hỗ trợ từ nguồn khác. */
export function mucHoanCanhVaNguonKhac(chung: PksChung, so: () => string): BienBanBlock[] {
  return [
    dongChu(so(), 'Hoàn cảnh gia đình', chung.hoan_canh_gia_dinh),
    dongChu(
      so(),
      'Đã nhận hỗ trợ từ nguồn khác (nếu có, ghi rõ nguồn, nội dung, giá trị)',
      chung.ho_tro_nguon_khac,
    ),
  ];
}

const HINH_THUC_DE_XUAT: DanhMucLuaChon[] = [
  { value: 'Tiền mặt', label: 'Tiền mặt' },
  { value: 'Hiện vật', label: 'Hiện vật' },
  { value: 'Hiện vật và Tiền', label: 'Tiền mặt và hiện vật' },
];

/** Mức đề xuất: ô nhập riêng; trống thì ghép nội dung + số tiền của khoản hỗ trợ. */
export function mucDeXuat(vnn: ViNguoiNgheo, chung: PksChung): string | null {
  if (chung.muc_de_xuat) return chung.muc_de_xuat;
  const parts = [
    vnn.noi_dung_ho_tro?.trim() || null,
    vnn.so_tien != null ? `${soVN(vnn.so_tien)} đồng` : null,
    vnn.tong_tien_quy_doi != null ? `hiện vật trị giá ${soVN(vnn.tong_tien_quy_doi)} đồng` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join('; ') : null;
}

/** Mục III + dòng địa danh, ngày + khối ký 4 cột. */
export function mucYKienToCongTac(nguon: PhieuKhaoSatNguon, so: () => string): BienBanBlock[] {
  const { vnn } = nguon;
  const chung = phieuCua(vnn).chung;
  return [
    tieuMuc('III. Ý KIẾN CỦA TỔ CÔNG TÁC'),
    luaChon(`${so()}Kết luận:`, danhMuc(PKS_KET_LUAN), chung.ket_luan, 'inline'),
    luaChon(`${so()}Hình thức đề xuất:`, HINH_THUC_DE_XUAT, vnn.hinh_thuc_ho_tro, 'inline'),
    dongChu(so(), 'Mức/nội dung đề xuất hỗ trợ', mucDeXuat(vnn, chung)),
    dongChu(so(), 'Ghi chú', chung.ghi_chu),
    {
      kind: 'chu-ky',
      diaDanhNgay: dongDiaDanhNgay(diaDanhXa(vnn.ten_xa_phuong), chung.ngay_khao_sat),
      nhomDau: { text: 'ĐẠI DIỆN TỔ CÔNG TÁC', span: 3 },
      cols: [
        { title: 'Bí thư Chi bộ', note: '(Ký, ghi rõ họ tên)' },
        { title: 'Trưởng khối/xóm', note: '(Ký, ghi rõ họ tên)' },
        { title: 'Trưởng ban CTMT', note: '(Ký, ghi rõ họ tên)' },
        { title: 'Đại diện hộ', note: '(Ký, ghi rõ họ tên)', hoTen: tenChuHo(nguon) },
      ],
    },
  ];
}
