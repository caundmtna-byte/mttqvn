// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildPbxhDisplayLabels } from './thuc-hien-phan-bien-service';
import { tinhTienDo } from '../core/display-tien-do';

/** Dựng chuỗi tiến độ y như RPC làm, từ chính bộ nhãn gửi xuống. */
function renderTienDoFromLabels(labels: Record<string, string>, daysFromToday: number): string {
  if (daysFromToday > 0) return labels.tien_do_con.replace('{{count}}', String(daysFromToday));
  if (daysFromToday === 0) return labels.tien_do_hom_nay;
  return labels.tien_do_qua_han.replace('{{count}}', String(Math.abs(daysFromToday)));
}

function isoDaysFromToday(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('buildPbxhDisplayLabels', () => {
  it('giữ nguyên chỗ trống {{count}} để SQL tự thay số', () => {
    const labels = buildPbxhDisplayLabels();
    expect(labels.tien_do_con).toContain('{{count}}');
    expect(labels.tien_do_qua_han).toContain('{{count}}');
    expect(labels.tien_do_hom_nay).not.toContain('{{count}}');
  });

  it('có đủ nhãn cho hai cột tính ra', () => {
    const labels = buildPbxhDisplayLabels();
    for (const k of ['don_vi_tinh', 'empty_cell', 'tien_do_con', 'tien_do_hom_nay', 'tien_do_qua_han']) {
      expect(labels[k], k).toBeTruthy();
    }
  });

  // Đây là điều kiện để "sắp xếp / tìm theo cột Tiến độ" ở server ra cùng kết quả
  // với chuỗi người dùng đang nhìn thấy. Lệch một chữ là lọc ra 0 dòng.
  it.each([7, 1, 0, -1, -30])('chuỗi dựng từ nhãn khớp tinhTienDo (%i ngày)', (days) => {
    const labels = buildPbxhDisplayLabels();
    expect(renderTienDoFromLabels(labels, days)).toBe(tinhTienDo(isoDaysFromToday(days)));
  });
});
