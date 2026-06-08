import React from 'react';
import {
  layoutNhapXuatKhoPhieuMetaPairs,
  type NhapXuatKhoPhieuDocumentModel,
} from '../utils/build-nhap-xuat-kho-phieu-document';

export const NHAP_XUAT_KHO_IN_PHIEU_PRINT_ROOT_ID = 'nhap-xuat-kho-in-phieu-print-root';

export interface KhoNhapXuatKhoInPhieuDocumentProps {
  model: NhapXuatKhoPhieuDocumentModel;
}

const KhoNhapXuatKhoInPhieuDocument: React.FC<KhoNhapXuatKhoInPhieuDocumentProps> = ({ model }) => {
  const columnHeaders = model.rows.length > 0 ? Object.keys(model.rows[0]) : [];
  const metaPairs = layoutNhapXuatKhoPhieuMetaPairs(model.metaItems, {
    label: model.signedDateLabel,
    value: model.signedDateValue,
  });

  return (
    <article id={NHAP_XUAT_KHO_IN_PHIEU_PRINT_ROOT_ID} className="nhap-xuat-kho-phieu-doc">
      <header className="nhap-xuat-kho-phieu-doc__letterhead">
        <div className="nhap-xuat-kho-phieu-doc__letterhead-left">
          <p className="nhap-xuat-kho-phieu-doc__org-name">{model.orgNameLine1}</p>
          {model.orgNameLine2 ? (
            <p className="nhap-xuat-kho-phieu-doc__org-name">{model.orgNameLine2}</p>
          ) : null}
          <p className="nhap-xuat-kho-phieu-doc__org-sub">{model.orgSubTitle}</p>
          <div className="nhap-xuat-kho-phieu-doc__org-line" aria-hidden />
          {model.address ? (
            <p className="nhap-xuat-kho-phieu-doc__org-line-text">{model.address}</p>
          ) : null}
          {model.phone ? (
            <p className="nhap-xuat-kho-phieu-doc__org-line-text">ĐT: {model.phone}</p>
          ) : null}
        </div>
        <div className="nhap-xuat-kho-phieu-doc__letterhead-right">
          <p className="nhap-xuat-kho-phieu-doc__ref-line">
            Mẫu số: <span className="nhap-xuat-kho-phieu-doc__ref-value">01-KCT</span>
          </p>
          <p className="nhap-xuat-kho-phieu-doc__ref-line">
            Số: <span className="nhap-xuat-kho-phieu-doc__ref-value">{model.soPhieu}</span>
          </p>
          <p className="nhap-xuat-kho-phieu-doc__ref-line">
            {model.signedDateLabel}:{' '}
            <span className="nhap-xuat-kho-phieu-doc__ref-value">{model.signedDateValue}</span>
          </p>
        </div>
      </header>

      <h1 className="nhap-xuat-kho-phieu-doc__title">{model.docTitle}</h1>
      <p className="nhap-xuat-kho-phieu-doc__subtitle">
        Ngày lập phiếu: {model.ngayPhieu}
      </p>

      <div className="nhap-xuat-kho-phieu-doc__meta">
        {metaPairs.map((pair, rowIdx) => (
          <div key={rowIdx} className="nhap-xuat-kho-phieu-doc__meta-row">
            {pair.map((item) => (
              <p key={item.label} className="nhap-xuat-kho-phieu-doc__meta-item">
                <span className="nhap-xuat-kho-phieu-doc__meta-label">{item.label}:</span>{' '}
                <span className="nhap-xuat-kho-phieu-doc__meta-value">{item.value}</span>
              </p>
            ))}
          </div>
        ))}
      </div>

      {model.rows.length === 0 ? (
        <p className="nhap-xuat-kho-phieu-doc__empty">{model.emptyMessage}</p>
      ) : (
        <table className="nhap-xuat-kho-phieu-doc__table">
          <colgroup>
            {columnHeaders.map((h) => (
              <col
                key={h}
                className={
                  h === model.sttColumnKey
                    ? 'nhap-xuat-kho-phieu-doc__col-stt'
                    : h === model.nameColumnKey
                      ? 'nhap-xuat-kho-phieu-doc__col-name'
                      : undefined
                }
              />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columnHeaders.map((h) => (
                <th
                  key={h}
                  className={
                    h === model.sttColumnKey || h.includes('Số lượng') || h.includes('Đơn giá') || h.includes('Thành tiền')
                      ? 'nhap-xuat-kho-phieu-doc__th nhap-xuat-kho-phieu-doc__th--center'
                      : 'nhap-xuat-kho-phieu-doc__th'
                  }
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {model.rows.map((row, ri) => (
              <tr key={ri}>
                {columnHeaders.map((h) => {
                  const isStt = h === model.sttColumnKey;
                  const isNumeric =
                    h.includes('Số lượng') || h.includes('Đơn giá') || h.includes('Thành tiền');
                  return (
                    <td
                      key={h}
                      className={
                        isStt
                          ? 'nhap-xuat-kho-phieu-doc__td nhap-xuat-kho-phieu-doc__td--center'
                          : isNumeric
                            ? 'nhap-xuat-kho-phieu-doc__td nhap-xuat-kho-phieu-doc__td--right'
                            : h === model.nameColumnKey
                              ? 'nhap-xuat-kho-phieu-doc__td nhap-xuat-kho-phieu-doc__td--left'
                              : 'nhap-xuat-kho-phieu-doc__td'
                      }
                    >
                      {row[h]}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {model.tongTien > 0 ? (
        <div className="nhap-xuat-kho-phieu-doc__summary">
          <div className="nhap-xuat-kho-phieu-doc__summary-row">
            <span className="nhap-xuat-kho-phieu-doc__summary-label">Tổng cộng:</span>
            <span className="nhap-xuat-kho-phieu-doc__summary-value">{model.tongTienFormatted}</span>
          </div>
          {model.tongTienBangChu ? (
            <p className="nhap-xuat-kho-phieu-doc__amount-words">
              <strong>Bằng chữ:</strong> {model.tongTienBangChu}.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="nhap-xuat-kho-phieu-doc__note">
        <strong>Ghi chú:</strong> {model.ghiChu}
      </div>

      <footer className="nhap-xuat-kho-phieu-doc__footer">
        <div className="nhap-xuat-kho-phieu-doc__sign-col">
          <p className="nhap-xuat-kho-phieu-doc__sign-label">{model.footer.col1Label}</p>
          <p className="nhap-xuat-kho-phieu-doc__sign-hint">(Ký, họ tên)</p>
          <div className="nhap-xuat-kho-phieu-doc__sign-area" aria-hidden="true" />
        </div>
        <div className="nhap-xuat-kho-phieu-doc__sign-col">
          <p className="nhap-xuat-kho-phieu-doc__sign-label">{model.footer.col2Label}</p>
          <p className="nhap-xuat-kho-phieu-doc__sign-hint">(Ký, họ tên)</p>
          <div className="nhap-xuat-kho-phieu-doc__sign-area" aria-hidden="true" />
        </div>
        <div className="nhap-xuat-kho-phieu-doc__sign-col">
          <p className="nhap-xuat-kho-phieu-doc__sign-label">{model.footer.col3Label}</p>
          <p className="nhap-xuat-kho-phieu-doc__sign-hint">(Ký, họ tên)</p>
          <div className="nhap-xuat-kho-phieu-doc__sign-area" aria-hidden="true" />
        </div>
        <div className="nhap-xuat-kho-phieu-doc__sign-col">
          <p className="nhap-xuat-kho-phieu-doc__sign-label">{model.footer.col4Label}</p>
          <p className="nhap-xuat-kho-phieu-doc__sign-hint">(Ký, họ tên, đóng dấu)</p>
          <div className="nhap-xuat-kho-phieu-doc__sign-area" aria-hidden="true" />
        </div>
      </footer>
    </article>
  );
};

export default KhoNhapXuatKhoInPhieuDocument;
