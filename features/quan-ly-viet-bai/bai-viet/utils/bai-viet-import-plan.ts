/**
 * Đối chiếu dòng trong file với bài viết đã có rồi phân loại: thêm mới / ghi đè /
 * bỏ qua / lỗi. Hàm thuần — cùng một kế hoạch dùng cho cả bước xem trước và bước
 * ghi thật, nên con số người dùng thấy trước khi bấm đúng bằng thứ sẽ xảy ra.
 *
 * Khớp lần lượt theo `matchKeys`: `link` trước rồi `ten_bai`. Link là khoá chắc
 * hơn (unique dưới DB, không lẫn hoa/thường), tên bài chỉ là lưới đỡ khi file
 * không có link của bản ghi cũ.
 */
import { txt } from '@/lib/text';
import type { ImportWriteMode } from '@/components/shared/ImportDialog';
import type { BaiVietDanhSach } from '../core/types';
import type { BaiVietImportRow } from './bai-viet-import-row';
import { normalizeBaiVietLinkForCompare } from './bai-viet-link-conflict';
import { normalizeBaiVietTenBaiForCompare } from './bai-viet-ten-bai-conflict';

/** Khoá tham chiếu được phép chọn trong hộp thoại. */
export type BaiVietMatchKey = 'link' | 'ten_bai';

export interface BaiVietImportPlanItem {
  rowNum: number;
  row: BaiVietImportRow;
  /** Id bài đã có sẽ bị ghi đè (chỉ có ở nhánh `updates`). */
  existingId?: string;
}

export interface BaiVietImportSkip {
  rowNum: number;
  message: string;
}

export interface BaiVietImportPlan {
  creates: BaiVietImportPlanItem[];
  updates: BaiVietImportPlanItem[];
  /** Dòng CỐ Ý không ghi theo chế độ đã chọn — không phải lỗi. */
  skips: BaiVietImportSkip[];
  /** Dòng hỏng: trùng nhau trong chính file, hoặc hai dòng cùng trỏ một bài. */
  errors: BaiVietImportSkip[];
}

export interface BuildPlanInput {
  rows: readonly BaiVietImportRow[];
  existing: readonly BaiVietDanhSach[];
  mode: ImportWriteMode;
  matchKeys: readonly string[];
}

function normalizeMatchKeys(matchKeys: readonly string[]): BaiVietMatchKey[] {
  // Giữ đúng thứ tự ưu tiên link → tên bài dù hộp thoại trả về thứ tự nào.
  const out: BaiVietMatchKey[] = [];
  if (matchKeys.includes('link')) out.push('link');
  if (matchKeys.includes('ten_bai')) out.push('ten_bai');
  return out;
}

export function buildBaiVietImportPlan(input: BuildPlanInput): BaiVietImportPlan {
  const keys = normalizeMatchKeys(input.matchKeys);
  const plan: BaiVietImportPlan = { creates: [], updates: [], skips: [], errors: [] };

  const byLink = new Map<string, BaiVietDanhSach>();
  const byTenBai = new Map<string, BaiVietDanhSach>();
  for (const item of input.existing) {
    const linkKey = normalizeBaiVietLinkForCompare(item.link);
    if (linkKey && !byLink.has(linkKey)) byLink.set(linkKey, item);
    const tenKey = normalizeBaiVietTenBaiForCompare(item.ten_bai);
    if (tenKey && !byTenBai.has(tenKey)) byTenBai.set(tenKey, item);
  }

  /** Dòng đã dùng khoá nào trong chính file — chặn hai dòng cùng link/cùng tên. */
  const seenLink = new Map<string, number>();
  const seenTenBai = new Map<string, number>();
  /** Bài đã có nào đã bị một dòng nhận — chặn hai dòng cùng ghi đè một bài. */
  const claimed = new Map<string, number>();

  for (const row of input.rows) {
    const dupLinkRow = row.linkKey ? seenLink.get(row.linkKey) : undefined;
    if (dupLinkRow != null) {
      plan.errors.push({
        rowNum: row.rowNum,
        message:
          txt('articleList.import.rowPrefix', { row: row.rowNum }) +
          txt('articleList.import.errTrungLinkTrongFile', { row: dupLinkRow }),
      });
      continue;
    }
    const dupTenRow = row.tenBaiKey ? seenTenBai.get(row.tenBaiKey) : undefined;
    if (dupTenRow != null) {
      plan.errors.push({
        rowNum: row.rowNum,
        message:
          txt('articleList.import.rowPrefix', { row: row.rowNum }) +
          txt('articleList.import.errTrungTenTrongFile', { row: dupTenRow }),
      });
      continue;
    }
    if (row.linkKey) seenLink.set(row.linkKey, row.rowNum);
    if (row.tenBaiKey) seenTenBai.set(row.tenBaiKey, row.rowNum);

    let matched: BaiVietDanhSach | undefined;
    for (const key of keys) {
      matched = key === 'link' ? byLink.get(row.linkKey) : byTenBai.get(row.tenBaiKey);
      if (matched) break;
    }

    // Trùng theo BẤT KỲ khoá nào cũng bị DB chặn bằng unique index (link và
    // lower(ten_bai) đều unique). Soi cả hai để báo trước bằng tiếng Việt thay
    // vì để người dùng nhận một loạt lỗi 23505 khó hiểu khi ghi.
    const anyConflict = byLink.get(row.linkKey) ?? byTenBai.get(row.tenBaiKey);

    if (input.mode === 'insert') {
      if (anyConflict) {
        plan.skips.push({
          rowNum: row.rowNum,
          message:
            txt('articleList.import.rowPrefix', { row: row.rowNum }) +
            txt('articleList.import.skipDaTonTai'),
        });
      } else {
        plan.creates.push({ rowNum: row.rowNum, row });
      }
      continue;
    }

    if (!matched) {
      if (input.mode === 'update') {
        plan.skips.push({
          rowNum: row.rowNum,
          message:
            txt('articleList.import.rowPrefix', { row: row.rowNum }) +
            txt('articleList.import.skipChuaTonTai'),
        });
        continue;
      }
      if (anyConflict) {
        // Không khớp theo khoá đã chọn nhưng lại đụng bản ghi cũ ở khoá KHÁC:
        // thêm mới chắc chắn hỏng. Nói rõ để người dùng tick thêm cột tham chiếu.
        plan.errors.push({
          rowNum: row.rowNum,
          message:
            txt('articleList.import.rowPrefix', { row: row.rowNum }) +
            txt('articleList.import.errTrungKhoaKhac'),
        });
        continue;
      }
      plan.creates.push({ rowNum: row.rowNum, row });
      continue;
    }

    const claimedBy = claimed.get(matched.id);
    if (claimedBy != null) {
      plan.errors.push({
        rowNum: row.rowNum,
        message:
          txt('articleList.import.rowPrefix', { row: row.rowNum }) +
          txt('articleList.import.errTrungBanGhiDich', { row: claimedBy }),
      });
      continue;
    }
    claimed.set(matched.id, row.rowNum);
    plan.updates.push({ rowNum: row.rowNum, row, existingId: matched.id });
  }

  return plan;
}
