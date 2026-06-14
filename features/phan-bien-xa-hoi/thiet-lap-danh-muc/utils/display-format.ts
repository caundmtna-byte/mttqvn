import {
  formatDisplayDateTimeShort,
  formatDisplayInteger,
  trimmedDisplay,
} from '@/lib/display-format';

/** @deprecated Dùng `trimmedDisplay` từ `@/lib/display-format`. */
export const trimmedPbxhThietLapDisplay = trimmedDisplay;

export function formatPbxhThietLapDateTimeDisplay(value: string | null | undefined): string {
  return formatDisplayDateTimeShort(value);
}

export function formatPbxhThietLapThuTuDisplay(value: number | null | undefined): string {
  return formatDisplayInteger(value);
}
