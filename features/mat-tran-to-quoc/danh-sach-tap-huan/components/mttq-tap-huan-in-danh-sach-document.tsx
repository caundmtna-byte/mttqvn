import React from 'react';
import {
  layoutTapHuanMetaPairs,
  type TapHuanInDanhSachDocumentModel,
} from '../utils/build-tap-huan-in-danh-sach-document';

export const TAP_HUAN_IN_DANH_SACH_PRINT_ROOT_ID = 'tap-huan-in-danh-sach-print-root';

export interface MttqTapHuanInDanhSachDocumentProps {
  model: TapHuanInDanhSachDocumentModel;
}

const MttqTapHuanInDanhSachDocument: React.FC<MttqTapHuanInDanhSachDocumentProps> = ({ model }) => {
  const columnHeaders = model.rows.length > 0 ? Object.keys(model.rows[0]) : [];
  const metaPairs = layoutTapHuanMetaPairs(model.metaItems, {
    label: model.signedDateLabel,
    value: model.signedDateValue,
  });

  return (
    <article
      id={TAP_HUAN_IN_DANH_SACH_PRINT_ROOT_ID}
      className="tap-huan-in-danh-sach-doc"
    >
      <header className="tap-huan-in-danh-sach-doc__letterhead">
        <p className="tap-huan-in-danh-sach-doc__org-name">{model.companyName.toUpperCase()}</p>
        {model.address ? (
          <p className="tap-huan-in-danh-sach-doc__org-line">{model.address}</p>
        ) : null}
        {model.phone ? (
          <p className="tap-huan-in-danh-sach-doc__org-line">ĐT: {model.phone}</p>
        ) : null}
      </header>

      <h1 className="tap-huan-in-danh-sach-doc__title">{model.documentTitle}</h1>

      <div className="tap-huan-in-danh-sach-doc__meta">
        {metaPairs.map((pair, rowIdx) => (
          <div key={rowIdx} className="tap-huan-in-danh-sach-doc__meta-row">
            {pair.map((item) => (
              <p key={item.label} className="tap-huan-in-danh-sach-doc__meta-item">
                <span className="tap-huan-in-danh-sach-doc__meta-label">{item.label}:</span>{' '}
                <span className="tap-huan-in-danh-sach-doc__meta-value">{item.value}</span>
              </p>
            ))}
          </div>
        ))}
      </div>

      {model.rows.length === 0 ? (
        <p className="tap-huan-in-danh-sach-doc__empty">{model.emptyMessage}</p>
      ) : (
        <table className="tap-huan-in-danh-sach-doc__table">
          <colgroup>
            {columnHeaders.map((h) => (
              <col
                key={h}
                className={
                  h === model.sttColumnKey
                    ? 'tap-huan-in-danh-sach-doc__col-stt'
                    : h === model.nameColumnKey
                      ? 'tap-huan-in-danh-sach-doc__col-name'
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
                    h === model.sttColumnKey
                      ? 'tap-huan-in-danh-sach-doc__th tap-huan-in-danh-sach-doc__th--center'
                      : 'tap-huan-in-danh-sach-doc__th'
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
                {columnHeaders.map((h) => (
                  <td
                    key={h}
                    className={
                      h === model.sttColumnKey
                        ? 'tap-huan-in-danh-sach-doc__td tap-huan-in-danh-sach-doc__td--center'
                        : h === model.nameColumnKey
                          ? 'tap-huan-in-danh-sach-doc__td tap-huan-in-danh-sach-doc__td--left'
                          : 'tap-huan-in-danh-sach-doc__td'
                    }
                  >
                    {row[h]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <footer className="tap-huan-in-danh-sach-doc__footer">
        <div className="tap-huan-in-danh-sach-doc__sign-col">
          <p className="tap-huan-in-danh-sach-doc__sign-label">{model.footer.nguoiTaoLabel}</p>
          <p className="tap-huan-in-danh-sach-doc__sign-name">{model.footer.nguoiTaoValue}</p>
        </div>
        <div className="tap-huan-in-danh-sach-doc__sign-col">
          <p className="tap-huan-in-danh-sach-doc__sign-label">{model.footer.nguoiKiemTraLabel}</p>
          <p className="tap-huan-in-danh-sach-doc__sign-line" aria-hidden="true" />
        </div>
        <div className="tap-huan-in-danh-sach-doc__sign-col">
          <p className="tap-huan-in-danh-sach-doc__sign-label">{model.footer.nguoiPheDuyetLabel}</p>
          <p className="tap-huan-in-danh-sach-doc__sign-line" aria-hidden="true" />
        </div>
      </footer>
    </article>
  );
};

export default MttqTapHuanInDanhSachDocument;
