import {
  DOTS_LONG,
  DOTS_MEDIUM,
  DOTS_SHORT,
  TINH_MAC_DINH,
  doan,
  f,
  luaChon,
  ngayThangNam,
  soVN,
  t,
  tenXaDayDu,
  type BienBanBlock,
  type BienBanModel,
} from '@/lib/bien-ban/bien-ban-model';
import { docSoTienVND } from '@/features/mat-tran-to-quoc/danh-sach-tang-luong/utils/luong-bang-chu';
import { TN_MUC_DICH, TN_PHU_LUC_DONG_TRONG } from '../../core/constants';
import type { TiepNhanFull } from '../../core/types';
import { giaTriHienVatTiepNhan, tongGiaTriTiepNhan } from '../tong-gia-tri';

/** Thông tin nhà tài trợ in lên biên bản (danh mục Nhà tài trợ). */
export interface TnNhaTaiTroIn {
  ten: string;
  dia_chi: string | null;
  dien_thoai: string | null;
  ma_so_thue: string | null;
  nguoi_dai_dien: string | null;
}

/** Khoảng cách giữa hai ô trên cùng dòng — NBSP vì HTML gộp dấu cách liên tiếp. */
const KHOANG_CACH = '\u00a0\u00a0\u00a0';

const tienHoacTrong = (n: number | null | undefined) => (n != null && n > 0 ? soVN(n) : null);

/** "tỉnh Nghệ An" hoặc "xã Tân Kỳ" — phần đuôi của "Uỷ ban MTTQ Việt Nam …". */
export function tenBenNhanTaiTro(tn: Pick<TiepNhanFull, 'don_vi_chu_tri_loai' | 'ten_don_vi_tiep_nhan'>): string {
  if (tn.don_vi_chu_tri_loai === 'xa_phuong') return tenXaDayDu(tn.ten_don_vi_tiep_nhan) ?? '';
  return `tỉnh ${TINH_MAC_DINH}`;
}

/** Mô tả phần hiện vật: phiếu nhập kho đã gắn + hiện vật khác không qua kho. */
export function moTaHienVat(tn: Pick<TiepNhanFull, 'phieu_kho' | 'hien_vat_khac_mo_ta'>): string | null {
  const parts: string[] = [];
  if (tn.phieu_kho.length > 0) {
    parts.push(`Hàng nhập kho theo phiếu ${tn.phieu_kho.map((p) => p.so_phieu).join(', ')}`);
  }
  const khac = tn.hien_vat_khac_mo_ta?.trim();
  if (khac) parts.push(khac);
  return parts.length > 0 ? parts.join('; ') : null;
}

/**
 * "Biên bản xác nhận khoản tài trợ" + Phụ lục "Danh sách xác nhận của người được tài
 * trợ" (TT 20/2026/TT-BTC). Hàm thuần — cùng mô hình cho xem trước, Word, Excel.
 * Ô chưa có dữ liệu in dòng chấm để viết tay.
 */
export function buildBienBanXacNhanTaiTro(tn: TiepNhanFull, ntt: TnNhaTaiTroIn | null): BienBanModel {
  const tenNtt = ntt?.ten ?? tn.ten_nha_tai_tro;
  const benNhan = tenBenNhanTaiTro(tn);
  const tong = tongGiaTriTiepNhan(tn);
  const hienVat = giaTriHienVatTiepNhan(tn);

  const blocks: BienBanBlock[] = [
    { kind: 'quoc-hieu' },
    { kind: 'tieu-de', lines: [{ text: 'BIÊN BẢN XÁC NHẬN KHOẢN TÀI TRỢ', bold: true, size: 'lg' }] },
    doan([t('Chúng tôi gồm có:', { bold: true })]),
    doan([t('Tên doanh nghiệp (Nhà tài trợ): '), f(tenNtt, DOTS_LONG - 30)]),
    doan([t('Địa chỉ: '), f(ntt?.dia_chi, DOTS_MEDIUM), t(`${KHOANG_CACH}Số điện thoại: `), f(ntt?.dien_thoai, DOTS_SHORT)]),
    doan([t('Mã số thuế: '), f(ntt?.ma_so_thue, DOTS_SHORT)]),
    doan(
      [
        t('Tên cơ quan, tổ chức, cá nhân (Bên nhận tài trợ; cơ quan, tổ chức có chức năng huy động tài trợ): '),
        t('Uỷ ban MTTQ Việt Nam '),
        f(benNhan, DOTS_SHORT),
      ],
      { align: 'justify' },
    ),
    doan([t('Địa chỉ: '), f(null, DOTS_MEDIUM), t(`${KHOANG_CACH}Số điện thoại: `), f(null, DOTS_SHORT)]),
    doan([t('Mã số thuế (nếu có): '), f(null, DOTS_MEDIUM)]),
    doan(
      [
        t('Cùng xác nhận '),
        f(tenNtt, DOTS_SHORT),
        t(' đã tài trợ cho Uỷ ban MTTQ Việt Nam '),
        f(benNhan, DOTS_SHORT),
        t(' nhằm mục đích:'),
      ],
      { align: 'justify' },
    ),
    luaChon([], TN_MUC_DICH, tn.muc_dich, 'stack'),
    doan([t('Với tổng giá trị của khoản tài trợ là: '), f(tienHoacTrong(tong), DOTS_SHORT), t(' đồng')]),
    doan([t('(Bằng chữ: '), f(tong > 0 ? docSoTienVND(tong) : null, DOTS_LONG - 10), t(')')]),
    doan([t('Bằng tiền: '), f(tienHoacTrong(tn.so_tien), DOTS_SHORT), t(' đồng')]),
    doan([
      t('Hiện vật: '),
      f(moTaHienVat(tn), DOTS_SHORT),
      t(`${KHOANG_CACH}quy ra trị giá VND: `),
      f(tienHoacTrong(hienVat), DOTS_SHORT),
    ]),
    doan([
      t('Giấy tờ có giá: '),
      f(tn.giay_to_co_gia_mo_ta, DOTS_SHORT),
      t(`${KHOANG_CACH}quy ra trị giá VND: `),
      f(tienHoacTrong(tn.giay_to_co_gia_gia_tri), DOTS_SHORT),
    ]),
    doan([t('(kèm theo các chứng từ liên quan khác của khoản tài trợ).', { italic: true })]),
    doan(
      [
        t('Uỷ ban MTTQ Việt Nam '),
        f(benNhan, DOTS_SHORT),
        t(
          ' cam kết sử dụng đúng mục đích của khoản tài trợ. Trường hợp sử dụng sai mục đích, Bên nhận tài trợ ký tên dưới đây xin chịu trách nhiệm trước pháp luật.',
        ),
      ],
      { align: 'justify' },
    ),
    doan(
      [
        t('Biên bản này được lập vào hồi '),
        f(null, 12),
        t(' tại '),
        f(tn.dia_diem_lap, DOTS_SHORT),
        t(` ${ngayThangNam(tn.ngay_tiep_nhan)} và được lập thành 02 (hai) bản như nhau, mỗi bên giữ 01 bản.`),
      ],
      { align: 'justify' },
    ),
    {
      kind: 'chu-ky',
      cols: [
        {
          title: 'BÊN NHẬN TÀI TRỢ; CƠ QUAN, TỔ CHỨC CÓ CHỨC NĂNG HUY ĐỘNG TÀI TRỢ',
          note: '(Ký, ghi rõ họ tên, đóng dấu)',
        },
        { title: 'BÊN TÀI TRỢ', note: '(Ký, ghi rõ họ tên, đóng dấu)', hoTen: ntt?.nguoi_dai_dien ?? null },
      ],
    },

    // ---------------- Phụ lục ----------------
    { kind: 'ngat-trang' },
    {
      kind: 'tieu-de',
      lines: [
        { text: 'PHỤ LỤC', bold: true },
        { text: 'DANH SÁCH XÁC NHẬN CỦA NGƯỜI ĐƯỢC TÀI TRỢ', bold: true },
        { text: `(Kèm theo Biên bản xác nhận khoản tài trợ lập ${ngayThangNam(tn.ngay_tiep_nhan)}`, italic: true },
        { text: `giữa ${tenNtt} và Uỷ ban MTTQ Việt Nam ${benNhan})`, italic: true },
      ],
    },
    doan(
      [
        t(
          'Áp dụng đối với khoản tài trợ cho người bệnh (điểm a) hoặc cho cá nhân để phòng, chống, khắc phục hậu quả thiên tai, dịch bệnh (điểm b) khoản 5 Điều 3 Thông tư số 20/2026/TT-BTC.',
          { italic: true },
        ),
      ],
      { align: 'justify' },
    ),
    {
      kind: 'bang',
      cols: [
        { title: 'STT', align: 'center', widthPct: 7 },
        { title: 'Họ và tên người ký xác nhận', widthPct: 22 },
        { title: 'Địa chỉ', widthPct: 20 },
        { title: 'Người được tài trợ/ quan hệ với người bệnh', widthPct: 19 },
        { title: 'Nội dung, giá trị nhận (VND)', widthPct: 18 },
        { title: 'Ký, ghi rõ họ tên', widthPct: 14 },
      ],
      rows: [
        ['1', '2', '3', '4', '5', '6'],
        ...(tn.phu_luc.length > 0
          ? tn.phu_luc.map((d, i) => [String(i + 1), d.ho_ten, d.dia_chi, d.quan_he, d.noi_dung_gia_tri, ''])
          : Array.from({ length: TN_PHU_LUC_DONG_TRONG }, (_, i) => [String(i + 1), '', '', '', '', ''])),
      ],
      footer: { span: 2, cells: ['Tổng cộng', '', '', '', ''] },
    },
    doan([t('Danh sách này là bộ phận không tách rời của Biên bản xác nhận khoản tài trợ nêu trên.', { italic: true })]),
    {
      kind: 'chu-ky',
      cols: [
        { title: 'NGƯỜI LẬP DANH SÁCH', note: '(Ký, ghi rõ họ tên)' },
        {
          title: 'XÁC NHẬN CỦA CƠ QUAN, TỔ CHỨC CÓ CHỨC NĂNG HUY ĐỘNG TÀI TRỢ',
          note: '(Ký, ghi rõ họ tên, đóng dấu)',
        },
      ],
    },
  ];

  return { tieuDe: `Biên bản xác nhận khoản tài trợ ${tn.so_phieu}`, blocks };
}
