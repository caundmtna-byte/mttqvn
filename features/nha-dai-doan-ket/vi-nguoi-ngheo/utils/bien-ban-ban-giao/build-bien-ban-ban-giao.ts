/**
 * Biên bản bàn giao tiền, hiện vật hỗ trợ — bám mẫu "BB bàn giao chung" của
 * cơ quan. Dùng cho MỌI lĩnh vực; đoạn "Riêng mô hình sinh kế / nhà ở" và cột
 * ký "Người giám hộ" chỉ in khi lĩnh vực cần.
 *
 * Phần nhập riêng cho biên bản đọc từ `vnn.bien_ban_ban_giao`; còn lại lấy từ
 * khoản hỗ trợ, hộ nghèo được gắn và phiếu khảo sát.
 */
import { docSoTienVND } from '@/features/mat-tran-to-quoc/danh-sach-tang-luong/utils/luong-bang-chu';
import {
  DOTS_LONG,
  DOTS_MEDIUM,
  DOTS_SHORT,
  diaChiDayDu,
  doan,
  f,
  luaChon,
  ngayGach,
  ngayThangNam,
  soVN,
  t,
  tenXaDayDu,
  type BienBanBlock,
  type BienBanCotKy,
  type BienBanModel,
  type BienBanRun,
  type DanhMucLuaChon,
} from '@/lib/bien-ban/bien-ban-model';
import type { VnnLinhVuc } from '../../core/constants';
import {
  BBBG_LINH_VUC_NHA,
  BBBG_LINH_VUC_SINH_KE,
  thanhTienHienVat,
  type BbbgHienVat,
  type VnnBienBanBanGiao,
} from '../../core/bien-ban-ban-giao';
import type { PhieuKhaoSatNguon } from '../phieu-khao-sat/phan-chung';

export const TIEU_DE_BAN_GIAO = 'Biên bản bàn giao tiền, hiện vật hỗ trợ';

/** Số dòng tối thiểu của bảng hiện vật — mẫu giấy in sẵn 5 dòng để viết tay. */
export const SO_DONG_HIEN_VAT_TOI_THIEU = 5;

/** Ô tick lĩnh vực trên mẫu → lĩnh vực của khoản hỗ trợ. */
const LINH_VUC: DanhMucLuaChon[] = [
  { value: 'Cứu trợ', label: 'Cứu trợ' },
  { value: 'Mô hình sinh kế', label: 'Mô hình sinh kế' },
  { value: 'Học sinh nghèo', label: 'Học sinh nghèo' },
  { value: 'Chữa bệnh', label: 'Chữa bệnh' },
  { value: 'Nhà bị sập', label: 'Nhà bị sập' },
  { value: 'Người chết', label: 'Thăm hỏi gia đình có người qua đời' },
];

/** Hoả hoạn tick chung ô "Cứu trợ"; Tết vì người nghèo và Con nuôi không có ô nào. */
export function oLinhVuc(linhVuc: VnnLinhVuc | string | null | undefined): string | null {
  if (linhVuc === 'Hoả hoạn') return 'Cứu trợ';
  return LINH_VUC.some((o) => o.value === linhVuc) ? (linhVuc as string) : null;
}

const NGUON: DanhMucLuaChon[] = [
  { value: 'Vì người nghèo', label: 'Quỹ “Vì người nghèo”' },
  { value: 'Cứu trợ', label: 'Quỹ Cứu trợ' },
  { value: 'Ngân sách', label: 'Nguồn khác' },
];

const HINH_THUC: DanhMucLuaChon[] = [
  { value: 'Tiền mặt', label: 'Tiền mặt' },
  { value: 'Hiện vật', label: 'Hiện vật' },
  { value: 'Hiện vật và Tiền', label: 'Tiền mặt và hiện vật' },
];

function muc(text: string): BienBanBlock {
  return doan([t(text, { bold: true })]);
}

/** Đơn vị bên giao: ô nhập riêng; trống ⇒ "Uỷ ban MTTQ Việt Nam xã …". */
function donViBenGiao(bb: VnnBienBanBanGiao, tenXa: string | null): BienBanRun[] {
  if (bb.don_vi_ben_giao) return [f(bb.don_vi_ben_giao, DOTS_LONG)];
  return [t('Uỷ ban MTTQ Việt Nam '), f(tenXa, DOTS_MEDIUM)];
}

/** "12/QĐ-UBMT" gõ đủ hay chỉ "12" đều in được; trống ⇒ khung "………/QĐ-………". */
function soQuyetDinh(so: string | null | undefined): BienBanRun[] {
  const s = so?.trim();
  if (!s) return [t('………/QĐ-………')];
  return [f(s.includes('/') ? s : `${s}/QĐ-………`)];
}

export interface NguoiDuocHoTro {
  hoTen: string | null;
  namSinh: string | null;
  quanHe: string | null;
  boSung: string | null;
}

/** Người được hỗ trợ khác người nhận — đọc từ phiếu khảo sát (học sinh / người bệnh / người qua đời). */
export function nguoiDuocHoTro({ vnn }: PhieuKhaoSatNguon): NguoiDuocHoTro | null {
  const p = vnn.phieu_khao_sat;
  if (vnn.linh_vuc_ho_tro === 'Học sinh nghèo') {
    const hs = p?.hoc_sinh ?? {};
    const boSung = [hs.lop && `Lớp ${hs.lop}`, hs.truong && `trường ${hs.truong}`].filter(Boolean).join(', ');
    return {
      hoTen: hs.ho_ten ?? null,
      namSinh: hs.ngay_sinh ? hs.ngay_sinh.slice(0, 4) : null,
      quanHe: hs.quan_he_chu_ho ?? null,
      boSung: boSung || null,
    };
  }
  if (vnn.linh_vuc_ho_tro === 'Chữa bệnh' || vnn.linh_vuc_ho_tro === 'Người chết') {
    const bt = p?.benh_tat ?? {};
    const boSung =
      vnn.linh_vuc_ho_tro === 'Người chết'
        ? bt.ngay_mat
          ? `Ngày mất: ${ngayGach(bt.ngay_mat)}`
          : null
        : bt.co_so_dieu_tri
          ? `Cơ sở điều trị: ${bt.co_so_dieu_tri}`
          : null;
    return {
      hoTen: bt.ho_ten ?? null,
      namSinh: bt.nam_sinh != null ? String(bt.nam_sinh) : null,
      quanHe: bt.quan_he_chu_ho ?? null,
      boSung,
    };
  }
  return null;
}

export interface BangHienVat {
  rows: string[][];
  tong: number | null;
}

/**
 * Dòng bảng hiện vật. Chưa nhập dòng nào mà khoản có hiện vật ⇒ một dòng dựng
 * từ Nội dung / Số lượng / Số tiền (chỉ hình thức "Hiện vật"). Luôn đệm đủ 5 dòng như mẫu.
 */
export function bangHienVat({ vnn }: PhieuKhaoSatNguon): BangHienVat {
  const nhap: BbbgHienVat[] = vnn.bien_ban_ban_giao?.hien_vat ?? [];
  const rows: string[][] = [];
  let tong: number | null = null;
  const cong = (n: number | null) => {
    if (n != null) tong = (tong ?? 0) + n;
  };

  if (nhap.length > 0) {
    nhap.forEach((d, i) => {
      const tt = thanhTienHienVat(d);
      cong(tt);
      rows.push([
        String(i + 1),
        d.ten ?? '',
        d.dvt ?? '',
        soVN(d.so_luong) ?? '',
        soVN(d.don_gia) ?? '',
        soVN(tt) ?? '',
        d.ghi_chu ?? '',
      ]);
    });
  } else if (vnn.hinh_thuc_ho_tro === 'Hiện vật') {
    // "Hiện vật và Tiền" không tách được phần hiện vật khỏi Số tiền ⇒ để bảng trống cho viết tay.
    cong(vnn.so_tien);
    rows.push([
      '1',
      vnn.noi_dung_ho_tro?.trim() ?? '',
      '',
      soVN(vnn.so_luong) ?? '',
      '',
      soVN(vnn.so_tien) ?? '',
      '',
    ]);
  }

  for (let i = rows.length; i < SO_DONG_HIEN_VAT_TOI_THIEU; i += 1) {
    rows.push([String(i + 1), '', '', '', '', '', '']);
  }
  return { rows, tong };
}

export function buildBienBanBanGiao(nguon: PhieuKhaoSatNguon): BienBanModel {
  const { vnn, ho } = nguon;
  const bb: VnnBienBanBanGiao = vnn.bien_ban_ban_giao ?? {};
  const nk = ho?.nhan_khau;
  const tenXaGoc = vnn.ten_xa_phuong ?? ho?.ten_xa_phuong ?? null;
  const tenXa = tenXaDayDu(tenXaGoc);
  const nguoiNhan = vnn.ho_ten_nguoi_nhan?.trim() || null;
  const duocHoTro = nguoiDuocHoTro(nguon);
  const hienVat = bangHienVat(nguon);
  // Số tiền là giá trị CẢ khoản ⇒ chỉ là tiền mặt khi hình thức "Tiền mặt".
  // "Hiện vật và Tiền" không tách được hai phần ⇒ để trống cho viết tay.
  const tienMat = vnn.hinh_thuc_ho_tro === 'Tiền mặt' ? vnn.so_tien : null;
  const lv = vnn.linh_vuc_ho_tro;

  const blocks: BienBanBlock[] = [
    { kind: 'quoc-hieu' },
    {
      kind: 'tieu-de',
      lines: [
        { text: 'BIÊN BẢN BÀN GIAO', bold: true, size: 'lg' },
        { text: 'tiền, hiện vật hỗ trợ', bold: true },
      ],
    },
    luaChon([t('Lĩnh vực hỗ trợ:', { bold: true })], LINH_VUC, oLinhVuc(lv), 'luoi'),
    doan([
      t(`Hôm nay, ${ngayThangNam(bb.ngay_ban_giao)}, tại `),
      f(bb.dia_diem, DOTS_MEDIUM),
      t(', chúng tôi gồm:'),
    ]),

    muc('I. BÊN GIAO'),
    doan([t('Đơn vị: '), ...donViBenGiao(bb, tenXa)]),
    luaChon('Nguồn hỗ trợ:', NGUON, vnn.nguon, 'inline'),
    doan([t('Đơn vị, cá nhân tài trợ (nếu có): '), f(vnn.ten_don_vi_ho_tro, DOTS_MEDIUM)]),
    doan([
      t('Đại diện: Ông (bà) '),
      f(bb.dai_dien_ho_ten, DOTS_MEDIUM),
      t('   Chức vụ: '),
      f(bb.dai_dien_chuc_vu, DOTS_SHORT),
    ]),

    muc('II. BÊN NHẬN'),
    doan([
      t('Ông (bà): '),
      f(nguoiNhan, DOTS_MEDIUM),
      t('   Năm sinh: '),
      f(nk?.nam_sinh, 12),
    ]),
    doan([
      t('Số Căn cước: '),
      f(ho?.so_cccd, DOTS_SHORT),
      t('   Ngày cấp: '),
      f(ngayGach(nk?.ngay_cap_cccd), 12),
      t('   Nơi cấp: '),
      f(nk?.noi_cap_cccd, DOTS_SHORT),
    ]),
    doan([
      t('Nơi thường trú: '),
      f(diaChiDayDu(vnn.khoi_xom ?? ho?.khoi_xom ?? null, tenXaGoc), DOTS_LONG),
    ]),
    doan([t('Số điện thoại: '), f(ho?.dien_thoai, DOTS_SHORT)]),
    doan([
      t('Người được hỗ trợ '),
      t('(ghi khi khác người nhận: học sinh, người bệnh, người qua đời)', { italic: true }),
      t(':'),
    ]),
    doan([
      t('Ông (bà)/em: '),
      f(duocHoTro?.hoTen, DOTS_MEDIUM),
      t('   Năm sinh: '),
      f(duocHoTro?.namSinh, 12),
    ]),
    doan([t('Quan hệ với người nhận: '), f(duocHoTro?.quanHe, DOTS_MEDIUM)]),
    doan([
      t('Thông tin bổ sung (lớp, trường/cơ sở điều trị/ngày mất): '),
      f(duocHoTro?.boSung, DOTS_MEDIUM),
    ]),

    doan([t('III. BÊN LÀM CHỨNG ', { bold: true }), t('(cán bộ khối, xóm, thôn, bản)', { italic: true })]),
    doan([
      t('Ông (bà) '),
      f(bb.lam_chung_1_ho_ten, DOTS_MEDIUM),
      t('   Chức vụ: '),
      f(bb.lam_chung_1_chuc_vu, DOTS_SHORT),
    ]),
    doan([
      t('Ông (bà) '),
      f(bb.lam_chung_2_ho_ten, DOTS_MEDIUM),
      t('   Chức vụ: '),
      f(bb.lam_chung_2_chuc_vu, DOTS_SHORT),
    ]),

    doan(
      [
        t('Căn cứ Quyết định số '),
        ...soQuyetDinh(bb.so_quyet_dinh),
        t(' ngày '),
        f(ngayGach(bb.ngay_quyet_dinh), 12),
        t(' của '),
        f(bb.co_quan_quyet_dinh, DOTS_SHORT),
        t(' về việc '),
        f(bb.ve_viec, DOTS_SHORT),
        t('.'),
      ],
      { align: 'justify' },
    ),
    doan([t('Hai bên thống nhất bàn giao các nội dung sau:')]),

    luaChon('1. Hình thức hỗ trợ:', HINH_THUC, vnn.hinh_thuc_ho_tro, 'inline'),
    doan([t('2. Tiền mặt: Tổng số tiền '), f(soVN(tienMat), DOTS_SHORT), t(' đồng')]),
    doan([t('(Bằng chữ: '), f(docSoTienVND(tienMat) || null, DOTS_LONG - 10), t(')')]),
    doan([t('3. Hiện vật:')]),
    {
      kind: 'bang',
      cols: [
        { title: 'STT', align: 'center', widthPct: 7 },
        { title: 'Tên hiện vật', widthPct: 26 },
        { title: 'ĐVT', align: 'center', widthPct: 9 },
        { title: 'Số lượng', align: 'right', widthPct: 11 },
        { title: 'Đơn giá (đồng)', align: 'right', widthPct: 15 },
        { title: 'Thành tiền (đồng)', align: 'right', widthPct: 16 },
        { title: 'Ghi chú', widthPct: 16 },
      ],
      rows: hienVat.rows,
      footer: { span: 2, cells: ['Tổng cộng', '', '', '', soVN(hienVat.tong) ?? '', ''] },
    },
    doan([
      t('Tổng giá trị hiện vật (bằng chữ): '),
      f(docSoTienVND(hienVat.tong) || null, DOTS_MEDIUM),
    ]),
    doan([t('4. Mục đích sử dụng: '), f(bb.muc_dich, DOTS_LONG - 20)]),
    doan([t('5. Cam kết của bên nhận:')]),
    doan([t('- Đã nhận đủ số tiền, hiện vật nêu trên;')]),
    doan([t('- Sử dụng đúng mục đích; không bán, cho, cầm cố, chuyển nhượng hiện vật được hỗ trợ;')]),
    doan([t('- Tạo điều kiện để bên giao hoàn tất hồ sơ thanh quyết toán theo quy định.')]),
  ];

  if (BBBG_LINH_VUC_SINH_KE.includes(lv)) {
    blocks.push(
      doan(
        [
          t('Riêng mô hình sinh kế: ', { bold: true }),
          t('chăm sóc, duy trì và phát triển mô hình; không bán, cầm cố, chuyển nhượng trong thời gian '),
          f(bb.so_thang_duy_tri, 9),
          t(
            ' tháng kể từ ngày nhận; chịu sự theo dõi của Ban Công tác Mặt trận khối/xóm; sử dụng sai mục đích thì hoàn trả giá trị đã nhận.',
          ),
        ],
        { align: 'justify' },
      ),
    );
  }
  if (BBBG_LINH_VUC_NHA.includes(lv)) {
    blocks.push(
      doan([
        t('Riêng nhà ở: ', { bold: true }),
        t('hoàn thành xây dựng/sửa chữa trước ngày '),
        f(ngayGach(bb.han_hoan_thanh_nha), 14),
        t('.'),
      ]),
    );
  }

  const cotKy: BienBanCotKy[] = [
    { title: 'BÊN GIAO', note: '(Ký, ghi rõ họ tên)', hoTen: bb.dai_dien_ho_ten },
    { title: 'BÊN NHẬN', note: '(Ký, ghi rõ họ tên)', hoTen: nguoiNhan },
  ];
  if (lv === 'Học sinh nghèo') {
    cotKy.push({
      title: 'NGƯỜI GIÁM HỘ',
      note: '(nếu người được hỗ trợ là học sinh) (Ký, ghi rõ họ tên)',
    });
  }

  blocks.push(
    doan([
      t('Biên bản được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi bên giữ 01 (một) bản.'),
    ]),
    { kind: 'chu-ky', cols: cotKy },
    {
      kind: 'chu-ky',
      cols: [
        {
          title: 'XÁC NHẬN CỦA ĐẠI DIỆN KHỐI/THÔN/XÓM/BẢN',
          note: '(Ký, ghi rõ họ tên)',
          hoTen: bb.lam_chung_1_ho_ten,
        },
      ],
    },
  );

  return { tieuDe: TIEU_DE_BAN_GIAO, blocks };
}
