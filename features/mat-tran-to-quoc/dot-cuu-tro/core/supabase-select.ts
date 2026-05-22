/** List: không select `mo_ta` (cột dài). */
export const KHO_DOT_CUU_TRO_SELECT_LIST = [
  'id',
  'tt',
  'ten',
  'link',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

/** Detail + form sau khi fetch đủ. */
export const KHO_DOT_CUU_TRO_SELECT_FULL = [
  'id',
  'tt',
  'ten',
  'mo_ta',
  'link',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

export const KHO_DOT_CUU_TRO_RETURNING_LIST = KHO_DOT_CUU_TRO_SELECT_LIST;
