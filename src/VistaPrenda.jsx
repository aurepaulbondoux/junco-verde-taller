import { useState, useEffect, useRef } from "react";
import { esquemaDe } from "./EsquemaPrenda.jsx";

const T = {bg:"#faf7f2",bgCard:"#fff",ink:"#1e1c18",inkMid:"#5a5750",inkLt:"#9a9690",border:"#ddd8cf",borderLt:"#eae5dc",green:"#3d5a3e",greenLt:"#e8f0e8",warn:"#916a00",warnLt:"#fef8e6"};
const num = v => Number(v) || 0;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

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

// Medidas de referencia para estimar la escala: ancho del dibujo (en unidades) y su equivalente real aproximado (cm)
const REFS = {
  sweater: {u: 124, cm: 50},
  poncho: {u: 224, cm: 90},
  chal: {u: 260, cm: 160},
  sombrero: {u: 120, cm: 20}
};
const TIPOS = [
  {id: "sweater", nombre: "Sweater / saco / kids", esq: esquemaDe("Sweater", "")},
  {id: "poncho", nombre: "Poncho / ruana", esq: esquemaDe("Ruana", "")},
  {id: "chal", nombre: "Chal / bufanda", esq: esquemaDe("Chal", "")},
  {id: "sombrero", nombre: "Sombrero", esq: esquemaDe("Sombrero", "Sombreros")}
];
const ZONAS_DEFECTO = {sweater: ["Canesú"], poncho: ["Ruedo"], chal: ["Centro"], sombrero: ["Banda"]};

export function tipoPorNombre(nombre) {
  const n = nombre || "";
  if (/^Sombrero/i.test(n)) return "sombrero";
  if (/^(Chal|Mantita)/i.test(n)) return "chal";
  if (/^(Ruana|Poncho)/i.test(n)) return "poncho";
  return "sweater";
}

// ═══════════════════════ MOTOR DE DIBUJO ═══════════════════════
// Dibuja un bloque de puntos (cada punto como una "V" de tejido)
function dibujarTile(grid, hexes, cw, ch) {
  const H = grid.length;
  const W = H ? grid[0].length : 0;
  const c = document.createElement("canvas");
  c.width = Math.max(1, W * cw);
  c.height = Math.max(1, H * ch);
  const ctx = c.getContext("2d");
  const oscuros = hexes.map(h => mezclar(h, 0, 0.38));
  const claros = hexes.map(h => mezclar(h, 255, 0.3));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      ctx.fillStyle = oscuros[grid[y][x]] || "#999";
      ctx.fillRect(x * cw, y * ch, cw, ch);
    }
  }
  ctx.lineCap = "round";
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = grid[y][x];
      const px = x * cw, py = y * ch;
      if (cw < 5) {
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
  return c;
}
function escalar(src, w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c;
}
function tilearGrid(g, rH, rV) {
  const H = g.length, W = g[0].length;
  const out = [];
  for (let vy = 0; vy < rV; vy++) {
    for (let y = 0; y < H; y++) {
      const fila = [];
      for (let vx = 0; vx < rH; vx++) for (let x = 0; x < W; x++) fila.push(g[y][x]);
      out.push(fila);
    }
  }
  return out;
}

// Caja que ocupa cada zona (se calcula una vez por forma)
const bboxCache = {};
function bboxDe(d) {
  if (bboxCache[d]) return bboxCache[d];
  const c = document.createElement("canvas");
  c.width = 1;
  c.height = 1;
  const ctx = c.getContext("2d");
  const path = new Path2D(d);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let y = 0; y <= 280; y += 2) {
    for (let x = 0; x <= 310; x += 2) {
      if (ctx.isPointInPath(path, x, y)) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  const r = x0 === Infinity ? {x: 0, y: 0, w: 300, h: 270} : {x: x0 - 2, y: y0 - 2, w: x1 - x0 + 4, h: y1 - y0 + 4};
  bboxCache[d] = r;
  return r;
}

// Dibuja la prenda con el tejido base y los motivos colocados en sus zonas.
// opts: { esq, k, colorBase, escala (%), cmAncho, etiquetas, asignaciones: [{zonas, modo: "bloque"|"rellenar", rep, motivo:{grid,hexes,pp,vv,rH,rV}}] }
export function renderPrenda(opts) {
  const esq = opts.esq;
  const ref = REFS[esq.tipo] || REFS.sweater;
  const cm = num(opts.cmAncho) > 0 ? num(opts.cmAncho) : ref.cm;
  const uCm = ref.u / cm;
  const escala = (opts.escala || 100) / 100;
  const asign = (opts.asignaciones || []).filter(a => a.motivo && a.motivo.grid && a.motivo.grid.length && a.zonas && a.zonas.length);

  const medida = m => {
    const pp = num(m.pp) > 0 ? num(m.pp) : 22;
    const vv = num(m.vv) > 0 ? num(m.vv) : 28;
    return {sw: (10 / pp) * uCm * escala, sh: (10 / vv) * uCm * escala};
  };
  let swMin = (10 / 22) * uCm * escala;
  asign.forEach(a => { swMin = Math.min(swMin, medida(a.motivo).sw); });
  const k = Math.min(3200 / esq.ancho, Math.max(opts.k || 3, 4 / swMin));

  const c = document.createElement("canvas");
  c.width = Math.round(esq.ancho * k);
  c.height = Math.round(esq.alto * k);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);

  const hacerPath = (d, dx) => {
    const p = new Path2D();
    p.addPath(new Path2D(d), new DOMMatrix([k, 0, 0, k, dx * k, 0]));
    return p;
  };
  const base = opts.colorBase || "#e8e0d0";

  // tejido base (todas las zonas)
  const swB = (10 / 22) * uCm * escala * k;
  const shB = (10 / 28) * uCm * escala * k;
  const baseTile = dibujarTile([[0, 0], [0, 0]], [base], clamp(Math.round(swB), 3, 10), clamp(Math.round(shB), 3, 12));
  const basePat = ctx.createPattern(baseTile, "repeat");
  esq.zonas.forEach(z => {
    z.partes.forEach(pt => {
      ctx.save();
      ctx.clip(hacerPath(pt.d, esq.vistas[pt.vista].dx));
      ctx.fillStyle = basePat;
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.restore();
    });
  });

  // motivos
  asign.forEach(a => {
    const m = a.motivo;
    const med = medida(m);
    const swPx = med.sw * k, shPx = med.sh * k;
    const modo = a.modo || "bloque";
    const grid = modo === "bloque" ? tilearGrid(m.grid, clamp(Math.round(num(m.rH)) || 1, 1, 12), clamp(Math.round(num(m.rV)) || 1, 1, 12)) : m.grid;
    const cwR = clamp(Math.ceil(swPx), 3, 12);
    const chR = clamp(Math.round(cwR * med.sh / med.sw), 3, 14);
    const fuente = dibujarTile(grid, m.hexes, cwR, chR);
    const tw = grid[0].length * swPx, th = grid.length * shPx;
    const tile = escalar(fuente, tw, th);
    const rep = modo === "bloque" ? "no-repeat" : (a.rep || "repeat");
    const pat = ctx.createPattern(tile, rep);
    a.zonas.forEach(id => {
      const z = esq.zonas.find(q => q.id === id);
      if (!z) return;
      z.partes.forEach(pt => {
        const dx = esq.vistas[pt.vista].dx;
        const b = bboxDe(pt.d);
        const bx = (dx + b.x) * k, by = b.y * k, bw = b.w * k, bh = b.h * k;
        const ox = bx + (bw - tile.width) / 2;
        const oy = by + (bh - tile.height) / 2;
        ctx.save();
        ctx.clip(hacerPath(pt.d, dx));
        ctx.translate(ox, oy);
        ctx.fillStyle = pat;
        ctx.fillRect(bx - ox, by - oy, bw, bh);
        ctx.restore();
      });
    });
  });

  // contornos y títulos
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(1, k * 0.45);
  ctx.strokeStyle = "rgba(30,28,24,0.45)";
  esq.zonas.forEach(z => {
    z.partes.forEach(pt => { ctx.stroke(hacerPath(pt.d, esq.vistas[pt.vista].dx)); });
  });
  ctx.fillStyle = "#9a9690";
  ctx.font = Math.round(12 * k) + "px Georgia, serif";
  ctx.textAlign = "center";
  esq.vistas.forEach(v => { ctx.fillText(v.titulo, (v.dx + 150) * k, 16 * k); });

  if (opts.etiquetas) {
    const usados = {};
    asign.forEach(a => { a.zonas.forEach(id => { usados[id] = true; }); });
    ctx.font = "bold " + Math.round(10 * k) + "px Georgia, serif";
    ctx.lineWidth = k * 2.5;
    esq.zonas.forEach(z => {
      if (!usados[z.id]) return;
      z.vistas.forEach(v => {
        const x = (esq.vistas[v].dx + z.lx) * k, y = z.ly * k;
        ctx.strokeStyle = "#1e1c18";
        ctx.strokeText(z.etq, x, y);
        ctx.fillStyle = "#fff";
        ctx.fillText(z.etq, x, y);
      });
    });
  }
  return c;
}

// ═══════════════════════ PANEL DEL EDITOR ═══════════════════════
function Chip({ activo, onClick, children }) {
  return (
    <span onClick={onClick} style={{padding: "3px 10px", borderRadius: 99, fontSize: 11, cursor: "pointer", background: activo ? T.green : "transparent", color: activo ? "#fff" : T.inkMid, border: "1px solid " + (activo ? T.green : T.border)}}>{children}</span>
  );
}

export default function VistaPrenda({ motivoId, gridRef, tick, colores, paleta, ptos10, vueltas10, prendaNombre, repH, repV }) {
  const clave = "jv_vistaprenda_" + motivoId;
  const [abierto, setAbierto] = useState(false);
  const [cfg, setCfg] = useState(() => {
    try {
      const s = window.localStorage.getItem(clave);
      if (s) return JSON.parse(s);
    } catch (e) { /* sin datos guardados */ }
    const tipo = tipoPorNombre(prendaNombre);
    return {tipo: tipo, zonas: ZONAS_DEFECTO[tipo], base: "auto", modo: "bloque", fillH: true, fillV: true, escala: 100, cm: ""};
  });
  const canvasRef = useRef(null);
  const tipo = TIPOS.find(t => t.id === cfg.tipo) || TIPOS[0];

  const cambiar = parte => {
    const nuevo = {...cfg, ...parte};
    setCfg(nuevo);
    try { window.localStorage.setItem(clave, JSON.stringify(nuevo)); } catch (e) { /* sin almacenamiento */ }
  };
  const cambiarTipo = id => cambiar({tipo: id, zonas: ZONAS_DEFECTO[id]});
  const alternarZona = id => cambiar({zonas: cfg.zonas.includes(id) ? cfg.zonas.filter(z => z !== id) : cfg.zonas.concat([id])});

  useEffect(() => {
    if (!abierto) return;
    const id = setTimeout(() => {
      const g = gridRef.current;
      const hexes = colores.map(pid => { const p = paleta.find(q => q.id === pid); return p ? p.hex : "#cccccc"; });
      const out = canvasRef.current;
      if (!out || !g.length || !hexes.length) return;
      const hexBase = cfg.base === "auto" ? hexes[0] : ((paleta.find(p => p.id === cfg.base) || {}).hex || hexes[0]);
      const rep = cfg.fillH && cfg.fillV ? "repeat" : (cfg.fillH ? "repeat-x" : (cfg.fillV ? "repeat-y" : "no-repeat"));
      const cv = renderPrenda({
        esq: tipo.esq, k: 3, colorBase: hexBase, escala: cfg.escala, cmAncho: cfg.cm, etiquetas: false,
        asignaciones: [{
          zonas: cfg.zonas.filter(z => tipo.esq.zonas.some(q => q.id === z)),
          modo: cfg.modo, rep: rep,
          motivo: {grid: g, hexes: hexes, pp: num(ptos10), vv: num(vueltas10), rH: repH, rV: repV}
        }]
      });
      out.width = cv.width;
      out.height = cv.height;
      out.getContext("2d").drawImage(cv, 0, 0);
    }, 150);
    return () => clearTimeout(id);
  }, [abierto, tick, cfg, colores, paleta, ptos10, vueltas10, repH, repV]);

  const descargar = () => {
    if (!canvasRef.current) return;
    const a = document.createElement("a");
    a.href = canvasRef.current.toDataURL("image/png");
    a.download = "motivo_en_prenda.png";
    a.click();
  };

  const sel = {width: "100%", padding: "7px 10px", border: "1px solid " + T.border, borderRadius: 2, fontSize: 13, fontFamily: "inherit", background: T.bgCard, boxSizing: "border-box"};
  const etiqueta = {fontSize: 11, color: T.inkMid, display: "block", marginBottom: 4};

  return (
    <div style={{background: T.bgCard, border: "1px solid " + T.border, borderRadius: 4, padding: "1rem 1.1rem", marginBottom: 12}}>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8}}>
        <div style={{fontSize: 11, color: T.inkMid, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 500}}>Ver en la prenda</div>
        <button onClick={() => setAbierto(!abierto)} style={{padding: "4px 10px", borderRadius: 2, border: "1px solid " + T.border, background: abierto ? T.greenLt : "transparent", color: abierto ? T.green : T.ink, cursor: "pointer", fontSize: 11, fontFamily: "inherit"}}>{abierto ? "Ocultar" : "👕 Abrir"}</button>
      </div>

      {abierto ? (
        <div style={{marginTop: 12}}>
          <div style={{marginBottom: 10}}>
            <label style={etiqueta}>Tipo de prenda</label>
            <select value={cfg.tipo} onChange={e => cambiarTipo(e.target.value)} style={sel}>
              {TIPOS.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </div>

          <div style={{marginBottom: 10}}>
            <label style={etiqueta}>Zonas donde va el motivo</label>
            <div style={{display: "flex", flexWrap: "wrap", gap: 5}}>
              {tipo.esq.zonas.map(z => <Chip key={z.id} activo={cfg.zonas.includes(z.id)} onClick={() => alternarZona(z.id)}>{z.id}</Chip>)}
            </div>
          </div>

          <div style={{marginBottom: 10}}>
            <label style={etiqueta}>Cómo se coloca</label>
            <div style={{display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center"}}>
              <Chip activo={cfg.modo === "bloque"} onClick={() => cambiar({modo: "bloque"})}>Mis repeticiones ({repH}×{repV})</Chip>
              <Chip activo={cfg.modo === "rellenar"} onClick={() => cambiar({modo: "rellenar"})}>Rellenar la zona</Chip>
              {cfg.modo === "rellenar" ? <Chip activo={cfg.fillH} onClick={() => cambiar({fillH: !cfg.fillH})}>↔</Chip> : null}
              {cfg.modo === "rellenar" ? <Chip activo={cfg.fillV} onClick={() => cambiar({fillV: !cfg.fillV})}>↕</Chip> : null}
            </div>
          </div>

          <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10}}>
            <div>
              <label style={etiqueta}>Color de la prenda</label>
              <select value={cfg.base} onChange={e => cambiar({base: e.target.value === "auto" ? "auto" : Number(e.target.value)})} style={sel}>
                <option value="auto">Fondo del motivo</option>
                {paleta.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={etiqueta}>Ancho real (cm, aprox.)</label>
              <input type="number" min="1" value={cfg.cm} placeholder={String(REFS[cfg.tipo].cm)} onChange={e => cambiar({cm: e.target.value})} style={sel}/>
            </div>
          </div>

          <label style={etiqueta}>Tamaño del motivo: <strong>{cfg.escala}%</strong></label>
          <input type="range" min="40" max="250" step="10" value={cfg.escala} onChange={e => cambiar({escala: Number(e.target.value)})} style={{width: "100%", marginBottom: 10}}/>

          <div style={{background: "#fff", border: "1px solid " + T.border, borderRadius: 2, padding: 6, textAlign: "center"}}>
            <canvas ref={canvasRef} style={{maxWidth: "100%", height: "auto"}}/>
          </div>
          {num(ptos10) <= 0 || num(vueltas10) <= 0 ? <div style={{fontSize: 10, color: T.warn, marginTop: 6}}>Sin tu tensión cargada se usan 22 puntos × 28 vueltas en 10 cm.</div> : null}
          <div style={{fontSize: 10, color: T.inkLt, marginTop: 6, lineHeight: 1.5}}>La escala es aproximada: usa tu tensión y un ancho típico de la prenda. Sirve para evaluar proporciones, colores y ubicación.</div>
          <div style={{marginTop: 8}}>
            <button onClick={descargar} style={{padding: "4px 10px", borderRadius: 2, border: "1px solid " + T.border, background: "transparent", cursor: "pointer", fontSize: 11, fontFamily: "inherit"}}>⬇ Descargar imagen</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
