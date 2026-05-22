const NGACH_LIST_COLS = ['id', 'ma', 'ten', 'mo_ta', 'thu_tu', 'tg_tao', 'tg_cap_nhat'].join(',');

export const LUONG_THIET_LAP_NGACH_SELECT = NGACH_LIST_COLS;
export const LUONG_THIET_LAP_NGACH_RETURNING = LUONG_THIET_LAP_NGACH_SELECT;

const BAC_LIST_COLS = ['id', 'ngach_id', 'ma_bac', 'he_so', 'thu_tu', 'tg_tao', 'tg_cap_nhat'].join(',');

export const LUONG_THIET_LAP_BAC_SELECT = BAC_LIST_COLS;
export const LUONG_THIET_LAP_BAC_RETURNING = LUONG_THIET_LAP_BAC_SELECT;

export const LUONG_THIET_LAP_CAU_HINH_SELECT = 'id,muc_luong_co_so,tg_tao,tg_cap_nhat';
export const LUONG_THIET_LAP_CAU_HINH_RETURNING = LUONG_THIET_LAP_CAU_HINH_SELECT;
