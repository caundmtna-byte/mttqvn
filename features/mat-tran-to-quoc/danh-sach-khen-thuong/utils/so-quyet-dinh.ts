/**
 * Chuẩn hoá số/ký hiệu quyết định khen thưởng.
 *
 * Bối cảnh: cột `mttq_khen_thuong.so_qd` hiện KHÔNG có ràng buộc định dạng và
 * đang bị dùng sai mục đích — một phần dữ liệu thật chứa nguyên câu lý do khen
 * thưởng ("Có thành tích xuất sắc trong công tác Bầu cử…") thay vì số quyết định.
 * In thẳng giá trị đó vào ô "Số:" của văn bản hành chính là hỏng thể thức.
 *
 * Vì vậy khi dựng văn bản, giá trị được phân loại:
 * - Trông như số/ký hiệu  → đưa vào ô "Số:".
 * - Trông như một câu văn → để ô "Số:" trống (chừa chỗ điền tay) và đẩy câu đó
 *   xuống phần trích yếu/nội dung, nơi nó thật sự thuộc về.
 */

/** Ô "Số:" bỏ trống trên bản in — cán bộ điền tay khi ban hành. */
export const SO_QD_PLACEHOLDER = '……../QĐ-MTTQ-BTT';

/** Hậu tố ký hiệu mặc định khi người dùng chỉ nhập phần số. */
export const KY_HIEU_QD_MAC_DINH = 'QĐ-MTTQ-BTT';

/** Số ký tự tối đa còn coi là số/ký hiệu văn bản. */
const DO_DAI_TOI_DA = 24;

/** Số từ tối đa còn coi là số/ký hiệu văn bản. */
const SO_TU_TOI_DA = 3;

/**
 * Giá trị `so_qd` có trông như một số/ký hiệu văn bản hay không.
 *
 * Hợp lệ: `12`, `12/QĐ`, `12/QĐ-MTTQ-BTT`, `05-QĐ/MT`.
 * Không hợp lệ: chuỗi rỗng, câu văn dài, chuỗi không có chữ số nào.
 */
export function laSoQuyetDinhHopLe(raw: string | null | undefined): boolean {
  const s = String(raw ?? '').trim();
  if (!s) return false;
  if (s.length > DO_DAI_TOI_DA) return false;
  if (!/\d/.test(s)) return false;
  const soTu = s.split(/\s+/).filter(Boolean).length;
  return soTu <= SO_TU_TOI_DA;
}

export interface SoQuyetDinhChuanHoa {
  /** Chuỗi in vào ô "Số:" — luôn có giá trị (placeholder khi thiếu). */
  soKyHieu: string;
  /** True khi `so_qd` thật sự là số quyết định. */
  hopLe: boolean;
  /**
   * Nội dung bị nhập nhầm vào `so_qd` (câu lý do khen thưởng) — null khi `so_qd`
   * hợp lệ. Người gọi đưa chuỗi này xuống trích yếu thay vì ô "Số:".
   */
  noiDungNhapNham: string | null;
}

/** Bổ sung ký hiệu mặc định khi người dùng chỉ nhập phần số. */
function themKyHieuNeuThieu(so: string): string {
  if (so.includes('/')) return so;
  return `${so}/${KY_HIEU_QD_MAC_DINH}`;
}

export function chuanHoaSoQuyetDinh(raw: string | null | undefined): SoQuyetDinhChuanHoa {
  const s = String(raw ?? '').trim();
  if (laSoQuyetDinhHopLe(s)) {
    return { soKyHieu: themKyHieuNeuThieu(s.replace(/\s+/g, '')), hopLe: true, noiDungNhapNham: null };
  }
  return {
    soKyHieu: SO_QD_PLACEHOLDER,
    hopLe: false,
    noiDungNhapNham: s ? s : null,
  };
}

const CHU_SO = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

/** Đọc số lượng người (0–999) thành chữ: `5` → `năm`, `21` → `hai mươi mốt`. */
export function soLuongBangChu(n: number): string {
  const so = Math.max(0, Math.floor(Number(n) || 0));
  if (so > 999) return String(so);
  const tram = Math.floor(so / 100);
  const chuc = Math.floor((so % 100) / 10);
  const donVi = so % 10;
  const parts: string[] = [];

  if (tram > 0) parts.push(`${CHU_SO[tram]} trăm`);
  if (chuc > 1) {
    parts.push(`${CHU_SO[chuc]} mươi`);
    if (donVi === 1) parts.push('mốt');
    else if (donVi === 5) parts.push('lăm');
    else if (donVi > 0) parts.push(CHU_SO[donVi]);
  } else if (chuc === 1) {
    parts.push('mười');
    if (donVi === 5) parts.push('lăm');
    else if (donVi > 0) parts.push(CHU_SO[donVi]);
  } else if (donVi > 0) {
    if (tram > 0) parts.push('lẻ');
    parts.push(CHU_SO[donVi]);
  } else if (parts.length === 0) {
    parts.push(CHU_SO[0]);
  }

  return parts.join(' ');
}

/** `5` → `05 (năm)` — dạng ghi số lượng trong điều khoản quyết định. */
export function soLuongVanBan(n: number): string {
  const so = Math.max(0, Math.floor(Number(n) || 0));
  const hienThi = so < 10 ? `0${so}` : String(so);
  return `${hienThi} (${soLuongBangChu(so)})`;
}
