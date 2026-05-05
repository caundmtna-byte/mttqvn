/**
 * Xuất hồ sơ nhân viên ra Doc, Excel (có header công ty như bảng lương).
 * PDF dùng print-employee-pdf.ts (đã có header).
 */
import type { Employee } from '../core/types';
import { formatDateTime, getTodayISODate, getFontStack } from '../../../../lib/utils';
import { txt } from '../../../../lib/text';
import { useUIStore } from '../../../../store/useStore';
import { buildEmployeeProfileSections } from './print-employee-pdf';

/** HTML header công ty (logo, tên, địa chỉ, email, SĐT) */
function buildCompanyHeaderHTML(): string {
  const info = useUIStore.getState().companyInfo;
  const logoHtml = info.appLogo
    ? `<img src="${info.appLogo}" alt="Logo" style="width:64px;height:64px;object-fit:contain;flex-shrink:0" />`
    : '';
  const addr = info.address ? `${txt('company.address')}: ${info.address}` : '';
  const contact: string[] = [];
  if (info.email) contact.push(`${txt('company.email')}: ${info.email}`);
  if (info.phone) contact.push(`${txt('company.phone')}: ${info.phone}`);
  const contactLine = contact.join(' · ');
  return `
<div style="display:flex;align-items:flex-start;gap:16px;padding-bottom:16px;margin-bottom:16px;border-bottom:2px solid #333;font-family:${getFontStack()}">
  ${logoHtml}
  <div style="flex:1;min-width:0">
    <div style="font-size:14pt;font-weight:bold;color:#111;text-transform:uppercase;letter-spacing:0.02em">${info.companyName}</div>
    ${addr ? `<p style="font-size:9pt;color:#444;margin:2px 0 0 0">${addr}</p>` : ''}
    ${contactLine ? `<p style="font-size:9pt;color:#444;margin:2px 0 0 0">${contactLine}</p>` : ''}
  </div>
</div>`;
}

const TABLE_CELL = (label: string, value: string) =>
  `<tr><td style="padding:4px 6px;border:1px solid #ddd;font-weight:600;width:40%;color:#444;font-family:${getFontStack()}">${label}</td><td style="padding:4px 6px;border:1px solid #ddd;font-family:${getFontStack()}">${value}</td></tr>`;

/** Nội dung HTML cho Doc (header + title + sections) */
function buildProfileBodyHTML(emp: Employee): string {
  const sections = buildEmployeeProfileSections(emp);
  const title = txt('employee.pdf.title');
  const subtitle = `${txt('employee.pdf.code')} ${emp.ma_nhan_vien}  ·  ${emp.ho_ten}`;
  const printedAt = formatDateTime(new Date());

  const tablesHtml = sections
    .map(
      (section) => `
<table style="width:100%;border-collapse:collapse;margin-top:12px;font-family:${getFontStack()};font-size:10pt">
  <thead><tr style="background:#3b82f6;color:#fff"><th colspan="2" style="padding:6px;text-align:left;font-size:9pt">${section.title}</th></tr></thead>
  <tbody>${section.rows.map((r) => TABLE_CELL(r.label, r.value)).join('')}</tbody>
</table>`
    )
    .join('');

  return `
<div style="font-family:${getFontStack()};font-size:10pt;color:#222;padding:20px;min-width:600px">
${buildCompanyHeaderHTML()}
<h1 style="font-size:16pt;text-align:center;margin:0 0 8px;font-family:${getFontStack()}">${title}</h1>
<p style="font-size:10pt;color:#555;text-align:center;margin-bottom:12px;font-family:${getFontStack()}">${subtitle}</p>
<hr style="border:0;border-top:1px solid #ccc;margin:12px 0">
${tablesHtml}
<p style="font-size:7pt;color:#888;margin-top:20px;font-family:${getFontStack()}">${txt('employee.pdf.printedAt')} ${printedAt}</p>
</div>`;
}

function buildProfileFullHTML(emp: Employee): string {
  const body = buildProfileBodyHTML(emp);
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${body}</body></html>`;
}

function safeFileName(name: string): string {
  return name.replace(/\s+/g, '_').replace(/[<>:"/\\|?*]/g, '');
}

export type EmployeeProfileExportFormat = 'pdf' | 'excel' | 'doc';

/** Xuất hồ sơ ra Excel (có header công ty + các section) */
export async function exportEmployeeProfileExcel(emp: Employee): Promise<void> {
  const XLSX = await import('xlsx');
  const info = useUIStore.getState().companyInfo;
  const sections = buildEmployeeProfileSections(emp);

  const rows: (string | number)[][] = [
    [info.companyName],
    ...(info.address ? [[txt('company.address'), info.address]] : []),
    ...(info.email ? [[txt('company.email'), info.email]] : []),
    ...(info.phone ? [[txt('company.phone'), info.phone]] : []),
    [],
    [txt('employee.pdf.title')],
    [txt('employee.pdf.code'), emp.ma_nhan_vien],
    [txt('employee.detail.fullName'), emp.ho_ten],
    [],
  ];

  for (const section of sections) {
    rows.push([section.title]);
    for (const row of section.rows) {
      rows.push([row.label, row.value]);
    }
    rows.push([]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 32 }, { wch: 40 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ho so');
  XLSX.writeFile(wb, `Ho_so_${safeFileName(emp.ho_ten)}_${emp.ma_nhan_vien}_${getTodayISODate()}.xlsx`);
}

/** Xuất hồ sơ ra Doc (HTML mở được bằng Word) */
export async function exportEmployeeProfileDoc(emp: Employee): Promise<void> {
  const html = buildProfileFullHTML(emp);
  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Ho_so_${safeFileName(emp.ho_ten)}_${emp.ma_nhan_vien}_${getTodayISODate()}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}
