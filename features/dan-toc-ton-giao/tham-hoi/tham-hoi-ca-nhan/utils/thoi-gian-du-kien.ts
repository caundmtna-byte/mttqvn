import { formatMonthYear } from '@/lib/utils';

/** `2026-05` → `2026-05-01` */
export function monthYearToDbDate(yyyyMm: string): string | null {
  const t = yyyyMm.trim();
  if (!t) return null;
  const m = t.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12 || year < 1900 || year > 2100) return null;
  return `${m[1]}-${m[2]}-01`;
}

/** ISO date hoặc YYYY-MM → value cho MonthYearPicker */
export function dbDateToMonthYear(iso: string | null | undefined): string {
  if (iso == null || iso === '') return '';
  const t = String(iso).trim();
  if (/^\d{4}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}` : '';
}

export function formatThoiGianDuKienDisplay(iso: string | null | undefined): string {
  if (iso == null || iso === '') return '';
  return formatMonthYear(iso);
}

function excelSerialToDate(serial: number): Date | null {
  if (!Number.isFinite(serial) || serial <= 0) return null;
  const utc = Math.round((serial - 25569) * 86400 * 1000);
  const d = new Date(utc);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Parse import → ISO date YYYY-MM-DD (ngày đầu tháng) hoặc null */
export function parseThoiGianDuKienImport(raw: unknown): string | null {
  if (raw == null || raw === '') return null;

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const d = excelSerialToDate(raw);
    if (!d) return null;
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  }

  const s = String(raw).trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}$/.test(s)) return monthYearToDbDate(s);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const m = s.match(/^(\d{4})-(\d{2})/);
    return m ? `${m[1]}-${m[2]}-01` : null;
  }

  const thangMatch = s.match(/^tháng\s+(\d{1,2})\/(\d{4})$/i);
  if (thangMatch) {
    const month = String(Number(thangMatch[1])).padStart(2, '0');
    return `${thangMatch[2]}-${month}-01`;
  }

  const slashMatch = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const month = String(Number(slashMatch[1])).padStart(2, '0');
    return `${slashMatch[2]}-${month}-01`;
  }

  return null;
}
