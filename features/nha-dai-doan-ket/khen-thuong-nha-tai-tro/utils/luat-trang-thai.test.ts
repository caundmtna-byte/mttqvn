import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  KTNT_BUOC_CHUYEN,
  ktntTrangThaiChonDuoc,
  ktntTrangThaiKeTiep,
  ktntTrangThaiKhiTao,
} from './luat-trang-thai';
import { KTNT_TRANG_THAI_VALUES } from '../core/constants';

describe('ktntTrangThaiKeTiep', () => {
  it('đã duyệt chỉ còn đường huỷ, không lùi về chờ duyệt', () => {
    expect(ktntTrangThaiKeTiep('Đã duyệt')).toEqual(['Đã duyệt', 'Hủy']);
  });

  it('không duyệt thì nộp lại hoặc huỷ, không nhảy thẳng sang đã duyệt', () => {
    expect(ktntTrangThaiKeTiep('Không duyệt')).toEqual(['Không duyệt', 'Chờ duyệt', 'Hủy']);
  });

  it('đã huỷ là kết thúc', () => {
    expect(ktntTrangThaiKeTiep('Hủy')).toEqual(['Hủy']);
  });

  it('rỗng / lạ coi như chờ duyệt, không khoá người dùng ra ngoài', () => {
    expect(ktntTrangThaiKeTiep(null)[0]).toBe('Chờ duyệt');
    expect(ktntTrangThaiKeTiep('  Đã duyệt  ')).toEqual(['Đã duyệt', 'Hủy']);
  });
});

describe('ktntTrangThaiChonDuoc — quyền Duyệt', () => {
  it('thiếu quyền duyệt: từ chờ duyệt chỉ còn huỷ', () => {
    expect(ktntTrangThaiChonDuoc('Chờ duyệt', false)).toEqual(['Chờ duyệt', 'Hủy']);
  });

  it('có quyền duyệt: thấy đủ như luật cho phép', () => {
    expect(ktntTrangThaiChonDuoc('Chờ duyệt', true)).toEqual([
      'Chờ duyệt',
      'Đã duyệt',
      'Không duyệt',
      'Hủy',
    ]);
  });

  it('đang ở trạng thái cần duyệt mà thiếu quyền vẫn giữ được trạng thái hiện tại', () => {
    expect(ktntTrangThaiChonDuoc('Đã duyệt', false)).toEqual(['Đã duyệt', 'Hủy']);
  });

  it('tạo mới: không chọn được Hủy; thiếu quyền chỉ có Chờ duyệt', () => {
    expect(ktntTrangThaiKhiTao(false)).toEqual(['Chờ duyệt']);
    expect(ktntTrangThaiKhiTao(true)).toEqual(['Chờ duyệt', 'Đã duyệt', 'Không duyệt']);
  });
});

/**
 * Bảng bước chuyển ở client phải khớp đúng nhánh trong trigger. Đọc thẳng file
 * migration: sửa luật ở một bên mà quên bên kia thì test này đỏ.
 */
describe('khớp trigger fn_kiem_luat_trang_thai', () => {
  const sql = readFileSync(
    resolve(__dirname, '../../../../supabase/migrations/20260923111000_ktnt_luat_trang_thai.sql'),
    'utf8',
  );
  const nhanh = sql.slice(sql.indexOf("TG_TABLE_NAME = 'ktnt_khen_thuong_nha_tai_tro'"));

  function buocTrongSql(tu: string): string[] {
    const m = nhanh.match(new RegExp(`v_tu = '${tu}'\\s+AND v_den (?:IN \\(([^)]*)\\)|= '([^']+)')`));
    if (!m) return [];
    return m[1] ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : [m[2]];
  }

  it.each(KTNT_TRANG_THAI_VALUES)('%s', (tu) => {
    expect(buocTrongSql(tu)).toEqual([...KTNT_BUOC_CHUYEN[tu]]);
  });
});
