import React from 'react';
import {
  QUOC_HIEU,
  TIEU_NGU,
  layoutThongTinPairs,
  type VanBanAlign,
  type VanBanBang,
  type VanBanHanhChinhModel,
} from '../utils/van-ban-hanh-chinh';

export interface VanBanHanhChinhDocumentProps {
  model: VanBanHanhChinhModel;
  /** Id phần tử gốc — trang in/PDF lấy đúng phần tử này. */
  rootId: string;
}

function alignClass(a: VanBanAlign | undefined): string {
  if (a === 'center') return ' van-ban-doc__td--center';
  if (a === 'right') return ' van-ban-doc__td--right';
  return '';
}

const BangKhoi: React.FC<{ bang: VanBanBang }> = ({ bang }) => {
  if (bang.rows.length === 0) {
    return <p className="van-ban-doc__empty">{bang.emptyMessage}</p>;
  }
  return (
    <table className="van-ban-doc__table">
      <colgroup>
        {bang.headers.map((h, i) => (
          <col key={h} style={bang.widths?.[i] ? { width: `${bang.widths[i]}%` } : undefined} />
        ))}
      </colgroup>
      <thead>
        <tr>
          {/* Bề rộng đặt cả ở <col> lẫn <th>: html2canvas (dùng cho PDF) bỏ qua
              <colgroup>, thiếu width trên <th> thì chữ tràn sang ô bên cạnh. */}
          {bang.headers.map((h, i) => (
            <th
              key={h}
              className="van-ban-doc__th"
              style={bang.widths?.[i] ? { width: `${bang.widths[i]}%` } : undefined}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {bang.rows.map((row, ri) => (
          <tr key={ri}>
            {row.map((cell, ci) => (
              <td
                key={ci}
                className={`van-ban-doc__td${alignClass(bang.aligns?.[ci])}${
                  bang.nowraps?.[ci] ? ' van-ban-doc__td--nowrap' : ''
                }`}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

/** Bản dựng màn hình của văn bản hành chính — cũng là nguồn cho PDF và cửa sổ in. */
const VanBanHanhChinhDocument: React.FC<VanBanHanhChinhDocumentProps> = ({ model, rootId }) => {
  const thongTinPairs = layoutThongTinPairs(model.thongTinChung ?? []);
  const coCanCu = (model.canCu ?? []).length > 0;

  return (
    <article id={rootId} className="van-ban-doc">
      <header className="van-ban-doc__head">
        <div className="van-ban-doc__head-col">
          {model.coQuanChuQuan ? (
            <p className="van-ban-doc__co-quan-chu-quan">{model.coQuanChuQuan}</p>
          ) : null}
          <p className="van-ban-doc__co-quan">{model.coQuanBanHanh}</p>
          <div className="van-ban-doc__rule" aria-hidden />
          <p className="van-ban-doc__so">Số: {model.soKyHieu}</p>
        </div>
        <div className="van-ban-doc__head-col">
          <p className="van-ban-doc__quoc-hieu">{QUOC_HIEU}</p>
          <p className="van-ban-doc__tieu-ngu">{TIEU_NGU}</p>
          <div className="van-ban-doc__rule van-ban-doc__rule--wide" aria-hidden />
          <p className="van-ban-doc__dia-danh">{model.diaDanhNgayThang}</p>
        </div>
      </header>

      <h1 className="van-ban-doc__ten-loai">{model.tenLoai}</h1>
      {model.trichYeu ? <p className="van-ban-doc__trich-yeu">{model.trichYeu}</p> : null}
      {model.thamQuyen ? <p className="van-ban-doc__tham-quyen">{model.thamQuyen}</p> : null}

      {(model.canCu ?? []).map((c, i) => (
        <p key={i} className="van-ban-doc__can-cu">
          {c}
        </p>
      ))}
      {coCanCu ? <p className="van-ban-doc__quyet-dinh-label">QUYẾT ĐỊNH:</p> : null}

      {thongTinPairs.length > 0 ? (
        <div className="van-ban-doc__meta">
          {thongTinPairs.map((pair, ri) => (
            <div key={ri} className="van-ban-doc__meta-row">
              {pair.map((item) => (
                <p key={item.label} className="van-ban-doc__meta-item">
                  <span className="van-ban-doc__meta-label">{item.label}:</span> {item.value}
                </p>
              ))}
            </div>
          ))}
        </div>
      ) : null}

      {model.noiDung.map((khoi, i) => {
        if (khoi.kind === 'bang') return <BangKhoi key={i} bang={khoi} />;
        const cls = [
          'van-ban-doc__doan',
          khoi.indent ? 'van-ban-doc__doan--indent' : '',
          khoi.align === 'center' ? 'van-ban-doc__doan--center' : '',
          khoi.italic ? 'van-ban-doc__doan--italic' : '',
          khoi.bold ? 'van-ban-doc__doan--bold' : '',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <p key={i} className={cls}>
            {khoi.text}
          </p>
        );
      })}

      <footer className="van-ban-doc__sign">
        <div>
          {model.noiNhan && model.noiNhan.length > 0 ? (
            <>
              <p className="van-ban-doc__noi-nhan-label">Nơi nhận:</p>
              {model.noiNhan.map((n) => (
                <p key={n} className="van-ban-doc__noi-nhan-item">
                  - {n};
                </p>
              ))}
            </>
          ) : model.chuKyPhu ? (
            <div className="van-ban-doc__sign-col">
              <p className="van-ban-doc__sign-role">{model.chuKyPhu.chucDanh}</p>
              <div className="van-ban-doc__sign-space" />
              <p className="van-ban-doc__sign-name">{model.chuKyPhu.hoTen ?? ''}</p>
            </div>
          ) : null}
        </div>
        <div className="van-ban-doc__sign-col">
          {model.chuKy.thayMat ? (
            <p className="van-ban-doc__sign-role">{model.chuKy.thayMat}</p>
          ) : null}
          <p className="van-ban-doc__sign-role">{model.chuKy.chucDanh}</p>
          <div className="van-ban-doc__sign-space" />
          <p className="van-ban-doc__sign-name">{model.chuKy.hoTen ?? ''}</p>
        </div>
      </footer>
    </article>
  );
};

export default VanBanHanhChinhDocument;
