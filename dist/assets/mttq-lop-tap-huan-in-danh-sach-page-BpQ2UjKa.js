import{j as n}from"./vendor-framer-BOqKMs2I.js";import{r as b}from"./vendor-icons-CpZrZtUL.js";import{u as W}from"./vendor-tanstack-C69ND6AN.js";import{t as r,o as X,y as L,Z as Y,u as Z,a as Q,d as C,P as J,ai as aa,r as ta}from"./index-DWsjVq2a.js";import{u as V}from"./use-can-DU7xLdZl.js";import{u as ea}from"./use-mttq-can-bo-Dpf8a-QS.js";import{P as T,A as g,T as v,B as o,W as y,a as R,b as O,V as k,F as na,c as ia,d as sa,D as oa}from"./index-CuHoJ_Ub.js";import{f as ra}from"./format-ten-don-vi-cap-quan-ly-BYYDJoO3.js";import{a as ca,u as ha}from"./use-mttq-tap-huan-viewer-BsJslYDL.js";import{f as la,a as pa}from"./use-mttq-tap-huan-BPUbOr_h.js";import{_ as I}from"./vendor-jspdf-CSIRm9mH.js";import"./vendor-recharts-D6KRJzRJ.js";import"./vendor-supabase-DX0i8-Of.js";import"./mttq-can-bo-service-Bm2KLdUL.js";import"./phong-ban-service-Cn62oAZp.js";import"./mttq-thiet-lap-service-CH1A3hMC.js";import"./supabase-select-CS4jMb5A.js";import"./chuc-vu-service-DO6zxbBZ.js";import"./trang-thai-BXSKzPuU.js";import"./schemas-C4fyO9GS.js";import"./coerce-DoFZsRnN.js";import"./dia-ban-service-DyNf3eKo.js";import"./constants-BcSGQabD.js";import"./compat-DOTGHHbm.js";function da(a,s,i){const t=r("common.emptyCell");return a.chi_tiet.filter(e=>ca(s,e)).map((e,d)=>{const c=i?.get(String(e.can_bo_id)),l=la(e,c),p=e.chuc_vu_cap_quan_ly??c?.chuc_vu_cap_quan_ly??null,u=ra(p,e.ten_don_vi_can_bo),m=l.ten_to_chuc.trim()||e.ten_to_chuc?.trim()||"",_=l.ten_phong_ban.trim()||e.ten_phong_ban?.trim()||"",N=l.ten_chuc_vu.trim()||e.chuc_vu?.trim()||"";return{[r("matTranTapHuan.printPreview.colStt")]:String(d+1),[r("matTranTapHuan.form.hoVaTen")]:e.ten_can_bo?.trim()||t,[r("matTranCanBo.store.toChucCol")]:m||t,[r("matTranCanBo.store.phongBanCol")]:_||t,[r("matTranTapHuan.form.chucVu")]:N||t,[r("matTranTapHuan.form.donViCongTac")]:u===t?t:u,[r("matTranTapHuan.form.thuocDien")]:e.thuoc_dien||t}})}function ua(a){const s={[r("matTranTapHuan.printPreview.metaLop")]:a.ten_lop_tap_huan,[r("matTranTapHuan.printPreview.metaNam")]:String(a.nam_tap_huan??""),[r("matTranTapHuan.printPreview.metaCap")]:a.cap_tap_huan};return a.cap_tap_huan==="Cấp xã"&&a.ten_don_vi?.trim()&&(s[r("matTranTapHuan.printPreview.metaDonVi")]=a.ten_don_vi.trim()),s}function ma(a,s,i,t){const h=ua(a),e=Object.entries(h).map(([N,x])=>({label:N,value:x})),d=r("matTranTapHuan.printPreview.signedDate"),c=X(L()),l=da(a,i,t),p=r("matTranTapHuan.printPreview.colStt"),u=r("matTranTapHuan.form.hoVaTen"),m=r("common.emptyCell"),_=a.ho_va_ten_nguoi_tao?.trim()||a.ten_tai_khoan_nguoi_tao?.trim()||m;return{companyName:s?.companyName?.trim()||"—",address:s?.address?.trim()||void 0,phone:s?.phone?.trim()||void 0,documentTitle:r("matTranTapHuan.printPreview.documentTitle"),metaItems:e,signedDateLabel:d,signedDateValue:c,rows:l,emptyMessage:r("matTranTapHuan.printPreview.empty"),sttColumnKey:p,nameColumnKey:u,footer:{nguoiTaoLabel:r("matTranTapHuan.printPreview.footerNguoiTao"),nguoiTaoValue:_,nguoiKiemTraLabel:r("matTranTapHuan.printPreview.footerNguoiKiemTra"),nguoiPheDuyetLabel:r("matTranTapHuan.printPreview.footerNguoiPheDuyet")}}}function S(a,s){const i=[...a,s],t=[];for(let h=0;h<i.length;h+=2){const e=[i[h]];i[h+1]&&e.push(i[h+1]),t.push(e)}return t}const A="tap-huan-in-danh-sach-print-root",_a=({model:a})=>{const s=a.rows.length>0?Object.keys(a.rows[0]):[],i=S(a.metaItems,{label:a.signedDateLabel,value:a.signedDateValue});return n.jsxs("article",{id:A,className:"tap-huan-in-danh-sach-doc",children:[n.jsxs("header",{className:"tap-huan-in-danh-sach-doc__letterhead",children:[n.jsx("p",{className:"tap-huan-in-danh-sach-doc__org-name",children:a.companyName.toUpperCase()}),a.address?n.jsx("p",{className:"tap-huan-in-danh-sach-doc__org-line",children:a.address}):null,a.phone?n.jsxs("p",{className:"tap-huan-in-danh-sach-doc__org-line",children:["ĐT: ",a.phone]}):null]}),n.jsx("h1",{className:"tap-huan-in-danh-sach-doc__title",children:a.documentTitle}),n.jsx("div",{className:"tap-huan-in-danh-sach-doc__meta",children:i.map((t,h)=>n.jsx("div",{className:"tap-huan-in-danh-sach-doc__meta-row",children:t.map(e=>n.jsxs("p",{className:"tap-huan-in-danh-sach-doc__meta-item",children:[n.jsxs("span",{className:"tap-huan-in-danh-sach-doc__meta-label",children:[e.label,":"]})," ",n.jsx("span",{className:"tap-huan-in-danh-sach-doc__meta-value",children:e.value})]},e.label))},h))}),a.rows.length===0?n.jsx("p",{className:"tap-huan-in-danh-sach-doc__empty",children:a.emptyMessage}):n.jsxs("table",{className:"tap-huan-in-danh-sach-doc__table",children:[n.jsx("colgroup",{children:s.map(t=>n.jsx("col",{className:t===a.sttColumnKey?"tap-huan-in-danh-sach-doc__col-stt":t===a.nameColumnKey?"tap-huan-in-danh-sach-doc__col-name":void 0},t))}),n.jsx("thead",{children:n.jsx("tr",{children:s.map(t=>n.jsx("th",{className:t===a.sttColumnKey?"tap-huan-in-danh-sach-doc__th tap-huan-in-danh-sach-doc__th--center":"tap-huan-in-danh-sach-doc__th",children:t},t))})}),n.jsx("tbody",{children:a.rows.map((t,h)=>n.jsx("tr",{children:s.map(e=>n.jsx("td",{className:e===a.sttColumnKey?"tap-huan-in-danh-sach-doc__td tap-huan-in-danh-sach-doc__td--center":e===a.nameColumnKey?"tap-huan-in-danh-sach-doc__td tap-huan-in-danh-sach-doc__td--left":"tap-huan-in-danh-sach-doc__td",children:t[e]},e))},h))})]}),n.jsxs("footer",{className:"tap-huan-in-danh-sach-doc__footer",children:[n.jsxs("div",{className:"tap-huan-in-danh-sach-doc__sign-col",children:[n.jsx("p",{className:"tap-huan-in-danh-sach-doc__sign-label",children:a.footer.nguoiTaoLabel}),n.jsx("p",{className:"tap-huan-in-danh-sach-doc__sign-name",children:a.footer.nguoiTaoValue})]}),n.jsxs("div",{className:"tap-huan-in-danh-sach-doc__sign-col",children:[n.jsx("p",{className:"tap-huan-in-danh-sach-doc__sign-label",children:a.footer.nguoiKiemTraLabel}),n.jsx("p",{className:"tap-huan-in-danh-sach-doc__sign-line","aria-hidden":"true"})]}),n.jsxs("div",{className:"tap-huan-in-danh-sach-doc__sign-col",children:[n.jsx("p",{className:"tap-huan-in-danh-sach-doc__sign-label",children:a.footer.nguoiPheDuyetLabel}),n.jsx("p",{className:"tap-huan-in-danh-sach-doc__sign-line","aria-hidden":"true"})]})]})]})},fa="Times New Roman",$=22,M=28,B=20,ga={top:850,right:850,bottom:850,left:1134},E={style:o.SINGLE,size:4,color:"333333"};function w(a,s){return new sa({text:a,font:fa,bold:s?.bold,size:s?.size??$})}function F(a,s=!1,i){return new T({alignment:i,children:[w(a,{bold:s})],spacing:{before:40,after:40}})}async function Ta(a,s){const i=[new T({alignment:g.LEFT,children:[w(a.companyName.toUpperCase(),{bold:!0,size:M})],spacing:{after:80}})];a.address&&i.push(new T({alignment:g.LEFT,children:[w(a.address,{size:B})],spacing:{after:40}})),a.phone&&i.push(new T({alignment:g.LEFT,children:[w(`ĐT: ${a.phone}`,{size:B})],spacing:{after:120}})),i.push(new T({alignment:g.CENTER,children:[w(a.documentTitle,{bold:!0,size:M})],spacing:{after:160}}));const t=S(a.metaItems,{label:a.signedDateLabel,value:a.signedDateValue});for(const l of t){const p=l.map(u=>new v({width:{size:50,type:y.PERCENTAGE},borders:{top:{style:o.NONE,size:0},bottom:{style:o.NONE,size:0},left:{style:o.NONE,size:0},right:{style:o.NONE,size:0}},children:[new T({children:[w(`${u.label}: `,{bold:!0}),w(u.value)]})]}));for(;p.length<2;)p.push(new v({width:{size:50,type:y.PERCENTAGE},borders:{top:{style:o.NONE,size:0},bottom:{style:o.NONE,size:0},left:{style:o.NONE,size:0},right:{style:o.NONE,size:0}},children:[new T({children:[w(" ")]})]}));i.push(new R({width:{size:100,type:y.PERCENTAGE},borders:{top:{style:o.NONE,size:0},bottom:{style:o.NONE,size:0},left:{style:o.NONE,size:0},right:{style:o.NONE,size:0},insideHorizontal:{style:o.NONE,size:0},insideVertical:{style:o.NONE,size:0}},rows:[new O({children:p})]}))}if(a.rows.length>0){const l=Object.keys(a.rows[0]),p=new O({tableHeader:!0,children:l.map(m=>new v({shading:{fill:"F5F5F5"},verticalAlign:k.CENTER,borders:{top:E,bottom:E,left:E,right:E},children:[F(m,!0,g.CENTER)]}))}),u=a.rows.map(m=>new O({children:l.map(_=>{const N=_===a.sttColumnKey,x=_===a.nameColumnKey;return new v({verticalAlign:k.CENTER,borders:{top:E,bottom:E,left:E,right:E},children:[F(String(m[_]??""),!1,N?g.CENTER:x?g.LEFT:g.LEFT)]})})}));i.push(new R({width:{size:100,type:y.PERCENTAGE},rows:[p,...u]}))}else i.push(new T({alignment:g.CENTER,children:[w(a.emptyMessage,{size:$})],spacing:{before:120}}));i.push(new T({spacing:{before:320}}),new R({width:{size:100,type:y.PERCENTAGE},borders:{top:{style:o.NONE,size:0},bottom:{style:o.NONE,size:0},left:{style:o.NONE,size:0},right:{style:o.NONE,size:0},insideHorizontal:{style:o.NONE,size:0},insideVertical:{style:o.NONE,size:0}},rows:[new O({children:[new v({width:{size:33,type:y.PERCENTAGE},borders:{top:{style:o.NONE,size:0},bottom:{style:o.NONE,size:0},left:{style:o.NONE,size:0},right:{style:o.NONE,size:0}},children:[new T({alignment:g.CENTER,spacing:{after:600},children:[w(a.footer.nguoiTaoLabel,{bold:!0})]}),new T({alignment:g.CENTER,children:[w(a.footer.nguoiTaoValue)]})]}),new v({width:{size:33,type:y.PERCENTAGE},borders:{top:{style:o.NONE,size:0},bottom:{style:o.NONE,size:0},left:{style:o.NONE,size:0},right:{style:o.NONE,size:0}},children:[new T({alignment:g.CENTER,spacing:{after:1200},children:[w(a.footer.nguoiKiemTraLabel,{bold:!0})]})]}),new v({width:{size:34,type:y.PERCENTAGE},borders:{top:{style:o.NONE,size:0},bottom:{style:o.NONE,size:0},left:{style:o.NONE,size:0},right:{style:o.NONE,size:0}},children:[new T({alignment:g.CENTER,spacing:{after:1200},children:[w(a.footer.nguoiPheDuyetLabel,{bold:!0})]})]})]})]}));const h=new na({sections:[{properties:{page:{size:{width:11906,height:16838},margin:ga}},children:i}]}),e=await ia.toBlob(h),d=URL.createObjectURL(e),c=document.createElement("a");c.href=d,c.download=`${s}_${L()}.docx`,document.body.appendChild(c),c.click(),c.remove(),URL.revokeObjectURL(d)}const wa=210,Na=297,H={top:15,right:15,bottom:15,left:20};async function ba(a,s){const[{default:i},{default:t}]=await Promise.all([I(()=>import("./vendor-jspdf-CSIRm9mH.js").then(N=>N.j),[]),I(()=>import("./html2canvas.esm-DmLBsbfV.js"),[])]),h=await t(a,{scale:2,useCORS:!0,logging:!1,backgroundColor:"#ffffff",scrollX:0,scrollY:0,windowWidth:a.scrollWidth}),e=new i({unit:"mm",format:"a4",orientation:"portrait"}),d=wa-H.left-H.right,c=Na-H.top-H.bottom,l=d,p=h.height*l/h.width,u=h.toDataURL("image/png");let m=0,_=0;for(;m<p;)_>0&&e.addPage(),e.addImage(u,"PNG",H.left,H.top-m,l,p),m+=c,_+=1;e.save(`${s}_${L()}.pdf`)}async function ya(a,s){const i=await I(()=>import("./vendor-xlsx-Ca2gZxVo.js"),[]),t=[];t.push([a.companyName.toUpperCase()]),a.address&&t.push([a.address]),a.phone&&t.push([`ĐT: ${a.phone}`]),t.push([]),t.push([a.documentTitle]),t.push([]);const h=S(a.metaItems,{label:a.signedDateLabel,value:a.signedDateValue});for(const c of h){const l=[];for(const p of c)l.push(`${p.label}: ${p.value}`);t.push(l)}if(t.push([]),a.rows.length>0){const c=Object.keys(a.rows[0]);t.push(c);for(const l of a.rows)t.push(c.map(p=>l[p]??""))}else t.push([a.emptyMessage]);t.push([]),t.push([a.footer.nguoiTaoLabel,a.footer.nguoiKiemTraLabel,a.footer.nguoiPheDuyetLabel]),t.push([a.footer.nguoiTaoValue,"",""]);const e=i.utils.aoa_to_sheet(t),d=i.utils.book_new();i.utils.book_append_sheet(d,e,"Danh_sach"),i.writeFile(d,`${s}_${L()}.xlsx`)}const Ea=`
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
  .tap-huan-in-danh-sach-doc {
    width: 100%;
    max-width: 210mm;
    margin: 0 auto;
    padding: 0;
  }
  .tap-huan-in-danh-sach-doc__letterhead { text-align: left; margin: 0 0 8pt; }
  .tap-huan-in-danh-sach-doc__org-name {
    margin: 0;
    font-size: 14pt;
    font-weight: 700;
    line-height: 1.15;
    text-transform: uppercase;
  }
  .tap-huan-in-danh-sach-doc__org-line {
    margin: 1pt 0 0;
    font-size: 10pt;
    line-height: 1.2;
  }
  .tap-huan-in-danh-sach-doc__title {
    margin: 10pt 0 8pt;
    font-size: 14pt;
    font-weight: 700;
    text-align: center;
    text-transform: uppercase;
    line-height: 1.2;
  }
  .tap-huan-in-danh-sach-doc__meta { margin: 0 0 8pt; }
  .tap-huan-in-danh-sach-doc__meta-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2pt 12pt;
    margin-bottom: 2pt;
  }
  .tap-huan-in-danh-sach-doc__meta-item { margin: 0; font-size: 11pt; }
  .tap-huan-in-danh-sach-doc__meta-label { font-weight: 700; }
  .tap-huan-in-danh-sach-doc__empty {
    margin: 10pt 0 0;
    text-align: center;
    font-style: italic;
    font-size: 11pt;
  }
  .tap-huan-in-danh-sach-doc__table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 10pt;
  }
  .tap-huan-in-danh-sach-doc__col-stt { width: 5%; }
  .tap-huan-in-danh-sach-doc__col-name { width: 18%; }
  .tap-huan-in-danh-sach-doc__th,
  .tap-huan-in-danh-sach-doc__td {
    border: 0.5px solid #333;
    padding: 3pt 4pt;
    vertical-align: top;
    word-break: break-word;
  }
  .tap-huan-in-danh-sach-doc__th {
    background: #f5f5f5;
    font-weight: 700;
    text-align: center;
    font-size: 10pt;
  }
  .tap-huan-in-danh-sach-doc__td { min-height: 28px; }
  .tap-huan-in-danh-sach-doc__td--center { text-align: center; }
  .tap-huan-in-danh-sach-doc__td--left { text-align: left; }
  .tap-huan-in-danh-sach-doc thead { display: table-header-group; }
  .tap-huan-in-danh-sach-doc tr { page-break-inside: avoid; }
  .tap-huan-in-danh-sach-doc__footer {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10pt 12pt;
    margin-top: 18pt;
    page-break-inside: avoid;
  }
  .tap-huan-in-danh-sach-doc__sign-col { text-align: center; }
  .tap-huan-in-danh-sach-doc__sign-label {
    margin: 0 0 36pt;
    font-size: 11pt;
    font-weight: 700;
  }
  .tap-huan-in-danh-sach-doc__sign-name { margin: 0; font-size: 11pt; }
`;function va(a,s){const i=window.open("","_blank","noopener,noreferrer,width=900,height=700");if(!i)return!1;const t=`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${s.replace(/</g,"&lt;")}</title>
  <style>${Ea}</style>
</head>
<body>
${a.outerHTML}
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
</html>`;return i.document.open(),i.document.write(t),i.document.close(),!0}const D="/mat-tran-to-quoc/tap-huan-khen-thuong/danh-sach-tap-huan",xa="mttq-tap-huan-danh-sach-preview",Ya=()=>{const{lopId:a}=Y(),s=Z(),i=Q(f=>f.user),t=V("view","matTranTrainingList"),h=b.useRef(!1),e=b.useRef(!1),d=String(a??"").trim(),{data:c,isLoading:l,isError:p}=pa(d||null),u=ha(),m=V("view","matTranOfficerList"),{data:_=[]}=ea({enabled:m}),{data:N}=W({queryKey:ta.thongTinToChuc.singleton,queryFn:aa,...J});b.useEffect(()=>{!i||t||h.current||(h.current=!0,C.error(r("matTranTapHuan.noViewPermission")),s(D,{replace:!0}))},[i,t,s]),b.useEffect(()=>{!d||l||!p&&c===null&&(C.error(r("matTranTapHuan.service.notFound")),s(D,{replace:!0}))},[d,l,p,c,s]);const x=b.useMemo(()=>{const f=new Map;for(const z of _)f.set(String(z.id),z);return f},[_]),P=b.useMemo(()=>c?ma(c,N,u,x):null,[c,N,u,x]),j=b.useMemo(()=>{const f=c?.ten_lop_tap_huan?.trim().replace(/\s+/g,"-").slice(0,40);return f?`${r("matTranTapHuan.printPreview.fileName")}-${f}`:r("matTranTapHuan.printPreview.fileName")},[c?.ten_lop_tap_huan]),K=b.useCallback(()=>{s(d?`${D}?open=${encodeURIComponent(d)}`:D)},[s,d]),G=b.useCallback(()=>{const f=document.getElementById(A);if(!f){C.error(r("common.error"));return}va(f,r("matTranTapHuan.printPreview.documentTitle"))||C.error(r("matTranTapHuan.printPreview.printPopupBlocked"))},[]),q=b.useCallback(async f=>{if(P)try{if(f==="pdf"){if(e.current)return;e.current=!0,await new Promise(U=>requestAnimationFrame(()=>U()));const z=document.getElementById(A);if(!z){C.error(r("common.error"));return}await ba(z,j)}else f==="docx"?await Ta(P,j):await ya(P,j)}catch{C.error(r("common.error"))}finally{e.current=!1}},[P,j]);return t?l||!c||!P?n.jsx("div",{className:"flex items-center justify-center min-h-[40vh]","aria-busy":"true",children:n.jsx("div",{className:"h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent"})}):n.jsx(oa,{previewClassPrefix:xa,onBack:K,onPrint:G,onDownload:q,downloadDisabled:!1,children:n.jsx(_a,{model:P})}):n.jsx("div",{className:"flex items-center justify-center min-h-[40vh]","aria-busy":"true",children:n.jsx("div",{className:"h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent"})})};export{Ya as default};
