/**
 * Nội dung xem/in hồ sơ nhân viên – dùng cho trang preview và in.
 * Header: logo + thông tin công ty (như bảng lương). Dữ liệu từ buildEmployeeProfileSections.
 */
import React from 'react';
import { txt } from '../../../../lib/text';
import { formatDateTime } from '../../../../lib/utils';
import { useUIStore } from '../../../../store/useStore';
import { buildEmployeeProfileSections } from '../utils/print-employee-pdf';
import type { Employee } from '../core/types';

interface Props {
  employee: Employee;
}

const EmployeeProfilePreviewContent: React.FC<Props> = ({ employee }) => {
  const companyInfo = useUIStore((s) => s.companyInfo);
  const sections = buildEmployeeProfileSections(employee);
  const printedAt = formatDateTime(new Date());

  return (
    <div className="employee-profile-preview-content bg-white text-gray-900 font-sans text-[10pt] p-5 min-h-full">
      {/* Header công ty: logo + tên, địa chỉ, email, SĐT (như phiếu lương) */}
      <div className="flex items-start gap-4 pb-4 mb-4 border-b-2 border-gray-300">
        {companyInfo.appLogo && (
          <img
            src={companyInfo.appLogo}
            alt="Logo"
            className="w-16 h-16 object-contain shrink-0"
          />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-[14pt] font-bold text-gray-900 uppercase tracking-tight">
            {companyInfo.companyName}
          </h2>
          {companyInfo.address && (
            <p className="text-[9pt] text-gray-600 mt-0.5">
              {txt('company.address')}: {companyInfo.address}
            </p>
          )}
          {(companyInfo.email || companyInfo.phone) && (
            <p className="text-[9pt] text-gray-600">
              {companyInfo.email && <span>{txt('company.email')}: {companyInfo.email}</span>}
              {companyInfo.email && companyInfo.phone && ' · '}
              {companyInfo.phone && <span>{txt('company.phone')}: {companyInfo.phone}</span>}
            </p>
          )}
        </div>
      </div>

      <h1 className="text-center text-[16pt] font-bold mb-1">{txt('employee.pdf.title')}</h1>
      <p className="text-center text-[10pt] text-gray-500 mb-4">
        {txt('employee.pdf.code')} {employee.ma_nhan_vien}  ·  {employee.ho_ten}
      </p>
      <hr className="border-t border-gray-300 my-3" />

      {sections.map((section) => (
        <table key={section.title} className="w-full border-collapse mt-3 text-[10pt]">
          <thead>
            <tr>
              <th colSpan={2} className="bg-primary text-white p-1.5 text-left text-[9pt] font-bold">
                {section.title}
              </th>
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row) => (
              <tr key={row.label}>
                <td className="w-[40%] border border-gray-300 p-1.5 font-semibold text-gray-600 bg-gray-50/50">
                  {row.label}
                </td>
                <td className="border border-gray-300 p-1.5 text-gray-900">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}

      <p className="text-[7pt] text-gray-500 mt-5">
        {txt('employee.pdf.printedAt')} {printedAt}
      </p>
    </div>
  );
};

export default EmployeeProfilePreviewContent;
