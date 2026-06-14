import type { PbxhThietLap } from '../core/types';
import {
  formatPbxhThietLapDateTimeDisplay,
  formatPbxhThietLapThuTuDisplay,
  trimmedPbxhThietLapDisplay,
} from './display-format';

export function getPbxhThietLapColumnDisplayValue(item: PbxhThietLap, colId: string): string {
  switch (colId) {
    case 'mo_ta':
      return trimmedPbxhThietLapDisplay(item.mo_ta) ?? '';
    case 'thu_tu':
      return formatPbxhThietLapThuTuDisplay(item.thu_tu);
    case 'tg_tao':
      return formatPbxhThietLapDateTimeDisplay(item.tg_tao);
    case 'tg_cap_nhat':
      return formatPbxhThietLapDateTimeDisplay(item.tg_cap_nhat);
    default:
      return String((item as unknown as Record<string, unknown>)[colId] ?? '');
  }
}
