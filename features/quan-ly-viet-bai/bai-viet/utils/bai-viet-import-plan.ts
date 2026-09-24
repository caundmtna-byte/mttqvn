/**
 * Khoá đối chiếu khi nhập bài viết — luật phân loại nằm ở lõi chung
 * `lib/data/import-plan.ts`.
 *
 * Thứ tự khớp: Mã hệ thống → link → tên bài. Link là khoá tự nhiên chắc hơn
 * (unique dưới DB, không lẫn hoa/thường), tên bài chỉ là lưới đỡ khi file không
 * có link của bản ghi cũ. Cả ba đều unique dưới DB.
 */
import { txt } from '@/lib/text';
import {
  buildImportPlan,
  type ImportKeySpec,
  type ImportPlan,
} from '@/lib/data/import-plan';
import type { ImportWriteMode } from '@/components/shared/ImportDialog';
import type { BaiVietDanhSach } from '../core/types';
import type { BaiVietImportRow } from './bai-viet-import-row';
import { normalizeBaiVietLinkForCompare } from './bai-viet-link-conflict';
import { normalizeBaiVietTenBaiForCompare } from './bai-viet-ten-bai-conflict';

export type BaiVietImportPlan = ImportPlan<BaiVietImportRow>;

export const BAI_VIET_IMPORT_KEYS: readonly ImportKeySpec<BaiVietDanhSach, BaiVietImportRow>[] = [
  {
    key: 'id',
    label: txt('shared.import.colMaHeThong'),
    unique: true,
    ofExisting: (e) => e.id || null,
    ofRow: (r) => r.idKey ?? null,
  },
  {
    key: 'link',
    label: txt('articleList.import.colLink').toLowerCase(),
    unique: true,
    ofExisting: (e) => normalizeBaiVietLinkForCompare(e.link) || null,
    ofRow: (r) => r.linkKey || null,
  },
  {
    key: 'ten_bai',
    label: txt('articleList.import.colTenBai').toLowerCase(),
    unique: true,
    ofExisting: (e) => normalizeBaiVietTenBaiForCompare(e.ten_bai) || null,
    ofRow: (r) => r.tenBaiKey || null,
  },
];

export interface BuildPlanInput {
  rows: readonly BaiVietImportRow[];
  existing: readonly BaiVietDanhSach[];
  mode: ImportWriteMode;
  matchKeys: readonly string[];
}

export function buildBaiVietImportPlan(input: BuildPlanInput): BaiVietImportPlan {
  return buildImportPlan({ ...input, keys: BAI_VIET_IMPORT_KEYS });
}
