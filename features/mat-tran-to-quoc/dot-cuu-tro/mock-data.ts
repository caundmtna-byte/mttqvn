import type { KhoDotCuuTroListRow } from './core/types';

const now = new Date().toISOString();

export const KHO_DOT_CUU_TRO_MOCK: KhoDotCuuTroListRow[] = [
  {
    id: '1',
    tt: 1,
    ten: 'Bão Yagi 2024 (mock)',
    link: 'https://example.org/yagi',
    tg_tao: now,
    tg_cap_nhat: now,
  },
];
