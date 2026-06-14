import React from 'react';
import { txt } from '@/lib/text';
import type { NhapXuatKhoPhieuDocumentModel } from '../utils/build-nhap-xuat-kho-phieu-document';

export const NHAP_XUAT_KHO_IN_PHIEU_PRINT_ROOT_ID = 'nhap-xuat-kho-in-phieu-print-root';

export interface KhoNhapXuatKhoInPhieuDocumentProps {
  model: NhapXuatKhoPhieuDocumentModel;
}

const KhoNhapXuatKhoInPhieuDocument: React.FC<KhoNhapXuatKhoInPhieuDocumentProps> = ({ model }) => {
  const { columnHeaders, columnCodes } = model;

  return (
    <article id={NHAP_XUAT_KHO_IN_PHIEU_PRINT_ROOT_ID} className="nhap-xuat-kho-phieu-doc">
      <header className="nhap-xuat-kho-phieu-doc__header">
        <div className="nhap-xuat-kho-phieu-doc__header-left">
          <p className="nhap-xuat-kho-phieu-doc__header-line">
            <span className="nhap-xuat-kho-phieu-doc__header-label">{model.donViLabel}:</span>{' '}
            <span className="nhap-xuat-kho-phieu-doc__header-value">{model.donViValue}</span>
          </p>
          <p className="nhap-xuat-kho-phieu-doc__header-line">
            <span className="nhap-xuat-kho-phieu-doc__header-label">{model.diaChiLabel}:</span>{' '}
            <span className="nhap-xuat-kho-phieu-doc__header-value">{model.diaChiValue}</span>
          </p>
          <p className="nhap-xuat-kho-phieu-doc__header-line">
            <span className="nhap-xuat-kho-phieu-doc__header-label">{model.boPhanLabel}:</span>{' '}
            <span className="nhap-xuat-kho-phieu-doc__header-value">{model.boPhanValue}</span>
          </p>
        </div>

        <div className="nhap-xuat-kho-phieu-doc__header-center">
          <h1 className="nhap-xuat-kho-phieu-doc__title">{model.docTitle}</h1>
          <p className="nhap-xuat-kho-phieu-doc__subtitle">
            {model.ngayLapPhieuLabel}: {model.ngayPhieu}
          </p>
        </div>

        <div className="nhap-xuat-kho-phieu-doc__header-right">
          <p className="nhap-xuat-kho-phieu-doc__ref-line">
            {model.soPhieuLabel}:{' '}
            <span className="nhap-xuat-kho-phieu-doc__ref-value">{model.soPhieu}</span>
          </p>
          <p className="nhap-xuat-kho-phieu-doc__ref-line">
            {model.mauSoLabel}:{' '}
            <span className="nhap-xuat-kho-phieu-doc__ref-value">{model.mauSo}</span>
          </p>
          <p className="nhap-xuat-kho-phieu-doc__thong-tu">{model.thongTu}</p>
        </div>
      </header>

      <div className="nhap-xuat-kho-phieu-doc__info">
        {model.infoLines.map((line) => (
          <p key={line.label} className="nhap-xuat-kho-phieu-doc__info-line">
            <span className="nhap-xuat-kho-phieu-doc__info-label">{line.label}:</span>{' '}
            <span className="nhap-xuat-kho-phieu-doc__info-value">{line.value}</span>
          </p>
        ))}
      </div>

      {model.rows.length === 0 ? (
        <p className="nhap-xuat-kho-phieu-doc__empty">{model.emptyMessage}</p>
      ) : (
        <table className="nhap-xuat-kho-phieu-doc__table">
          <colgroup>
            <col className="nhap-xuat-kho-phieu-doc__col-stt" />
            <col className="nhap-xuat-kho-phieu-doc__col-name" />
            <col />
            <col />
            <col />
            <col />
            <col />
          </colgroup>
          <thead>
            <tr>
              {columnHeaders.map((h) => (
                <th
                  key={h}
                  className={
                    h === model.sttColumnKey ||
                    h.includes('Số lượng') ||
                    h.includes('Đơn giá') ||
                    h.includes('Thành tiền')
                      ? 'nhap-xuat-kho-phieu-doc__th nhap-xuat-kho-phieu-doc__th--center'
                      : 'nhap-xuat-kho-phieu-doc__th'
                  }
                >
                  {h}
                </th>
              ))}
            </tr>
            <tr className="nhap-xuat-kho-phieu-doc__code-row">
              {columnCodes.map((code, idx) => (
                <th key={`code-${idx}`} className="nhap-xuat-kho-phieu-doc__th nhap-xuat-kho-phieu-doc__th--code">
                  {code}
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
            {model.showCongRow ? (
              <tr className="nhap-xuat-kho-phieu-doc__cong-row">
                <td
                  colSpan={5}
                  className="nhap-xuat-kho-phieu-doc__td nhap-xuat-kho-phieu-doc__td--right nhap-xuat-kho-phieu-doc__td--bold"
                >
                  {model.congLabel}
                </td>
                <td className="nhap-xuat-kho-phieu-doc__td nhap-xuat-kho-phieu-doc__td--right nhap-xuat-kho-phieu-doc__td--bold">
                  {model.congValue}
                </td>
                <td className="nhap-xuat-kho-phieu-doc__td" />
              </tr>
            ) : null}
          </tbody>
        </table>
      )}

      {model.tongTienBangChu ? (
        <p className="nhap-xuat-kho-phieu-doc__amount-words">
          <strong>{model.tongTienBangChuLabel}:</strong> {model.tongTienBangChu}.
        </p>
      ) : null}

      <p className="nhap-xuat-kho-phieu-doc__chung-tu">
        <strong>{model.chungTuGocLabel}:</strong> {model.chungTuGoc}
      </p>

      <p className="nhap-xuat-kho-phieu-doc__signature-date">{model.signatureDateLine}</p>

      {model.ghiChuNoiBo ? (
        <p className="nhap-xuat-kho-phieu-doc__note">
          <span className="nhap-xuat-kho-phieu-doc__note-label">
            {txt('matTranNhapXuatKho.printPreview.ghiChuNoiBo')}:
          </span>{' '}
          {model.ghiChuNoiBo}
        </p>
      ) : null}

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
