import { useState, useEffect, useMemo, useRef } from "react";
import { dbGet } from "./supabase.js";

// ═══════════════════════ CONSTANTES Y UTILIDADES ═══════════════════════
const T = {bg:"#faf7f2",bgCard:"#fff",bgMuted:"#f0ebe2",bgDeep:"#e6dfd4",ink:"#1e1c18",inkMid:"#5a5750",inkLt:"#9a9690",border:"#ddd8cf",borderLt:"#eae5dc",green:"#3d5a3e",greenLt:"#e8f0e8",danger:"#b03a2e",dangerLt:"#fdf0ee",warn:"#916a00",warnLt:"#fef8e6",ok:"#2d6a4f",okLt:"#e8f5ee",info:"#2c5f8a",infoLt:"#eaf2f8",violet:"#5b3f7a",violetLt:"#f2eef8"};
const num = v => Number(v) || 0;
const GPP_DEF = 0.012;
const LETRAS = "ABCDEFGHIJKL";
const S = 6; // píxeles por milímetro en las imágenes del PDF
const UBICACIONES = ["Canesú", "Pecho", "Frente", "Espalda", "Mangas", "Puños", "Ruedo", "Cuello", "Capucha"];
const hoy = () => new Date().toISOString().split("T")[0];
const slug = t => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");

function aRgb(hex) {
  let h = (hex || "#cccccc").replace("#", "");
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  const n = parseInt(h, 16);
  if (isNaN(n)) return [204, 204, 204];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mezclar(hex, destino, t) {
  const c = aRgb(hex);
  const r = c.map(v => Math.round(v + (destino - v) * t));
  return "rgb(" + r.join(",") + ")";
}
const luminancia = hex => { const c = aRgb(hex); return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]; };

const decodificar = (filas, ancho, alto, ncolores) => {
  const g = [];
  for (let y = 0; y < alto; y++) {
    const fila = (filas && filas[y]) || "";
    const r = [];
    for (let x = 0; x < ancho; x++) {
      const v = parseInt(fila[x], 36);
      r.push(isNaN(v) || v >= ncolores ? 0 : v);
    }
    g.push(r);
  }
  return g;
};

// Vista previa del tejido (cada punto como una "V")
function dibujarTejido(canvas, g, hexes, repH, repV, aspecto, maxAncho) {
  const H = g.length;
  const W = H ? g[0].length : 0;
  if (!W || !H) return;
  const totalW = W * repH;
  const cw = Math.max(3, Math.min(16, Math.floor(maxAncho / totalW)));
  const ch = Math.max(3, Math.round(cw * aspecto));
  canvas.width = totalW * cw;
  canvas.height = H * repV * ch;
  const ctx = canvas.getContext("2d");
  const oscuros = hexes.map(h => mezclar(h, 0, 0.38));
  const claros = hexes.map(h => mezclar(h, 255, 0.32));
  for (let vy = 0; vy < repV; vy++) {
    for (let y = 0; y < H; y++) {
      for (let vx = 0; vx < repH; vx++) {
        for (let x = 0; x < W; x++) {
          ctx.fillStyle = oscuros[g[y][x]] || "#999";
          ctx.fillRect((vx * W + x) * cw, (vy * H + y) * ch, cw, ch);
        }
      }
    }
  }
  ctx.lineCap = "round";
  for (let vy = 0; vy < repV; vy++) {
    for (let y = 0; y < H; y++) {
      for (let vx = 0; vx < repH; vx++) {
        for (let x = 0; x < W; x++) {
          const idx = g[y][x];
          const px = (vx * W + x) * cw;
          const py = (vy * H + y) * ch;
          if (cw < 6) {
            ctx.fillStyle = hexes[idx] || "#ccc";
            ctx.fillRect(px, py, cw, Math.max(1, ch - 1));
            continue;
          }
          ctx.strokeStyle = hexes[idx] || "#ccc";
          ctx.lineWidth = cw * 0.52;
          ctx.beginPath();
          ctx.moveTo(px + cw * 0.27, py + ch * 0.2);
          ctx.lineTo(px + cw * 0.5, py + ch * 0.82);
          ctx.moveTo(px + cw * 0.73, py + ch * 0.2);
          ctx.lineTo(px + cw * 0.5, py + ch * 0.82);
          ctx.stroke();
          if (cw >= 8) {
            ctx.strokeStyle = claros[idx] || "#fff";
            ctx.lineWidth = cw * 0.13;
            ctx.beginPath();
            ctx.moveTo(px + cw * 0.22, py + ch * 0.26);
            ctx.lineTo(px + cw * 0.4, py + ch * 0.68);
            ctx.moveTo(px + cw * 0.68, py + ch * 0.26);
            ctx.lineTo(px + cw * 0.52, py + ch * 0.68);
            ctx.stroke();
          }
        }
      }
    }
  }
}

// Gráfico con números y letras por color, para imprimir (fila 1 abajo; puntos de derecha a izquierda)
function canvasGrafico(g, hexes, cellPx, yDesde, yHasta, conLetras) {
  const H = g.length;
  const W = H ? g[0].length : 0;
  const izq = Math.round(7 * S);
  const arriba = Math.round(5 * S);
  const c = document.createElement("canvas");
  c.width = izq + W * cellPx + 2;
  c.height = arriba + (yHasta - yDesde) * cellPx + 2;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  for (let y = yDesde; y < yHasta; y++) {
    for (let x = 0; x < W; x++) {
      const v = g[y][x];
      const px = izq + x * cellPx;
      const py = arriba + (y - yDesde) * cellPx;
      ctx.fillStyle = hexes[v] || "#cccccc";
      ctx.fillRect(px, py, cellPx, cellPx);
      if (conLetras) {
        ctx.fillStyle = luminancia(hexes[v]) > 140 ? "#000" : "#fff";
        ctx.font = "bold " + Math.floor(cellPx * 0.55) + "px Helvetica, Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(LETRAS[v] || "?", px + cellPx / 2, py + cellPx / 2 + 1);
      }
    }
  }
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x++) {
    const n = W - x;
    ctx.strokeStyle = n % 10 === 0 ? "#000" : (n % 5 === 0 ? "#666" : "#bbb");
    ctx.beginPath();
    ctx.moveTo(izq + x * cellPx + 0.5, arriba);
    ctx.lineTo(izq + x * cellPx + 0.5, arriba + (yHasta - yDesde) * cellPx);
    ctx.stroke();
  }
  for (let y = yDesde; y <= yHasta; y++) {
    const n = H - y;
    ctx.strokeStyle = n % 10 === 0 ? "#000" : (n % 5 === 0 ? "#666" : "#bbb");
    ctx.beginPath();
    ctx.moveTo(izq, arriba + (y - yDesde) * cellPx + 0.5);
    ctx.lineTo(izq + W * cellPx, arriba + (y - yDesde) * cellPx + 0.5);
    ctx.stroke();
  }
  const fuente = Math.max(9, Math.floor(cellPx * 0.45));
  ctx.fillStyle = "#222";
  ctx.font = fuente + "px Helvetica, Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  for (let x = 0; x < W; x++) {
    const n = W - x;
    if (cellPx >= 16 || n % 5 === 0 || n === 1) ctx.fillText(String(n), izq + x * cellPx + cellPx / 2, arriba / 2);
  }
  ctx.textAlign = "right";
  for (let y = yDesde; y < yHasta; y++) {
    const n = H - y;
    if (cellPx >= 16 || n % 5 === 0 || n === 1) ctx.fillText(String(n), izq - 5, arriba + (y - yDesde) * cellPx + cellPx / 2);
  }
  return c;
}

function filaTalle(talles, talle, cat) {
  const c = cat || "";
  const orden = c.includes("Kids") ? ["kids", "bebe"] : (c.includes("Sombreros") ? ["unico"] : ["adultos", "unico", "kids", "bebe"]);
  for (let i = 0; i < orden.length; i++) {
    const f = (talles[orden[i]] || []).find(t => t.talle === talle);
    if (f) return f;
  }
  return null;
}

function prepararMotivo(m, paleta, cantidad, vinculo) {
  const ncol = (m.colores || []).length || 1;
  const grid = decodificar(m.celdas, m.ancho, m.alto, ncol);
  const hexes = (m.colores || []).map(pid => { const c = paleta.find(q => q.id === pid); return c ? c.hex : "#cccccc"; });
  const nombres = (m.colores || []).map(pid => { const c = paleta.find(q => q.id === pid); return c ? c.nombre : "(color eliminado)"; });
  const puntos = new Array(ncol).fill(0);
  grid.forEach(f => { f.forEach(v => { if (v < ncol) puntos[v]++; }); });
  const pp = num(m.ptos10), vv = num(m.vueltas10), pm = num(m.pesoMuestra);
  const calibrado = pp > 0 && vv > 0 && pm > 0;
  const gpp = calibrado ? pm / (pp * vv) : GPP_DEF;
  const fac = num(m.factor) > 0 ? num(m.factor) : 1;
  const rH = Math.max(1, Math.round(num(m.repH)) || 1);
  const rV = Math.max(1, Math.round(num(m.repV)) || 1);
  const gPieza = puntos.map(n => n * rH * rV * gpp * fac);
  return {
    id: m.id, nombre: m.nombre, ubicacion: (vinculo && vinculo.ubicacion) || "", ancho: m.ancho, alto: m.alto,
    grid: grid, hexes: hexes, nombres: nombres, puntos: puntos, rH: rH, rV: rV,
    gPieza: gPieza, gPedido: gPieza.map(g => g * cantidad),
    pp: pp, vv: vv, calibrado: calibrado, notas: m.notas || "",
    medidaAncho: pp > 0 ? m.ancho / pp * 10 * rH : 0, medidaAlto: vv > 0 ? m.alto / vv * 10 * rV : 0
  };
}

// ═══════════════════════ GENERACIÓN DEL PDF ═══════════════════════
async function construirPDF(d) {
  const mod = await import("jspdf");
  const JsPDF = mod.jsPDF || mod.default;
  const doc = new JsPDF({unit: "mm", format: "a4"});
  const W = 210, M = 14, PIE = 284;
  const GRIS = [154, 150, 144];
  const GRIS2 = [90, 87, 80];
  let y = 0;

  const texto = (t, x, yy, tam, negrita, color, opciones) => {
    doc.setFont("helvetica", negrita ? "bold" : "normal");
    doc.setFontSize(tam);
    const c = color || [30, 28, 24];
    doc.setTextColor(c[0], c[1], c[2]);
    doc.text(String(t), x, yy, opciones || {});
  };
  const encabezado = titulo => {
    doc.setFillColor(61, 90, 62);
    doc.rect(0, 0, W, 18, "F");
    texto("JUNCO VERDE", M, 11.5, 15, true, [255, 255, 255]);
    texto(titulo, W - M, 11.5, 11, false, [255, 255, 255], {align: "right"});
    return 27;
  };
  const seccion = t => {
    y += 3;
    texto(t.toUpperCase(), M, y, 8.5, true, [61, 90, 62]);
    doc.setDrawColor(221, 216, 207);
    doc.line(M, y + 1.8, W - M, y + 1.8);
    y += 7;
  };
  const asegurar = (alto, titulo) => {
    if (y + alto > PIE - 6) { doc.addPage(); y = encabezado(titulo); }
  };
  const tituloOrden = "Orden de trabajo #" + d.pedido.id;

  // ── Página 1: datos del pedido ──
  y = encabezado(tituloOrden);
  texto("Emitida el " + d.hoy, M, y, 9, false, GRIS2);
  y += 3;
  seccion("Datos del pedido");
  const pares = [
    ["Artesana", d.pedido.artesana],
    ["Fecha de entrega", d.pedido.fechaEntrega],
    ["Prenda", d.pedido.prenda],
    ["Talle", d.pedido.talle || "-"],
    ["Cantidad", d.pedido.cantidad],
    ["Tiempo estimado", d.tiempo + " días"],
    ["Colección", d.pedido.coleccion || "-"]
  ];
  if (d.mostrarCliente) pares.push(["Cliente", d.pedido.cliente]);
  for (let i = 0; i < pares.length; i += 2) {
    for (let k = 0; k < 2; k++) {
      const par = pares[i + k];
      if (!par) continue;
      const x = M + k * 95;
      texto(par[0], x, y, 8, false, GRIS);
      const val = doc.splitTextToSize(String(par[1]), 88)[0];
      texto(val, x, y + 5, 11, true);
    }
    y += 13;
  }

  const f = d.fila;
  const medidas = f ? [["Busto", f.busto], ["Largo", f.largo], ["Manga", f.manga], ["Cintura", f.cintura], ["Cadera", f.cadera]].filter(m => m[1] !== null && m[1] !== undefined) : [];
  if (medidas.length > 0) {
    asegurar(30, tituloOrden);
    seccion("Medidas del talle " + d.pedido.talle + " (cm)");
    const bw = (W - 2 * M) / medidas.length;
    medidas.forEach((m, i) => {
      const x = M + i * bw;
      doc.setDrawColor(221, 216, 207);
      doc.rect(x, y, bw - 3, 14);
      texto(m[0], x + 3, y + 5, 8, false, GRIS);
      texto(m[1], x + 3, y + 11, 12, true);
    });
    y += 18;
  }

  if (d.lanaTotal > 0) {
    asegurar(20, tituloOrden);
    seccion("Lana");
    texto("Lana estimada para todo el pedido: " + Math.round(d.lanaTotal) + " g  (" + Math.round(d.lanaPorPrenda) + " g por prenda)", M, y, 10);
    y += 6;
  }

  if (d.pedido.notas) {
    const lineas = doc.splitTextToSize(String(d.pedido.notas), W - 2 * M);
    asegurar(lineas.length * 5 + 14, tituloOrden);
    seccion("Instrucciones");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 28, 24);
    doc.text(lineas, M, y);
    y += lineas.length * 5 + 2;
  }

  if (d.motivos.length > 0) {
    asegurar(30, tituloOrden);
    seccion("Motivos de esta orden");
    d.motivos.forEach((m, i) => {
      asegurar(13, tituloOrden);
      texto((i + 1) + ". " + m.nombre + (m.ubicacion ? "  -  " + m.ubicacion : ""), M, y, 10, true);
      texto(m.ancho + " puntos x " + m.alto + " vueltas, " + m.hexes.length + " colores, se repite " + m.rH + " x " + m.rV, M + 5, y + 5, 9, false, GRIS2);
      y += 11;
    });
    texto("El detalle de cada motivo (colores, lana y gráfico) está en las páginas siguientes.", M, y, 9, false, GRIS2);
    y += 6;
  }

  asegurar(34, tituloOrden);
  y = Math.max(y + 8, 246);
  doc.setDrawColor(30, 28, 24);
  doc.line(M, y, M + 80, y);
  doc.line(M + 100, y, W - M, y);
  texto("Recibí la lana asignada - firma artesana", M, y + 5, 8, false, GRIS2);
  texto("Entregué las prendas terminadas - firma y fecha", M + 100, y + 5, 8, false, GRIS2);

  // ── Una sección por motivo ──
  d.motivos.forEach((m, idx) => {
    const titulo = "Motivo " + (idx + 1) + " de " + d.motivos.length;
    doc.addPage();
    y = encabezado(titulo);
    texto(m.nombre, M, y + 1, 17, true);
    y += 9;
    if (m.ubicacion) { texto("Ubicación en la prenda: " + m.ubicacion, M, y, 10.5, true, [61, 90, 62]); y += 6; }
    texto("Tamaño del gráfico: " + m.ancho + " puntos x " + m.alto + " vueltas", M, y, 10);
    y += 5;
    if (m.rH > 1 || m.rV > 1) { texto("Se repite " + m.rH + " veces a lo ancho y " + m.rV + " veces a lo alto", M, y, 10); y += 5; }
    if (m.medidaAncho > 0) { texto("Medida aproximada tejido: " + m.medidaAncho.toFixed(1) + " x " + m.medidaAlto.toFixed(1) + " cm", M, y, 10); y += 5; }
    texto("Prendas en este pedido: " + d.pedido.cantidad, M, y, 10);
    y += 4;

    seccion("Lana por color");
    texto("Letra", M + 2, y, 8, false, GRIS);
    texto("Color", M + 18, y, 8, false, GRIS);
    texto("Puntos", M + 112, y, 8, false, GRIS, {align: "right"});
    texto("g por prenda", M + 142, y, 8, false, GRIS, {align: "right"});
    texto("g del pedido", W - M, y, 8, false, GRIS, {align: "right"});
    y += 3;
    let totP = 0, totPed = 0;
    m.hexes.forEach((hx, i) => {
      asegurar(9, titulo);
      const c = aRgb(hx);
      doc.setFillColor(c[0], c[1], c[2]);
      doc.setDrawColor(90, 87, 80);
      doc.rect(M + 2, y + 1, 6, 6, "FD");
      texto(LETRAS[i] || "?", M + 11, y + 5.6, 10, true);
      texto(doc.splitTextToSize(m.nombres[i], 80)[0], M + 18, y + 5.6, 10);
      texto((m.puntos[i] * m.rH * m.rV).toLocaleString("es-AR"), M + 112, y + 5.6, 10, false, null, {align: "right"});
      texto(Math.ceil(m.gPieza[i]) + " g", M + 142, y + 5.6, 10, false, null, {align: "right"});
      texto(Math.ceil(m.gPedido[i]) + " g", W - M, y + 5.6, 10, true, null, {align: "right"});
      totP += m.gPieza[i];
      totPed += m.gPedido[i];
      y += 8;
    });
    doc.setDrawColor(221, 216, 207);
    doc.line(M, y, W - M, y);
    texto("Total", M + 18, y + 5.5, 10, true);
    texto(Math.ceil(totP) + " g", M + 142, y + 5.5, 10, true, null, {align: "right"});
    texto(Math.ceil(totPed) + " g", W - M, y + 5.5, 10, true, null, {align: "right"});
    y += 9;
    texto(m.calibrado ? "Cantidades calculadas con muestra de tejido." : "Cantidades estimadas: pueden variar según la tensión de cada tejedora.", M, y, 8, false, GRIS);
    y += 5;
    if (m.notas) {
      const ln = doc.splitTextToSize("Notas: " + m.notas, W - 2 * M);
      asegurar(ln.length * 5 + 4, titulo);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 28, 24);
      doc.text(ln, M, y);
      y += ln.length * 5 + 2;
    }

    // vista previa
    const cv = document.createElement("canvas");
    const asp = (m.pp > 0 && m.vv > 0) ? m.pp / m.vv : 0.8;
    dibujarTejido(cv, m.grid, m.hexes, m.rH, m.rV, asp, 640);
    if (cv.width > 0 && cv.height > 0) {
      const esc = Math.min(170 / cv.width, 90 / cv.height);
      const iw = cv.width * esc;
      const ih = cv.height * esc;
      asegurar(ih + 12, titulo);
      y += 2;
      texto("Vista previa (referencia de colores y composición)", M, y, 8, false, GRIS);
      y += 3;
      doc.addImage(cv.toDataURL("image/png"), "PNG", M, y, iw, ih);
      y += ih + 4;
    }

    // gráfico, en una o más páginas
    const dispW = (W - 2 * M) - 8;
    const cellMm = Math.min(7, dispW / m.ancho);
    const cellPx = Math.max(5, Math.floor(cellMm * S));
    const cellReal = cellPx / S;
    const conLetras = cellPx >= 16;
    const rpp = Math.max(5, Math.floor(222 / cellReal));
    const nChunks = Math.ceil(m.alto / rpp);
    for (let k = 0; k < nChunks; k++) {
      const yHasta = m.alto - k * rpp;
      const yDesde = Math.max(0, yHasta - rpp);
      doc.addPage();
      y = encabezado("Gráfico: " + m.nombre + (nChunks > 1 ? "  (" + (k + 1) + "/" + nChunks + ")" : ""));
      texto("Fila 1 = la de abajo. Los puntos se numeran de derecha a izquierda. Líneas gruesas cada 5 y 10.", M, y, 8.5, false, GRIS2);
      y += 5;
      // leyenda de letras
      let lx = M;
      m.hexes.forEach((hx, i) => {
        const etiqueta = (LETRAS[i] || "?") + " = " + m.nombres[i];
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const tw = doc.getTextWidth(etiqueta);
        if (lx + 8 + tw > W - M) { lx = M; y += 6; }
        const c = aRgb(hx);
        doc.setFillColor(c[0], c[1], c[2]);
        doc.setDrawColor(90, 87, 80);
        doc.rect(lx, y - 3.4, 4.5, 4.5, "FD");
        texto(etiqueta, lx + 6.5, y, 9);
        lx += 6.5 + tw + 6;
      });
      y += 4;
      const cv2 = canvasGrafico(m.grid, m.hexes, cellPx, yDesde, yHasta, conLetras);
      doc.addImage(cv2.toDataURL("image/png"), "PNG", M, y, cv2.width / S, cv2.height / S);
    }
  });

  // ── pie de página ──
  const total = doc.getNumberOfPages();
  const pie = d.taller.nombre + (d.taller.tel ? "  -  " + d.taller.tel : "") + (d.taller.email ? "  -  " + d.taller.email : "");
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    texto(pie, M, 291, 8, false, GRIS);
    texto("Página " + i + " de " + total, W - M, 291, 8, false, GRIS, {align: "right"});
  }
  return doc;
}

// ═══════════════════════ COMPONENTES CHICOS ═══════════════════════
function Boton({ children, onClick, primario, disabled, small, style }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{padding:small?"4px 10px":"8px 16px",borderRadius:2,border:primario ? "none" : "1px solid " + T.border,background:primario ? T.green : "transparent",color:primario ? "#fff" : T.ink,cursor:disabled ? "not-allowed" : "pointer",opacity:disabled ? 0.5 : 1,fontSize:small ? 11 : 13,fontWeight:500,fontFamily:"inherit",whiteSpace:"nowrap",...(style || {})}}>{children}</button>
  );
}
function Modal({ children, onClose }) {
  const mob = window.innerWidth < 768;
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(30,28,24,0.5)",display:"flex",alignItems:mob ? "flex-end" : "center",justifyContent:"center",zIndex:300}}>
      <div style={{background:T.bgCard,border:"1px solid " + T.border,borderRadius:mob ? "12px 12px 0 0" : 4,padding:"1.5rem",width:mob ? "100%" : 720,maxWidth:"100vw",maxHeight:mob ? "92vh" : "90vh",overflowY:"auto",fontFamily:"'Georgia',serif",color:T.ink}}>{children}</div>
    </div>
  );
}
function Seccion({ titulo, children }) {
  return (
    <div style={{borderTop:"1px solid " + T.borderLt,paddingTop:14,marginTop:16}}>
      <div style={{fontSize:11,color:T.inkLt,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10,fontWeight:500}}>{titulo}</div>
      {children}
    </div>
  );
}
function MiniMotivo({ m, paleta }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const g = decodificar(m.celdas, m.ancho, m.alto, (m.colores || []).length || 1);
    const px = Math.max(2, Math.floor(70 / Math.max(m.ancho, m.alto)));
    c.width = m.ancho * px;
    c.height = m.alto * px;
    const ctx = c.getContext("2d");
    const hx = (m.colores || []).map(pid => { const q = paleta.find(z => z.id === pid); return q ? q.hex : "#ccc"; });
    for (let y = 0; y < m.alto; y++) {
      for (let x = 0; x < m.ancho; x++) {
        ctx.fillStyle = hx[g[y][x]] || "#ccc";
        ctx.fillRect(x * px, y * px, px, px);
      }
    }
  }, [m, paleta]);
  return <canvas ref={ref} style={{maxWidth:72,maxHeight:72,border:"1px solid " + T.border,borderRadius:2,background:"#fff",flexShrink:0}}/>;
}

// ═══════════════════════ ORDEN DE TRABAJO ═══════════════════════
export default function OrdenTrabajo({ p, onClose, app }) {
  const { artesanas, cfg, getPrenda, talles, pedidos, sp, catOf } = app;
  const [motData, setMotData] = useState(null);
  const [errMot, setErrMot] = useState(false);
  const [vinculos, setVinculos] = useState((p.motivos || []).map(v => ({...v})));
  const [sucio, setSucio] = useState(false);
  const [mostrarCliente, setMostrarCliente] = useState(false);
  const [pdf, setPdf] = useState(null);
  const [generando, setGenerando] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let vivo = true;
    dbGet("motivos").then(d => {
      if (!vivo) return;
      if (d === undefined) { setErrMot(true); return; }
      setMotData({paleta: (d && d.paleta) || [], motivos: (d && d.motivos) || []});
    });
    return () => { vivo = false; };
  }, []);

  const pr = getPrenda(p.prenda);
  const cat = catOf(p.prenda);
  const fila = filaTalle(talles, p.talle, cat);
  const art = artesanas.find(a => a.nombre === p.artesana);
  const tiempo = cfg.tiemposProd[p.prenda] || 14;

  const preparados = useMemo(() => {
    if (!motData) return [];
    return vinculos.map(v => {
      const m = motData.motivos.find(x => x.id === v.motivoId);
      return m ? prepararMotivo(m, motData.paleta, p.cantidad, v) : null;
    });
  }, [vinculos, motData, p.cantidad]);

  const cambiarVinculos = nuevos => { setVinculos(nuevos); setSucio(true); setPdf(null); };
  const agregarVinculo = () => {
    if (!motData || motData.motivos.length === 0) return;
    cambiarVinculos(vinculos.concat([{motivoId: motData.motivos[0].id, ubicacion: ""}]));
  };
  const guardarVinculos = () => {
    const limpios = vinculos.filter(v => v.motivoId);
    sp(pedidos.map(x => x.id === p.id ? {...x, motivos: limpios} : x));
    setSucio(false);
    setMsg("Motivos guardados en el pedido.");
    setTimeout(() => setMsg(""), 3000);
  };

  const generar = async () => {
    setGenerando(true);
    setMsg("");
    try {
      if (sucio) guardarVinculos();
      const lista = preparados.filter(Boolean);
      const doc = await construirPDF({
        pedido: p, hoy: hoy(), fila: fila, tiempo: tiempo, mostrarCliente: mostrarCliente,
        lanaPorPrenda: pr ? pr.lana : 0, lanaTotal: pr ? pr.lana * p.cantidad : 0,
        taller: cfg.taller, motivos: lista
      });
      const blob = doc.output("blob");
      const nombre = "Orden_" + p.id + "_" + slug(p.prenda) + "_" + slug(p.artesana) + ".pdf";
      const file = new File([blob], nombre, {type: "application/pdf"});
      setPdf({blob: blob, file: file, nombre: nombre, kb: Math.round(blob.size / 1024)});
    } catch (e) {
      console.error("Error generando PDF:", e);
      setMsg("No se pudo generar el PDF. Probá de nuevo.");
    }
    setGenerando(false);
  };
  const descargarPdf = () => {
    const url = URL.createObjectURL(pdf.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = pdf.nombre;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };
  const compartirPdf = async () => {
    try {
      await navigator.share({files: [pdf.file], title: "Orden de trabajo #" + p.id, text: "Orden de trabajo para " + p.artesana});
    } catch (e) { /* cancelado por la usuaria */ }
  };
  const puedeCompartir = !!(pdf && typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({files: [pdf.file]}));

  const copiarTexto = () => {
    let t = "ORDEN #" + p.id + " - Junco Verde\nArtesana: " + p.artesana + "\nPrenda: " + p.prenda + (p.talle ? " (" + p.talle + ")" : "") + " x" + p.cantidad;
    t += "\nEntrega: " + p.fechaEntrega;
    if (pr && pr.lana) t += "\nLana: " + (pr.lana * p.cantidad) + "g";
    if (p.notas) t += "\nNotas: " + p.notas;
    preparados.filter(Boolean).forEach(m => {
      t += "\n\nMotivo: " + m.nombre + (m.ubicacion ? " (" + m.ubicacion + ")" : "");
      m.hexes.forEach((h, i) => { t += "\n- " + (LETRAS[i] || "?") + " " + m.nombres[i] + ": " + Math.ceil(m.gPedido[i]) + " g"; });
    });
    if (navigator.clipboard) navigator.clipboard.writeText(t);
    setMsg("Texto copiado.");
    setTimeout(() => setMsg(""), 3000);
  };

  const validos = preparados.filter(Boolean).length;
  const cerrar = () => { if (sucio && !window.confirm("Hay motivos sin guardar. ¿Cerrar igual?")) return; onClose(); };

  return (
    <Modal onClose={cerrar}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <h3 style={{margin:0,fontSize:17,fontWeight:400}}>Orden de trabajo #{p.id}</h3>
        <button onClick={cerrar} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:T.inkLt}}>×</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10,marginBottom:6}}>
        <div><div style={{fontSize:10,color:T.inkLt,textTransform:"uppercase"}}>Artesana</div><div style={{fontSize:15,fontWeight:500}}>{p.artesana}</div><div style={{fontSize:11,color:T.inkMid}}>{art ? art.especialidad : ""}</div></div>
        <div><div style={{fontSize:10,color:T.inkLt,textTransform:"uppercase"}}>Cliente</div><div style={{fontSize:15,fontWeight:500}}>{p.cliente}</div></div>
        <div><div style={{fontSize:10,color:T.inkLt,textTransform:"uppercase"}}>Entrega</div><div style={{fontSize:15,fontWeight:500}}>{p.fechaEntrega}</div></div>
      </div>

      <div style={{background:T.bg,borderRadius:2,padding:"12px 14px",marginTop:10}}>
        <div style={{fontSize:17,marginBottom:6}}>{p.prenda}</div>
        <div style={{display:"flex",gap:16,fontSize:13,flexWrap:"wrap"}}>
          <span><span style={{color:T.inkMid}}>Cantidad:</span> <strong>{p.cantidad}</strong></span>
          {p.talle ? <span><span style={{color:T.inkMid}}>Talle:</span> <strong>{p.talle}</strong></span> : null}
          {pr && pr.lana > 0 ? <span><span style={{color:T.inkMid}}>Lana:</span> <strong>{pr.lana * p.cantidad}g</strong></span> : null}
          <span><span style={{color:T.inkMid}}>Tiempo est.:</span> <strong>{tiempo}d</strong></span>
        </div>
        {p.notas ? <div style={{marginTop:10,fontSize:13,padding:"8px 12px",background:T.warnLt,borderRadius:2,color:T.warn,fontWeight:500}}>{p.notas}</div> : null}
      </div>

      {msg ? <div style={{background:T.infoLt,border:"1px solid " + T.info,borderRadius:2,padding:"8px 12px",marginTop:12,fontSize:12,color:T.info}}>{msg}</div> : null}

      <Seccion titulo="Motivos de esta prenda">
        {errMot ? <div style={{fontSize:12,color:T.danger}}>No se pudieron cargar los motivos. Verificá que exista la tabla <strong>motivos</strong> en Supabase.</div> : null}
        {!errMot && motData === null ? <div style={{fontSize:12,color:T.inkLt}}>Cargando motivos…</div> : null}
        {motData && motData.motivos.length === 0 ? <div style={{fontSize:12,color:T.warn,background:T.warnLt,padding:"8px 12px",borderRadius:2}}>Todavía no hay motivos. Creá uno en la pestaña <strong>Motivos</strong> y después volvé acá.</div> : null}
        {motData && motData.motivos.length > 0 ? (
          <div>
            {vinculos.length === 0 ? <div style={{fontSize:12,color:T.inkMid,marginBottom:10}}>Esta orden no tiene motivos asociados.</div> : null}
            <datalist id="ubicaciones-motivo">{UBICACIONES.map(u => <option key={u} value={u}/>)}</datalist>
            {vinculos.map((v, i) => {
              const m = motData.motivos.find(x => x.id === v.motivoId);
              const prep = preparados[i];
              const gTot = prep ? prep.gPedido.reduce((a, g) => a + g, 0) : 0;
              return (
                <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",flexWrap:"wrap",padding:"10px",border:"1px solid " + T.border,borderRadius:4,marginBottom:8,background:T.bgCard}}>
                  {m ? <MiniMotivo m={m} paleta={motData.paleta}/> : <div style={{width:72,height:72,border:"1px dashed " + T.danger,borderRadius:2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:T.danger,textAlign:"center",flexShrink:0}}>no existe</div>}
                  <div style={{flex:1,minWidth:200}}>
                    <select value={v.motivoId} onChange={e => cambiarVinculos(vinculos.map((x, j) => j === i ? {...x, motivoId: Number(e.target.value)} : x))} style={{width:"100%",padding:"7px 10px",border:"1px solid " + T.border,borderRadius:2,fontSize:13,fontFamily:"inherit",marginBottom:6,background:T.bgCard}}>
                      {m ? null : <option value={v.motivoId}>(motivo eliminado)</option>}
                      {motData.motivos.map(x => <option key={x.id} value={x.id}>{x.nombre}</option>)}
                    </select>
                    <input list="ubicaciones-motivo" value={v.ubicacion || ""} onChange={e => cambiarVinculos(vinculos.map((x, j) => j === i ? {...x, ubicacion: e.target.value} : x))} placeholder="Ubicación en la prenda (ej: canesú, puños)" style={{width:"100%",padding:"7px 10px",border:"1px solid " + T.border,borderRadius:2,fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/>
                    {prep ? <div style={{fontSize:11,color:T.inkMid,marginTop:6}}>{prep.ancho}×{prep.alto} pts · {prep.hexes.length} colores · repetido {prep.rH}×{prep.rV} · {Math.ceil(gTot)} g de lana para el pedido</div> : null}
                  </div>
                  <button onClick={() => cambiarVinculos(vinculos.filter((_, j) => j !== i))} style={{border:"none",background:"none",cursor:"pointer",color:T.danger,fontSize:16}}>✕</button>
                </div>
              );
            })}
            <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
              <Boton small onClick={agregarVinculo}>+ Agregar motivo</Boton>
              <Boton small primario onClick={guardarVinculos} disabled={!sucio}>Guardar motivos</Boton>
              {sucio ? <span style={{fontSize:11,color:T.warn}}>● sin guardar</span> : null}
            </div>
          </div>
        ) : null}
      </Seccion>

      <Seccion titulo="PDF para la artesana">
        <div style={{fontSize:12,color:T.inkMid,marginBottom:10,lineHeight:1.5}}>
          Incluye los datos del pedido, medidas del talle, lana, instrucciones{validos > 0 ? ", " + validos + (validos === 1 ? " motivo" : " motivos") + " con colores, gramos, vista previa y gráfico numerado" : ""} y espacio para firmas.
        </div>
        <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:T.inkMid,marginBottom:12,cursor:"pointer"}}>
          <input type="checkbox" checked={mostrarCliente} onChange={e => { setMostrarCliente(e.target.checked); setPdf(null); }}/>
          Mostrar el nombre del cliente en el PDF
        </label>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <Boton primario onClick={generar} disabled={generando}>{generando ? "Generando…" : (pdf ? "Volver a generar" : "Generar PDF")}</Boton>
          {pdf ? <Boton onClick={descargarPdf}>⬇ Descargar</Boton> : null}
          {puedeCompartir ? <Boton onClick={compartirPdf}>Compartir (WhatsApp, mail…)</Boton> : null}
        </div>
        {pdf ? <div style={{fontSize:11,color:T.ok,marginTop:8}}>✓ PDF listo: {pdf.nombre} ({pdf.kb} KB)</div> : null}
      </Seccion>

      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:18,paddingTop:12,borderTop:"1px solid " + T.borderLt}}>
        <Boton onClick={copiarTexto}>Copiar texto</Boton>
        <Boton onClick={cerrar}>Cerrar</Boton>
      </div>
    </Modal>
  );
}
