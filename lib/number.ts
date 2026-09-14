/**
 * Đọc / hiển thị số trong ô nhập — dùng chung cho mọi ô tiền và số lượng.
 *
 * Cán bộ gõ tiền theo thói quen tiếng Việt: `1.500.000` hoặc `1 500 000`, đôi khi
 * dán từ Excel ra thành `1,500,000`. Nếu đưa thẳng chuỗi đó vào `Number()` thì
 * ra `NaN` và hồ sơ bị từ chối mà không rõ lý do — hoặc tệ hơn, `parseFloat`
 * đọc `"500.000.000"` thành `500` rồi ghi vào sổ mà không báo gì.
 *
 * Trước đây bộ đọc này nằm riêng trong `features/quy/utils/quy-tien.ts` nên bốn
 * module còn lại mỗi nơi tự parse một kiểu, ba trong số đó sai âm thầm.
 */

/**
 * Ký tự phân cách hàng nghìn được chấp nhận khi nhập.
 *
 * Viết tường minh bằng mã Unicode, không dán ký tự thô: Word và Excel chèn dấu
 * cách KHÔNG NGẮT (U+00A0) và dấu cách hẹp không ngắt (U+202F) vào giữa các
 * nhóm chữ số. Người dán số vào ô nhập không hề nhìn thấy chúng, nên nếu không
 * chấp nhận thì họ sẽ gặp lỗi "số tiền chưa hợp lệ" trên một chuỗi trông hoàn
 * toàn bình thường.
 */
const KY_TU_TRANG = "\\s'\\u00A0\\u202F";
const DAU_PHAN_CACH = `.,${KY_TU_TRANG}`;
const XOA_TRANG = new RegExp(`[${KY_TU_TRANG}]`, 'g');
const NHOM_NGHIN = new RegExp(`[${DAU_PHAN_CACH}]`, 'g');
const CHI_CHU_SO_VA_PHAN_CACH = new RegExp(`^[\\d${DAU_PHAN_CACH}]+$`);

/**
 * Trần trên của một dòng tiền: `Number.MAX_SAFE_INTEGER`.
 *
 * Cột DB là `numeric(18,2)` nên về lý thuyết nhận tới 9.999.999.999.999.999,99,
 * nhưng JavaScript **không biểu diễn chính xác** số nguyên vượt
 * `Number.MAX_SAFE_INTEGER` (≈ 9,007 × 10^15): mọi phép cộng dồn số dư từ đó
 * trở đi đều không còn đáng tin. Với sổ quỹ của một tỉnh thì mốc này (hơn 9
 * triệu tỷ đồng) là xa thực tế, nên từ chối an toàn hơn nhiều so với nhận rồi
 * cộng sai.
 */
export const SO_TIEN_TOI_DA = Number.MAX_SAFE_INTEGER;

export interface ParseSoOptions {
  /**
   * Cho phép phần thập phân (ô số lượng hàng hoá, đơn giá lẻ).
   *
   * Mặc định `false` — tiền VND là số nguyên đồng, và ở chế độ nguyên thì mọi
   * dấu chấm/phẩy đều chắc chắn là dấu nhóm hàng nghìn, không phải đoán.
   */
  choThapPhan?: boolean;
}

/** Một nhóm hàng nghìn hợp lệ là đúng 3 chữ số. */
function laNhomNghinHopLe(phan: string): boolean {
  return /^\d{3}$/.test(phan);
}

/**
 * Nhóm dẫn đầu của một số có phân cách: 1-3 chữ số và **không bắt đầu bằng 0**.
 *
 * Nhờ ràng buộc này mà `0,125` được hiểu đúng là không phẩy một hai lăm chứ
 * không phải một trăm hai lăm — không ai viết số 125 thành `0,125`.
 */
function laNhomDauHopLe(phan: string): boolean {
  return /^[1-9]\d{0,2}$/.test(phan);
}

/**
 * Tách phần nguyên và phần thập phân khi cho phép số lẻ.
 *
 * Luật phân biệt — `1.500,25` (Việt Nam) với `1,500.25` (Anh–Mỹ) chỉ khác nhau ở
 * dấu nào đứng sau: **dấu xuất hiện SAU CÙNG là dấu thập phân**, dấu còn lại là
 * dấu nhóm. Khi chỉ có một loại dấu và nhóm sau nó đúng 3 chữ số (`1.500`) thì
 * coi là dấu nhóm — đây là cách viết phổ biến hơn hẳn ở Việt Nam, và đoán
 * ngược lại sẽ biến một nghìn năm trăm thành một phẩy năm.
 */
function tachThapPhan(s: string): { nguyen: string; le: string } | null {
  const viTriChot = Math.max(s.lastIndexOf('.'), s.lastIndexOf(','));
  if (viTriChot < 0) return { nguyen: s, le: '' };

  const coCham = s.includes('.');
  const coPhay = s.includes(',');

  if (coCham && coPhay) {
    // Hai loại dấu ⇒ dấu đứng sau là dấu thập phân, dấu kia là dấu nhóm.
    const sau = s.slice(viTriChot + 1);
    if (sau === '' || /[.,]/.test(sau)) return null;
    return { nguyen: s.slice(0, viTriChot), le: sau };
  }

  // Một loại dấu: nếu MỌI nhóm đều đúng 3 chữ số thì đó là nhóm hàng nghìn
  // (`500,000,000`), chứ không phải phần thập phân. Chỉ khi nhóm cuối không
  // phải 3 chữ số — hoặc số dẫn đầu bắt đầu bằng 0 như `0,125` — mới là số lẻ.
  const nhom = s.split(/[.,]/);
  const laNhomNghin =
    laNhomDauHopLe(nhom[0]!) && nhom.slice(1).every(laNhomNghinHopLe);
  if (laNhomNghin) return { nguyen: nhom.join(''), le: '' };

  const sau = s.slice(viTriChot + 1);
  if (sau === '') return null;
  return { nguyen: s.slice(0, viTriChot), le: sau };
}

/** Phần nguyên sau khi bỏ dấu nhóm phải là chuỗi chữ số, và mọi nhóm phải đủ 3 số. */
function docPhanNguyen(nguyen: string): string | null {
  if (nguyen === '') return null;
  const nhom = nguyen.split(/[.,]/);
  if (nhom.length > 1) {
    // Nhóm đầu 1-3 chữ số không dẫn đầu bằng 0, các nhóm sau phải đúng 3 —
    // chặn `1.50`, `12.34.567` và `0.125` (không đọc được là nguyên hay lẻ).
    if (!laNhomDauHopLe(nhom[0]!)) return null;
    if (!nhom.slice(1).every(laNhomNghinHopLe)) return null;
  }
  const gop = nguyen.replace(NHOM_NGHIN, '');
  return /^\d+$/.test(gop) ? gop : null;
}

/**
 * Chuyển chuỗi người dùng gõ thành số.
 *
 * Trả `null` khi không đọc được — người gọi hiện câu lỗi tiếng Việt, **không tự
 * đoán 0**. Đoán 0 là cách hỏng tệ nhất: hồ sơ được lưu, không có thông báo nào,
 * và số tiền sai nằm im trong sổ.
 */
export function parseSoInput(
  raw: string | number | null | undefined,
  options: ParseSoOptions = {},
): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;

  const s = raw.trim();
  if (s === '') return null;

  // Chỉ cho phép chữ số và dấu phân cách; chữ cái / ký hiệu tiền tệ ⇒ không đọc được.
  if (!CHI_CHU_SO_VA_PHAN_CACH.test(s)) return null;

  // Dấu cách chỉ có thể là dấu nhóm, bỏ trước cho đỡ phải xét.
  const khongTrang = s.replace(XOA_TRANG, '');
  if (khongTrang === '') return null;

  if (!options.choThapPhan) {
    const gop = docPhanNguyen(khongTrang);
    if (gop == null) return null;
    const n = Number(gop);
    return Number.isFinite(n) ? n : null;
  }

  const tach = tachThapPhan(khongTrang);
  if (tach == null) return null;
  const nguyen = docPhanNguyen(tach.nguyen === '' ? '0' : tach.nguyen);
  if (nguyen == null) return null;
  if (tach.le !== '' && !/^\d+$/.test(tach.le)) return null;

  const n = Number(tach.le === '' ? nguyen : `${nguyen}.${tach.le}`);
  return Number.isFinite(n) ? n : null;
}

/** Số tiền hợp lệ cho một dòng sổ: đọc được, dương, trong ngưỡng cộng dồn an toàn. */
export function isSoTienHopLe(value: number | null | undefined): value is number {
  if (value == null || !Number.isFinite(value)) return false;
  if (value <= 0) return false;
  return value <= SO_TIEN_TOI_DA;
}

export interface FormatSoOptions {
  /** Số chữ số thập phân tối đa. Mặc định `0` — tiền VND. */
  soLeToiDa?: number;
}

/**
 * Hiển thị lại trong ô nhập: nhóm hàng nghìn bằng dấu chấm, **không** kèm `₫`.
 *
 * Khoá cứng `vi-VN` chứ không theo locale máy: cùng một hồ sơ mở trên máy cài
 * tiếng Anh sẽ hiện `500,000,000` — cán bộ đọc nhầm thành năm trăm nghìn.
 */
export function formatSoInput(
  value: number | null | undefined,
  options: FormatSoOptions = {},
): string {
  if (value == null || !Number.isFinite(value)) return '';
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: options.soLeToiDa ?? 0,
  }).format(value);
}

/**
 * Chuẩn hoá chuỗi ĐANG GÕ dở trong ô nhập.
 *
 * Khác `parseSoInput` ở chỗ khoan dung: lúc gõ, chuỗi thường chưa hợp lệ (`1.`,
 * `1.50`, `12,`) và không được phép xoá những gì người dùng vừa gõ. Chỉ giữ chữ
 * số, cộng một dấu thập phân khi ô cho phép số lẻ.
 */
export function chuanHoaDangGo(raw: string, soLeToiDa = 0): { nguyen: string; le: string | null } {
  const chiSoVaPhay = raw.replace(new RegExp(`[${KY_TU_TRANG}]`, 'g'), '');
  if (soLeToiDa <= 0) {
    return { nguyen: chiSoVaPhay.replace(/\D/g, ''), le: null };
  }
  // Dấu thập phân người Việt gõ là dấu phẩy; dấu chấm coi là dấu nhóm.
  const viTri = chiSoVaPhay.lastIndexOf(',');
  if (viTri < 0) return { nguyen: chiSoVaPhay.replace(/\D/g, ''), le: null };
  return {
    nguyen: chiSoVaPhay.slice(0, viTri).replace(/\D/g, ''),
    le: chiSoVaPhay.slice(viTri + 1).replace(/\D/g, '').slice(0, soLeToiDa),
  };
}
