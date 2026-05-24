import { txt } from '@/lib/text';
import type { MttqTangLuongListRow } from '../core/types';
import { getPreviousRecordForCanBo, isTruocHanRecord } from './tang-luong-cycle';

export interface ConsecutiveEarlyWarning {
  shouldWarn: boolean;
  message: string;
}

/** Cảnh báo nếu bản ghi trước đó (theo ngày) cũng là trước hạn. */
export function checkConsecutiveEarlyAdvance(
  allRows: MttqTangLuongListRow[],
  canBoId: string,
  ngayNangLuong: string,
  loaiKy: MttqTangLuongListRow['loai_ky'],
  excludeId?: string,
): ConsecutiveEarlyWarning {
  if (!isTruocHanRecord(loaiKy)) {
    return { shouldWarn: false, message: '' };
  }
  const prev = getPreviousRecordForCanBo(allRows, canBoId, ngayNangLuong, excludeId);
  if (!prev || !isTruocHanRecord(prev.loai_ky)) {
    return { shouldWarn: false, message: '' };
  }
  return {
    shouldWarn: true,
    message: txt('matTranTangLuong.validation.consecutiveEarlyWarning'),
  };
}

export function validateNgayTruocHan(
  ngayNang: string,
  ngayDenHanGoc: string | null,
  loaiKy: MttqTangLuongListRow['loai_ky'],
): string | null {
  if (!isTruocHanRecord(loaiKy)) return null;
  if (!ngayDenHanGoc) return null;
  if (ngayNang.slice(0, 10) > ngayDenHanGoc.slice(0, 10)) {
    return txt('matTranTangLuong.validation.ngayTruocHanAfterDue');
  }
  return null;
}
