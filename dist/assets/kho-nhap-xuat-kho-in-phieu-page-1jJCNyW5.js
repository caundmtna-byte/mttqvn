import{j as a}from"./vendor-framer-DlhZUZkd.js";import{r as b}from"./vendor-icons-DbfuVodK.js";import{u as q}from"./vendor-tanstack-DiL8ouE1.js";import{t as o,M as S,ae as W,o as V,a2 as D,X as Y,u as Q,a as Z,d as P,N as J,ad as ee,q as te}from"./index-BJm-uYWy.js";import{u as ae}from"./use-can-p5IA6I19.js";import{P as g,A as x,T as L,B as R,W as K,a as A,b as z,V as H,F as ne,c as ie,d as oe,D as he}from"./index-BBX0tkHx.js";import{b as re}from"./use-kho-nhap-xuat-kho-C9uOTlsY.js";import{_ as F}from"./vendor-jspdf-0L1rWGsd.js";import"./vendor-recharts-DY5_xcBA.js";import"./vendor-supabase-DX0i8-Of.js";import"./kho-nhap-xuat-kho-service-Ct74VQoi.js";const j=["","một","hai","ba","bốn","năm","sáu","bảy","tám","chín"];function $(e,i=!1){const n=Math.floor(e/100),t=Math.floor(e%100/10),r=e%10,h=[];return n>0?h.push(`${j[n]} trăm`):i&&(t>0||r>0)&&h.push("không trăm"),t>1?(h.push(`${j[t]} mươi`),r===1?h.push("mốt"):r===5?h.push("lăm"):r>0&&h.push(j[r])):t===1?(h.push("mười"),r===5?h.push("lăm"):r>0&&h.push(j[r])):r>0&&h.push(t===0&&n>0?`lẻ ${j[r]}`:j[r]),h.join(" ").trim()}function se(e){const i=Math.round(Math.abs(e));if(i===0)return"Không đồng";if(i>=1e12)return`${W(i)} đồng`;const n=Math.floor(i/1e9),t=Math.floor(i%1e9/1e6),r=Math.floor(i%1e6/1e3),h=i%1e3,u=[];n>0&&u.push(`${$(n)} tỷ`),t>0&&u.push(`${$(t,n>0)} triệu`),r>0&&u.push(`${$(r,n>0||t>0)} nghìn`),(h>0||u.length===0)&&u.push($(h,u.length>0));const s=u.join(" ").replace(/\s+/g," ").trim();return`${s.charAt(0).toUpperCase()}${s.slice(1)} đồng chẵn`}function ue(e){const i=e.trim().toUpperCase(),n=i.match(/^(.+?\bVIỆT NAM)\s+(TỈNH\b.+)$/);if(n)return{line1:n[1].trim(),line2:n[2].trim()};const t=i.search(/\sTỈNH\b/);return t>0?{line1:i.slice(0,t).trim(),line2:i.slice(t+1).trim()}:{line1:i}}function pe(e){switch(e){case"nhap_ngoai":return o("matTranNhapXuatKho.printPreview.docTitleNhap");case"xuat_ngoai":return o("matTranNhapXuatKho.printPreview.docTitleXuat");case"chuyen_kho":return o("matTranNhapXuatKho.printPreview.docTitleChuyen")}}function ce(e){switch(e){case"nhap_ngoai":return{col1Label:o("matTranNhapXuatKho.printPreview.footerCol1Nhap"),col2Label:o("matTranNhapXuatKho.printPreview.footerCol2Nhap"),col3Label:o("matTranNhapXuatKho.printPreview.footerCol3Nhap"),col4Label:o("matTranNhapXuatKho.printPreview.footerCol4")};case"xuat_ngoai":return{col1Label:o("matTranNhapXuatKho.printPreview.footerCol1Xuat"),col2Label:o("matTranNhapXuatKho.printPreview.footerCol2Xuat"),col3Label:o("matTranNhapXuatKho.printPreview.footerCol3Xuat"),col4Label:o("matTranNhapXuatKho.printPreview.footerCol4")};case"chuyen_kho":return{col1Label:o("matTranNhapXuatKho.printPreview.footerCol1Chuyen"),col2Label:o("matTranNhapXuatKho.printPreview.footerCol2Chuyen"),col3Label:o("matTranNhapXuatKho.printPreview.footerCol3Chuyen"),col4Label:o("matTranNhapXuatKho.printPreview.footerCol4")}}}function le(e){const i=o("common.emptyCell"),n=[{label:o("matTranNhapXuatKho.detail.loaiPhieu"),value:o(`matTranNhapXuatKho.loaiPhieu.${e.loai_phieu}`)}];return e.loai_phieu==="nhap_ngoai"?n.push({label:o("matTranNhapXuatKho.detail.khoNhap"),value:e.ten_kho_nhap?.trim()||i},{label:o("matTranNhapXuatKho.detail.donViCuuTro"),value:e.ten_don_vi_cuu_tro?.trim()||i}):e.loai_phieu==="xuat_ngoai"?n.push({label:o("matTranNhapXuatKho.detail.khoXuat"),value:e.ten_kho_xuat?.trim()||i},{label:o("matTranNhapXuatKho.detail.dotCuuTro"),value:e.ten_dot_cuu_tro?.trim()||i}):n.push({label:o("matTranNhapXuatKho.detail.khoXuat"),value:e.ten_kho_xuat?.trim()||i},{label:o("matTranNhapXuatKho.detail.khoNhap"),value:e.ten_kho_nhap?.trim()||i}),n}function O(e,i){const n=[...e,i],t=[];for(let r=0;r<n.length;r+=2){const h=[n[r]];n[r+1]&&h.push(n[r+1]),t.push(h)}return t}function de(e,i){const n=o("common.emptyCell"),t=o("matTranNhapXuatKho.printPreview.colStt"),r=o("matTranNhapXuatKho.form.hangHoa"),h=o("matTranNhapXuatKho.form.donViTinh"),u=o("matTranNhapXuatKho.form.soLuong"),s=o("matTranNhapXuatKho.form.donGia"),c=o("matTranNhapXuatKho.form.thanhTien"),l=o("matTranNhapXuatKho.form.chiTietGhiChu"),N=[...e.chi_tiet??[]].sort((_,m)=>{const y=_.thu_tu??0,E=m.thu_tu??0;return y!==E?y-E:Number(_.id)-Number(m.id)}),f=N.map((_,m)=>({[t]:String(m+1),[r]:_.ten_hang_hoa?.trim()||`#${_.hang_hoa_id}`,[h]:_.don_vi_tinh?.trim()||n,[u]:Number.isFinite(_.so_luong)?W(_.so_luong):n,[s]:_.don_gia>0?S(_.don_gia):n,[c]:_.thanh_tien>0?S(_.thanh_tien):n,[l]:_.ghi_chu?.trim()||""})),d=N.reduce((_,m)=>_+(Number.isFinite(m.thanh_tien)?m.thanh_tien:0),0),T=i?.companyName?.trim()||"UỶ BAN MẶT TRẬN TỔ QUỐC VIỆT NAM TỈNH NGHỆ AN",v=ue(T);return{companyName:T,orgNameLine1:v.line1,orgNameLine2:v.line2,orgSubTitle:o("matTranNhapXuatKho.printPreview.orgSubTitle"),address:i?.address?.trim()||void 0,phone:i?.phone?.trim()||void 0,soPhieu:e.so_phieu,loaiPhieuLabel:o(`matTranNhapXuatKho.loaiPhieu.${e.loai_phieu}`),docTitle:pe(e.loai_phieu),ngayPhieu:e.ngay_phieu?V(e.ngay_phieu):n,signedDateLabel:o("matTranNhapXuatKho.printPreview.signedDate"),signedDateValue:V(D()),metaItems:le(e),rows:f,emptyMessage:o("matTranNhapXuatKho.printPreview.empty"),tongTien:d,tongTienFormatted:d>0?S(d):"—",tongTienBangChu:d>0?se(d):"",ghiChu:e.ghi_chu?.trim()||o("matTranNhapXuatKho.printPreview.noGhiChu"),sttColumnKey:t,nameColumnKey:r,footer:ce(e.loai_phieu)}}const B="nhap-xuat-kho-in-phieu-print-root",me=({model:e})=>{const i=e.rows.length>0?Object.keys(e.rows[0]):[],n=O(e.metaItems,{label:e.signedDateLabel,value:e.signedDateValue});return a.jsxs("article",{id:B,className:"nhap-xuat-kho-phieu-doc",children:[a.jsxs("header",{className:"nhap-xuat-kho-phieu-doc__letterhead",children:[a.jsxs("div",{className:"nhap-xuat-kho-phieu-doc__letterhead-left",children:[a.jsx("p",{className:"nhap-xuat-kho-phieu-doc__org-name",children:e.orgNameLine1}),e.orgNameLine2?a.jsx("p",{className:"nhap-xuat-kho-phieu-doc__org-name",children:e.orgNameLine2}):null,a.jsx("p",{className:"nhap-xuat-kho-phieu-doc__org-sub",children:e.orgSubTitle}),a.jsx("div",{className:"nhap-xuat-kho-phieu-doc__org-line","aria-hidden":!0}),e.address?a.jsx("p",{className:"nhap-xuat-kho-phieu-doc__org-line-text",children:e.address}):null,e.phone?a.jsxs("p",{className:"nhap-xuat-kho-phieu-doc__org-line-text",children:["ĐT: ",e.phone]}):null]}),a.jsxs("div",{className:"nhap-xuat-kho-phieu-doc__letterhead-right",children:[a.jsxs("p",{className:"nhap-xuat-kho-phieu-doc__ref-line",children:["Mẫu số: ",a.jsx("span",{className:"nhap-xuat-kho-phieu-doc__ref-value",children:"01-KCT"})]}),a.jsxs("p",{className:"nhap-xuat-kho-phieu-doc__ref-line",children:["Số: ",a.jsx("span",{className:"nhap-xuat-kho-phieu-doc__ref-value",children:e.soPhieu})]}),a.jsxs("p",{className:"nhap-xuat-kho-phieu-doc__ref-line",children:[e.signedDateLabel,":"," ",a.jsx("span",{className:"nhap-xuat-kho-phieu-doc__ref-value",children:e.signedDateValue})]})]})]}),a.jsx("h1",{className:"nhap-xuat-kho-phieu-doc__title",children:e.docTitle}),a.jsxs("p",{className:"nhap-xuat-kho-phieu-doc__subtitle",children:["Ngày lập phiếu: ",e.ngayPhieu]}),a.jsx("div",{className:"nhap-xuat-kho-phieu-doc__meta",children:n.map((t,r)=>a.jsx("div",{className:"nhap-xuat-kho-phieu-doc__meta-row",children:t.map(h=>a.jsxs("p",{className:"nhap-xuat-kho-phieu-doc__meta-item",children:[a.jsxs("span",{className:"nhap-xuat-kho-phieu-doc__meta-label",children:[h.label,":"]})," ",a.jsx("span",{className:"nhap-xuat-kho-phieu-doc__meta-value",children:h.value})]},h.label))},r))}),e.rows.length===0?a.jsx("p",{className:"nhap-xuat-kho-phieu-doc__empty",children:e.emptyMessage}):a.jsxs("table",{className:"nhap-xuat-kho-phieu-doc__table",children:[a.jsx("colgroup",{children:i.map(t=>a.jsx("col",{className:t===e.sttColumnKey?"nhap-xuat-kho-phieu-doc__col-stt":t===e.nameColumnKey?"nhap-xuat-kho-phieu-doc__col-name":void 0},t))}),a.jsx("thead",{children:a.jsx("tr",{children:i.map(t=>a.jsx("th",{className:t===e.sttColumnKey||t.includes("Số lượng")||t.includes("Đơn giá")||t.includes("Thành tiền")?"nhap-xuat-kho-phieu-doc__th nhap-xuat-kho-phieu-doc__th--center":"nhap-xuat-kho-phieu-doc__th",children:t},t))})}),a.jsx("tbody",{children:e.rows.map((t,r)=>a.jsx("tr",{children:i.map(h=>{const u=h===e.sttColumnKey,s=h.includes("Số lượng")||h.includes("Đơn giá")||h.includes("Thành tiền");return a.jsx("td",{className:u?"nhap-xuat-kho-phieu-doc__td nhap-xuat-kho-phieu-doc__td--center":s?"nhap-xuat-kho-phieu-doc__td nhap-xuat-kho-phieu-doc__td--right":h===e.nameColumnKey?"nhap-xuat-kho-phieu-doc__td nhap-xuat-kho-phieu-doc__td--left":"nhap-xuat-kho-phieu-doc__td",children:t[h]},h)})},r))})]}),e.tongTien>0?a.jsxs("div",{className:"nhap-xuat-kho-phieu-doc__summary",children:[a.jsxs("div",{className:"nhap-xuat-kho-phieu-doc__summary-row",children:[a.jsx("span",{className:"nhap-xuat-kho-phieu-doc__summary-label",children:"Tổng cộng:"}),a.jsx("span",{className:"nhap-xuat-kho-phieu-doc__summary-value",children:e.tongTienFormatted})]}),e.tongTienBangChu?a.jsxs("p",{className:"nhap-xuat-kho-phieu-doc__amount-words",children:[a.jsx("strong",{children:"Bằng chữ:"})," ",e.tongTienBangChu,"."]}):null]}):null,a.jsxs("div",{className:"nhap-xuat-kho-phieu-doc__note",children:[a.jsx("strong",{children:"Ghi chú:"})," ",e.ghiChu]}),a.jsxs("footer",{className:"nhap-xuat-kho-phieu-doc__footer",children:[a.jsxs("div",{className:"nhap-xuat-kho-phieu-doc__sign-col",children:[a.jsx("p",{className:"nhap-xuat-kho-phieu-doc__sign-label",children:e.footer.col1Label}),a.jsx("p",{className:"nhap-xuat-kho-phieu-doc__sign-hint",children:"(Ký, họ tên)"}),a.jsx("div",{className:"nhap-xuat-kho-phieu-doc__sign-area","aria-hidden":"true"})]}),a.jsxs("div",{className:"nhap-xuat-kho-phieu-doc__sign-col",children:[a.jsx("p",{className:"nhap-xuat-kho-phieu-doc__sign-label",children:e.footer.col2Label}),a.jsx("p",{className:"nhap-xuat-kho-phieu-doc__sign-hint",children:"(Ký, họ tên)"}),a.jsx("div",{className:"nhap-xuat-kho-phieu-doc__sign-area","aria-hidden":"true"})]}),a.jsxs("div",{className:"nhap-xuat-kho-phieu-doc__sign-col",children:[a.jsx("p",{className:"nhap-xuat-kho-phieu-doc__sign-label",children:e.footer.col3Label}),a.jsx("p",{className:"nhap-xuat-kho-phieu-doc__sign-hint",children:"(Ký, họ tên)"}),a.jsx("div",{className:"nhap-xuat-kho-phieu-doc__sign-area","aria-hidden":"true"})]}),a.jsxs("div",{className:"nhap-xuat-kho-phieu-doc__sign-col",children:[a.jsx("p",{className:"nhap-xuat-kho-phieu-doc__sign-label",children:e.footer.col4Label}),a.jsx("p",{className:"nhap-xuat-kho-phieu-doc__sign-hint",children:"(Ký, họ tên, đóng dấu)"}),a.jsx("div",{className:"nhap-xuat-kho-phieu-doc__sign-area","aria-hidden":"true"})]})]})]})},ge="Times New Roman",G=22,M=28,X=20,_e={top:850,right:850,bottom:850,left:1134},k={style:R.SINGLE,size:4,color:"333333"},w={top:{style:R.NONE,size:0},bottom:{style:R.NONE,size:0},left:{style:R.NONE,size:0},right:{style:R.NONE,size:0}};function p(e,i){return new oe({text:e,font:ge,bold:i?.bold,italics:i?.italics,size:i?.size??G})}function U(e,i=!1,n){return new g({alignment:n,children:[p(e,{bold:i})],spacing:{before:40,after:40}})}async function fe(e,i){const n=[new g({alignment:x.LEFT,children:[p(e.orgNameLine1,{bold:!0,size:M})],spacing:{after:e.orgNameLine2?0:40}}),...e.orgNameLine2?[new g({alignment:x.LEFT,children:[p(e.orgNameLine2,{bold:!0,size:M})],spacing:{after:40}})]:[],new g({alignment:x.LEFT,children:[p(e.orgSubTitle.toUpperCase(),{bold:!0,size:G})],spacing:{after:80}})];e.address&&n.push(new g({alignment:x.LEFT,children:[p(e.address,{size:X})],spacing:{after:40}})),e.phone&&n.push(new g({alignment:x.LEFT,children:[p(`ĐT: ${e.phone}`,{size:X})],spacing:{after:120}})),n.push(new g({alignment:x.RIGHT,children:[p(`Mẫu số: 01-KCT · Số: ${e.soPhieu} · ${e.signedDateLabel}: ${e.signedDateValue}`,{size:X})],spacing:{after:160}}),new g({alignment:x.CENTER,children:[p(e.docTitle,{bold:!0,size:M})],spacing:{after:80}}),new g({alignment:x.CENTER,children:[p(`Ngày lập phiếu: ${e.ngayPhieu}`)],spacing:{after:160}}));const t=O(e.metaItems,{label:e.signedDateLabel,value:e.signedDateValue});for(const c of t){const l=c.map(N=>new L({width:{size:50,type:K.PERCENTAGE},borders:w,children:[new g({children:[p(`${N.label}: `,{bold:!0}),p(N.value)]})]}));for(;l.length<2;)l.push(new L({width:{size:50,type:K.PERCENTAGE},borders:w,children:[new g({children:[p(" ")]})]}));n.push(new A({width:{size:100,type:K.PERCENTAGE},borders:{...w,insideHorizontal:w.top,insideVertical:w.left},rows:[new z({children:l})]}))}if(e.rows.length>0){const c=Object.keys(e.rows[0]),l=new z({tableHeader:!0,children:c.map(f=>new L({shading:{fill:"F5F5F5"},verticalAlign:H.CENTER,borders:{top:k,bottom:k,left:k,right:k},children:[U(f,!0,x.CENTER)]}))}),N=e.rows.map(f=>new z({children:c.map(d=>{const T=d===e.sttColumnKey,v=d.includes("Số lượng")||d.includes("Đơn giá")||d.includes("Thành tiền");return new L({verticalAlign:H.CENTER,borders:{top:k,bottom:k,left:k,right:k},children:[U(String(f[d]??""),!1,T?x.CENTER:v?x.RIGHT:x.LEFT)]})})}));n.push(new A({width:{size:100,type:K.PERCENTAGE},rows:[l,...N]}))}else n.push(new g({alignment:x.CENTER,children:[p(e.emptyMessage,{size:G})],spacing:{before:120}}));e.tongTien>0&&(n.push(new g({alignment:x.RIGHT,spacing:{before:120},children:[p("Tổng cộng: ",{bold:!0}),p(e.tongTienFormatted,{bold:!0})]})),e.tongTienBangChu&&n.push(new g({spacing:{before:80},children:[p("Bằng chữ: ",{bold:!0}),p(`${e.tongTienBangChu}.`,{italics:!0})]}))),n.push(new g({spacing:{before:160},children:[p("Ghi chú: ",{bold:!0}),p(e.ghiChu)]}),new g({spacing:{before:320}}),new A({width:{size:100,type:K.PERCENTAGE},borders:{...w,insideHorizontal:w.top,insideVertical:w.left},rows:[new z({children:[e.footer.col1Label,e.footer.col2Label,e.footer.col3Label,e.footer.col4Label].map((c,l)=>new L({width:{size:25,type:K.PERCENTAGE},borders:w,children:[new g({alignment:x.CENTER,spacing:{after:160},children:[p(c,{bold:!0,size:X})]}),new g({alignment:x.CENTER,spacing:{after:1200},children:[p(l===3?"(Ký, họ tên, đóng dấu)":"(Ký, họ tên)",{italics:!0,size:X})]})]}))})]}));const r=new ne({sections:[{properties:{page:{size:{width:11906,height:16838},margin:_e}},children:n}]}),h=await ie.toBlob(r),u=URL.createObjectURL(h),s=document.createElement("a");s.href=u,s.download=`${i}_${D()}.docx`,document.body.appendChild(s),s.click(),s.remove(),URL.revokeObjectURL(u)}const xe=210,Ne=297,C={top:15,right:15,bottom:15,left:20};async function be(e,i){const[{default:n},{default:t}]=await Promise.all([F(()=>import("./vendor-jspdf-0L1rWGsd.js").then(T=>T.j),[]),F(()=>import("./html2canvas.esm-DmLBsbfV.js"),[])]),r=await t(e,{scale:2,useCORS:!0,logging:!1,backgroundColor:"#ffffff",scrollX:0,scrollY:0,windowWidth:e.scrollWidth}),h=new n({unit:"mm",format:"a4",orientation:"portrait"}),u=xe-C.left-C.right,s=Ne-C.top-C.bottom,c=u,l=r.height*c/r.width,N=r.toDataURL("image/png");let f=0,d=0;for(;f<l;)d>0&&h.addPage(),h.addImage(N,"PNG",C.left,C.top-f,c,l),f+=s,d+=1;h.save(`${i}_${D()}.pdf`)}async function we(e,i){const n=await F(()=>import("./vendor-xlsx-Ca2gZxVo.js"),[]),t=[];t.push([e.orgNameLine1]),e.orgNameLine2&&t.push([e.orgNameLine2]),t.push([e.orgSubTitle.toUpperCase()]),e.address&&t.push([e.address]),e.phone&&t.push([`ĐT: ${e.phone}`]),t.push([`Mẫu số: 01-KCT · Số: ${e.soPhieu} · ${e.signedDateLabel}: ${e.signedDateValue}`]),t.push([]),t.push([e.docTitle]),t.push([`Ngày lập phiếu: ${e.ngayPhieu}`]),t.push([]);const r=O(e.metaItems,{label:e.signedDateLabel,value:e.signedDateValue});for(const s of r){const c=[];for(const l of s)c.push(`${l.label}: ${l.value}`);t.push(c)}if(t.push([]),e.rows.length>0){const s=Object.keys(e.rows[0]);t.push(s);for(const c of e.rows)t.push(s.map(l=>c[l]??""));t.push([]),e.tongTien>0&&(t.push(["","","","","","Tổng cộng:",e.tongTienFormatted]),e.tongTienBangChu&&t.push([`Bằng chữ: ${e.tongTienBangChu}.`]))}else t.push([e.emptyMessage]);t.push([]),t.push([`Ghi chú: ${e.ghiChu}`]),t.push([]),t.push([e.footer.col1Label,e.footer.col2Label,e.footer.col3Label,e.footer.col4Label]),t.push(["(Ký, họ tên)","(Ký, họ tên)","(Ký, họ tên)","(Ký, họ tên, đóng dấu)"]);const h=n.utils.aoa_to_sheet(t),u=n.utils.book_new();n.utils.book_append_sheet(u,h,"Phieu"),n.writeFile(u,`${i}_${D()}.xlsx`)}const Te=`
  @page { size: A4 portrait; margin: 12mm 12mm 12mm 16mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    font-family: 'Times New Roman', Times, serif;
    font-size: 11pt;
    line-height: 1.3;
    color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .nhap-xuat-kho-phieu-doc {
    width: 100%;
    max-width: 210mm;
    margin: 0 auto;
    padding: 0;
  }
  .nhap-xuat-kho-phieu-doc__letterhead {
    display: flex;
    justify-content: space-between;
    gap: 16pt;
    margin-bottom: 10pt;
  }
  .nhap-xuat-kho-phieu-doc__letterhead-left {
    flex: 1;
    min-width: 0;
    text-align: center;
    padding-right: 8pt;
  }
  .nhap-xuat-kho-phieu-doc__letterhead-right {
    flex: 0 0 auto;
    text-align: right;
    min-width: 130pt;
    font-size: 10pt;
  }
  .nhap-xuat-kho-phieu-doc__org-name {
    margin: 0;
    font-size: 12pt;
    font-weight: 700;
    line-height: 1.2;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .nhap-xuat-kho-phieu-doc__org-sub {
    margin: 2pt 0 0;
    font-size: 11pt;
    font-weight: 700;
    text-transform: uppercase;
  }
  .nhap-xuat-kho-phieu-doc__org-line {
    width: 120pt;
    height: 1px;
    background: #000;
    margin: 4pt auto;
  }
  .nhap-xuat-kho-phieu-doc__org-line-text {
    margin: 1pt 0 0;
    font-size: 10pt;
    line-height: 1.2;
  }
  .nhap-xuat-kho-phieu-doc__ref-line { margin: 0 0 2pt; }
  .nhap-xuat-kho-phieu-doc__ref-value { font-weight: 700; }
  .nhap-xuat-kho-phieu-doc__title {
    margin: 10pt 0 4pt;
    font-size: 14pt;
    font-weight: 700;
    text-align: center;
    text-transform: uppercase;
    line-height: 1.2;
  }
  .nhap-xuat-kho-phieu-doc__subtitle {
    margin: 0 0 10pt;
    font-size: 11pt;
    text-align: center;
  }
  .nhap-xuat-kho-phieu-doc__meta { margin: 0 0 10pt; }
  .nhap-xuat-kho-phieu-doc__meta-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2pt 12pt;
    margin-bottom: 2pt;
  }
  .nhap-xuat-kho-phieu-doc__meta-item { margin: 0; font-size: 11pt; }
  .nhap-xuat-kho-phieu-doc__meta-label { font-weight: 700; }
  .nhap-xuat-kho-phieu-doc__empty {
    margin: 10pt 0 0;
    text-align: center;
    font-style: italic;
    font-size: 11pt;
  }
  .nhap-xuat-kho-phieu-doc__table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 10pt;
  }
  .nhap-xuat-kho-phieu-doc__col-stt { width: 5%; }
  .nhap-xuat-kho-phieu-doc__col-name { width: 22%; }
  .nhap-xuat-kho-phieu-doc__th,
  .nhap-xuat-kho-phieu-doc__td {
    border: 0.5px solid #333;
    padding: 3pt 4pt;
    vertical-align: top;
    word-break: break-word;
  }
  .nhap-xuat-kho-phieu-doc__th {
    background: #f5f5f5;
    font-weight: 700;
    text-align: center;
    font-size: 10pt;
  }
  .nhap-xuat-kho-phieu-doc__td { min-height: 28px; }
  .nhap-xuat-kho-phieu-doc__td--center { text-align: center; }
  .nhap-xuat-kho-phieu-doc__td--right { text-align: right; }
  .nhap-xuat-kho-phieu-doc__td--left { text-align: left; }
  .nhap-xuat-kho-phieu-doc thead { display: table-header-group; }
  .nhap-xuat-kho-phieu-doc tr { page-break-inside: avoid; }
  .nhap-xuat-kho-phieu-doc__summary { margin-top: 8pt; text-align: right; }
  .nhap-xuat-kho-phieu-doc__summary-row {
    display: flex;
    justify-content: flex-end;
    gap: 12pt;
    margin-bottom: 4pt;
    font-size: 11pt;
  }
  .nhap-xuat-kho-phieu-doc__summary-label { font-weight: 700; }
  .nhap-xuat-kho-phieu-doc__summary-value { font-weight: 700; min-width: 100pt; text-align: right; }
  .nhap-xuat-kho-phieu-doc__amount-words {
    margin: 4pt 0 0;
    font-size: 11pt;
    font-style: italic;
    text-align: left;
  }
  .nhap-xuat-kho-phieu-doc__note {
    margin: 10pt 0 0;
    padding: 6pt 8pt;
    border: 0.5px solid #333;
    font-size: 11pt;
    min-height: 32pt;
  }
  .nhap-xuat-kho-phieu-doc__footer {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 8pt 10pt;
    margin-top: 20pt;
    page-break-inside: avoid;
  }
  .nhap-xuat-kho-phieu-doc__sign-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .nhap-xuat-kho-phieu-doc__sign-label {
    margin: 0;
    font-size: 10pt;
    font-weight: 700;
    text-transform: uppercase;
  }
  .nhap-xuat-kho-phieu-doc__sign-hint {
    margin: 8pt 0 0;
    font-size: 10pt;
    font-style: italic;
  }
  .nhap-xuat-kho-phieu-doc__sign-area {
    width: 100%;
    min-height: 48pt;
  }
`;function ke(e,i){const n=window.open("","_blank","noopener,noreferrer,width=900,height=700");if(!n)return!1;const t=`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${i.replace(/</g,"&lt;")}</title>
  <style>${Te}</style>
</head>
<body>
${e.outerHTML}
<script>
  window.onload = function () {
    window.focus();
    window.print();
  };
  window.onafterprint = function () {
    window.close();
  };
<\/script>
</body>
</html>`;return n.document.open(),n.document.write(t),n.document.close(),!0}const I="/mat-tran-to-quoc/kho-cuu-tro/nhap-xuat-kho",ye="nhap-xuat-kho-phieu-preview",Ie=()=>{const{phieuId:e}=Y(),i=Q(),n=Z(m=>m.user),t=ae("view","matTranReliefStockTransactions"),r=b.useRef(!1),h=b.useRef(!1),u=String(e??"").trim(),{data:s,isLoading:c,isError:l}=re(u||null),{data:N}=q({queryKey:te.thongTinToChuc.singleton,queryFn:ee,...J});b.useEffect(()=>{!n||t||r.current||(r.current=!0,P.error(o("matTranNhapXuatKho.noViewPermission")),i(I,{replace:!0}))},[n,t,i]),b.useEffect(()=>{!u||c||!l&&s===null&&(P.error(o("matTranNhapXuatKho.service.notFound")),i(I,{replace:!0}))},[u,c,l,s,i]);const f=b.useMemo(()=>s?de(s,N):null,[s,N]),d=b.useMemo(()=>{const m=s?.so_phieu?.trim().replace(/\s+/g,"-").slice(0,40);return m?`${o("matTranNhapXuatKho.printPreview.fileName")}-${m}`:o("matTranNhapXuatKho.printPreview.fileName")},[s?.so_phieu]),T=b.useCallback(()=>{i(u?`${I}?open=${encodeURIComponent(u)}`:I)},[i,u]),v=b.useCallback(()=>{const m=document.getElementById(B);if(!m){P.error(o("common.error"));return}const y=s?.so_phieu??o("matTranNhapXuatKho.printPreview.documentTitle");ke(m,y)||P.error(o("matTranNhapXuatKho.printPreview.printPopupBlocked"))},[s?.so_phieu]),_=b.useCallback(async m=>{if(f)try{if(m==="pdf"){if(h.current)return;h.current=!0,await new Promise(E=>requestAnimationFrame(()=>E()));const y=document.getElementById(B);if(!y){P.error(o("common.error"));return}await be(y,d)}else m==="docx"?await fe(f,d):await we(f,d)}catch{P.error(o("common.error"))}finally{h.current=!1}},[f,d]);return t?c||!s||!f?a.jsx("div",{className:"flex items-center justify-center min-h-[40vh]","aria-busy":"true",children:a.jsx("div",{className:"h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent"})}):a.jsx(he,{previewClassPrefix:ye,pageTitle:o("matTranNhapXuatKho.printPreview.pageTitle"),onBack:T,onPrint:v,onDownload:_,downloadDisabled:!1,children:a.jsx(me,{model:f})}):a.jsx("div",{className:"flex items-center justify-center min-h-[40vh]","aria-busy":"true",children:a.jsx("div",{className:"h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent"})})};export{Ie as default};
