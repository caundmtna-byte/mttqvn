import { AuditTicket } from "../features/thiet-bi/kiem-ke/core/types";
import { MaintenanceTicket } from "../features/thiet-bi/bao-tri/core/types";
import { formatCurrency, formatDate, formatDateTime } from "../lib/utils";

/** Thông tin công ty in kèm (header phiếu) */
export interface CompanyPrintInfo {
  companyName?: string;
  address?: string;
  phone?: string;
}

const printHTML = (title: string, content: string, companyInfo?: CompanyPrintInfo) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const name = companyInfo?.companyName || '5F QUẢN LÝ THIẾT BỊ';
  const address = companyInfo?.address || 'Số 1 Đường Mẫu, Quận 1, TP. Hồ Chí Minh';
  const phone = companyInfo?.phone || '028 1234 5678';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: 'Times New Roman', serif; padding: 20px; color: #000; line-height: 1.4; font-size: 13px; }
          .header { display: flex; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .logo { width: 80px; height: 80px; margin-right: 20px; object-fit: contain; }
          .company-info { flex: 1; }
          .company-name { font-size: 16px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
          .doc-title { text-align: center; font-size: 20px; font-weight: bold; margin: 20px 0; text-transform: uppercase; }
          .meta-info { margin-bottom: 20px; }
          .row { display: flex; margin-bottom: 8px; }
          .label { width: 150px; font-weight: bold; }
          .value { flex: 1; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
          th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; }
          th { background-color: #f0f0f0; text-align: center; font-weight: bold; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .footer { display: flex; justify-content: space-between; margin-top: 40px; text-align: center; }
          .sign-box { width: 200px; }
          .sign-box p { font-weight: bold; margin-bottom: 60px; }
          @media print {
            @page { margin: 10mm; }
            body { -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <div class="company-name">${name}</div>
            <div>Địa chỉ: ${address}</div>
            <div>Điện thoại: ${phone}</div>
          </div>
          <div style="text-align: right;">
             <div>Ngày in: ${formatDateTime(new Date())}</div>
          </div>
        </div>
        ${content}
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

export const printAuditTicket = (ticket: AuditTicket, companyInfo?: CompanyPrintInfo) => {
    const rows = ticket.chi_tiet.map((item, index) => `
        <tr>
            <td class="text-center">${index + 1}</td>
            <td>${item.ma_san_pham}</td>
            <td>${item.ten_san_pham}</td>
            <td class="text-center">${item.ton_he_thong}</td>
            <td class="text-center">${item.ton_thuc_te}</td>
            <td>${item.ly_do || ''}</td>
        </tr>
    `).join('');

    const content = `
        <div class="doc-title">PHIẾU KIỂM KÊ TÀI SẢN</div>
        <div class="meta-info">
            <div class="row"><span class="label">Mã phiếu:</span> <span class="value">${ticket.ma_phieu}</span></div>
            <div class="row"><span class="label">Tên đợt kiểm kê:</span> <span class="value">${ticket.ten_phieu || 'Kiểm kê định kỳ'}</span></div>
            <div class="row"><span class="label">Ngày kiểm kê:</span> <span class="value">${formatDate(ticket.ngay_kiem)}</span></div>
            <div class="row"><span class="label">Kho / Vị trí:</span> <span class="value">${ticket.ten_kho}</span></div>
            <div class="row"><span class="label">Người thực hiện:</span> <span class="value">${ticket.nguoi_kiem}</span></div>
        </div>

        <table>
            <thead>
                <tr>
                    <th width="40">STT</th>
                    <th width="100">Mã SP</th>
                    <th>Tên Sản phẩm</th>
                    <th width="100">Tồn Hệ thống</th>
                    <th width="100">Tồn Thực tế</th>
                    <th>Ghi chú</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>

        <div class="footer">
            <div class="sign-box">
                <p>NGƯỜI LẬP PHIẾU</p>
                <span>${ticket.nguoi_kiem}</span>
            </div>
             <div class="sign-box">
                <p>TRƯỞNG ĐƠN VỊ</p>
                <span>(Ký, họ tên)</span>
            </div>
            <div class="sign-box">
                <p>BAN KIỂM KÊ</p>
                <span>(Ký, họ tên)</span>
            </div>
        </div>
    `;

    printHTML(`Phieu_Kiem_Ke_${ticket.ma_phieu}`, content, companyInfo);
};

export const printMaintenanceTicket = (ticket: MaintenanceTicket, companyInfo?: CompanyPrintInfo) => {
    const sparePartsRows = ticket.linh_kien_su_dung?.map((item, index) => `
        <tr>
            <td class="text-center">${index + 1}</td>
            <td>${item.ten_linh_kien}</td>
            <td class="text-center">${item.don_vi_tinh}</td>
            <td class="text-center">${item.so_luong}</td>
            <td class="text-right">${formatCurrency(item.don_gia)}</td>
            <td class="text-right">${formatCurrency(item.thanh_tien)}</td>
        </tr>
    `).join('') || '<tr><td colspan="6" class="text-center">Không sử dụng vật tư</td></tr>';

    const content = `
        <div class="doc-title">PHIẾU BẢO TRÌ / SỬA CHỮA THIẾT BỊ</div>
        <div class="meta-info">
            <div class="row"><span class="label">Số phiếu:</span> <span class="value">${ticket.ma_phieu}</span></div>
            <div class="row"><span class="label">Ngày báo cáo:</span> <span class="value">${formatDate(ticket.ngay_bao_cao)}</span></div>
            <div class="row"><span class="label">Người báo cáo:</span> <span class="value">${ticket.nguoi_bao_cao}</span></div>
            <div class="row"><span class="label">Đơn vị thực hiện:</span> <span class="value">${ticket.nha_cung_cap_dv || 'Nội bộ'}</span></div>
             <div class="row"><span class="label">Kỹ thuật viên:</span> <span class="value">${ticket.nguoi_thuc_hien || '---'}</span></div>
        </div>

        <div style="border: 1px solid #000; padding: 10px; margin-bottom: 20px;">
            <div class="row"><span class="label">Thiết bị:</span> <span class="value"><strong>${ticket.ten_tai_san}</strong> (${ticket.ma_tai_san})</span></div>
            <div class="row"><span class="label">Sự cố / Yêu cầu:</span> <span class="value">${ticket.mo_ta_su_co}</span></div>
            <div class="row"><span class="label">Giải pháp:</span> <span class="value">${ticket.giai_phap_khac_phuc || '---'}</span></div>
        </div>

        <h3>CHI TIẾT VẬT TƯ & CHI PHÍ</h3>
        <table>
            <thead>
                <tr>
                    <th width="40">STT</th>
                    <th>Tên Vật tư / Linh kiện</th>
                    <th width="60">ĐVT</th>
                    <th width="60">SL</th>
                    <th width="100">Đơn giá</th>
                    <th width="100">Thành tiền</th>
                </tr>
            </thead>
            <tbody>
                ${sparePartsRows}
                <tr>
                    <td colspan="5" class="text-right"><strong>Chi phí nhân công:</strong></td>
                    <td class="text-right">${formatCurrency(ticket.chi_phi_nhan_cong)}</td>
                </tr>
                <tr>
                    <td colspan="5" class="text-right"><strong>TỔNG CỘNG:</strong></td>
                    <td class="text-right"><strong>${formatCurrency(ticket.chi_phi_tong)}</strong></td>
                </tr>
            </tbody>
        </table>

        <div class="footer">
            <div class="sign-box">
                <p>NGƯỜI YÊU CẦU</p>
                <span>${ticket.nguoi_bao_cao}</span>
            </div>
             <div class="sign-box">
                <p>KỸ THUẬT VIÊN</p>
                <span>${ticket.nguoi_thuc_hien || '(Ký tên)'}</span>
            </div>
            <div class="sign-box">
                <p>QUẢN LÝ DUYỆT</p>
                <span>(Ký, đóng dấu)</span>
            </div>
        </div>
    `;

    printHTML(`Phieu_Bao_Tri_${ticket.ma_phieu}`, content, companyInfo);
};
